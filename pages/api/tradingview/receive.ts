import type { NextApiRequest, NextApiResponse } from 'next';
import { createMessage } from '@/lib/messages';
import { logApiRequest, logApiResponse } from '@/lib/api-logger';
import http from 'http';

// 扩展NextApiRequest以包含TradingView数据
interface TradingViewRequest extends NextApiRequest {
  body: {
    ticker: string;
    time: string;
    close: number;
    message: string;
  };
}

/**
 * TradingView 消息接收API
 * 用于接收来自TradingView Webhook推送的交易信号
 * 
 * POST /api/tradingview/receive
 * 
 * 请求头：
 * - Content-Type: application/json
 * 
 * Body示例:
 * {
 *   "ticker": "BTCUSDT",
 *   "time": "2024-01-15T10:30:00Z",
 *   "close": 45000.5,
 *   "message": "BTCUSDT 上插针 | 2024-01-15T10:30:00Z | 价格:45000.5 | 15M@45100+1H@45200"
 * }
 */
export default async function handler(
  req: TradingViewRequest,
  res: NextApiResponse
) {
  // 立即输出日志，确认请求到达了
  console.log('=== TradingView API 收到请求 ===');
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  console.log('Body:', req.body);
  
  // 只允许POST请求
  if (req.method !== 'POST') {
    const errorResponse = { 
      error: 'Method not allowed',
      message: '只支持POST请求' 
    };
    logApiResponse('/api/tradingview/receive', 405, errorResponse);
    return res.status(405).json(errorResponse);
  }

  // 记录请求日志（统一格式，方便调试）
  logApiRequest(req, '/api/tradingview/receive', {
    logBody: true,
    logHeaders: false,
    logQuery: true,
  });

  try {

    // 确保body存在
    if (!req.body) {
      const errorResponse = {
        error: 'Bad request',
        message: '请求体不能为空'
      };
      logApiResponse('/api/tradingview/receive', 400, errorResponse);
      return res.status(400).json(errorResponse);
    }

    const { ticker, time, close, message } = req.body;

    // 验证必需字段
    if (!ticker || typeof ticker !== 'string') {
      const errorResponse = {
        error: 'Bad request',
        message: 'ticker字段不能为空且必须是字符串',
        received: req.body
      };
      logApiResponse('/api/tradingview/receive', 400, errorResponse);
      return res.status(400).json(errorResponse);
    }

    if (!message || typeof message !== 'string') {
      const errorResponse = {
        error: 'Bad request',
        message: 'message字段不能为空且必须是字符串',
        received: req.body
      };
      logApiResponse('/api/tradingview/receive', 400, errorResponse);
      return res.status(400).json(errorResponse);
    }

    // 验证close字段（如果存在，必须是数字）
    if (close !== undefined && (typeof close !== 'number' || isNaN(close))) {
      const errorResponse = {
        error: 'Bad request',
        message: 'close字段必须是有效数字',
        received: req.body
      };
      logApiResponse('/api/tradingview/receive', 400, errorResponse);
      return res.status(400).json(errorResponse);
    }

    // 获取客户端IP地址
    const ip_address = 
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      (req.headers['x-real-ip'] as string) ||
      req.socket.remoteAddress ||
      undefined;

    // 构建消息标题（使用ticker和时间）
    const title = `${ticker} 交易信号`;
    
    // 构建完整的消息内容
    let content = message;
    if (close !== undefined) {
      content = `${message}\n价格: ${close}`;
    }
    if (time) {
      content = `${content}\n时间: ${time}`;
    }

    // 构建metadata，保存TradingView的原始数据
    const metadata = {
      source: 'tradingview',
      ticker,
      time,
      close: close !== undefined ? close : null,
      original_message: message
    };

    // 创建消息记录
    const savedMessage = await createMessage({
      source: 'tradingview',
      source_id: `${ticker}_${time || Date.now()}`,
      type: 'trading_signal',
      title,
      content,
      metadata,
      sender: 'TradingView',
      sender_id: 'tradingview_webhook',
      ip_address,
      status: 'received'
    });

    // 返回成功响应
    const responseData = {
      success: true,
      message: 'TradingView消息已接收并记录',
      data: {
        id: savedMessage.id,
        ticker,
        time,
        close,
        created_at: savedMessage.created_at
      }
    };
    
    // 记录响应日志
    logApiResponse('/api/tradingview/receive', 200, responseData);
    
    res.status(200).json(responseData);

    // 立即触发消息转发（异步，不阻塞响应）
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
        created_at: savedMessage.created_at
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
    // 记录错误响应日志
    logApiResponse('/api/tradingview/receive', 500, undefined, error);
    
    console.error('接收TradingView消息错误:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message || '服务器内部错误'
    });
  }
}

