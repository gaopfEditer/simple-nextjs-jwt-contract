import type { NextApiRequest, NextApiResponse } from 'next';
import { createMessage } from '@/lib/messages';
import { logApiRequest, logApiResponse } from '@/lib/api-logger';
import http from 'http';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

// 启用 dayjs 插件
dayjs.extend(utc);
dayjs.extend(timezone);

// 扩展NextApiRequest以包含TradingView数据
interface TradingViewRequest extends NextApiRequest {
  body: {
    // 新格式：支持以 ; 分隔的数据和描述
    // 格式：{{ticker}} | {{type}} | {{time}} | {{close}} | {{high}} | {{low}} ; {{描述}}
    message: string; // 完整消息（包含数据和描述，以 ; 分隔）
  };
}

/**
 * 将UTC时间转换为北京时间（UTC+8）
 * @param utcTimeString UTC时间字符串（ISO 8601格式，如 2024-01-15T10:30:00Z）
 * @returns 北京时间字符串（格式：YYYY-MM-DD HH:mm:ss）
 */
function convertToBeijingTime(utcTimeString: string | null): string | null {
  if (!utcTimeString) return null;
  
  try {
    // 使用 dayjs 解析 UTC 时间并转换为北京时间
    const beijingTime = dayjs.utc(utcTimeString).tz('Asia/Shanghai');
    
    // 检查日期是否有效
    if (!beijingTime.isValid()) {
      console.warn('[时间转换] 无效的时间格式:', utcTimeString);
      return null;
    }
    
    // 格式化为 YYYY-MM-DD HH:mm:ss
    const beijingTimeString = beijingTime.format('YYYY-MM-DD HH:mm:ss');
    console.log('[时间转换] UTC:', utcTimeString, '-> 北京时间:', beijingTimeString);
    
    return beijingTimeString;
  } catch (error) {
    console.error('[时间转换] 转换失败:', error, '原始时间:', utcTimeString);
    return null;
  }
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
 * 请求格式:
 * {
 *   "message": "BTCUSDT | RSI超买 | 2024-01-15T10:30:00Z | 45000.5 | 45100 | 44900 ; BTCUSDT RSI超买 | 时间:2024-01-15T10:30:00Z | 价格:45000.5 | 最高:45100 | 最低:44900"
 * }
 * 
 * 数据格式说明：
 * - 以 ; 分隔，前面是数据部分，后面是描述部分
 * - 数据部分格式：{{ticker}} | {{type}} | {{time}} | {{close}} | {{high}} | {{low}}
 *   - time 字段应为UTC时间（ISO 8601格式，如 2024-01-15T10:30:00Z）
 *   - 系统会自动将UTC时间转换为北京时间（UTC+8）
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

    const { message } = req.body;

    // 验证 message 字段
    if (!message || typeof message !== 'string') {
      const errorResponse = {
        error: 'Bad request',
        message: 'message字段不能为空且必须是字符串',
        received: req.body
      };
      logApiResponse('/api/tradingview/receive', 400, errorResponse);
      return res.status(400).json(errorResponse);
    }

    // 解析数据
    let ticker: string = '';
    let type: string = 'trading_signal';
    let time: string | null = null;
    let close: number | null = null;
    let high: number | null = null;
    let low: number | null = null;
    let description: string = '';

    // 检查是否包含 ; 分隔符
    if (!message.includes(';')) {
      const errorResponse = {
        error: 'Bad request',
        message: 'message格式错误：必须包含 ; 分隔符（格式：数据部分 ; 描述部分）',
        received: req.body
      };
      logApiResponse('/api/tradingview/receive', 400, errorResponse);
      return res.status(400).json(errorResponse);
    }

    // 分割数据和描述部分
    const parts = message.split(';').map(s => s.trim());
    const dataPart = parts[0]; // 数据部分
    description = parts[1] || ''; // 描述部分（可选）

    // 验证数据部分不为空
    if (!dataPart || !dataPart.trim()) {
      const errorResponse = {
        error: 'Bad request',
        message: '数据部分不能为空（; 分隔符前面的内容）',
        received: req.body
      };
      logApiResponse('/api/tradingview/receive', 400, errorResponse);
      return res.status(400).json(errorResponse);
    }

    // 解析数据部分：{{ticker}} | {{type}} | {{time}} | {{close}} | {{high}} | {{low}}
    const dataFields = dataPart.split('|').map(s => s.trim());
    
    console.log('[解析数据] dataFields:', dataFields);
    
    if (dataFields.length >= 1 && dataFields[0] && dataFields[0].trim()) {
      ticker = dataFields[0].trim();
    }
    if (dataFields.length >= 2 && dataFields[1] && dataFields[1].trim()) {
      type = dataFields[1].trim();
    }
    if (dataFields.length >= 3 && dataFields[2] && dataFields[2].trim()) {
      const utcTime = dataFields[2].trim();
      // 将UTC时间转换为北京时间
      time = convertToBeijingTime(utcTime);
      if (!time) {
        console.warn('[解析数据] 时间转换失败，使用原始时间:', utcTime);
        time = utcTime; // 如果转换失败，使用原始时间
      }
    }
    if (dataFields.length >= 4 && dataFields[3] && dataFields[3].trim()) {
      const closeVal = parseFloat(dataFields[3]);
      close = isNaN(closeVal) ? null : closeVal;
    }
    if (dataFields.length >= 5 && dataFields[4] && dataFields[4].trim()) {
      const highVal = parseFloat(dataFields[4]);
      high = isNaN(highVal) ? null : highVal;
    }
    if (dataFields.length >= 6 && dataFields[5] && dataFields[5].trim()) {
      const lowVal = parseFloat(dataFields[5]);
      low = isNaN(lowVal) ? null : lowVal;
    }

    // 调试日志：显示解析结果
    console.log('[解析结果] ticker:', ticker, 'type:', type, 'time:', time, 'close:', close);

    // 验证必需字段
    if (!ticker || ticker.trim() === '') {
      const errorResponse = {
        error: 'Bad request',
        message: 'ticker字段不能为空（应从message的数据部分第一个字段解析）',
        received: req.body,
        debug: {
          message: message,
          dataPart: dataPart,
          dataFields: dataFields,
          firstDataField: dataFields[0]
        }
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

    console.log('[准备创建消息]', {
      source: 'tradingview',
      source_id: `${ticker}_${time || Date.now()}_${type || 'signal'}`,
      type: type || 'trading_signal',
      title,
      content: content.substring(0, 100) + '...', // 只显示前100个字符
      metadata,
      sender: 'TradingView',
      sender_id: 'tradingview_webhook',
      ip_address,
      status: 'received'
    });

    // 创建消息记录
    let savedMessage;
    try {
      savedMessage = await createMessage({
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
      
      console.log('[消息创建成功]', {
        id: savedMessage.id,
        source: savedMessage.source,
        type: savedMessage.type,
        created_at: savedMessage.created_at
      });
    } catch (dbError: any) {
      console.error('[消息创建失败]', {
        error: dbError.message,
        stack: dbError.stack,
        input: {
          source: 'tradingview',
          ticker,
          type: type || 'trading_signal',
          title,
          content: content.substring(0, 100) + '...'
        }
      });
      
      // 数据库错误，返回500
      const errorResponse = {
        error: 'Database error',
        message: '保存消息到数据库失败',
        details: process.env.NODE_ENV === 'development' ? dbError.message : undefined
      };
      logApiResponse('/api/tradingview/receive', 500, errorResponse);
      return res.status(500).json(errorResponse);
    }

    // 验证消息是否成功创建
    if (!savedMessage || !savedMessage.id) {
      console.error('[消息创建异常]', {
        savedMessage,
        message: 'createMessage返回了无效的结果'
      });
      
      const errorResponse = {
        error: 'Internal error',
        message: '消息创建失败：返回了无效的结果'
      };
      logApiResponse('/api/tradingview/receive', 500, errorResponse);
      return res.status(500).json(errorResponse);
    }

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
    
    console.log('[API响应]', {
      statusCode: 200,
      messageId: savedMessage.id,
      ticker
    });
    
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

