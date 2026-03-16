import type { NextApiRequest, NextApiResponse } from 'next';
import http from 'http';

/**
 * 向指定 openclaw 客户端下发消息（代理到 server.js 的 POST /api/openclaw/send）
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const port = parseInt(process.env.PORT || '3123', 10);
  const body = JSON.stringify(req.body || {});
  return new Promise<void>((resolve) => {
    const request = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path: '/api/openclaw/send',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body, 'utf8'),
        },
        timeout: 5000,
      },
      (response) => {
        let data = '';
        response.on('data', (chunk) => (data += chunk));
        response.on('end', () => {
          res.setHeader('Content-Type', 'application/json');
          res.status(response.statusCode || 200).send(data || '{"success":false,"sent":false}');
          resolve();
        });
      }
    );
    request.on('error', (err) => {
      res.status(502).json({ success: false, sent: false, error: err.message });
      resolve();
    });
    request.on('timeout', () => {
      request.destroy();
      res.status(504).json({ success: false, sent: false, error: 'timeout' });
      resolve();
    });
    request.write(body);
    request.end();
  });
}
