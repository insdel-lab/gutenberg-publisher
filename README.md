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

```bash
npm install
npm run build
```

このフォルダの `main.js`、`manifest.json`、`styles.css` をVault内の次の場所へ配置します。

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
npm run dev   # watch build
npm test
npm run build
```

## セキュリティ

アプリケーションパスワードはObsidianのプラグインデータに保存されます。WordPressログイン用パスワードを入力せず、このプラグイン専用のアプリケーションパスワードを使ってください。不要になった場合はWordPressのプロフィール画面から個別に失効できます。
