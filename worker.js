/**
 * CF Deploy — Cloudflare Worker 入口
 *
 * 路由规则：
 *   /api/github/*  → 代理到 https://api.github.com/*
 *   其他请求       → 由 [assets] 处理（返回 public/index.html）
 *
 * 代理行为：
 *   - 原封不动转发请求方法、请求体、Authorization / Content-Type 头
 *   - 去掉浏览器专有头（Host / Origin / Referer），避免 GitHub API 拒绝
 *   - 原封不动返回 GitHub API 的响应状态码和响应体
 *   - 附加 CORS 头，允许同源页面调用
 */

const GITHUB_API = 'https://api.github.com';
const API_PREFIX = '/api/github';

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

    // ── 非代理路径：交给静态资源处理 ──────────────────────
    if (!url.pathname.startsWith(API_PREFIX)) {
      return env.ASSETS.fetch(request);
    }

    // ── 代理路径：/api/github/xxx → api.github.com/xxx ───
    const githubPath = url.pathname.slice(API_PREFIX.length) || '/';
    const githubUrl  = GITHUB_API + githubPath + url.search;

    // 只转发安全头，丢弃 Host / Origin / Referer 等浏览器头
    const forwardHeaders = new Headers();
    for (const key of FORWARD_HEADERS) {
      const val = request.headers.get(key);
      if (val) forwardHeaders.set(key, val);
    }
    // GitHub API 要求 User-Agent
    forwardHeaders.set('User-Agent', 'CF-Deploy-Proxy/1.0');

    // 转发请求到 GitHub API
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

    // 回传 GitHub 响应，附加 CORS 头
    // 透传原始 Content-Type（日志接口返回 text/plain，不能强制覆盖为 JSON）
    const originCT = githubRes.headers.get('content-type') || 'application/json';
    const resHeaders = corsHeaders(originCT);
    // 保留分页相关头（Link）
    const link = githubRes.headers.get('link');
    if (link) resHeaders.set('link', link);

    return new Response(githubRes.body, {
      status:  githubRes.status,
      headers: resHeaders,
    });
  },
};

// 构建带 CORS 的响应头
function corsHeaders(contentType) {
  return new Headers({
    'content-type':                contentType,
    'access-control-allow-origin': '*',
    'access-control-allow-methods':'GET, POST, PUT, DELETE, PATCH, OPTIONS',
    'access-control-allow-headers':'Authorization, Content-Type, Accept, X-GitHub-Api-Version',
  });
}
