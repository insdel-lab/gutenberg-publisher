# Gutenberg Publisher for Obsidian

ObsidianのMarkdownノートをWordPressのネイティブGutenbergブロックへ変換し、リボンの送信アイコンから投稿・更新するプラグインです。

## 主な機能

- 見出し、段落、太字・リンク、リスト、引用、コード、区切り線、表、画像をGutenbergブロックへ変換
- `![[image.png]]` を含むObsidian画像埋め込みをWordPressメディアライブラリへアップロード
- WordPressの投稿／固定ページ、下書き／公開／レビュー待ち／非公開に対応
- カテゴリ・タグを名前から検索し、未登録なら自動作成
- 初回投稿後に投稿IDをフロントマターへ保存し、次回は同じ投稿を更新
- コマンドパレットから「投稿・更新」「下書きとして投稿・更新」を実行

## インストール

コミュニティプラグインディレクトリへの掲載後は、Obsidianの「設定 → コミュニティプラグイン → 閲覧」で **Gutenberg Publisher** を検索し、インストールして有効にします。

開発版を手動でインストールする場合は、次のコマンドでビルドします。

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm build
```

生成された `main.js`と、このフォルダの `manifest.json`、`styles.css` をVault内の次の場所へ配置します。

```text
<Vault>/.obsidian/plugins/gutenberg-publisher/
```

Obsidianを再読み込みし、「設定 → コミュニティプラグイン」で **Gutenberg Publisher** を有効にします。

## WordPress側の準備

1. WordPress管理画面の「ユーザー → プロフィール」を開きます。
2. 「アプリケーションパスワード」で `Obsidian Gutenberg Publisher` などの名前を付けて発行します。
3. Obsidianの「設定 → Gutenberg Publisher」にサイトURL、ユーザー名、発行されたパスワードを入力します。
4. 「接続テスト」を押します。WordPressサイトはHTTPSを推奨します。

## ノートのフロントマター

すべて任意です。

```yaml
---
title: 投稿タイトル
status: draft # draft, publish, pending, private
post_type: post # post または page
slug: custom-slug
excerpt: 投稿の抜粋
date: 2026-08-24T10:00:00
categories:
  - お知らせ
tags:
  - Obsidian
  - WordPress
---
```

投稿後、プラグインが `wordpress_id`、`wordpress_url`、`wordpress_status`、`wordpress_post_type`、`wordpress_updated` を自動追記します。`wordpress_id` があるノートは新規投稿ではなく更新になります。

## 開発

```bash
pnpm dev   # watch build
pnpm test
pnpm build
```

## 外部通信とプライバシー

このプラグインは、ユーザーが設定したWordPressサイトのREST APIとのみ通信します。接続テストまたは投稿コマンドを実行したときに、次の情報をWordPressへ送信します。

- WordPressユーザー名とアプリケーションパスワード
- 投稿タイトル、本文、抜粋、スラッグ、公開日時、投稿状態
- カテゴリとタグ
- ローカル画像のアップロードを有効にした場合は、ノートに埋め込まれた画像と代替テキスト

通信は接続確認、カテゴリ・タグの検索／作成、画像のアップロード、投稿／固定ページの作成・更新に必要です。開発者が運営するサーバーへの通信、解析、広告、テレメトリーはありません。

アプリケーションパスワードは、VaultのObsidianプラグインデータに保存されます。Obsidian SyncやiCloudなどでVault設定を同期する場合、認証情報も同期対象になる可能性があります。WordPressの通常ログインパスワードではなく、このプラグイン専用のアプリケーションパスワードを使用し、HTTPSのWordPressサイトへ接続してください。不要になった場合はWordPressのプロフィール画面から個別に失効できます。

## ライセンス

[MIT License](./LICENSE)
