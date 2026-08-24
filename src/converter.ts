import { Lexer, Marked, Parser, Renderer, Tokens } from "marked";

export interface ConversionResult {
  content: string;
  firstHeading?: string;
}

export type ImageUrlResolver = (url: string, title?: string | null) => Promise<string>;

const marked = new Marked({ gfm: true, breaks: false });

function attrs(value: Record<string, unknown>): string {
  return Object.keys(value).length ? ` ${JSON.stringify(value)}` : "";
}

function block(name: string, html: string, attributes: Record<string, unknown> = {}): string {
  return `<!-- wp:${name}${attrs(attributes)} -->\n${html}\n<!-- /wp:${name} -->`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function normalizeObsidianSyntax(markdown: string): string {
  return markdown.replace(/(!?)\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_match, embed: string, path: string, label?: string) => {
    if (embed) {
      const alt = label ?? path;
      return `![${alt}](${encodeURI(path)})`;
    }
    return `[${label ?? path}](${encodeURI(path.replace(/\.md$/i, ""))})`;
  });
}

function parseInline(token: Tokens.Paragraph | Tokens.Heading): string {
  return Parser.parseInline(token.tokens, { renderer: new Renderer() });
}

async function replaceImageUrls(html: string, resolver: ImageUrlResolver): Promise<string> {
  const regex = /<img\s+([^>]*?)src="([^"]+)"([^>]*)>/gi;
  const matches = [...html.matchAll(regex)];
  let result = html;
  for (const match of matches) {
    const resolved = await resolver(match[2]);
    result = result.replace(match[0], `<img ${match[1]}src="${escapeHtml(resolved)}"${match[3]}>`);
  }
  return result;
}

function listHtml(token: Tokens.List): string {
  const tag = token.ordered ? "ol" : "ul";
  const start = token.ordered && token.start !== 1 && token.start !== "" ? ` start="${token.start}"` : "";
  const items = token.items.map((item) => {
    const checkbox = item.task
      ? `<input disabled type="checkbox"${item.checked ? " checked" : ""}> `
      : "";
    const body = Parser.parse(item.tokens, { renderer: new Renderer() })
      .trim()
      .replace(/^<p>|<\/p>$/g, "");
    return `<li>${checkbox}${body}</li>`;
  }).join("\n");
  return `<${tag}${start}>\n${items}\n</${tag}>`;
}

export async function markdownToGutenberg(
  markdown: string,
  resolveImage: ImageUrlResolver = async (url) => url,
  removeFirstH1 = false
): Promise<ConversionResult> {
  const tokens = Lexer.lex(normalizeObsidianSyntax(markdown), { gfm: true });
  const blocks: string[] = [];
  let firstHeading: string | undefined;

  for (const token of tokens) {
    if (token.type === "space") continue;

    switch (token.type) {
      case "heading": {
        const heading = token as Tokens.Heading;
        firstHeading ??= heading.text;
        if (removeFirstH1 && heading.depth === 1 && blocks.length === 0) break;
        const html = `<h${heading.depth} class="wp-block-heading">${parseInline(heading)}</h${heading.depth}>`;
        blocks.push(block("heading", html, heading.depth === 2 ? {} : { level: heading.depth }));
        break;
      }
      case "paragraph": {
        const paragraph = token as Tokens.Paragraph;
        let html = await replaceImageUrls(parseInline(paragraph), resolveImage);
        const onlyImage = /^<img\b[^>]*>$/.test(html.trim());
        if (onlyImage) {
          blocks.push(block("image", `<figure class="wp-block-image">${html}</figure>`));
        } else {
          blocks.push(block("paragraph", `<p>${html}</p>`));
        }
        break;
      }
      case "image": {
        const image = token as Tokens.Image;
        const url = await resolveImage(image.href, image.title);
        const title = image.title ? ` title="${escapeHtml(image.title)}"` : "";
        blocks.push(block("image", `<figure class="wp-block-image"><img src="${escapeHtml(url)}" alt="${escapeHtml(image.text)}"${title}></figure>`));
        break;
      }
      case "list": {
        const list = token as Tokens.List;
        const html = await replaceImageUrls(listHtml(list), resolveImage);
        blocks.push(block("list", html, list.ordered ? { ordered: true } : {}));
        break;
      }
      case "blockquote": {
        const quote = token as Tokens.Blockquote;
        const html = await replaceImageUrls(Parser.parse(quote.tokens, { renderer: new Renderer() }).trim(), resolveImage);
        blocks.push(block("quote", `<blockquote class="wp-block-quote">${html}</blockquote>`));
        break;
      }
      case "code": {
        const code = token as Tokens.Code;
        const language = code.lang?.split(/\s+/)[0];
        const className = language ? ` class="language-${escapeHtml(language)}"` : "";
        blocks.push(block("code", `<pre class="wp-block-code"><code${className}>${escapeHtml(code.text)}</code></pre>`));
        break;
      }
      case "hr":
        blocks.push(block("separator", '<hr class="wp-block-separator has-alpha-channel-opacity">'));
        break;
      case "table": {
        const table = token as Tokens.Table;
        const header = table.header.map((cell) => `<th>${Parser.parseInline(cell.tokens)}</th>`).join("");
        const rows = table.rows.map((row) => `<tr>${row.map((cell) => `<td>${Parser.parseInline(cell.tokens)}</td>`).join("")}</tr>`).join("\n");
        blocks.push(block("table", `<figure class="wp-block-table"><table><thead><tr>${header}</tr></thead><tbody>${rows}</tbody></table></figure>`));
        break;
      }
      case "html":
        blocks.push(block("html", (token as Tokens.HTML).text.trim()));
        break;
      default: {
        const html = marked.parser([token]).trim();
        if (html) blocks.push(block("html", html));
      }
    }
  }

  return { content: blocks.join("\n\n"), firstHeading };
}
