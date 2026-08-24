import { App, Notice, PluginSettingTab, Setting } from "obsidian";
import type { SettingDefinitionItem } from "obsidian";
import type GutenbergPublisherPlugin from "./main";
import { PostStatus, PostType, PublisherSettings } from "./types";
import { WordPressClient } from "./wordpress";

export class PublisherSettingTab extends PluginSettingTab {
  constructor(app: App, private readonly plugin: GutenbergPublisherPlugin) {
    super(app, plugin);
  }

  getSettingDefinitions(): SettingDefinitionItem<keyof PublisherSettings>[] {
    return [
      {
        name: "WordPress URL",
        desc: "例: https://example.com（末尾のスラッシュは不要です）",
        control: { type: "text", key: "siteUrl", placeholder: "https://example.com" }
      },
      {
        name: "ユーザー名",
        control: { type: "text", key: "username" }
      },
      {
        name: "アプリケーションパスワード",
        desc: "WordPressの「ユーザー → プロフィール」でこのプラグイン専用に発行してください。",
        render: (setting) => this.addApplicationPasswordControl(setting)
      },
      {
        name: "接続テスト",
        desc: "保存した認証情報でWordPress REST APIへ接続します。",
        render: (setting) => this.addConnectionTestControl(setting)
      },
      {
        name: "既定の投稿状態",
        control: {
          type: "dropdown",
          key: "defaultStatus",
          options: { draft: "下書き", publish: "公開", pending: "レビュー待ち", private: "非公開" }
        }
      },
      {
        name: "投稿タイプ",
        control: { type: "dropdown", key: "postType", options: { posts: "投稿", pages: "固定ページ" } }
      },
      {
        name: "先頭のH1を本文から除く",
        desc: "先頭のH1を投稿タイトルとして使い、本文では重複表示しません。",
        control: { type: "toggle", key: "removeTitleHeading" }
      },
      {
        name: "ローカル画像をアップロード",
        desc: "Obsidianの添付画像をWordPressメディアライブラリへ送信します。",
        control: { type: "toggle", key: "uploadImages" }
      }
    ];
  }

  getControlValue(key: string): unknown {
    switch (key) {
      case "siteUrl": return this.plugin.settings.siteUrl;
      case "username": return this.plugin.settings.username;
      case "applicationPassword": return this.plugin.settings.applicationPassword;
      case "defaultStatus": return this.plugin.settings.defaultStatus;
      case "postType": return this.plugin.settings.postType;
      case "removeTitleHeading": return this.plugin.settings.removeTitleHeading;
      case "uploadImages": return this.plugin.settings.uploadImages;
      default: return undefined;
    }
  }

  async setControlValue(key: string, value: unknown): Promise<void> {
    switch (key) {
      case "siteUrl":
        if (typeof value !== "string") return;
        this.plugin.settings.siteUrl = value.trim();
        break;
      case "username":
        if (typeof value !== "string") return;
        this.plugin.settings.username = value.trim();
        break;
      case "applicationPassword":
        if (typeof value !== "string") return;
        this.plugin.settings.applicationPassword = value;
        break;
      case "defaultStatus":
        if (typeof value !== "string" || !["draft", "publish", "pending", "private"].includes(value)) return;
        this.plugin.settings.defaultStatus = value as PostStatus;
        break;
      case "postType":
        if (value !== "posts" && value !== "pages") return;
        this.plugin.settings.postType = value;
        break;
      case "removeTitleHeading":
        if (typeof value !== "boolean") return;
        this.plugin.settings.removeTitleHeading = value;
        break;
      case "uploadImages":
        if (typeof value !== "boolean") return;
        this.plugin.settings.uploadImages = value;
        break;
      default:
        return;
    }
    await this.plugin.saveSettings();
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName("WordPress URL")
      .setDesc("例: https://example.com（末尾のスラッシュは不要です）")
      .addText((text) => text
        .setPlaceholder("https://example.com")
        .setValue(this.plugin.settings.siteUrl)
        .onChange(async (value) => {
          this.plugin.settings.siteUrl = value.trim();
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName("ユーザー名")
      .addText((text) => text
        .setValue(this.plugin.settings.username)
        .onChange(async (value) => {
          this.plugin.settings.username = value.trim();
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName("アプリケーションパスワード")
      .setDesc("WordPressの「ユーザー → プロフィール」でこのプラグイン専用に発行してください。")
      .then((setting) => this.addApplicationPasswordControl(setting));

    new Setting(containerEl)
      .setName("接続テスト")
      .setDesc("保存した認証情報でWordPress REST APIへ接続します。")
      .then((setting) => this.addConnectionTestControl(setting));

    new Setting(containerEl)
      .setName("既定の投稿状態")
      .addDropdown((dropdown) => dropdown
        .addOptions({ draft: "下書き", publish: "公開", pending: "レビュー待ち", private: "非公開" })
        .setValue(this.plugin.settings.defaultStatus)
        .onChange(async (value) => {
          this.plugin.settings.defaultStatus = value as PostStatus;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName("投稿タイプ")
      .addDropdown((dropdown) => dropdown
        .addOptions({ posts: "投稿", pages: "固定ページ" })
        .setValue(this.plugin.settings.postType)
        .onChange(async (value) => {
          this.plugin.settings.postType = value as PostType;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName("先頭のH1を本文から除く")
      .setDesc("先頭のH1を投稿タイトルとして使い、本文では重複表示しません。")
      .addToggle((toggle) => toggle.setValue(this.plugin.settings.removeTitleHeading).onChange(async (value) => {
        this.plugin.settings.removeTitleHeading = value;
        await this.plugin.saveSettings();
      }));

    new Setting(containerEl)
      .setName("ローカル画像をアップロード")
      .setDesc("Obsidianの添付画像をWordPressメディアライブラリへ送信します。")
      .addToggle((toggle) => toggle.setValue(this.plugin.settings.uploadImages).onChange(async (value) => {
        this.plugin.settings.uploadImages = value;
        await this.plugin.saveSettings();
      }));
  }

  private addApplicationPasswordControl(setting: Setting): void {
    setting.addText((text) => {
      text.inputEl.type = "password";
      text.setValue(this.plugin.settings.applicationPassword).onChange(async (value) => {
        this.plugin.settings.applicationPassword = value;
        await this.plugin.saveSettings();
      });
    });
  }

  private addConnectionTestControl(setting: Setting): void {
    setting.addButton((button) => button.setButtonText("テスト").onClick(async () => {
      button.setDisabled(true);
      try {
        const client = new WordPressClient(this.plugin.settings);
        const name = await client.testConnection();
        new Notice(`接続成功: ${name}`);
      } catch (error) {
        new Notice(error instanceof Error ? error.message : String(error), 8000);
      } finally {
        button.setDisabled(false);
      }
    }));
  }
}
