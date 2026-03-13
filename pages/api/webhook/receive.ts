import type { NextApiRequest, NextApiResponse } from 'next';
import { createMessage } from '@/lib/messages';
import http from 'http';

/**
 * 通用 Webhook 接收接口
 *
 * POST /api/webhook/receive
 * Body: { signature: string, source: string, data: object }
 * - signature: 签名（可选，用于校验）
 * - source: 来源标识
 * - data: JSON 数据，任意结构
 *
 * 当 source 为 whisper 时，会创建消息并像 TradingView 一样转发给 WebSocket 客户端。
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
    const body = req.body;
    if (!body || typeof body !== 'object') {
      return res.status(400).json({
        error: 'Bad request',
        message: '请求体必须为 JSON 对象'
      });
    }

    const signature = body.signature;
    const source = body.source;
    const data = body.data;

    // 仅做基本结构校验，data 可为任意 JSON
    if (source === undefined || source === null) {
      return res.status(400).json({
        error: 'Bad request',
        message: '缺少 source 字段'
      });
    }

    const sourceStr = String(source);

    if (process.env.NODE_ENV === 'development') {
      console.log('[Webhook] 收到:', { signature, source: sourceStr, data });
    }

    // source 为 whisper 时：创建消息并转发给 WebSocket
    if (sourceStr.toLowerCase() === 'whisper') {
      const dataObj = data && typeof data === 'object' ? data : {};
      let content: string =
        (dataObj.content ?? dataObj.text ?? dataObj.message) ??
        (typeof data === 'string' ? data : JSON.stringify(dataObj || {}));
      if (typeof content !== 'string') content = JSON.stringify(content);
      if (!content.trim()) content = JSON.stringify(dataObj || {});
      const title = dataObj.title ?? 'Whisper';

      const ip_address =
        (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
        (req.headers['x-real-ip'] as string) ||
        req.socket.remoteAddress ||
        undefined;

      const savedMessage = await createMessage({
        source: 'whisper',
        source_id: `whisper_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        type: dataObj.type ?? 'text',
        title: String(title),
        content: typeof content === 'string' ? content : JSON.stringify(content),
        metadata: { signature: signature ?? null, raw: dataObj },
        sender: dataObj.sender ?? 'Whisper',
        sender_id: dataObj.sender_id ?? 'whisper_webhook',
        ip_address,
        status: 'received'
      });

      // 异步触发转发，不阻塞响应
      const port = parseInt(process.env.PORT || '3123', 10);
      const messageData = JSON.stringify({
        id: savedMessage.id,
        source: savedMessage.source,
        source_id: savedMessage.source_id,
        type: savedMessage.type,
        title: savedMessage.title,
        content: savedMessage.content,
        metadata: savedMessage.metadata,
        sender: savedMessage.sender,
        sender_id: savedMessage.sender_id,
        created_at: savedMessage.created_at
      });

      const forwardOptions = {
        hostname: 'localhost',
        port,
        path: '/api/messages/forward',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(messageData, 'utf8')
        },
        timeout: 2000
      };

      const forwardReq = http.request(forwardOptions, () => {});
      forwardReq.on('error', (err) => {
        if (process.env.NODE_ENV === 'development') {
          console.log('[Webhook Whisper] 转发失败:', err.message);
        }
      });
      forwardReq.on('timeout', () => forwardReq.destroy());
      forwardReq.write(messageData);
      forwardReq.end();

      return res.status(200).json({
        success: true,
        message: '已接收并转发',
        received: {
          signature: signature ?? null,
          source: sourceStr,
          data: data ?? null
        },
        messageId: savedMessage.id
      });
    }

    return res.status(200).json({
      success: true,
      message: '已接收',
      received: {
        signature: signature ?? null,
        source: sourceStr,
        data: data ?? null
      }
    });
  } catch (error: unknown) {
    console.error('[Webhook] 错误:', error);
    const message = error instanceof Error ? error.message : '服务器内部错误';
    return res.status(500).json({
      error: 'Internal server error',
      message
    });
  }
}
