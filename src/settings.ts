import { App, Notice, PluginSettingTab, Setting } from "obsidian";
import type GutenbergPublisherPlugin from "./main";
import { PostStatus, PostType } from "./types";
import { WordPressClient } from "./wordpress";

export class PublisherSettingTab extends PluginSettingTab {
  constructor(app: App, private readonly plugin: GutenbergPublisherPlugin) {
    super(app, plugin);
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
      .addText((text) => {
        text.inputEl.type = "password";
        text.setValue(this.plugin.settings.applicationPassword).onChange(async (value) => {
          this.plugin.settings.applicationPassword = value;
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName("接続テスト")
      .setDesc("保存した認証情報でWordPress REST APIへ接続します。")
      .addButton((button) => button.setButtonText("テスト").onClick(async () => {
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
}
