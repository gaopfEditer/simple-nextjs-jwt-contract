import type { NextApiRequest, NextApiResponse } from 'next';
import { findUserByEmail, comparePassword } from '@/lib/db';
import { generateToken } from '@/lib/jwt';
import { setTokenCookie } from '@/lib/auth';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: '方法不允许' });
  }

  try {
    const { email, password } = req.body;

    // 验证输入
    if (!email || !password) {
      return res.status(400).json({ message: '请填写邮箱和密码' });
    }

    // 查找用户
    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ message: '邮箱或密码错误' });
    }

    // 检查用户是否启用
    if (!user.is_enabled) {
      return res.status(403).json({ message: '账户已被禁用' });
    }

    // 验证密码
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: '邮箱或密码错误' });
    }

    // 更新最后登录时间
    const { updateLastLoginAt } = await import('@/lib/db');
    await updateLastLoginAt(user.id);

    // 生成 Access Token 和 Refresh Token
    const { generateRefreshToken } = await import('@/lib/jwt');
    
    // 格式化日期为 ISO 8601 格式
    const createdAt = user.created_at ? new Date(user.created_at).toISOString() : new Date().toISOString();
    const lastLoginAt = user.last_login_at ? new Date(user.last_login_at).toISOString() : null;
    
    const accessToken = generateToken({
      userAuthInfo: {
        UserID: String(user.id),
        Email: user.email,
        CreatedAt: createdAt,
        LastLoginAt: lastLoginAt,
      },
    });
    const refreshToken = generateRefreshToken({
      userAuthInfo: {
        UserID: String(user.id),
        Email: user.email,
        CreatedAt: createdAt,
        LastLoginAt: lastLoginAt,
      },
    });

    // 设置 Cookie
    setTokenCookie(res, accessToken);

    // 返回用户信息（不包含密码）
    return res.status(200).json({
      message: '登录成功',
      user: {
        id: user.id,
        email: user.email,
        is_enabled: user.is_enabled,
        last_login_at: user.last_login_at,
      },
      token: accessToken,
      refreshToken: refreshToken,
    });
  } catch (error: any) {
    console.error('登录错误:', error);
    return res.status(500).json({ 
      message: '服务器错误',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

