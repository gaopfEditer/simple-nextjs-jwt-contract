import type { NextApiRequest, NextApiResponse } from 'next';
import { getPool } from '@/lib/db-connection';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: '方法不允许' });
  }

  try {
    const pool = getPool();
    
    // 获取所有不同的站点ID
    const [rows] = await pool.execute(
      `SELECT DISTINCT site_id, 
        COUNT(*) as total_visits,
        COUNT(DISTINCT visitor_id) as unique_visitors,
        MAX(created_at) as last_visit_at
       FROM visits 
       GROUP BY site_id 
       ORDER BY last_visit_at DESC`
    ) as any[];

    const sites = rows.map((row: any) => ({
      siteId: row.site_id,
      totalVisits: Number(row.total_visits),
      uniqueVisitors: Number(row.unique_visitors),
      lastVisitAt: row.last_visit_at ? new Date(row.last_visit_at) : null,
    }));

    return res.status(200).json({
      sites,
      count: sites.length,
    });
  } catch (error: any) {
    console.error('获取站点列表错误:', error);
    return res.status(500).json({
      message: '服务器错误',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

