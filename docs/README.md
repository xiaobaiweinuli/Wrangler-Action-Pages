# Cloudflare Workers 部署与拉取控制台（Wrangler GitHub Actions 方案）

**无需本地 Wrangler CLI，通过浏览器控制台 + GitHub Actions 实现 Cloudflare Workers / Pages 的完整部署与代码归档，完美支持手机、AArch64 等无法运行 Wrangler 的设备。**

网页控制台地址：[wrangler-action.bxiao.workers.dev](https://wrangler-action.bxiao.workers.dev/)

---

## 目录结构

```
仓库根目录/
├── .github/
│   └── workflows/
│       ├── auto-deploy.yml       # Push 触发，自动部署根目录最新 zip
│       ├── deploy.yml            # 手动触发，下拉选 zip 部署
│       ├── command.yml           # 手动触发，执行 wrangler 命令
│       ├── fetch.yml             # 手动触发，从 Cloudflare 拉取 Worker 归档
│       └── update-zip-list.yml   # 自动维护 deploy.yml 的压缩包下拉列表
├── builds/
│   └── worker-name-20260101-120000.zip  # fetch.yml 归档的 Worker 代码
├── your-worker.zip               # 上传的项目压缩包（任意名称）
└── README.md
```

---

## 快速开始

### 第一步：配置 Secrets

在 GitHub 仓库 **Settings → Secrets and variables → Actions** 中添加：

| Secret 名称 | 是否必填 | 说明 |
|---|---|---|
| `CLOUDFLARE_API_TOKEN` | ✅ 必填 | Cloudflare API Token（需含 Worker 编辑权限） |
| `CLOUDFLARE_ACCOUNT_ID` | ✅ 必填 | Cloudflare 账户 ID |
| `GH_WORKFLOW_TOKEN` | ✅ 必填 | 带 `workflow` 权限的 GitHub PAT |

**获取 Cloudflare API Token：**

1. 进入 [Cloudflare Dashboard → API Tokens](https://dash.cloudflare.com/?to=/:account/api-tokens)
2. 点击 **Create Token** → 选择 **Edit Cloudflare Workers** 模板
3. 限定 Token 的账户和区域范围（建议最小权限原则）

**创建 GH_WORKFLOW_TOKEN：**

> `update-zip-list.yml` 需要修改 `.github/workflows/deploy.yml`，GitHub 原生 `GITHUB_TOKEN` 无权操作 workflows 目录，必须使用带 `workflow` 权限的 PAT。

1. 进入 [GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)](https://github.com/settings/tokens)
2. 点击 **Generate new token (classic)**，勾选 **`workflow`**（会自动附带 `repo`）
3. 将 token 填入仓库 Secret `GH_WORKFLOW_TOKEN`

---

### 第二步：准备项目压缩包

压缩包解压后根层必须包含 wrangler 配置文件（`.toml` / `.jsonc` / `.json` 均可）：

```
your-project.zip
├── wrangler.toml   ← 必须在根层
├── src/
│   └── index.js
└── package.json
```

---

### 第三步：上传并部署

将 `.zip` 推送到仓库根目录，两个 Action 自动并行触发：

- **`auto-deploy.yml`**：自动选最新 zip → 解压 → 安装依赖 → 构建 → 部署
- **`update-zip-list.yml`**：扫描根目录 + `builds/` → 更新 `deploy.yml` 下拉选项

---

## 五个 Workflow 说明

### `auto-deploy.yml` — 自动部署

- **触发：** push 根目录 `*.zip`
- **逻辑：** 按 git 提交时间自动选最新 zip，静默部署（无调试输出）
- **适用：** 日常开发迭代，上传即部署

### `deploy.yml` — 手动部署

- **触发：** 手动（Actions → Run workflow）
- **功能：** 下拉选择任意 zip（含 `builds/` 归档），支持调试模式
- **适用：** 版本回滚、指定归档重部署

### `command.yml` — 执行 wrangler 命令

- **触发：** 手动
- **输入：** 每行一条 wrangler 命令（必须以 `wrangler ` 开头）
- **适用：** 创建 D1、KV Namespace、R2 Bucket、Vectorize Index 等资源

```
wrangler d1 create my-database
wrangler kv namespace create MY_KV
wrangler r2 bucket create my-bucket
wrangler vectorize create email-vectors --dimensions=768
```

### `fetch.yml` — 从 Cloudflare 拉取 Worker

- **触发：** 手动
- **输入：** Cloudflare Dashboard 上的 Worker 名称
- **逻辑：**
  1. 用 `create-cloudflare --existing-script` 拉取线上 Worker 代码
  2. 删除 `node_modules` 等依赖
  3. 打包为 `builds/{name}-{北京时间戳}.zip`
  4. commit 推送到仓库 → 自动触发 `update-zip-list.yml`
- **适用：** 线上代码备份、跨设备同步 Worker 源码

### `update-zip-list.yml` — 维护下拉列表

- **触发：** push `*.zip`（根目录）/ push `builds/*.zip`（fetch 归档后）/ 手动
- **作用：** 扫描根目录 + `builds/` 所有 zip，自动更新 `deploy.yml` 的下拉选项

---

## 自动触发链路

```
上传 zip → 根目录
  ├── auto-deploy.yml      → 静默部署
  └── update-zip-list.yml  → 更新下拉列表

手动触发 fetch.yml
  → 拉取 Worker 代码
  → 归档 builds/xxx.zip（push）
  └── update-zip-list.yml  → 自动更新下拉列表（含 builds/ 归档）
```

---

## 网页控制台功能

控制台部署在 Cloudflare Worker 上，解决国内访问 GitHub API 慢的问题（所有请求通过 Worker 代理）。

| Tab | 功能 |
|---|---|
| 🚀 部署 | 拖拽文件夹或 zip，浏览器内打包上传，自动触发部署 |
| 📦 版本管理 | 查看所有 zip，一键部署 / 回滚 / 下载 / 删除 |
| ⚡ 命令执行 | 填写 wrangler 命令，触发 `command.yml` |
| ☁ 拉取归档 | 输入 Worker 名称拉取代码，查看 builds/ 归档列表 |
| 📋 运行记录 | 实时查看 GitHub Actions 运行状态和完整日志 |

---

## 常见问题

**Q：为什么需要 PAT，不能用 GITHUB_TOKEN？**

A：GitHub 硬性限制，`GITHUB_TOKEN` 永远无法修改 `.github/workflows/` 目录，任何 `permissions` 设置均无效。`update-zip-list.yml` 需要写入 `deploy.yml`，因此必须使用 PAT。

**Q：`fetch.yml` 拉取的是 TypeScript 源码还是编译产物？**

A：Cloudflare 存储的是 esbuild bundle 后的单文件 JS，不是 TypeScript 源码。拉取后的 `src/` 目录中是 bundle 产物，体积较大属正常现象。

**Q：手动触发时下拉菜单没有新文件？**

A：`update-zip-list.yml` 在 push 后自动运行，通常需要几十秒。刚推送就立即触发手动部署时可能列表还未更新，稍等片刻再触发即可，或选择「自动选最新」选项。

**Q：`builds/` 目录下的归档会触发自动部署吗？**

A：不会。`auto-deploy.yml` 只监听根目录 `*.zip`（`paths: - '*.zip'`），`builds/*.zip` 不在监听范围内，fetch 归档不会意外触发自动部署。

**Q：Pages 项目如何部署？**

A：`wrangler.toml` 中填写 `pages_build_output_dir` 字段即可，deploy workflow 会自动识别并执行 `npm run build` + `wrangler pages deploy`。
