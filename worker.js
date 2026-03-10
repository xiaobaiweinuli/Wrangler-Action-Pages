/**
 * CF Deploy — Cloudflare Worker 入口
 *
 * 路由规则：
 *   /api/github/*  → 代理到 https://api.github.com/*
 *   /api/raw/*     → 代理到 https://raw.githubusercontent.com/*（文件下载）
 *   其他请求       → 由 [assets] 处理（返回 public/index.html）
 *
 * 代理行为：
 *   - 原封不动转发请求方法、请求体、Authorization / Content-Type 头
 *   - 去掉浏览器专有头（Host / Origin / Referer），避免 GitHub 拒绝
 *   - 原封不动返回响应状态码和响应体（流式透传，不缓冲）
 *   - 附加 CORS 头，允许同源页面调用
 */

const GITHUB_API  = 'https://api.github.com';
const GITHUB_RAW  = 'https://raw.githubusercontent.com';
const API_PREFIX  = '/api/github';
const RAW_PREFIX  = '/api/raw';

// 转发时保留的请求头白名单
const FORWARD_HEADERS = [
  'authorization',
  'content-type',
  'accept',
  'x-github-api-version',
];

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // ── /api/github/* → api.github.com/* ─────────────────
    if (url.pathname.startsWith(API_PREFIX)) {
      return proxyGithubApi(request, url);
    }

    // ── /api/raw/* → raw.githubusercontent.com/* ─────────
    if (url.pathname.startsWith(RAW_PREFIX)) {
      return proxyRawDownload(request, url);
    }

    // ── 其他：静态资源 ─────────────────────────────────────
    return env.ASSETS.fetch(request);
  },
};

// ── GitHub API 代理 ───────────────────────────────────────
async function proxyGithubApi(request, url) {
  const githubPath = url.pathname.slice(API_PREFIX.length) || '/';
  const githubUrl  = GITHUB_API + githubPath + url.search;

  const forwardHeaders = buildForwardHeaders(request);
  forwardHeaders.set('User-Agent', 'CF-Deploy-Proxy/1.0');

  let githubRes;
  try {
    githubRes = await fetch(githubUrl, {
      method:  request.method,
      headers: forwardHeaders,
      body:    ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ message: '代理请求失败：' + e.message }),
      { status: 502, headers: corsHeaders('application/json') }
    );
  }

  const originCT   = githubRes.headers.get('content-type') || 'application/json';
  const resHeaders = corsHeaders(originCT);
  const link = githubRes.headers.get('link');
  if (link) resHeaders.set('link', link);

  return new Response(githubRes.body, {
    status:  githubRes.status,
    headers: resHeaders,
  });
}

// ── raw.githubusercontent.com 下载代理 ────────────────────
// 路径格式：/api/raw/{owner}/{repo}/{branch}/{filename}
// 对应：raw.githubusercontent.com/{owner}/{repo}/{branch}/{filename}
async function proxyRawDownload(request, url) {
  const rawPath   = url.pathname.slice(RAW_PREFIX.length) || '/';
  const rawUrl    = GITHUB_RAW + rawPath;
  // 从路径末尾提取文件名（用于 Content-Disposition）
  const filename  = rawPath.split('/').pop() || 'download';

  const forwardHeaders = buildForwardHeaders(request);
  forwardHeaders.set('User-Agent', 'CF-Deploy-Proxy/1.0');

  let rawRes;
  try {
    rawRes = await fetch(rawUrl, {
      method:  'GET',
      headers: forwardHeaders,
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ message: '下载代理失败：' + e.message }),
      { status: 502, headers: corsHeaders('application/json') }
    );
  }

  if (!rawRes.ok) {
    return new Response(
      JSON.stringify({ message: 'GitHub 返回 ' + rawRes.status }),
      { status: rawRes.status, headers: corsHeaders('application/json') }
    );
  }

  const contentType = rawRes.headers.get('content-type') || 'application/zip';
  const resHeaders  = new Headers({
    'content-type':                contentType,
    'content-disposition':         'attachment; filename="' + encodeURIComponent(filename) + '"',
    'access-control-allow-origin': '*',
  });
  // 透传文件大小（浏览器可显示进度）
  const cl = rawRes.headers.get('content-length');
  if (cl) resHeaders.set('content-length', cl);

  // 流式透传，不在 Worker 内存中缓冲
  return new Response(rawRes.body, {
    status:  200,
    headers: resHeaders,
  });
}

// ── 工具：构建转发头 ──────────────────────────────────────
function buildForwardHeaders(request) {
  const headers = new Headers();
  for (const key of FORWARD_HEADERS) {
    const val = request.headers.get(key);
    if (val) headers.set(key, val);
  }
  return headers;
}

// ── 工具：CORS 响应头 ─────────────────────────────────────
function corsHeaders(contentType) {
  return new Headers({
    'content-type':                contentType,
    'access-control-allow-origin': '*',
    'access-control-allow-methods':'GET, POST, PUT, DELETE, PATCH, OPTIONS',
    'access-control-allow-headers':'Authorization, Content-Type, Accept, X-GitHub-Api-Version',
  });
}
