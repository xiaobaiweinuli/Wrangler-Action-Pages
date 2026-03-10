# CF Deploy — Cloudflare 部署控制台

通过浏览器直接将 Cloudflare Worker / Pages 项目部署到 Cloudflare，无需命令行，无需 Git 客户端。专为无法在本机运行 Wrangler CLI 的设备（如手机、ARM 设备）设计。

---

## 部署到 Cloudflare Workers

本项目基于 **Cloudflare Workers + Static Assets** 构建：

- `public/index.html`：静态页面，由 Cloudflare CDN 全球分发
- `worker.js`：代理层，将页面发出的 GitHub API 请求从 Cloudflare 节点转发，解决国内直连 GitHub API 不稳定的问题

### 文件结构

```
/
├── worker.js        ← Worker 入口（GitHub API 代理）
├── wrangler.toml    ← 部署配置
└── public/
    └── index.html   ← 静态页面
```

### 方式一：通过 Cloudflare Dashboard 连接 GitHub 自动部署（推荐）

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com) → **Workers & Pages → Create → Worker**
2. 选择「Connect to Git」，连接本仓库
3. 构建命令留空，部署命令填 `wrangler deploy`
4. 保存后每次推送自动部署，访问地址为 `https://cf-deploy.你的账户名.workers.dev`

### 方式二：通过 wrangler 命令手动部署

```bash
wrangler deploy
```

> 所有 GitHub API 请求均经由 Cloudflare 节点中转，国内无需任何代理即可正常使用。

---

## 使用前提

此网页是 **[cf-wrangler-actions](https://github.com/你的用户名/cf-wrangler-actions)** 的配套工具，需要目标仓库已按照该项目的 README 完成以下配置：

- 已添加 `CLOUDFLARE_API_TOKEN`、`CLOUDFLARE_ACCOUNT_ID`、`GH_WORKFLOW_TOKEN` 三个 Secret
- 仓库中已存在 `.github/workflows/deploy.yml`

---

## 快速开始

### 1. 创建 GitHub PAT

网页需要一个有权限读写目标仓库的 Personal Access Token。

1. 打开 [GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)](https://github.com/settings/tokens)
2. 点击 **Generate new token (classic)**
3. 勾选以下权限：
   - `repo`（读写仓库文件）
   - `workflow`（触发 Actions）
4. 生成后**立即复制**（只显示一次）

### 2. 连接仓库

打开网页后：

1. **仓库地址** 填写目标仓库，格式为 `owner/repo-name`
2. **GitHub PAT** 填写刚才创建的 Token
3. 点击「连接」，浏览器会弹出「是否保存密码」提示，建议保存——下次打开自动填充，无需重复输入

> PAT 由浏览器密码管理器加密保存，不写入 localStorage。

---

## 功能说明

### 🚀 部署

支持两种方式选择项目：

| 方式 | 说明 |
|---|---|
| 选择文件夹 | 在浏览器内自动打包为 zip，无需手动压缩 |
| 选择 ZIP 文件 | 直接使用已有的压缩包 |
| 拖放 ZIP 文件 | 将 zip 文件拖入上传区域 |

上传文件名默认取文件夹名或 zip 文件名，可手动修改。上传完成后自动触发仓库的 `deploy.yml`，无需任何额外操作。

**调试模式**：勾选后部署日志将完整输出到 Actions 页面，便于排查错误。

### 📦 版本管理

列出仓库根目录所有 `.zip` 文件，支持：

- **🚀 部署**：一键触发指定版本的部署（用于回滚）
- **🗑 删除**：删除不再需要的旧版本

### ⚡ 命令执行

直接在浏览器中触发 `wrangler` 命令，支持三种运行模式：

| 模式 | 说明 |
|---|---|
| `wrangler-command` | 只执行命令，不部署 |
| `deploy` | 只部署压缩包 |
| `all` | 先执行命令，再部署 |

命令每行一条，**必须以 `wrangler ` 开头**，例如：

```
wrangler d1 create my-database
wrangler vectorize create email-vectors --dimensions=768
wrangler r2 bucket create my-bucket
```

### 📋 运行记录

实时显示最近 8 次 `deploy.yml` 的运行状态（排队 / 运行中 / 成功 / 失败），有进行中的任务时每 8 秒自动刷新。点击右侧「↗」跳转到 GitHub Actions 页面查看完整日志。

---

## 多仓库使用

支持管理多个仓库：

- **历史列表**：仓库地址输入框会记录使用过的仓库，点击输入框弹出历史下拉，可一键切换
- **从 GitHub 获取**：点击「获取列表」按钮，用 PAT 拉取所有有权限的仓库列表
- **浏览器自动匹配**：以仓库地址作为「用户名」保存凭据，切换不同仓库时浏览器会自动填入对应的 PAT

---

## 注意事项

- GitHub API 单文件上传限制为 **100MB**，建议压缩包控制在 95MB 以内
- 文件夹选择功能（`webkitdirectory`）在 iOS Safari 上可能不支持，建议提前在电脑上打包好 zip 再上传
- PAT 的有效期到期后需重新生成并更新，否则连接会失败
