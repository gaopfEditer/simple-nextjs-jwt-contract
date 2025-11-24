import type { NextApiRequest, NextApiResponse } from 'next';
import { getPayloadFromRequest } from '@/lib/auth';
import { findUserById } from '@/lib/db';
import { getUserIdFromPayload } from '@/lib/jwt';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: '方法不允许' });
  }

  try {
    // 调试：输出请求头信息（仅在开发环境）
    if (process.env.NODE_ENV === 'development') {
      console.log('[API /auth/me] 请求头:', {
        authorization: req.headers.authorization ? 
          req.headers.authorization.substring(0, 50) + '...' : '未设置',
        cookieToken: req.cookies.token ? 
          req.cookies.token.substring(0, 50) + '...' : '未设置',
      });
    }

    // 验证 token 并获取用户信息
    const payload = getPayloadFromRequest(req);
    if (!payload) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[API /auth/me] Token 验证失败');
      }
      return res.status(401).json({ message: '未授权' });
    }

    // 从 payload 获取用户 ID
    const userId = getUserIdFromPayload(payload);
    
    // 查找用户
    const user = await findUserById(userId);
    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }

    // 检查用户是否启用
    if (!user.is_enabled) {
      return res.status(403).json({ message: '账户已被禁用' });
    }

    // 返回用户信息（不包含密码）
    return res.status(200).json({
      user: {
        id: user.id,
        email: user.email,
        is_enabled: user.is_enabled,
        last_login_at: user.last_login_at,
        created_at: user.created_at,
        updated_at: user.updated_at,
      },
    });
  } catch (error: any) {
    console.error('获取用户信息错误:', error);
    return res.status(500).json({ 
      message: '服务器错误',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

