import { useEffect, useState } from 'react';
import axios from 'axios';
import { useSite } from './site-context';

export interface SiteStats {
  totalVisits: number;
  uniqueVisitors: number;
  totalArticleViews: number;
}

export interface ArticleStats {
  views: number;
  uniqueReaders: number;
}

/**
 * 跟踪页面访问的Hook
 */
export function useTrackVisit(path?: string) {
  let currentSiteId = 'local';
  try {
    const site = useSite();
    currentSiteId = site.currentSiteId;
  } catch {
    // 不在 SiteProvider 中，使用默认值
  }
  
  useEffect(() => {
    // 确保在客户端执行
    if (typeof window === 'undefined') return;

    const trackVisit = async () => {
      try {
        await axios.post('/api/stats/track', {
          path: path || window.location.pathname,
        }, {
          headers: {
            'X-Site-ID': currentSiteId,
          },
        });
      } catch (error) {
        // 静默失败，不影响用户体验
        // console.error('跟踪访问失败:', error);
      }
    };

    trackVisit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]); // 移除 currentSiteId 依赖，避免无限循环
}

/**
 * 跟踪文章阅读的Hook
 */
export function useTrackArticleView(articleId: string) {
  let currentSiteId = 'local';
  try {
    const site = useSite();
    currentSiteId = site.currentSiteId;
  } catch {
    // 不在 SiteProvider 中，使用默认值
  }
  
  useEffect(() => {
    // 确保在客户端执行
    if (typeof window === 'undefined') return;
    if (!articleId) return;

    const trackView = async () => {
      try {
        await axios.post('/api/stats/article', {
          articleId,
        }, {
          headers: {
            'X-Site-ID': currentSiteId,
          },
        });
      } catch (error) {
        console.error('跟踪文章阅读失败:', error);
      }
    };

    trackView();
  }, [articleId, currentSiteId]);
}

/**
 * 获取站点统计数据的Hook
 */
export function useSiteStats() {
  let currentSiteId = 'local';
  try {
    const site = useSite();
    currentSiteId = site.currentSiteId;
  } catch {
    // 不在 SiteProvider 中，使用默认值
  }
  
  const [stats, setStats] = useState<SiteStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/api/stats/overview', {
          headers: {
            'X-Site-ID': currentSiteId,
          },
        });
        setStats(response.data);
        setError(null);
      } catch (err: any) {
        setError(err.message || '获取统计数据失败');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [currentSiteId]);

  return { stats, loading, error };
}

/**
 * 获取文章统计数据的Hook
 */
export function useArticleStats(articleId: string | null) {
  let currentSiteId = 'local';
  try {
    const site = useSite();
    currentSiteId = site.currentSiteId;
  } catch {
    // 不在 SiteProvider 中，使用默认值
  }
  
  const [stats, setStats] = useState<ArticleStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!articleId) {
      setLoading(false);
      return;
    }

    const fetchStats = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`/api/stats/article?articleId=${encodeURIComponent(articleId)}`, {
          headers: {
            'X-Site-ID': currentSiteId,
          },
        });
        setStats({
          views: response.data.views,
          uniqueReaders: response.data.uniqueReaders,
        });
        setError(null);
      } catch (err: any) {
        setError(err.message || '获取文章统计数据失败');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [articleId, currentSiteId]);

  return { stats, loading, error };
}

