import type { NextApiRequest, NextApiResponse } from 'next';
import { createMessage } from '@/lib/messages';
import { logApiRequest, logApiResponse } from '@/lib/api-logger';
import http from 'http';

// 扩展NextApiRequest以包含TradingView数据
interface TradingViewRequest extends NextApiRequest {
  body: {
    // 新格式：支持以 ; 分隔的数据和描述
    // 格式：{{ticker}} | {{type}} | {{time}} | {{close}} | {{high}} | {{low}} ; {{描述}}
    message?: string; // 完整消息（包含数据和描述，以 ; 分隔）
    // 兼容旧格式
    ticker?: string;
    time?: string;
    close?: number;
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
 * 新格式（推荐）:
 * {
 *   "message": "BTCUSDT | RSI超买 | 2024-01-15T10:30:00Z | 45000.5 | 45100 | 44900 ; BTCUSDT RSI超买 | 时间:2024-01-15T10:30:00Z | 价格:45000.5 | 最高:45100 | 最低:44900"
 * }
 * 
 * 旧格式（兼容）:
 * {
 *   "ticker": "BTCUSDT",
 *   "time": "2024-01-15T10:30:00Z",
 *   "close": 45000.5,
 *   "message": "BTCUSDT 上插针 | 2024-01-15T10:30:00Z | 价格:45000.5 | 15M@45100+1H@45200"
 * }
 * 
 * 数据格式说明：
 * - 以 ; 分隔，前面是数据部分，后面是描述部分
 * - 数据部分格式：{{ticker}} | {{type}} | {{time}} | {{close}} | {{high}} | {{low}}
 * - 描述部分：可选的描述信息
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

    const { message, ticker: oldTicker, time: oldTime, close: oldClose } = req.body;

    // 解析数据
    let ticker: string = oldTicker || 'UNKNOWN'; // 默认值
    let type: string = 'trading_signal';
    let time: string | null = oldTime || null;
    let close: number | null = oldClose !== undefined ? oldClose : null;
    let high: number | null = null;
    let low: number | null = null;
    let description: string = '';

    // 优先使用新格式（message字段包含完整数据）
    if (message && typeof message === 'string') {
      // 检查是否包含 ; 分隔符（新格式）
      if (message.includes(';')) {
        const parts = message.split(';').map(s => s.trim());
        const dataPart = parts[0]; // 数据部分
        description = parts[1] || ''; // 描述部分（可选）

        // 解析数据部分：{{ticker}} | {{type}} | {{time}} | {{close}} | {{high}} | {{low}}
        const dataFields = dataPart.split('|').map(s => s.trim());
        
        if (dataFields.length >= 1 && dataFields[0]) ticker = dataFields[0];
        if (dataFields.length >= 2 && dataFields[1]) type = dataFields[1];
        if (dataFields.length >= 3 && dataFields[2]) time = dataFields[2];
        if (dataFields.length >= 4 && dataFields[3]) {
          const closeVal = parseFloat(dataFields[3]);
          close = isNaN(closeVal) ? null : closeVal;
        }
        if (dataFields.length >= 5 && dataFields[4]) {
          const highVal = parseFloat(dataFields[4]);
          high = isNaN(highVal) ? null : highVal;
        }
        if (dataFields.length >= 6 && dataFields[5]) {
          const lowVal = parseFloat(dataFields[5]);
          low = isNaN(lowVal) ? null : lowVal;
        }
      } else {
        // 旧格式：只有 message，没有数据部分
        description = message;
        // 如果旧格式字段存在，使用它们
        if (oldTicker) ticker = oldTicker;
        if (oldTime) time = oldTime;
        if (oldClose !== undefined) close = oldClose;
      }
    } else {
      // 完全使用旧格式
      if (oldTicker) ticker = oldTicker;
      if (oldTime) time = oldTime;
      if (oldClose !== undefined) close = oldClose;
      description = message || '';
    }

    // 验证必需字段
    if (!ticker || typeof ticker !== 'string') {
      const errorResponse = {
        error: 'Bad request',
        message: 'ticker字段不能为空且必须是字符串（可以从message中解析或直接提供）',
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

    // 构建消息标题（使用ticker和信号类型）
    const title = `${ticker} ${type || '交易信号'}`;
    
    // 构建完整的消息内容（使用描述部分，如果没有则自动生成）
    let content = description;
    if (!content) {
      // 如果没有描述，自动生成
      const parts: string[] = [];
      if (ticker) parts.push(ticker);
      if (type) parts.push(type);
      if (time) parts.push(`时间: ${time}`);
      if (close !== null) parts.push(`价格: ${close}`);
      if (high !== null) parts.push(`最高: ${high}`);
      if (low !== null) parts.push(`最低: ${low}`);
      content = parts.join(' | ');
    }

    // 构建metadata，保存TradingView的原始数据
    const metadata: any = {
      source: 'tradingview',
      ticker,
      type: type || 'trading_signal',
      time,
      close,
      high,
      low,
      original_message: message || req.body.message || ''
    };

    // 创建消息记录
    const savedMessage = await createMessage({
      source: 'tradingview',
      source_id: `${ticker}_${time || Date.now()}_${type || 'signal'}`,
      type: type || 'trading_signal', // 使用解析出的信号类型
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
        type: type || 'trading_signal',
        time,
        close,
        high,
        low,
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

