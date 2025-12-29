/**
 * 归档旧访问记录的定时任务脚本
 * 建议使用 cron 每周执行一次：0 2 * * 0 node scripts/archive-old-visits.js
 */

require('dotenv').config();
const mysql = require('mysql2/promise');

async function getArchiveableCount(daysToKeep = 90) {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'nextjs_jwt',
  });
  
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
  
  const [rows] = await pool.execute(
    'SELECT COUNT(*) as count FROM visits WHERE created_at < ?',
    [cutoffDate]
  );
  
  await pool.end();
  return rows[0].count || 0;
}

async function archiveOldVisits(daysToKeep = 90) {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'nextjs_jwt',
  });
  
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
  
  const [result] = await pool.execute(
    `INSERT INTO visits_archive SELECT *, NOW() as archived_at FROM visits WHERE created_at < ?`,
    [cutoffDate]
  );
  
  const archivedCount = result.affectedRows || 0;
  
  if (archivedCount > 0) {
    await pool.execute('DELETE FROM visits WHERE created_at < ?', [cutoffDate]);
  }
  
  await pool.end();
  return archivedCount;
}

async function main() {
  try {
    console.log('开始检查可归档的数据...');
    const count = await getArchiveableCount(90); // 保留90天
    
    if (count === 0) {
      console.log('没有需要归档的数据');
      process.exit(0);
    }
    
    console.log(`发现 ${count} 条可归档的记录，开始归档...`);
    const archived = await archiveOldVisits(90);
    console.log(`成功归档 ${archived} 条记录`);
    process.exit(0);
  } catch (error) {
    console.error('归档失败:', error);
    process.exit(1);
  }
}

main();

