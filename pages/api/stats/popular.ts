import type { NextApiRequest, NextApiResponse } from 'next';
import { getSiteId } from '@/lib/visitor-info';
import { getPopularArticles } from '@/lib/stats';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: '方法不允许' });
  }

  try {
    const siteId = getSiteId(req);
    const limit = parseInt(req.query.limit as string) || 10;
    const articles = await getPopularArticles(siteId, limit);

    return res.status(200).json({
      siteId,
      articles,
      count: articles.length,
    });
  } catch (error: any) {
    console.error('获取热门文章错误:', error);
    return res.status(500).json({
      message: '服务器错误',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

