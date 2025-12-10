import type { NextApiRequest, NextApiResponse } from 'next';
import { extractVisitorInfo, getSiteId } from '@/lib/visitor-info';
import { recordVisit } from '@/lib/stats';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: '方法不允许' });
  }

  try {
    const siteId = getSiteId(req);
    const visitorInfo = extractVisitorInfo(req);

    // 如果请求体中有路径，使用请求体中的路径（用于客户端指定）
    if (req.body?.path) {
      visitorInfo.path = req.body.path;
    }

    // 记录访问
    const visitId = await recordVisit(siteId, visitorInfo);

    return res.status(200).json({
      success: true,
      visitId,
      message: '访问已记录',
    });
  } catch (error: any) {
    console.error('记录访问错误:', error);
    return res.status(500).json({
      success: false,
      message: '服务器错误',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

