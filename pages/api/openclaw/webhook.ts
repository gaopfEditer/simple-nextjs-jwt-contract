import type { NextApiRequest, NextApiResponse } from 'next';
import http from 'http';

/**
 * OpenClaw Webhook API
 * 
 * 当角色流程中每个角色完成时调用此接口，
 * 将下一个角色名称通过 WebSocket 转发给 type=openclaw 的连接，以继续流程。
 * 
 * POST /api/openclaw/webhook?type=openclaw
 * 或 POST /api/openclaw/webhook
 * Body: { nextRole: string, type?: string }
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed',
      message: '只支持 POST 请求'
    });
  }

  try {
    const queryType = typeof req.query.type === 'string' ? req.query.type : null;
    const targetType = queryType || req.body?.type || 'openclaw';
    const nextRole = req.body?.nextRole ?? req.body?.next_role ?? req.body?.role;

    if (!nextRole || typeof nextRole !== 'string') {
      return res.status(400).json({
        error: 'Bad request',
        message: '缺少 nextRole 参数，请提供下一个角色名称'
      });
    }

    const port = parseInt(process.env.PORT || '3123', 10);
    const forwardData = JSON.stringify({
      nextRole: nextRole.trim(),
      type: targetType
    });

    const forwardOptions = {
      hostname: 'localhost',
      port,
      path: '/api/openclaw/forward',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(forwardData, 'utf8')
      },
      timeout: 5000
    };

    const forwardResult = await new Promise<{ forwardedCount: number; success: boolean }>((resolve, reject) => {
      const forwardReq = http.request(forwardOptions, (forwardRes) => {
        let body = '';
        forwardRes.on('data', (chunk) => { body += chunk.toString(); });
        forwardRes.on('end', () => {
          try {
            const data = body ? JSON.parse(body) : {};
            resolve({
              success: data.success === true,
              forwardedCount: data.forwardedCount ?? 0
            });
          } catch {
            resolve({ success: forwardRes.statusCode === 200, forwardedCount: 0 });
          }
        });
      });

      forwardReq.on('error', reject);
      forwardReq.on('timeout', () => {
        forwardReq.destroy();
        reject(new Error('Request timeout'));
      });
      forwardReq.write(forwardData);
      forwardReq.end();
    });

    return res.status(200).json({
      success: true,
      message: 'Webhook 已处理，下一个角色已转发给 OpenClaw',
      data: {
        nextRole: nextRole.trim(),
        type: targetType,
        forwardedCount: forwardResult.forwardedCount
      }
    });
  } catch (error: unknown) {
    console.error('[OpenClaw Webhook] 错误:', error);
    const message = error instanceof Error ? error.message : '服务器内部错误';
    return res.status(500).json({
      error: 'Internal server error',
      message
    });
  }
}
