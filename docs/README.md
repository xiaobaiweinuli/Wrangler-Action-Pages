# Cloudflare Wrangler GitHub Action 部署方案

通过 GitHub Actions 将 Cloudflare Workers / Pages 项目部署到 Cloudflare，解决 Wrangler CLI 不兼容 AArch64 架构（手机、部分 ARM 设备）的问题。

## 目录结构

```
仓库根目录/
├── .github/
│   └── workflows/
│       ├── deploy.yml            # 主部署 workflow
│       └── update-zip-list.yml   # 自动维护压缩包下拉列表
├── your-worker.zip               # 上传你的项目压缩包（任意名称）
└── README.md
```

---

## 快速开始

### 第一步：配置 Secrets

在 GitHub 仓库页面进入 **Settings → Secrets and variables → Actions**，添加以下 Secret：

| Secret 名称 | 是否必填 | 说明 |
|---|---|---|
| `CLOUDFLARE_API_TOKEN` | ✅ 必填 | Cloudflare API Token |
| `CLOUDFLARE_ACCOUNT_ID` | ✅ 必填 | Cloudflare 账户 ID |
| `GH_WORKFLOW_TOKEN` | ✅ 必填 | 带 `workflow` 权限的 GitHub PAT |

**获取 Cloudflare API Token：**

