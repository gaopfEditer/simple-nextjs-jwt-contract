import type { NextApiRequest, NextApiResponse } from 'next';
import { getSiteId } from '@/lib/visitor-info';
import { getRecentVisits } from '@/lib/stats';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: '方法不允许' });
  }

  try {
    const siteId = getSiteId(req);
    const limit = parseInt(req.query.limit as string) || 50;
    const visits = await getRecentVisits(siteId, limit);

    return res.status(200).json({
      siteId,
      visits,
      count: visits.length,
    });
  } catch (error: any) {
    console.error('获取最近访问记录错误:', error);
    return res.status(500).json({
      message: '服务器错误',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

