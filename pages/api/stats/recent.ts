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
    const beforeId = req.query.beforeId ? parseInt(req.query.beforeId as string) : undefined;
    const beforeTime = req.query.beforeTime ? new Date(req.query.beforeTime as string) : undefined;
    const days = req.query.days ? parseInt(req.query.days as string) : 30; // 默认查询最近30天
    
    const visits = await getRecentVisits(siteId, limit, {
      beforeId,
      beforeTime,
      days,
      includeFields: ['visitor_id', 'user_agent', 'referer'], // 可选：包含额外字段
    });

    return res.status(200).json({
      siteId,
      visits,
      count: visits.length,
      // 用于游标分页
      nextCursor: visits.length > 0 ? {
        id: visits[visits.length - 1].id,
        time: visits[visits.length - 1].created_at,
      } : null,
    });
  } catch (error: any) {
    console.error('获取最近访问记录错误:', error);
    return res.status(500).json({
      message: '服务器错误',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}
