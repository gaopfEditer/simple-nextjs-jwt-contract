// ==================== API 调用示例 ====================
// 前端路径和 API 端点说明

import axios from 'axios';

// 前端页面路径:
// /                    - 首页（显示统计）
// /article/1          - 示例文章1
// /article/2          - 示例文章2
// /article/3          - 示例文章3
// /stats/admin        - 访问统计管理页面（站点切换、访问列表、文章列表）
// /login              - 登录页
// /register           - 注册页
// /dashboard          - 仪表板

// API 端点:
// POST   /api/stats/track
// POST   /api/stats/article
// GET    /api/stats/overview
// GET    /api/stats/article?articleId=xxx
// GET    /api/stats/recent?limit=50
// GET    /api/stats/popular?limit=10
// GET    /api/stats/sites              - 获取所有站点列表

// 站点ID说明:
// - "local" 表示本地访问（127.x.x.x, 192.168.x.x 等）
// - 其他IP地址表示远程站点
// - 可通过 X-Site-ID 请求头指定站点

// ==================== 访问统计 API ====================

// 1. 记录访问（通常不需要手动调用，已在 _app.tsx 中自动集成）
export async function trackVisit(path?: string) {
  const response = await axios.post('/api/stats/track', {
    path: path || window.location.pathname,
  });
  return response.data;
}

// 2. 记录文章阅读
export async function trackArticleView(articleId: string) {
  const response = await axios.post('/api/stats/article', {
    articleId,
  });
  return response.data;
}

// 3. 获取站点统计概览
export async function getSiteStats() {
  const response = await axios.get('/api/stats/overview');
  return response.data;
  // 返回: { siteId: 'default', totalVisits: 30567, uniqueVisitors: 14156, totalArticleViews: 388 }
}

// 4. 获取文章阅读量
export async function getArticleStats(articleId: string) {
  const response = await axios.get(`/api/stats/article?articleId=${encodeURIComponent(articleId)}`);
  return response.data;
  // 返回: { articleId: 'article-123', views: 388, uniqueReaders: 256 }
}

// 5. 获取最近访问记录
export async function getRecentVisits(limit: number = 50) {
  const response = await axios.get(`/api/stats/recent?limit=${limit}`);
  return response.data;
  // 返回: { siteId: 'default', visits: [...], count: 50 }
}

// 6. 获取热门文章
export async function getPopularArticles(limit: number = 10) {
  const response = await axios.get(`/api/stats/popular?limit=${limit}`);
  return response.data;
  // 返回: { siteId: 'default', articles: [...], count: 10 }
}

// ==================== 多站点支持 ====================

// 获取所有站点列表
export async function getAllSites() {
  const response = await axios.get('/api/stats/sites');
  return response.data;
  // 返回: { sites: [...], count: 5 }
}

// 使用自定义站点ID获取统计
export async function getSiteStatsForSite(siteId: string) {
  const response = await axios.get('/api/stats/overview', {
    headers: {
      'X-Site-ID': siteId,
    },
  });
  return response.data;
}

// 使用自定义站点ID获取访问记录
export async function getRecentVisitsForSite(siteId: string, limit: number = 50) {
  const response = await axios.get(`/api/stats/recent?limit=${limit}`, {
    headers: {
      'X-Site-ID': siteId,
    },
  });
  return response.data;
}

// 使用自定义站点ID获取热门文章
export async function getPopularArticlesForSite(siteId: string, limit: number = 10) {
  const response = await axios.get(`/api/stats/popular?limit=${limit}`, {
    headers: {
      'X-Site-ID': siteId,
    },
  });
  return response.data;
}

// ==================== 使用示例 ====================

// 示例1: 在组件中获取统计数据
export async function example1() {
  const stats = await getSiteStats();
  console.log('总访问量:', stats.totalVisits);
  console.log('独立访客:', stats.uniqueVisitors);
  console.log('文章阅读量:', stats.totalArticleViews);
}

// 示例2: 获取文章统计
export async function example2(articleId: string) {
  const articleStats = await getArticleStats(articleId);
  console.log('文章阅读量:', articleStats.views);
  console.log('独立读者:', articleStats.uniqueReaders);
}

// 示例3: 手动记录文章阅读
export async function example3(articleId: string) {
  await trackArticleView(articleId);
  console.log('文章阅读已记录');
}

// 示例4: 获取热门文章列表
export async function example4() {
  const { articles } = await getPopularArticles(10);
  articles.forEach((article: any) => {
    console.log(`${article.article_id}: ${article.view_count} 次阅读`);
  });
}

// 示例5: 获取最近访问记录
export async function example5() {
  const { visits } = await getRecentVisits(20);
  visits.forEach((visit: any) => {
    console.log(`${visit.ip_address} 访问了 ${visit.path} (${visit.device_type})`);
  });
}

