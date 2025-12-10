import type { NextApiRequest, NextApiResponse } from 'next';
import { extractVisitorInfo, getSiteId } from '@/lib/visitor-info';
import { recordArticleView, getArticleViews, getArticleUniqueReaders } from '@/lib/stats';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'POST') {
    // 记录文章阅读
    try {
      const { articleId } = req.body;

      if (!articleId) {
        return res.status(400).json({ message: '缺少文章ID' });
      }

      const siteId = getSiteId(req);
      const visitorInfo = extractVisitorInfo(req);

      await recordArticleView(siteId, articleId, visitorInfo);

      return res.status(200).json({
        success: true,
        message: '阅读已记录',
      });
    } catch (error: any) {
      console.error('记录文章阅读错误:', error);
      return res.status(500).json({
        success: false,
        message: '服务器错误',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  } else if (req.method === 'GET') {
    // 获取文章阅读量
    try {
      const { articleId } = req.query;

      if (!articleId || typeof articleId !== 'string') {
        return res.status(400).json({ message: '缺少文章ID' });
      }

      const siteId = getSiteId(req);
      const [views, uniqueReaders] = await Promise.all([
        getArticleViews(articleId, siteId),
        getArticleUniqueReaders(articleId, siteId),
      ]);

      return res.status(200).json({
        articleId,
        views,
        uniqueReaders,
      });
    } catch (error: any) {
      console.error('获取文章阅读量错误:', error);
      return res.status(500).json({
        message: '服务器错误',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  } else {
    return res.status(405).json({ message: '方法不允许' });
  }
}

