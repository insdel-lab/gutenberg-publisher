import { requestUrl, RequestUrlParam } from "obsidian";
import { PostStatus, UploadResult, WordPressPostResponse } from "./types";

interface ClientOptions {
  siteUrl: string;
  username: string;
  applicationPassword: string;
}

export interface PostPayload {
  title: string;
  content: string;
  status: PostStatus;
  slug?: string;
  excerpt?: string;
  date?: string;
  categories?: number[];
  tags?: number[];
}

export class WordPressError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = "WordPressError";
  }
}

export class WordPressClient {
  private readonly baseUrl: string;
  private readonly authorization: string;

  constructor(options: ClientOptions) {
    this.baseUrl = `${options.siteUrl.replace(/\/+$/, "")}/wp-json/wp/v2`;
    this.authorization = `Basic ${utf8Base64(`${options.username}:${options.applicationPassword.replace(/\s/g, "")}`)}`;
  }

  private async request<T>(path: string, params: Partial<RequestUrlParam> = {}): Promise<T> {
    const response = await requestUrl({
      url: `${this.baseUrl}${path}`,
      method: params.method ?? "GET",
      headers: { Authorization: this.authorization, ...params.headers },
      body: params.body,
      contentType: params.contentType,
      throw: false
    });

    if (response.status < 200 || response.status >= 300) {
      const detail = response.json?.message ?? response.text ?? `HTTP ${response.status}`;
      throw new WordPressError(`WordPress API: ${detail}`, response.status);
    }
    return response.json as T;
  }

  async testConnection(): Promise<string> {
    const user = await this.request<{ name: string }>("/users/me?context=edit");
    return user.name;
  }

  async savePost(postType: "posts" | "pages", payload: PostPayload, postId?: number): Promise<WordPressPostResponse> {
    return this.request<WordPressPostResponse>(`/${postType}${postId ? `/${postId}` : ""}`, {
      method: "POST",
      contentType: "application/json",
      body: JSON.stringify(payload)
    });
  }

  async resolveTerms(taxonomy: "categories" | "tags", terms: Array<string | number>): Promise<number[]> {
    const ids: number[] = [];
    for (const term of terms) {
      if (typeof term === "number" || /^\d+$/.test(String(term))) {
        ids.push(Number(term));
        continue;
      }
      const name = String(term).trim();
      if (!name) continue;
      const found = await this.request<Array<{ id: number; name: string }>>(
        `/${taxonomy}?search=${encodeURIComponent(name)}&per_page=100&context=edit`
      );
      const exact = found.find((item) => item.name.toLocaleLowerCase() === name.toLocaleLowerCase());
      if (exact) {
        ids.push(exact.id);
      } else {
        const created = await this.request<{ id: number }>(`/${taxonomy}`, {
          method: "POST",
          contentType: "application/json",
          body: JSON.stringify({ name })
        });
        ids.push(created.id);
      }
    }
    return ids;
  }

  async uploadMedia(data: ArrayBuffer, filename: string, mimeType: string, altText: string): Promise<UploadResult> {
    const response = await this.request<{ id: number; source_url: string }>("/media", {
      method: "POST",
      headers: {
        "Content-Disposition": `attachment; filename="${filename.replace(/["\\]/g, "_")}"`
      },
      contentType: mimeType || "application/octet-stream",
      body: data
    });

    if (altText) {
      await this.request(`/media/${response.id}`, {
        method: "POST",
        contentType: "application/json",
        body: JSON.stringify({ alt_text: altText })
      });
    }
    return { id: response.id, sourceUrl: response.source_url };
  }
}

function utf8Base64(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  bytes.forEach((byte) => binary += String.fromCharCode(byte));
  return btoa(binary);
}
