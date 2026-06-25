import type { NextApiRequest, NextApiResponse } from 'next';
import http from 'http';

/**
 * Deal-Video API
 *
 * 调用时携带视频 URL，通过 WebSocket 通知所有 type=deal-video 的客户端。
 *
 * POST /api/deal-video/receive
 * Body: { videoUrl: string, meta?: object }
 * 或 Query: ?videoUrl=https://...
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed',
      message: '只支持 POST 请求',
    });
  }

  try {
    const queryUrl = typeof req.query.videoUrl === 'string' ? req.query.videoUrl : null;
    const videoUrl =
      req.body?.videoUrl ??
      req.body?.video_url ??
      req.body?.url ??
      queryUrl;

    if (!videoUrl || typeof videoUrl !== 'string' || !videoUrl.trim()) {
      return res.status(400).json({
        error: 'Bad request',
        message: '缺少 videoUrl 参数，请提供视频地址',
      });
    }

    const port = parseInt(process.env.PORT || '3123', 10);
    const forwardData = JSON.stringify({
      videoUrl: videoUrl.trim(),
      type: 'deal-video',
      meta: req.body?.meta ?? null,
    });

    const forwardResult = await new Promise<{ forwardedCount: number; success: boolean }>(
      (resolve, reject) => {
        const forwardReq = http.request(
          {
            hostname: '127.0.0.1',
            port,
            path: '/api/deal-video/forward',
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(forwardData, 'utf8'),
            },
            timeout: 5000,
          },
          (forwardRes) => {
            let body = '';
            forwardRes.on('data', (chunk) => {
              body += chunk.toString();
            });
            forwardRes.on('end', () => {
              try {
                const data = body ? JSON.parse(body) : {};
                resolve({
                  success: data.success === true,
                  forwardedCount: data.forwardedCount ?? 0,
                });
              } catch {
                resolve({ success: forwardRes.statusCode === 200, forwardedCount: 0 });
              }
            });
          }
        );

        forwardReq.on('error', reject);
        forwardReq.on('timeout', () => {
          forwardReq.destroy();
          reject(new Error('Request timeout'));
        });
        forwardReq.write(forwardData);
        forwardReq.end();
      }
    );

    return res.status(200).json({
      success: true,
      message: '视频任务已转发给 deal-video 客户端',
      data: {
        videoUrl: videoUrl.trim(),
        forwardedCount: forwardResult.forwardedCount,
      },
    });
  } catch (error: unknown) {
    console.error('[Deal-Video API] 错误:', error);
    const message = error instanceof Error ? error.message : '服务器内部错误';
    return res.status(500).json({
      error: 'Internal server error',
      message,
    });
  }
}
