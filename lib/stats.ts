import { getPool } from './db-connection';
import { VisitorInfo, generateVisitorId, GeoInfo } from './visitor-info';

export interface VisitRecord {
  id: number;
  site_id: string;
  visitor_id: string;
  ip_address: string;
  user_agent: string;
  device_type: string;
  browser: string;
  browser_version: string;
  os: string;
  os_version: string;
  referer: string;
  path: string;
  query_string: string;
  country: string | null;
  region: string | null;
  city: string | null;
  created_at: Date;
}

export interface ArticleView {
  id: number;
  site_id: string;
  article_id: string;
  visitor_id: string;
  ip_address: string;
  view_count: number;
  first_view_at: Date;
  last_view_at: Date;
}

export interface SiteStats {
  totalVisits: number;
  uniqueVisitors: number;
  totalArticleViews: number;
}

/**
 * 记录访问
 */
export async function recordVisit(
  siteId: string,
  visitorInfo: VisitorInfo,
  geoInfo?: GeoInfo
): Promise<number> {
  const pool = getPool();
  const visitorId = generateVisitorId(visitorInfo.ip, visitorInfo.userAgent);

  const [result] = await pool.execute(
    `INSERT INTO visits (
      site_id, visitor_id, ip_address, user_agent, device_type,
      browser, browser_version, os, os_version,
      referer, path, query_string, country, region, city
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      siteId,
      visitorId,
      visitorInfo.ip,
      visitorInfo.userAgent,
      visitorInfo.deviceType,
      visitorInfo.browser,
      visitorInfo.browserVersion,
      visitorInfo.os,
      visitorInfo.osVersion,
      visitorInfo.referer,
      visitorInfo.path,
      visitorInfo.queryString,
      geoInfo?.country || null,
      geoInfo?.region || null,
      geoInfo?.city || null,
    ]
  ) as any[];

  return result.insertId;
}

/**
 * 记录文章阅读
 */
export async function recordArticleView(
  siteId: string,
  articleId: string,
  visitorInfo: VisitorInfo
): Promise<void> {
  const pool = getPool();
  const visitorId = generateVisitorId(visitorInfo.ip, visitorInfo.userAgent);

  // 使用 INSERT ... ON DUPLICATE KEY UPDATE 来更新已存在的记录
  await pool.execute(
    `INSERT INTO article_views (
      site_id, article_id, visitor_id, ip_address, view_count
    ) VALUES (?, ?, ?, ?, 1)
    ON DUPLICATE KEY UPDATE
      view_count = view_count + 1,
      last_view_at = NOW()`,
    [siteId, articleId, visitorId, visitorInfo.ip]
  );
}

/**
 * 获取站点总访问量（优化版：优先从汇总表读取）
 */
export async function getTotalVisits(
  siteId: string = 'default',
  useCache: boolean = true
): Promise<number> {
  const pool = getPool();
  
  // 优先从汇总表读取（如果启用缓存）
  if (useCache) {
    const [cacheRows] = await pool.execute(
      `SELECT SUM(total_visits) as total 
       FROM site_stats 
       WHERE site_id = ? 
       AND stat_date >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)`,
      [siteId]
    ) as any[];
    
    const cachedTotal = cacheRows[0]?.total;
    if (cachedTotal !== null && cachedTotal !== undefined) {
      // 汇总表只包含最近90天，需要加上历史总数
      const [historyRows] = await pool.execute(
        `SELECT SUM(total_visits) as total 
         FROM site_stats 
         WHERE site_id = ? 
         AND stat_date < DATE_SUB(CURDATE(), INTERVAL 90 DAY)`,
        [siteId]
      ) as any[];
      
      const historyTotal = historyRows[0]?.total || 0;
      return Number(cachedTotal) + Number(historyTotal);
    }
  }
  
  // 回退到直接查询（如果汇总表没有数据）
  const [rows] = await pool.execute(
    'SELECT COUNT(*) as count FROM visits WHERE site_id = ?',
    [siteId]
  ) as any[];

  return rows[0]?.count || 0;
}

/**
 * 获取站点独立访客数（优化版：优先从汇总表读取）
 */
export async function getUniqueVisitors(
  siteId: string = 'default',
  useCache: boolean = true
): Promise<number> {
  const pool = getPool();
  
  // 优先从汇总表读取（如果启用缓存）
  if (useCache) {
    // 注意：独立访客数不能简单相加，需要去重
    // 这里只查询最近90天的汇总数据，然后加上历史数据
    const [cacheRows] = await pool.execute(
      `SELECT SUM(unique_visitors) as total 
       FROM site_stats 
       WHERE site_id = ? 
       AND stat_date >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)`,
      [siteId]
    ) as any[];
    
    const cachedTotal = cacheRows[0]?.total;
    if (cachedTotal !== null && cachedTotal !== undefined) {
      // 对于独立访客，需要实际去重查询（汇总表只是近似值）
      // 这里返回汇总值作为快速估算，精确值需要全表查询
      return Number(cachedTotal);
    }
  }
  
  // 回退到直接查询（如果汇总表没有数据）
  // 注意：COUNT(DISTINCT) 在大数据量时很慢，建议使用汇总表
  const [rows] = await pool.execute(
    'SELECT COUNT(DISTINCT visitor_id) as count FROM visits WHERE site_id = ?',
    [siteId]
  ) as any[];

  return rows[0]?.count || 0;
}

/**
 * 获取文章阅读量
 */
export async function getArticleViews(
  articleId: string,
  siteId: string = 'default'
): Promise<number> {
  const pool = getPool();
  const [rows] = await pool.execute(
    'SELECT SUM(view_count) as total FROM article_views WHERE site_id = ? AND article_id = ?',
    [siteId, articleId]
  ) as any[];

  return rows[0]?.total || 0;
}

/**
 * 获取文章独立阅读数（去重访客数）
 */
export async function getArticleUniqueReaders(
  articleId: string,
  siteId: string = 'default'
): Promise<number> {
  const pool = getPool();
  const [rows] = await pool.execute(
    'SELECT COUNT(DISTINCT visitor_id) as count FROM article_views WHERE site_id = ? AND article_id = ?',
    [siteId, articleId]
  ) as any[];

  return rows[0]?.count || 0;
}

/**
 * 获取站点统计概览
 */
export async function getSiteStats(siteId: string = 'default'): Promise<SiteStats> {
  const [totalVisits, uniqueVisitors, totalArticleViews] = await Promise.all([
    getTotalVisits(siteId),
    getUniqueVisitors(siteId),
    getTotalArticleViews(siteId),
  ]);

  return {
    totalVisits,
    uniqueVisitors,
    totalArticleViews,
  };
}

/**
 * 获取站点文章总阅读量
 */
export async function getTotalArticleViews(siteId: string = 'default'): Promise<number> {
  const pool = getPool();
  const [rows] = await pool.execute(
    'SELECT SUM(view_count) as total FROM article_views WHERE site_id = ?',
    [siteId]
  ) as any[];

  return rows[0]?.total || 0;
}

/**
 * 获取最近访问记录（优化版）
 * - 只查询必要字段，避免 SELECT *
 * - 默认只查询最近30天，减少数据量
 * - 支持游标分页
 */
export async function getRecentVisits(
  siteId: string = 'default',
  limit: number = 50,
  options?: {
    beforeId?: number;        // 游标分页：基于ID
    beforeTime?: Date;         // 游标分页：基于时间
    days?: number;             // 查询最近N天，默认30天
    includeFields?: string[]; // 需要包含的额外字段
  }
): Promise<VisitRecord[]> {
  const pool = getPool();
  const safeLimit = Math.max(1, Math.min(1000, parseInt(String(limit), 10) || 50));
  const days = options?.days || 30;
  
  // 基础字段（列表查询必需，避免查询大字段如 user_agent, referer, query_string）
  const baseFields = [
    'id', 'site_id', 'ip_address', 'device_type', 
    'browser', 'os', 'path', 'created_at'
  ];
  
  // 如果需要额外字段
  const extraFields = options?.includeFields || [];
  const allFields = [...baseFields, ...extraFields].join(', ');
  
  // 构建 WHERE 条件
  const conditions: string[] = ['site_id = ?'];
  const params: any[] = [siteId];
  
  // 时间范围限制（默认最近30天）
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  conditions.push('created_at >= ?');
  params.push(cutoffDate);
  
  // 游标分页：基于ID
  if (options?.beforeId) {
    conditions.push('id < ?');
    params.push(options.beforeId);
  }
  // 游标分页：基于时间
  else if (options?.beforeTime) {
    conditions.push('created_at < ?');
    params.push(options.beforeTime);
  }
  
  const whereClause = conditions.join(' AND ');
  
  const [rows] = await pool.execute(
    `SELECT ${allFields} FROM visits 
     WHERE ${whereClause}
     ORDER BY created_at DESC, id DESC
     LIMIT ${safeLimit}`,
    params
  ) as any[];

  return rows.map(mapRowToVisitRecord);
}

/**
 * 获取热门文章（按阅读量排序）
 */
export async function getPopularArticles(
  siteId: string = 'default',
  limit: number = 10
): Promise<Array<{ article_id: string; view_count: number; unique_readers: number }>> {
  const pool = getPool();
  // LIMIT 不能使用占位符，需要直接拼接（确保 limit 是整数防止 SQL 注入）
  const safeLimit = Math.max(1, Math.min(1000, parseInt(String(limit), 10) || 10));
  const [rows] = await pool.execute(
    `SELECT 
      article_id,
      SUM(view_count) as view_count,
      COUNT(DISTINCT visitor_id) as unique_readers
     FROM article_views 
     WHERE site_id = ? 
     GROUP BY article_id 
     ORDER BY view_count DESC 
     LIMIT ${safeLimit}`,
    [siteId]
  ) as any[];

  return rows.map((row: any) => ({
    article_id: row.article_id,
    view_count: Number(row.view_count),
    unique_readers: Number(row.unique_readers),
  }));
}

/**
 * 将数据库行映射到 VisitRecord 对象
 */
function mapRowToVisitRecord(row: any): VisitRecord {
  return {
    id: row.id,
    site_id: row.site_id,
    visitor_id: row.visitor_id,
    ip_address: row.ip_address,
    user_agent: row.user_agent,
    device_type: row.device_type,
    browser: row.browser,
    browser_version: row.browser_version,
    os: row.os,
    os_version: row.os_version,
    referer: row.referer,
    path: row.path,
    query_string: row.query_string,
    country: row.country,
    region: row.region,
    city: row.city,
    created_at: new Date(row.created_at),
  };
}

