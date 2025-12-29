import type { NextApiRequest, NextApiResponse } from 'next';
import { createMessage } from '@/lib/messages';
import http from 'http';

// 扩展NextApiRequest以包含body
interface MessageRequest extends NextApiRequest {
  body: {
    source?: string;
    source_id?: string;
    type?: string;
    title?: string;
    content: string;
    metadata?: any;
    sender?: string;
    sender_id?: string;
  };
}

/**
 * 消息接收API
 * 用于接收来自Telegram机器人或其他API调用的标准消息
 * 
 * POST /api/messages/receive
 * 
 * Body示例:
 * {
 *   "source": "telegram",
 *   "source_id": "123456",
 *   "type": "text",
 *   "title": "新消息",
 *   "content": "这是一条测试消息",
 *   "metadata": { "chat_id": 123, "message_id": 456 },
 *   "sender": "username",
 *   "sender_id": "user_123"
 * }
 */
export default async function handler(
  req: MessageRequest,
  res: NextApiResponse
) {
  // 只允许POST请求
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      error: 'Method not allowed',
      message: '只支持POST请求' 
    });
  }

  try {
    // 调试：输出请求信息（仅在开发环境）
    if (process.env.NODE_ENV === 'development') {
      console.log('[API /messages/receive] 请求信息:', {
        method: req.method,
        headers: {
          'content-type': req.headers['content-type'],
        },
        body: req.body,
        bodyType: typeof req.body,
      });
    }

    // 确保body存在
    if (!req.body) {
      return res.status(400).json({
        error: 'Bad request',
        message: '请求体不能为空'
      });
    }

    const {
      source = 'api',
      source_id,
      type = 'text',
      title,
      content,
      metadata,
      sender,
      sender_id
    } = req.body;

    // 验证必需字段
    if (!content || typeof content !== 'string') {
      if (process.env.NODE_ENV === 'development') {
        console.log('[API /messages/receive] 验证失败:', {
          content,
          contentType: typeof content,
          body: req.body
        });
      }
      return res.status(400).json({
        error: 'Bad request',
        message: '消息内容(content)不能为空',
        received: {
          content,
          contentType: typeof content,
          body: req.body
        }
      });
    }

    // 获取客户端IP地址
    const ip_address = 
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      (req.headers['x-real-ip'] as string) ||
      req.socket.remoteAddress ||
      undefined;

    // 创建消息记录
    const message = await createMessage({
      source,
      source_id,
      type,
      title,
      content,
      metadata,
      sender,
      sender_id,
      ip_address,
      status: 'received'
    });

    // 返回成功响应
    res.status(200).json({
      success: true,
      message: '消息已接收并记录',
      data: {
        id: message.id,
        source: message.source,
        type: message.type,
        created_at: message.created_at
      }
    });

    // 立即触发消息转发（异步，不阻塞响应）
    // 通过HTTP请求触发server.js的立即转发逻辑，直接传递消息数据
    try {
      const port = process.env.PORT || 3000;
      const messageData = JSON.stringify({
        id: message.id,
        source: message.source,
        source_id: message.source_id,
        type: message.type,
        title: message.title,
        content: message.content,
        metadata: message.metadata,
        sender: message.sender,
        sender_id: message.sender_id,
        created_at: message.created_at
      });
      
      const forwardOptions = {
        hostname: 'localhost',
        port: port,
        path: '/api/messages/forward',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(messageData, 'utf8')
        },
        timeout: 2000 // 2秒超时
      };

      const forwardReq = http.request(forwardOptions, () => {
        // 成功触发，不需要处理响应
      });

      forwardReq.on('error', (err) => {
        // 静默处理错误，不影响主响应
        if (process.env.NODE_ENV === 'development') {
          console.log('触发消息转发失败（不影响消息保存）:', err.message);
        }
      });

      forwardReq.on('timeout', () => {
        forwardReq.destroy();
      });

      forwardReq.write(messageData);
      forwardReq.end();
    } catch (error) {
      // 静默处理错误
      if (process.env.NODE_ENV === 'development') {
        console.log('触发消息转发时出错（不影响消息保存）:', error);
      }
    }
  } catch (error: any) {
    console.error('接收消息错误:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message || '服务器内部错误'
    });
  }
}