1. 进入 [Cloudflare Dashboard → API Tokens](https://dash.cloudflare.com/?to=/:account/api-tokens)
2. 点击 **Create Token** → 选择 **Edit Cloudflare Workers** 模板
3. 限定 Token 的账户和区域范围（建议最小权限原则）
4. 复制生成的 Token 填入 Secret

**获取 Cloudflare Account ID：**

登录 Cloudflare Dashboard，右侧栏「Account ID」即为所需值。

**创建 GH_WORKFLOW_TOKEN（必须）：**

> **为什么需要 PAT？** 这是 GitHub 的硬性安全限制：Actions 自动生成的 `GITHUB_TOKEN` 永远无法修改 `.github/workflows/` 目录下的文件，任何 `permissions` 设置都无效。`update-zip-list.yml` 需要更新 `deploy.yml` 的下拉选项，因此必须使用带 `workflow` 权限的个人 PAT。

1. 进入 [GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)](https://github.com/settings/tokens)
2. 点击 **Generate new token (classic)**
3. **Select scopes** 中勾选 **`workflow`**（会自动同时勾选 `repo`）
4. 设置合适的过期时间（建议 1 年，到期前记得更新）
5. 点击 **Generate token**，立即复制 token 值（只显示一次）
6. 将 token 值填入仓库 Secret **`GH_WORKFLOW_TOKEN`**

### 第二步：准备项目压缩包

将你的 Cloudflare 项目打包成 `.zip` 文件。压缩包解压后根层必须包含 `wrangler.toml`：

```
your-project.zip
├── wrangler.toml   ← 必须在根层
├── src/
│   └── index.js
├── package.json
└── ...
```

### 第三步：上传压缩包触发部署

将 `.zip` 文件推送到仓库根目录，两个 Action 会自动并行运行：

- **`deploy.yml`**：自动选择最新压缩包 → 解压 → 检测项目类型 → 安装依赖 → 部署
- **`update-zip-list.yml`**：扫描所有压缩包 → 更新手动触发的下拉菜单选项

---

## 使用说明

### 自动部署（推送触发）

每次向仓库根目录推送 `.zip` 文件时自动触发，**全程静默运行**，不输出任何 Wrangler 日志。部署结果只显示：

```
✅ 部署成功
```

或

```
❌ 部署失败（退出码：1）
💡 提示：勾选「调试模式」重新运行可查看详细错误日志
```

---

### 手动触发（完整选项）

进入仓库 **Actions → 🚀 部署到 Cloudflare → Run workflow**，有以下输入项：

#### 运行模式（必选）

| 模式 | 说明 |
|---|---|
| `deploy` | 只部署压缩包（默认）|
| `wrangler-command` | 只执行 wrangler 命令，不部署压缩包 |
| `all` | 先执行 wrangler 命令，再部署压缩包 |

#### 选择压缩包（`deploy` / `all` 模式有效）

下拉菜单列出仓库中所有压缩包，由 `update-zip-list.yml` 自动维护。不选则默认部署最新压缩包：

```
[deploy/all] 选择压缩包:
  ● 自动选最新        ← 默认
  ○ worker-v2.zip
  ○ worker-v1.zip
```

#### 自定义命令（`wrangler-command` / `all` 模式有效）

在输入框中填写完整的 wrangler 命令，**每行一条，且每条命令必须以 `wrangler ` 开头**（安全校验，不符合格式会直接报错退出）：

```
wrangler d1 create email-monitor-db
wrangler vectorize create email-vectors --dimensions=768
wrangler r2 bucket create my-bucket
```

空行和 `#` 开头的注释行会自动跳过。任意一条命令失败都会报错，并显示是第几条命令出了问题。

#### 调试模式（所有模式有效）

勾选后，Wrangler 的完整输出日志（包括详细错误、部署地址等）将显示在 Actions 页面。自定义命令的输出**无论是否勾选调试模式都会显示**（命令执行结果需要可见才有意义）。

---

## 项目类型自动识别

Action 会自动读取 `wrangler.toml` 判断项目类型，无需手动配置：

### Workers 项目

`wrangler.toml` 中**不含** `pages_build_output_dir` 字段：

```toml
name = "my-worker"
main = "src/index.js"
compatibility_date = "2024-01-01"
```

执行流程：`npm install（如有）` → `wrangler deploy`

### Pages 项目

`wrangler.toml` 中**含有** `pages_build_output_dir` 字段：

```toml
name = "my-pages-site"          # ← 必须填写
pages_build_output_dir = "dist"  # ← 必须填写
```

执行流程：`npm install` → `npm run build（如有 build script）` → `wrangler pages deploy dist --project-name=my-pages-site`

> ⚠️ Pages 项目必须在 `wrangler.toml` 中填写 `name` 字段，否则部署会报错提示。

---

## 两个 Workflow 的关系说明

推送 zip 文件时，两个 workflow **完全并行运行，互不依赖**：

```
push *.zip
  ├── deploy.yml         → 直接扫描文件系统找最新 zip → 部署
  └── update-zip-list.yml → 更新 deploy.yml 的 options 列表
                             （供下一次手动触发时的下拉菜单使用）
```

- `deploy.yml` 的**自动部署**直接扫描根目录文件，不依赖 options 列表
- `update-zip-list.yml` 只修改 `.github/workflows/deploy.yml`，该路径不在 `*.zip` 监听范围内，不会循环触发
- 两者同时失败互不影响对方

---

## 常见问题

**Q：为什么静默模式下部署失败只显示退出码，没有具体原因？**

A：静默模式将 Wrangler 所有输出重定向到 `/dev/null`，防止日志泄露部署地址、Token 相关信息。开启调试模式重跑即可看到完整错误。

**Q：`wrangler-command` 模式的命令怎么填写？**

A：每行填写一条完整的 wrangler 命令，且必须以 `wrangler ` 开头，否则会被安全校验拦截。例如 `wrangler d1 create my-db`、`wrangler vectorize create email-vectors --dimensions=768`。

**Q：`wrangler-command` 模式和 `all` 模式的命令在哪个目录下执行？**

A：统一在仓库根目录执行，不在解压后的项目目录内。这对 `d1 create`、`vectorize create` 等管理类命令没有影响，因为这些命令不依赖项目文件。

**Q：`all` 模式下命令执行失败，还会继续部署吗？**

A：不会。`all` 模式先执行命令步骤，命令失败后整个 workflow 会报错退出，不会进入后续的部署步骤。

**Q：`update-zip-list.yml` 的 commit 会再次触发 `deploy.yml` 吗？**

A：不会。`deploy.yml` 只监听根目录 `*.zip` 文件变更，而 `update-zip-list.yml` 修改的是 `.github/workflows/deploy.yml`，路径不匹配，不会触发。

**Q：手动触发时下拉菜单没有我新上传的压缩包？**

A：`update-zip-list.yml` 在 push zip 后自动更新列表，通常几十秒内完成。如果刚推送就立即手动触发，可能列表还未更新。稍等片刻后再手动触发即可看到新文件。

**Q：可以保留多个版本的压缩包用于回滚吗？**

A：可以。仓库根目录的所有 zip 文件都会出现在手动触发的下拉菜单中，选择旧版本压缩包手动触发即可回滚。

**Q：Pages 项目报错「缺少 name 字段」？**

A：请在项目的 `wrangler.toml` 中添加 `name = "你的项目名"`，该名称需与 Cloudflare Dashboard 中的 Pages 项目名一致。
