# Bili Stats

自用 Bilibili 观看记录统计网站。前端使用 Next.js + Recharts，数据存储在 Supabase，GitHub Actions 定时从 Bilibili 历史记录接口同步数据。

## 功能

- 总览：今日、本周、本月、今年观看时长、视频数、UP 主数。
- 趋势：每日、每周、每月、每年观看时长和视频数。
- 分类：按 `tag_name` 聚合观看时长和视频数量。
- UP 主：按观看时长统计 Top UP 主。
- 明细：按关键字、分类、UP 主筛选最近观看记录。
- 访问保护：设置 `SITE_PASSWORD` 后需要密码进入仪表盘。

## 本地开发

需要 Node.js `24.16.0` 和 npm `11.15.0` 或更新版本。使用 nvm 时可运行：

```bash
nvm use
```

```bash
npm install
cp .env.example .env.local
npm run dev
```

如果没有配置 Supabase 环境变量，页面会展示演示数据。

## Supabase 初始化

1. 创建 Supabase 项目。
2. 在 SQL Editor 执行 `supabase/migrations/001_initial_schema.sql`。
3. 在 `.env.local` 或 Vercel 环境变量中配置：

```bash
NEXT_PUBLIC_SUPABASE_URL=你的 Supabase URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=你的 anon key
SITE_PASSWORD=你的站点访问密码
```

## Supabase 迁移自动部署

仓库包含 `.github/workflows/deploy-supabase.yml`。当 `main` 分支上的 `supabase/**` 文件发生变化时，GitHub Actions 会自动执行 Supabase CLI 的 `supabase db push`，把 migrations 推送到 Supabase 项目。

创建 Supabase 项目并连接 GitHub 后，在 GitHub Secrets 中配置：

- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_PROJECT_ID`
- `SUPABASE_DB_PASSWORD`

如果这些 Secrets 还没有配置，workflow 会跳过迁移，避免首次推送仓库时失败。

## 同步 Bilibili 历史记录

本地同步需要：

```bash
SUPABASE_URL=你的 Supabase URL
SUPABASE_SERVICE_ROLE_KEY=你的 service role key
BILI_COOKIE=你的 Bilibili Cookie
SYNC_MAX_PAGES=50
```

运行：

```bash
npm run sync:bilibili
```

`BILI_COOKIE` 至少需要包含已登录账号的 `SESSDATA`。Cookie 过期时，脚本会失败并提示更新。

## GitHub Actions

`.github/workflows/sync-bilibili-history.yml` 默认每 3 小时同步一次，也支持手动触发。

需要配置 GitHub Secrets：

- `BILI_COOKIE`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

可选配置 GitHub Repository Variable：

- `SYNC_MAX_PAGES`，默认 `50`

## 部署

推荐使用 Vercel Hobby 免费层部署。需要配置：

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SITE_PASSWORD`

不要在 Vercel 前端环境变量中配置 `BILI_COOKIE` 或 `SUPABASE_SERVICE_ROLE_KEY`。这两个密钥只应存在于 GitHub Secrets 或本地 `.env.local`。
