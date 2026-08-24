import { describe, expect, it } from "vitest";
import { markdownToGutenberg } from "../src/converter";

describe("markdownToGutenberg", () => {
  it("converts common Markdown to Gutenberg blocks", async () => {
    const result = await markdownToGutenberg("# Title\n\nHello **world**.\n\n- one\n- two\n\n```ts\nconst n = 1;\n```", undefined, true);
    expect(result.firstHeading).toBe("Title");
    expect(result.content).not.toContain("<h1");
    expect(result.content).toContain("<!-- wp:paragraph -->");
    expect(result.content).toContain("<strong>world</strong>");
    expect(result.content).toContain("<!-- wp:list -->");
    expect(result.content).toContain('class="language-ts"');
  });

  it("converts Obsidian embeds and resolves image URLs", async () => {
    const result = await markdownToGutenberg("![[assets/photo.png|説明]]", async (url) => `https://example.com/${url}`);
    expect(result.content).toContain("<!-- wp:image -->");
    expect(result.content).toContain("https://example.com/assets/photo.png");
    expect(result.content).toContain('alt="説明"');
  });

  it("creates table and quote blocks", async () => {
    const result = await markdownToGutenberg("> quote\n\n| A | B |\n| - | - |\n| 1 | 2 |");
    expect(result.content).toContain("<!-- wp:quote -->");
    expect(result.content).toContain("<!-- wp:table -->");
  });
});
