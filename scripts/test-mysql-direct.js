// 直接测试 MySQL 连接（不依赖 .env.local）
// 使用方法: node scripts/test-mysql-direct.js

const mysql = require('mysql2/promise');

// 手动输入配置（用于测试）
const config = {
  host: 'localhost',
  port: 3388,
  user: 'root',
  password: '', // 在这里手动填入你的密码
  database: 'nextjs_jwt',
};

async function testConnection() {
  console.log('尝试连接数据库...');
  console.log('配置信息:', {
    host: config.host,
    port: config.port,
    user: config.user,
    database: config.database,
    passwordLength: config.password ? config.password.length : 0,
  });

  try {
    const connection = await mysql.createConnection(config);
    console.log('✅ 数据库连接成功！');
    
    // 测试查询
    const [rows] = await connection.execute('SELECT 1 as test');
    console.log('✅ 测试查询成功:', rows);
    
    // 检查 users 表是否存在
    try {
      const [tables] = await connection.execute(
        "SHOW TABLES LIKE 'users'"
      );
      if (tables.length > 0) {
        console.log('✅ users 表存在');
        
        // 查看表结构
        const [structure] = await connection.execute('DESCRIBE users');
        console.log('✅ 表结构:', structure);
      } else {
        console.log('⚠️  users 表不存在，需要执行建表语句');
      }
    } catch (err) {
      console.log('⚠️  无法检查表:', err.message);
    }
    
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
    
    // 提供具体的解决建议
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log('\n📋 解决建议:');
      console.log('1. 确认密码是否正确');
      console.log('2. 尝试在 MySQL 中执行:');
      console.log('   ALTER USER \'root\'@\'localhost\' IDENTIFIED WITH mysql_native_password BY \'你的密码\';');
      console.log('   FLUSH PRIVILEGES;');
      console.log('3. 或者创建一个新用户:');
      console.log('   CREATE USER \'nextjs_user\'@\'localhost\' IDENTIFIED BY \'secure_password\';');
      console.log('   GRANT ALL PRIVILEGES ON nextjs_jwt.* TO \'nextjs_user\'@\'localhost\';');
      console.log('   FLUSH PRIVILEGES;');
    }
    
    process.exit(1);
  }
}

testConnection();

