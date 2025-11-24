import type { NextApiRequest, NextApiResponse } from 'next';
import { createUser } from '@/lib/db';
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

    if (password.length < 6) {
      return res.status(400).json({ message: '密码长度至少为 6 位' });
    }

    // 创建用户
    const user = await createUser(email, password);

    // 检查用户是否启用
    if (!user.is_enabled) {
      return res.status(403).json({ message: '账户已被禁用' });
    }

    // 生成 JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
    });

    // 设置 Cookie
    setTokenCookie(res, token);

    // 返回用户信息（不包含密码）
    return res.status(201).json({
      message: '注册成功',
      user: {
        id: user.id,
        email: user.email,
        is_enabled: user.is_enabled,
        created_at: user.created_at,
      },
      token,
    });
  } catch (error: any) {
    console.error('注册错误:', error);
    if (error.message === '用户已存在') {
      return res.status(409).json({ message: error.message });
    }
    return res.status(500).json({ 
      message: '服务器错误',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

