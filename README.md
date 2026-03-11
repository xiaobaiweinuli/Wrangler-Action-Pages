# CF Deploy — Cloudflare 部署控制台

通过浏览器直接将 Cloudflare Worker / Pages 项目部署到 Cloudflare，无需命令行，无需 Git 客户端。专为无法在本机运行 Wrangler CLI 的设备（如手机、ARM 设备）设计。

---

## 项目结构

本项目基于 **Cloudflare Workers + Static Assets** 构建，所有 GitHub API 请求和文件下载均经由 Cloudflare 节点代理，国内无需任何代理即可正常使用。

```
/
├── worker.js        ← Worker 入口（GitHub API + 文件下载代理）
├── wrangler.toml    ← 部署配置
└── public/
    └── index.html   ← 静态页面（Cloudflare CDN 分发）
```

**Worker 代理路由：**

| 路径 | 代理目标 | 用途 |
|---|---|---|
| `/api/github/*` | `api.github.com/*` | GitHub API |
| `/api/raw/*` | `raw.githubusercontent.com/*` | zip 文件下载 |

---

## 部署此控制台

### 方式一：Cloudflare Dashboard 连接 GitHub（推荐）

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com) → **Workers & Pages → Create → Worker**
2. 选择「Connect to Git」，连接本仓库
3. 构建命令留空，部署命令填 `wrangler deploy`
4. 保存后每次推送自动部署

### 方式二：wrangler 命令手动部署

```bash
wrangler deploy
```

---

## 使用前提

此网页是 [**Wrangler-Action**](.github/workflows/deploy.yml)的配套工具，需要目标仓库已完成以下配置

- 已添加 `CLOUDFLARE_API_TOKEN`、`CLOUDFLARE_ACCOUNT_ID`、`GH_WORKFLOW_TOKEN` 三个 Secret
- 仓库中已存在 `.github/workflows/deploy.yml`

---

## 快速开始

### 1. 创建 GitHub PAT

1. 打开 [GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)](https://github.com/settings/tokens)
2. 点击 **Generate new token (classic)**
3. 勾选权限：`repo`（读写仓库文件）+ `workflow`（触发 Actions）
4. 生成后**立即复制**（只显示一次）

### 2. 连接仓库

打开网页后：

1. **仓库地址** 填写 `owner/repo-name` 格式（点「获取列表」可从 GitHub 拉取仓库下拉）
2. **GitHub PAT** 填写 Token（点击眼睛图标可显示 / 隐藏）
3. 点击「连接」，建议在浏览器弹出「保存密码」时保存，下次打开自动填充

> PAT 由浏览器密码管理器加密保存，不写入 localStorage。  
> 刷新页面自动恢复连接状态和上次所在的 Tab，关闭标签页后会话自动清除。

---

## 功能说明

### 🚀 部署

支持三种方式选择项目文件：

| 方式 | 支持环境 | 说明 |
|---|---|---|
| 选择文件夹 | 桌面 Chrome/Edge、Android Chrome 132+ | 浏览器内递归打包，完整保留子目录结构 |
| 选择多个文件 | 全平台降级 | 无子目录，适合 iOS / 旧版 Android |
| 选择 ZIP 文件 | 全平台 | 直接使用已有压缩包 |
| 拖放 ZIP 文件 | 桌面 | 拖入上传区域 |

上传文件名默认取文件夹名或 zip 文件名，可手动修改。上传完成后自动触发 `deploy.yml` 并轮询进度（最多 2 分钟），完成后 toast 通知结果。

**调试模式**：勾选后 Wrangler 完整日志输出到 GitHub Actions，部署出错时建议开启。

### 📦 版本管理

列出仓库根目录所有 `.zip` 文件，每条记录支持：

- **🚀 部署**：一键触发该版本部署（用于回滚），可独立开启调试模式
- **⬇ 下载**：经 Cloudflare Worker 代理下载，国内可正常访问
- **🗑 删除**：删除不再需要的旧版本

### ⚡ 命令执行

在浏览器中触发任意 `wrangler` 命令，支持三种运行模式：

| 模式 | 说明 |
|---|---|
| `wrangler-command` | 只执行命令，不部署 |
| `deploy` | 只部署压缩包 |
| `all` | 先执行命令，再部署 |

命令每行一条，**必须以 `wrangler ` 开头**，输入框实时校验并高亮错误行。例如：

```
wrangler d1 create my-database
wrangler vectorize create email-vectors --dimensions=768
wrangler r2 bucket create my-bucket
```

### 📋 运行记录

显示最近 8 次 `deploy.yml` 的运行状态。触发部署后自动轮询（每 5 秒，最多 2 分钟），完成后 toast 通知成功或失败。

**内联日志查看**：点击「📄 日志」在页面内查看完整日志，无需跳转 GitHub：

- 自动优先展示失败的 Job（便于快速定位错误）
- 支持关键字搜索与高亮，↑↓ 按钮逐条跳转
- 一键复制全文
- 日志已本地缓存，关闭后再次打开无需重新请求

---

## 多仓库使用

- **历史下拉**：仓库地址输入框记录最近 10 个仓库，点击弹出下拉一键切换
- **从 GitHub 获取**：点击「获取列表」用 PAT 拉取所有可访问的仓库
- **浏览器自动匹配**：以仓库地址作为用户名保存凭据，切换仓库时浏览器自动填入对应 PAT

---

## 注意事项

- GitHub API 单文件上传限制 **100MB**，建议压缩包控制在 95MB 以内
- iOS Safari 不支持选择文件夹，建议提前打包好 zip 再上传
- PAT 到期后需重新生成并重新连接