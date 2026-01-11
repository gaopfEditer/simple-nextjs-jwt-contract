import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * 通用的API请求日志工具
 * 用于统一记录所有API请求的详细信息，方便调试
 */
export function logApiRequest(
  req: NextApiRequest,
  apiPath: string,
  options?: {
    logBody?: boolean;
    logHeaders?: boolean;
    logQuery?: boolean;
  }
) {
  const {
    logBody = true,
    logHeaders = false,
    logQuery = true,
  } = options || {};

  // 获取客户端IP
  const clientIp = 
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    (req.headers['x-real-ip'] as string) ||
    req.socket.remoteAddress ||
    'unknown';

  // 构建日志信息
  const logInfo: any = {
    timestamp: new Date().toISOString(),
    api: apiPath,
    method: req.method,
    url: req.url,
    ip: clientIp,
  };

  // 添加查询参数
  if (logQuery && Object.keys(req.query || {}).length > 0) {
    logInfo.query = req.query;
  }

  // 添加请求头（可选，通常包含敏感信息）
  if (logHeaders) {
    logInfo.headers = {
      'user-agent': req.headers['user-agent'],
      'content-type': req.headers['content-type'],
      'content-length': req.headers['content-length'],
      'authorization': req.headers['authorization'] ? '[已设置]' : undefined,
    };
  }

  // 添加请求体
  if (logBody && req.body) {
    // 对于大文件或敏感数据，可以限制日志长度
    const bodyStr = JSON.stringify(req.body);
    if (bodyStr.length > 1000) {
      logInfo.body = bodyStr.substring(0, 1000) + '...[截断]';
      logInfo.bodyLength = bodyStr.length;
    } else {
      logInfo.body = req.body;
    }
  }

  // 输出日志
  console.log(`[API请求] ${apiPath}`, JSON.stringify(logInfo, null, 2));
}

/**
 * 记录API响应日志
 */
export function logApiResponse(
  apiPath: string,
  statusCode: number,
  responseData?: any,
  error?: any
) {
  const logInfo: any = {
    timestamp: new Date().toISOString(),
    api: apiPath,
    statusCode,
  };

  if (error) {
    logInfo.error = {
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    };
  } else if (responseData) {
    const responseStr = JSON.stringify(responseData);
    if (responseStr.length > 500) {
      logInfo.response = responseStr.substring(0, 500) + '...[截断]';
      logInfo.responseLength = responseStr.length;
    } else {
      logInfo.response = responseData;
    }
  }

  const logLevel = statusCode >= 400 ? 'error' : 'info';
  const emoji = statusCode >= 500 ? '❌' : statusCode >= 400 ? '⚠️' : '✅';
  
  console.log(`[API响应] ${emoji} ${apiPath} [${statusCode}]`, JSON.stringify(logInfo, null, 2));
}

