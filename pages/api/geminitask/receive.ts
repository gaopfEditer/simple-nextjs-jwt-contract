import type { NextApiRequest, NextApiResponse } from 'next';
import { createMessage } from '@/lib/messages';
import { logApiRequest, logApiResponse } from '@/lib/api-logger';
import http from 'http';

/**
 * Gemini Task 消息体结构
 */
interface GeminiTaskMessage {
  title?: string;
  content: string;
  sender?: string;
  metadata?: {
    ticker?: string;
    type?: string;
    time?: string;
    sentiment?: string;
    liquidation_vol?: string;
    short_ratio?: string;
    [key: string]: any;
  };
}

/**
 * Gemini Task API 请求体结构
 */
interface GeminiTaskRequest extends NextApiRequest {
  body: {
    type?: string;
    source?: string;
    message: GeminiTaskMessage;
  };
}

/**
 * Gemini Task 消息接收API
 * 用于接收来自 Gemini 量化分析任务推送的消息
 *
 * POST /api/geminitask/receive
 *
 * 请求格式:
 * {
 *   "type": "message_received",
 *   "source": "Gemini_Quant_Analyst",
 *   "message": {
 *     "title": "BTC/ETH 每日深度分析 (08:00)",
 *     "content": "这里是分析报告的正文内容...",
 *     "sender": "Gemini_AI",
 *     "metadata": {
 *       "ticker": "BTC/ETH",
 *       "type": "Macro_Analysis",
 *       "time": "2026-03-01 08:00:00",
 *       "sentiment": "Neutral/Bullish",
 *       "liquidation_vol": "400M",
 *       "short_ratio": "70%"
 *     }
 *   }
 * }
 */
export default async function handler(
  req: GeminiTaskRequest,
  res: NextApiResponse
) {
  console.log('=== Gemini Task API 收到请求 ===');
  console.log('Method:', req.method);
  console.log('URL:', req.url);

  if (req.method !== 'POST') {
    const errorResponse = {
      error: 'Method not allowed',
      message: '只支持POST请求',
    };
    logApiResponse('/api/geminitask/receive', 405, errorResponse);
    return res.status(405).json(errorResponse);
  }

  logApiRequest(req, '/api/geminitask/receive', {
    logBody: true,
    logHeaders: false,
    logQuery: true,
  });

  try {
    if (!req.body) {
      const errorResponse = {
        error: 'Bad request',
        message: '请求体不能为空',
      };
      logApiResponse('/api/geminitask/receive', 400, errorResponse);
      return res.status(400).json(errorResponse);
    }

    const body = typeof req.body === 'object' ? req.body : JSON.parse(String(req.body));
    const { type, source: requestSource, message: msg } = body;

    if (!msg || typeof msg !== 'object') {
      const errorResponse = {
        error: 'Bad request',
        message: '缺少 message 字段或格式错误',
        received: body,
      };
      logApiResponse('/api/geminitask/receive', 400, errorResponse);
      return res.status(400).json(errorResponse);
    }

    const { title, content, sender, metadata } = msg;

    if (!content || typeof content !== 'string') {
      const errorResponse = {
        error: 'Bad request',
        message: 'message.content 不能为空且必须是字符串',
        received: msg,
      };
      logApiResponse('/api/geminitask/receive', 400, errorResponse);
      return res.status(400).json(errorResponse);
    }

    const metadataObj = metadata && typeof metadata === 'object' ? metadata : {};
    const ticker = metadataObj.ticker || 'unknown';
    const signalType = metadataObj.type || 'Macro_Analysis';
    const time = metadataObj.time || new Date().toISOString();

    const sourceId = `${ticker}_${time}_${signalType}`.replace(/\s/g, '_');

    const ipAddress =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      (req.headers['x-real-ip'] as string) ||
      req.socket?.remoteAddress ||
      undefined;

    let savedMessage;
    try {
      savedMessage = await createMessage({
        source: 'geminitask',
        source_id: sourceId,
        type: signalType,
        title: title || `${ticker} ${signalType}`,
        content,
        metadata: { ...metadataObj, request_source: requestSource || 'Gemini_Quant_Analyst' },
        sender: sender || 'Gemini_AI',
        sender_id: 'geminitask',
        ip_address: ipAddress,
        status: 'received',
      });

      console.log('[Gemini Task] 消息创建成功', {
        id: savedMessage.id,
        source: savedMessage.source,
        type: savedMessage.type,
        created_at: savedMessage.created_at,
      });
    } catch (dbError: any) {
      console.error('[Gemini Task] 消息创建失败', {
        error: dbError.message,
        ticker,
        type: signalType,
      });

      const errorResponse = {
        error: 'Database error',
        message: '保存消息到数据库失败',
        details: process.env.NODE_ENV === 'development' ? dbError.message : undefined,
      };
      logApiResponse('/api/geminitask/receive', 500, errorResponse);
      return res.status(500).json(errorResponse);
    }

    if (!savedMessage || !savedMessage.id) {
      const errorResponse = {
        error: 'Internal error',
        message: '消息创建失败：返回了无效的结果',
      };
      logApiResponse('/api/geminitask/receive', 500, errorResponse);
      return res.status(500).json(errorResponse);
    }

    const responseData = {
      success: true,
      message: 'Gemini Task 消息已接收并记录',
      data: {
        id: savedMessage.id,
        ticker,
        type: signalType,
        time,
        title: savedMessage.title,
        created_at: savedMessage.created_at,
      },
    };

    logApiResponse('/api/geminitask/receive', 200, responseData);

    res.status(200).json(responseData);

    // 立即触发消息转发（通过 WebSocket 推送给客户端）
    try {
      const port = process.env.PORT || 3123;
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
        created_at: savedMessage.created_at,
      });

      const forwardReq = http.request(
        {
          hostname: 'localhost',
          port,
          path: '/api/messages/forward',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(messageData, 'utf8'),
          },
          timeout: 2000,
        },
        () => {
          // 成功触发
        }
      );

      forwardReq.on('error', (err) => {
        if (process.env.NODE_ENV === 'development') {
          console.log('[Gemini Task] 触发消息转发失败（不影响消息保存）:', err.message);
        }
      });

      forwardReq.on('timeout', () => {
        forwardReq.destroy();
      });

      forwardReq.write(messageData);
      forwardReq.end();
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[Gemini Task] 触发消息转发时出错:', error);
      }
    }
  } catch (error: any) {
    logApiResponse('/api/geminitask/receive', 500, undefined, error);
    console.error('[Gemini Task] 接收消息错误:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message || '服务器内部错误',
    });
  }
}
