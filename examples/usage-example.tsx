// ==================== 实际使用示例 ====================

import { useEffect, useState } from 'react';
import axios from 'axios';

// 示例1: 在组件中获取并显示统计数据
export function StatsExample() {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    // 获取站点统计
    axios.get('/api/stats/overview')
      .then(res => setStats(res.data))
      .catch(err => console.error(err));
  }, []);

  if (!stats) return <div>加载中...</div>;

  return (
    <div>
      <p>总访问量: {stats.totalVisits}</p>
      <p>独立访客: {stats.uniqueVisitors}</p>
      <p>文章阅读量: {stats.totalArticleViews}</p>
    </div>
  );
}

// 示例2: 获取文章阅读量
export function ArticleStatsExample({ articleId }: { articleId: string }) {
  const [articleStats, setArticleStats] = useState<any>(null);

  useEffect(() => {
    axios.get(`/api/stats/article?articleId=${encodeURIComponent(articleId)}`)
      .then(res => setArticleStats(res.data))
      .catch(err => console.error(err));
  }, [articleId]);

  if (!articleStats) return null;

  return <div>本文阅读量: {articleStats.views} 次</div>;
}

// 示例3: 手动记录文章阅读
export function TrackArticleExample({ articleId }: { articleId: string }) {
  const handleView = async () => {
    try {
      await axios.post('/api/stats/article', { articleId });
      console.log('阅读已记录');
    } catch (error) {
      console.error('记录失败:', error);
    }
  };

  return <button onClick={handleView}>标记为已读</button>;
}

// 示例4: 获取热门文章列表
export function PopularArticlesExample() {
  const [articles, setArticles] = useState<any[]>([]);

  useEffect(() => {
    axios.get('/api/stats/popular?limit=10')
      .then(res => setArticles(res.data.articles))
      .catch(err => console.error(err));
  }, []);

  return (
    <div>
      <h3>热门文章</h3>
      <ul>
        {articles.map(article => (
          <li key={article.article_id}>
            {article.article_id}: {article.view_count} 次阅读
          </li>
        ))}
      </ul>
    </div>
  );
}

// 示例5: 获取最近访问记录
export function RecentVisitsExample() {
  const [visits, setVisits] = useState<any[]>([]);

  useEffect(() => {
    axios.get('/api/stats/recent?limit=20')
      .then(res => setVisits(res.data.visits))
      .catch(err => console.error(err));
  }, []);

  return (
    <div>
      <h3>最近访问</h3>
      <ul>
        {visits.map(visit => (
          <li key={visit.id}>
            {visit.ip_address} - {visit.path} - {visit.device_type} - {new Date(visit.created_at).toLocaleString()}
          </li>
        ))}
      </ul>
    </div>
  );
}

// 示例6: 多站点支持 - 获取所有站点
export function MultiSiteExample() {
  const [sites, setSites] = useState<any[]>([]);

  useEffect(() => {
    axios.get('/api/stats/sites')
      .then(res => setSites(res.data.sites))
      .catch(err => console.error(err));
  }, []);

  return (
    <div>
      <h3>所有站点</h3>
      <ul>
        {sites.map(site => (
          <li key={site.siteId}>
            {site.siteId === 'local' ? 'local (本地)' : site.siteId} - 
            {site.totalVisits} 次访问, {site.uniqueVisitors} 访客
          </li>
        ))}
      </ul>
    </div>
  );
}

// 示例7: 使用站点切换 Context
import { useSite } from '@/lib/site-context';

export function SiteSwitchExample() {
  const { currentSiteId, setCurrentSiteId, sites } = useSite();

  return (
    <div>
      <select value={currentSiteId} onChange={(e) => setCurrentSiteId(e.target.value)}>
        {sites.map(site => (
          <option key={site.siteId} value={site.siteId}>
            {site.siteId === 'local' ? 'local (本地)' : site.siteId}
          </option>
        ))}
      </select>
      <p>当前站点: {currentSiteId}</p>
    </div>
  );
}

