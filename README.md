# Bili Stats

自用 Bilibili 观看记录统计网站。前端使用 Next.js + Recharts，数据存储在 Supabase，GitHub Actions 定时从 Bilibili 历史记录接口同步数据。

## 功能

- 总览：今日、本周、本月、今年观看时长、视频数、UP 主数。
- 趋势：每日、每周、每月、每年观看时长和视频数。
- 分类：按 `tag_name` 聚合观看时长和视频数量。
- UP 主：按观看时长统计 Top UP 主。
- 明细：按关键字、分类、UP 主筛选最近观看记录，并为 20 分钟以上完播视频手动选择是否计入统计。
- 审核：集中处理 20 分钟以上且接近完播的待审核视频。
- 访问保护：设置 `SITE_PASSWORD` 后需要密码进入仪表盘。

统计口径：只统计完播视频。进度距离总时长小于等于 1 分钟时视为完播。20 分钟以下的完播视频自动计入；20 分钟及以上的完播视频默认不计入，需要在审核页或明细页手动选择“计入”或“排除”。

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
SUPABASE_URL=你的 Supabase URL
SUPABASE_SERVICE_ROLE_KEY=你的 service role key 或 secret key
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

`SYNC_MAX_PAGES` 表示一次同步最多翻多少页历史记录，Bilibili 历史接口每页最多约 30 条。默认 `50` 约等于最多检查 1500 条记录。

同步脚本每次都从最新历史开始往前翻，遇到已经入库的记录就停止。因此：

- 首次导入：手动触发 GitHub Actions 时把 `max_pages` 填大，例如 `500` 或 `1000`，让它尽量把旧历史翻完。
- 日常更新：保持默认 `50` 即可；因为脚本遇到已入库记录会提前停止，通常不会真的翻满 50 页。

## GitHub Actions

`.github/workflows/sync-bilibili-history.yml` 默认每 3 小时同步一次，也支持手动触发。cron 为 `12 */3 * * *`，GitHub Actions 使用 UTC；换算为北京时间大约是每天 `02:12`、`05:12`、`08:12`、`11:12`、`14:12`、`17:12`、`20:12`、`23:12`，实际执行时间可能因 GitHub 排队略有延迟。

需要配置 GitHub Secrets：

- `BILI_COOKIE`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`，如果你的 Supabase 项目显示的是新式 secret key，也可以配置为 `SUPABASE_SECRET_KEY`

可选配置 GitHub Repository Variable：

- `SYNC_MAX_PAGES`，默认 `50`

## 部署

推荐使用 Vercel Hobby 免费层部署。需要配置：

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` 或 `SUPABASE_SECRET_KEY`
- `SITE_PASSWORD`

不要在 Vercel 前端公开环境变量中配置 `BILI_COOKIE` 或 service/secret key。`SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_SECRET_KEY` 只用于服务端 API 保存长视频计入开关，变量名不能带 `NEXT_PUBLIC_`。
