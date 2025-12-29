/**
 * 更新每日统计汇总的定时任务脚本
 * 建议使用 cron 每天凌晨执行：0 1 * * * node scripts/update-daily-stats.js
 */

require('dotenv').config();

// 注意：需要编译 TypeScript 或使用 ts-node
// 这里提供一个简化的 JavaScript 版本
const mysql = require('mysql2/promise');

async function updateDailyStats(siteId, date = new Date()) {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'nextjs_jwt',
  });
  
  const dateStr = date.toISOString().split('T')[0];
  
  const [visitRows] = await pool.execute(
    `SELECT COUNT(*) as total_visits, COUNT(DISTINCT visitor_id) as unique_visitors
     FROM visits WHERE site_id = ? AND DATE(created_at) = ?`,
    [siteId, dateStr]
  );
  
  const [articleRows] = await pool.execute(
    `SELECT SUM(view_count) as total_article_views
     FROM article_views WHERE site_id = ? AND DATE(last_view_at) = ?`,
    [siteId, dateStr]
  );
  
  await pool.execute(
    `INSERT INTO site_stats (site_id, stat_date, total_visits, unique_visitors, total_article_views)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       total_visits = VALUES(total_visits),
       unique_visitors = VALUES(unique_visitors),
       total_article_views = VALUES(total_article_views),
       updated_at = NOW()`,
    [
      siteId,
      dateStr,
      visitRows[0].total_visits || 0,
      visitRows[0].unique_visitors || 0,
      articleRows[0].total_article_views || 0,
    ]
  );
  
  await pool.end();
}

async function updateAllSitesDailyStats(date = new Date()) {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'nextjs_jwt',
  });
  
  const dateStr = date.toISOString().split('T')[0];
  const [sites] = await pool.execute(
    'SELECT DISTINCT site_id FROM visits WHERE DATE(created_at) = ?',
    [dateStr]
  );
  
  for (const site of sites) {
    await updateDailyStats(site.site_id, date);
  }
  
  await pool.end();
}

async function main() {
  try {
    console.log('开始更新每日统计汇总...');
    const date = new Date();
    // 更新昨天的统计（因为今天的数据还在增长）
    date.setDate(date.getDate() - 1);
    
    await updateAllSitesDailyStats(date);
    console.log('每日统计汇总更新完成');
    process.exit(0);
  } catch (error) {
    console.error('更新统计汇总失败:', error);
    process.exit(1);
  }
}

main();

