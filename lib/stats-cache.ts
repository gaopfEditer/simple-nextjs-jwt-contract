/**
 * 统计缓存和汇总表管理
 */

import { getPool } from './db-connection';

/**
 * 更新或创建每日统计汇总
 * 应该在定时任务中调用（如每天凌晨执行）
 */
export async function updateDailyStats(siteId: string, date: Date = new Date()): Promise<void> {
  const pool = getPool();
  const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
  
  // 计算当天的统计数据
  const [visitRows] = await pool.execute(
    `SELECT 
      COUNT(*) as total_visits,
      COUNT(DISTINCT visitor_id) as unique_visitors
     FROM visits 
     WHERE site_id = ? 
     AND DATE(created_at) = ?`,
    [siteId, dateStr]
  ) as any[];
  
  const visitData = visitRows[0];
  
  // 计算当天的文章阅读量
  const [articleRows] = await pool.execute(
    `SELECT SUM(view_count) as total_article_views
     FROM article_views 
     WHERE site_id = ? 
     AND DATE(last_view_at) = ?`,
    [siteId, dateStr]
  ) as any[];
  
  const articleData = articleRows[0];
  
  // 插入或更新汇总数据
  await pool.execute(
    `INSERT INTO site_stats 
     (site_id, stat_date, total_visits, unique_visitors, total_article_views)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       total_visits = VALUES(total_visits),
       unique_visitors = VALUES(unique_visitors),
       total_article_views = VALUES(total_article_views),
       updated_at = NOW()`,
    [
      siteId,
      dateStr,
      visitData.total_visits || 0,
      visitData.unique_visitors || 0,
      articleData.total_article_views || 0,
    ]
  );
}

/**
 * 批量更新多个站点的每日统计
 */
export async function updateAllSitesDailyStats(date: Date = new Date()): Promise<void> {
  const pool = getPool();
  
  // 获取所有站点ID
  const [sites] = await pool.execute(
    'SELECT DISTINCT site_id FROM visits WHERE DATE(created_at) = ?',
    [date.toISOString().split('T')[0]]
  ) as any[];
  
  // 为每个站点更新统计
  for (const site of sites) {
    await updateDailyStats(site.site_id, date);
  }
}

/**
 * 归档旧数据（将90天前的数据移到归档表）
 */
export async function archiveOldVisits(daysToKeep: number = 90): Promise<number> {
  const pool = getPool();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
  
  // 将旧数据复制到归档表
  const [result] = await pool.execute(
    `INSERT INTO visits_archive 
     SELECT *, NOW() as archived_at 
     FROM visits 
     WHERE created_at < ?`,
    [cutoffDate]
  ) as any[];
  
  const archivedCount = result.affectedRows || 0;
  
  // 删除已归档的数据
  if (archivedCount > 0) {
    await pool.execute(
      'DELETE FROM visits WHERE created_at < ?',
      [cutoffDate]
    );
  }
  
  return archivedCount;
}

/**
 * 获取需要归档的数据量（用于监控）
 */
export async function getArchiveableCount(daysToKeep: number = 90): Promise<number> {
  const pool = getPool();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
  
  const [rows] = await pool.execute(
    'SELECT COUNT(*) as count FROM visits WHERE created_at < ?',
    [cutoffDate]
  ) as any[];
  
  return rows[0]?.count || 0;
}

