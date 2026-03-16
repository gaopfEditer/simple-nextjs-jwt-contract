import type { NextApiRequest, NextApiResponse } from 'next';
import http from 'http';

const PROXY_ERROR_LOG_INTERVAL_MS = 60000; // 同一类错误最多每分钟打一次
let lastProxyErrorLog = 0;
let lastProxyErrorMessage = '';

/**
 * 获取 openclaw 会话列表（代理到 server.js 的 GET /api/openclaw/clients）
 * 避免请求被 Next 当作页面返回 HTML
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const port = 3123;
  return new Promise<void>((resolve) => {
    const request = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path: '/api/openclaw/clients',
        method: 'GET',
        timeout: 5000,
      },
      (response) => {
        let body = '';
        response.on('data', (chunk) => (body += chunk));
        response.on('end', () => {
          res.setHeader('Content-Type', 'application/json');
          res.status(response.statusCode || 200).send(body || '{"success":true,"clients":[]}');
          resolve();
        });
      }
    );
    request.on('error', (err) => {
      const now = Date.now();
      if (now - lastProxyErrorLog >= PROXY_ERROR_LOG_INTERVAL_MS || err.message !== lastProxyErrorMessage) {
        console.warn('[OpenClaw API] 代理 GET /clients 失败:', err.message, '（请使用 npm run dev 启动，确保 node server.js 监听 3123）');
        lastProxyErrorLog = now;
        lastProxyErrorMessage = err.message;
      }
      res.status(200).json({ success: true, clients: [], _proxyError: err.message });
      resolve();
    });
    request.on('timeout', () => {
      request.destroy();
      const msg = 'timeout';
      const now = Date.now();
      if (now - lastProxyErrorLog >= PROXY_ERROR_LOG_INTERVAL_MS || msg !== lastProxyErrorMessage) {
        console.warn('[OpenClaw API] 代理 GET /clients 超时');
        lastProxyErrorLog = now;
        lastProxyErrorMessage = msg;
      }
      res.status(200).json({ success: true, clients: [], _proxyError: msg });
      resolve();
    });
    request.end();
  });
}
