import { NextApiRequest, NextApiResponse } from 'next';
import Cookies from 'js-cookie';
import { verifyToken, JWTPayload } from './jwt';

export function getTokenFromRequest(req: NextApiRequest): string | null {
  let token: string | null = null;
  let source = '';

  // 优先从 Authorization header 获取 token（与另一个系统保持一致）
  const authHeader = req.headers.authorization;
  if (authHeader) {
    // 支持多种格式：Bearer <token> 或直接 <token>
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
      source = 'Authorization Bearer';
    } else {
      // 如果没有 Bearer 前缀，直接使用整个值（某些系统可能不需要 Bearer）
      token = authHeader.trim();
      source = 'Authorization';
    }
  }

  // 如果 Authorization header 中没有，再从 Cookie 获取
  if (!token) {
    const cookieToken = req.cookies.token;
    if (cookieToken) {
      token = cookieToken.trim();
      source = 'Cookie';
    }
  }

  // 调试日志（仅在开发环境）
  if (process.env.NODE_ENV === 'development' && token) {
    console.log(`[Token] 来源: ${source}, 长度: ${token.length}, 预览: ${token.substring(0, 20)}...`);
  }

  return token;
}

export function getPayloadFromRequest(req: NextApiRequest): JWTPayload | null {
  const token = getTokenFromRequest(req);
  if (!token) {
    if (process.env.NODE_ENV === 'development') {
      console.log('[Token] 未找到 token');
    }
    return null;
  }

  // 验证 token
  const payload = verifyToken(token);
  if (!payload) {
    if (process.env.NODE_ENV === 'development') {
      console.log('[Token] Token 验证失败，可能是：1. token 格式错误 2. token 已过期 3. secret 不匹配');
      // 尝试解析 token 看看是否能解码（仅用于调试）
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.decode(token, { complete: true });
        console.log('[Token] Token 结构:', {
          header: decoded?.header,
          payload: decoded?.payload,
          signatureLength: token.split('.').length,
        });
      } catch (e) {
        console.log('[Token] Token 无法解析，可能是格式错误');
      }
    }
  }

  return payload;
}

export function setTokenCookie(res: NextApiResponse, token: string): void {
  res.setHeader(
    'Set-Cookie',
    `token=${token}; HttpOnly; Path=/; Max-Age=${7 * 24 * 60 * 60}; SameSite=Lax`
  );
}

export function clearTokenCookie(res: NextApiResponse): void {
  res.setHeader(
    'Set-Cookie',
    'token=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax'
  );
}

// 客户端工具函数
export function setToken(token: string): void {
  if (typeof window !== 'undefined') {
    // 同时保存到 Cookie 和 localStorage
    Cookies.set('token', token, { expires: 7 });
    localStorage.setItem('token', token);
  }
}

export function getToken(): string | undefined {
  if (typeof window !== 'undefined') {
    // 优先从 Cookie 获取，如果没有则从 localStorage 获取
    return Cookies.get('token') || localStorage.getItem('token') || undefined;
  }
  return undefined;
}

export function removeToken(): void {
  if (typeof window !== 'undefined') {
    Cookies.remove('token');
    localStorage.removeItem('token');
  }
}

