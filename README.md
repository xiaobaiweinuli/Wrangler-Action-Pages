# CF Deploy — Cloudflare Worker/Pages 浏览器部署控制台

**无需 Wrangler CLI，无需命令行，通过浏览器直接部署 Cloudflare Workers / Pages。**  
专为手机、ARM 设备（如无法运行 Wrangler 的 AArch64 机器）设计，基于 GitHub Actions 自动化实现完整的部署流程。

> 配套工具： [**Wrangler-Action**](/docs/README.md)

---

## 特性

- 📱 **全平台支持** — 手机、平板、ARM 设备均可使用，无需安装任何工具
- 📦 **浏览器内打包** — 选择项目文件夹自动递归压缩为 ZIP，无需提前打包
- 🚀 **一键触发部署** — 上传后自动触发 GitHub Actions，实时轮询进度
- 🔄 **版本管理 & 回滚** — 列出仓库所有版本，一键部署历史版本
- 📋 **内联日志查看** — 直接在页面内查看 GitHub Actions 完整日志，无需跳转
- ⬇ **代理加速下载** — 文件下载经 Cloudflare 节点中转，国内可正常访问
- ⚡ **执行任意 Wrangler 命令** — D1、R2、KV、Vectorize 等资源创建无需本地环境
- 🌐 **GitHub API 代理** — 所有请求经 Cloudflare Worker 中转，国内无需代理

---

## 快速开始

### 1. 部署此控制台到 Cloudflare Workers

**方式一：Dashboard 连接 GitHub（推荐）**

1. [Cloudflare Dashboard](https://dash.cloudflare.com) → Workers & Pages → Create → Connect to Git
2. 连接本仓库，构建命令留空，部署命令填 `wrangler deploy`

**方式二：本地命令**

```bash
wrangler deploy
```

### 2. 创建 GitHub PAT

前往 [GitHub Settings → Tokens (classic)](https://github.com/settings/tokens)，勾选 `repo` + `workflow` 权限。

### 3. 打开网页，连接目标仓库，开始部署

---

## 使用前提

目标仓库需已完成 [**Wrangler-Action**](/docs/README.md) 的配置：

- 已添加 `CLOUDFLARE_API_TOKEN`、`CLOUDFLARE_ACCOUNT_ID`、`GH_WORKFLOW_TOKEN` 三个 Secret
- 仓库中存在 `.github/workflows/deploy.yml`

---

## 项目结构

```
/
├── worker.js        ← Worker 入口（GitHub API + 文件下载代理）
├── wrangler.toml    ← 部署配置
└── public/
    └── index.html   ← 前端页面（Cloudflare CDN 分发）
```

**Worker 代理路由：**

| 路径 | 目标 | 用途 |
|---|---|---|
| `/api/github/*` | `api.github.com` | GitHub REST API |
| `/api/raw/*` | `raw.githubusercontent.com` | ZIP 文件下载加速 |

---

## 功能详情

### 🚀 部署 Tab

| 选择方式 | 支持环境 |
|---|---|
| 选择文件夹（递归打包） | 桌面 Chrome/Edge、Android Chrome 132+ |
| 选择多个文件 | 全平台（iOS 降级方案） |
| 选择 / 拖放 ZIP | 全平台 |

上传完成后自动触发 `deploy.yml`，最多轮询 2 分钟，完成后 Toast 通知。

### 📦 版本管理 Tab

列出仓库根目录所有 `.zip`，支持部署（回滚）、代理下载、删除，每条记录可独立开启调试模式。

### ⚡ 命令执行 Tab

在浏览器触发任意 `wrangler` 命令（每行一条，输入框实时校验）：

```
wrangler d1 create my-database
wrangler r2 bucket create my-bucket
wrangler vectorize create email-vectors --dimensions=768
```

### 📋 运行记录 Tab

最近 8 次运行状态，点击「📄 日志」内联查看完整日志：支持 Job 切换、关键字搜索高亮、一键复制，日志本地缓存无需重复请求。

---

## 注意事项

- GitHub API 单文件上传限制 **100MB**，建议压缩包控制在 95MB 以内
- PAT 到期后需重新生成
- 刷新页面自动恢复登录状态和上次所在 Tab；关闭标签页后会话自动清除
