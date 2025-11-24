// 测试数据库连接的脚本
// 使用方法: node scripts/test-db-connection.js

require('dotenv').config({ path: '.env.local' });
const mysql = require('mysql2/promise');

async function testConnection() {
  const config = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'nextjs_jwt',
  };

  console.log('尝试连接数据库...');
  console.log('配置信息:', {
    host: config.host,
    port: config.port,
    user: config.user,
    database: config.database,
    passwordSet: !!config.password,
    passwordLength: config.password ? config.password.length : 0,
    passwordPreview: config.password ? 
      (config.password.length > 0 ? config.password.substring(0, 1) + '***' + config.password.substring(config.password.length - 1) : 'empty') : 
      'not set',
  });

  try {
    const connection = await mysql.createConnection(config);
    console.log('✅ 数据库连接成功！');
    
    // 测试查询
    const [rows] = await connection.execute('SELECT 1 as test');
    console.log('✅ 测试查询成功:', rows);
    
    await connection.end();
    console.log('✅ 连接已关闭');
  } catch (error) {
    console.error('❌ 数据库连接失败:');
    console.error('错误信息:', error.message);
    console.error('错误代码:', error.code);
    console.error('错误详情:', {
      errno: error.errno,
      sqlState: error.sqlState,
      sqlMessage: error.sqlMessage,
    });
    process.exit(1);
  }
}

testConnection();

