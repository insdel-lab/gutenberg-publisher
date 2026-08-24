import {
  Editor,
  MarkdownView,
  Notice,
  Plugin,
  TFile,
  getAllTags
} from "obsidian";
import { markdownToGutenberg } from "./converter";
import { PublisherSettingTab } from "./settings";
import { PostStatus, PublishMetadata, PublisherSettings } from "./types";
import { WordPressClient } from "./wordpress";

const DEFAULT_SETTINGS: PublisherSettings = {
  siteUrl: "",
  username: "",
  applicationPassword: "",
  defaultStatus: "draft",
  postType: "posts",
  removeTitleHeading: true,
  uploadImages: true
};

export default class GutenbergPublisherPlugin extends Plugin {
  settings: PublisherSettings = DEFAULT_SETTINGS;
  private publishing = false;

  async onload(): Promise<void> {
    await this.loadSettings();
    this.addSettingTab(new PublisherSettingTab(this.app, this));

    this.addRibbonIcon("send", "WordPressへ投稿", () => void this.publishActiveNote());
    this.addCommand({
      id: "publish-active-note",
      name: "現在のノートをWordPressへ投稿・更新",
      checkCallback: (checking) => {
        const available = this.app.workspace.getActiveFile()?.extension === "md";
        if (available && !checking) void this.publishActiveNote();
        return available;
      }
    });
    this.addCommand({
      id: "publish-active-note-as-draft",
      name: "現在のノートをWordPressの下書きとして投稿・更新",
      editorCallback: (_editor: Editor, view: MarkdownView) => void this.publishFile(view.file, "draft")
    });
  }

  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  private async publishActiveNote(): Promise<void> {
    const file = this.app.workspace.getActiveFile();
    if (!file || file.extension !== "md") {
      new Notice("投稿するMarkdownノートを開いてください。 ");
      return;
    }
    await this.publishFile(file);
  }

  private async publishFile(file: TFile | null, forcedStatus?: PostStatus): Promise<void> {
    if (!file || this.publishing) return;
    if (!this.settings.siteUrl || !this.settings.username || !this.settings.applicationPassword) {
      new Notice("Gutenberg Publisherの設定でWordPress接続情報を入力してください。", 8000);
      return;
    }

    this.publishing = true;
    const progress = new Notice("WordPressへ投稿しています…", 0);
    try {
      const raw = await this.app.vault.read(file);
      const cache = this.app.metadataCache.getFileCache(file);
      const frontmatter = cache?.frontmatter ?? {};
      const body = stripFrontmatter(raw);
      const client = new WordPressClient(this.settings);
      const metadata = this.getMetadata(file, frontmatter, forcedStatus);
      const uploaded = new Map<string, string>();
      const converted = await markdownToGutenberg(
        body,
        async (url, alt) => this.resolveImage(file, url, alt ?? "", client, uploaded),
        this.settings.removeTitleHeading
      );
      if (!frontmatter.title && converted.firstHeading) metadata.title = converted.firstHeading;

      const [categories, tags] = await Promise.all([
        metadata.postType === "posts" ? client.resolveTerms("categories", metadata.categories) : Promise.resolve([]),
        metadata.postType === "posts" ? client.resolveTerms("tags", metadata.tags) : Promise.resolve([])
      ]);
      const response = await client.savePost(metadata.postType, {
        title: metadata.title,
        content: converted.content,
        status: metadata.status,
        slug: metadata.slug,
        excerpt: metadata.excerpt,
        date: metadata.date,
        categories,
        tags
      }, metadata.postId);

      await this.app.fileManager.processFrontMatter(file, (fm) => {
        fm.wordpress_id = response.id;
        fm.wordpress_url = response.link;
        fm.wordpress_status = response.status;
        fm.wordpress_post_type = metadata.postType;
        fm.wordpress_updated = new Date().toISOString();
      });
      progress.hide();
      new Notice(`${metadata.postId ? "更新" : "投稿"}しました: ${response.link}`, 10000);
    } catch (error) {
      progress.hide();
      console.error("Gutenberg Publisher", error);
      new Notice(error instanceof Error ? error.message : String(error), 10000);
    } finally {
      this.publishing = false;
    }
  }

  private getMetadata(file: TFile, fm: Record<string, unknown>, forcedStatus?: PostStatus): PublishMetadata {
    const cache = this.app.metadataCache.getFileCache(file);
    const frontmatterTags = toArray(fm.tags ?? fm.tag).map((tag) => String(tag).replace(/^#/, ""));
    const inlineTags = (cache ? getAllTags(cache) ?? [] : []).map((tag) => tag.replace(/^#/, ""));
    return {
      title: String(fm.title ?? file.basename),
      status: forcedStatus ?? validStatus(fm.status) ?? this.settings.defaultStatus,
      postType: resolvePostType(fm.wordpress_post_type ?? fm.post_type, this.settings.postType),
      postId: positiveNumber(fm.wordpress_id),
      slug: optionalString(fm.slug),
      excerpt: optionalString(fm.excerpt),
      date: optionalString(fm.date),
      categories: toArray(fm.categories ?? fm.category),
      tags: [...new Set([...frontmatterTags, ...inlineTags])]
    };
  }

  private async resolveImage(
    note: TFile,
    rawUrl: string,
    alt: string,
    client: WordPressClient,
    uploaded: Map<string, string>
  ): Promise<string> {
    if (/^(https?:|data:)/i.test(rawUrl) || !this.settings.uploadImages) return rawUrl;
    const decoded = decodeURIComponent(rawUrl).split("#")[0];
    const target = this.app.metadataCache.getFirstLinkpathDest(decoded, note.path);
    if (!target) throw new Error(`画像が見つかりません: ${decoded}`);
    const cached = uploaded.get(target.path);
    if (cached) return cached;
    const data = await this.app.vault.readBinary(target);
    const result = await client.uploadMedia(data, target.name, mimeType(target.extension), alt || target.basename);
    uploaded.set(target.path, result.sourceUrl);
    return result.sourceUrl;
  }
}

function stripFrontmatter(markdown: string): string {
  return markdown.replace(/^---\s*\r?\n[\s\S]*?\r?\n---\s*(?:\r?\n|$)/, "");
}

function toArray(value: unknown): Array<string | number> {
  if (Array.isArray(value)) return value.filter((item): item is string | number => typeof item === "string" || typeof item === "number");
  if (typeof value === "string") return value.split(",").map((item) => item.trim()).filter(Boolean);
  if (typeof value === "number") return [value];
  return [];
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function positiveNumber(value: unknown): number | undefined {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function validStatus(value: unknown): PostStatus | undefined {
  return ["draft", "publish", "pending", "private"].includes(String(value)) ? value as PostStatus : undefined;
}

function resolvePostType(value: unknown, fallback: "posts" | "pages"): "posts" | "pages" {
  if (value === "page" || value === "pages") return "pages";
  if (value === "post" || value === "posts") return "posts";
  return fallback;
}

function mimeType(extension: string): string {
  const types: Record<string, string> = {
    png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif",
    webp: "image/webp", svg: "image/svg+xml", avif: "image/avif"
  };
  return types[extension.toLowerCase()] ?? "application/octet-stream";
}
