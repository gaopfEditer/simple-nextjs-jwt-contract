import type { NextApiRequest, NextApiResponse } from 'next';
import { clearTokenCookie } from '@/lib/auth';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: '方法不允许' });
  }

  try {
    clearTokenCookie(res);
    return res.status(200).json({ message: '登出成功' });
  } catch (error) {
    return res.status(500).json({ message: '服务器错误' });
  }
}

