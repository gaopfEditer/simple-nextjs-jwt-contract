// 数据库连接诊断工具
// 使用方法: node scripts/diagnose.js

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function diagnose() {
  console.log('🔍 开始诊断数据库连接问题...\n');

  // 1. 检查 .env.local 文件
  console.log('1️⃣  检查 .env.local 文件...');
  const envPath = path.join(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    console.log('   ✅ .env.local 文件存在');
    const envContent = fs.readFileSync(envPath, 'utf8');
    const lines = envContent.split('\n').filter(line => line.trim() && !line.trim().startsWith('#'));
    
    const envVars = {};
    lines.forEach(line => {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim();
        envVars[key] = value;
      }
    });

    console.log('   配置项:');
    console.log(`   - DB_HOST: ${envVars.DB_HOST || '(未设置)'}`);
    console.log(`   - DB_PORT: ${envVars.DB_PORT || '(未设置)'}`);
    console.log(`   - DB_USER: ${envVars.DB_USER || '(未设置)'}`);
    console.log(`   - DB_PASSWORD: ${envVars.DB_PASSWORD ? `已设置 (长度: ${envVars.DB_PASSWORD.length})` : '(未设置)'}`);
    console.log(`   - DB_NAME: ${envVars.DB_NAME || '(未设置)'}`);
  } else {
    console.log('   ❌ .env.local 文件不存在！');
    console.log('   请创建 .env.local 文件并添加数据库配置');
    return;
  }

  // 2. 加载环境变量
  console.log('\n2️⃣  加载环境变量...');
  require('dotenv').config({ path: '.env.local' });
  const config = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'nextjs_jwt',
  };

  console.log('   从环境变量读取的配置:');
  console.log(`   - host: ${config.host}`);
  console.log(`   - port: ${config.port}`);
  console.log(`   - user: ${config.user}`);
  console.log(`   - database: ${config.database}`);
  console.log(`   - password: ${config.password ? `已设置 (长度: ${config.password.length})` : '(未设置)'}`);

  // 3. 测试连接
  console.log('\n3️⃣  测试数据库连接...');
  try {
    const connection = await mysql.createConnection(config);
    console.log('   ✅ 连接成功！');

    // 检查数据库是否存在
    const [dbs] = await connection.execute(
      'SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ?',
      [config.database]
    );
    
    if (dbs.length > 0) {
      console.log(`   ✅ 数据库 '${config.database}' 存在`);
    } else {
      console.log(`   ⚠️  数据库 '${config.database}' 不存在`);
      console.log(`   请执行: CREATE DATABASE ${config.database} DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    }

    // 检查表是否存在
    try {
      await connection.execute(`USE ${config.database}`);
      const [tables] = await connection.execute(
        "SHOW TABLES LIKE 'users'"
      );
      if (tables.length > 0) {
        console.log(`   ✅ users 表存在`);
        
        // 查看表结构
        const [structure] = await connection.execute('DESCRIBE users');
        console.log(`   ✅ 表结构正常 (${structure.length} 个字段)`);
      } else {
        console.log(`   ⚠️  users 表不存在`);
        console.log(`   请执行建表语句: SOURCE database/schema.sql;`);
      }
    } catch (err) {
      console.log(`   ⚠️  无法检查表: ${err.message}`);
    }

    await connection.end();
    console.log('\n✅ 诊断完成：数据库连接正常！');
  } catch (error) {
    console.log('   ❌ 连接失败！');
    console.log(`   错误: ${error.message}`);
    console.log(`   错误代码: ${error.code}`);
    
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log('\n📋 可能的解决方案:');
      console.log('\n   方案 A: 修改 MySQL 用户认证插件');
      console.log('   ────────────────────────────────────────────');
      console.log('   在 MySQL 中执行:');
      console.log(`   ALTER USER '${config.user}'@'localhost' IDENTIFIED WITH mysql_native_password BY '你的密码';`);
      console.log('   FLUSH PRIVILEGES;');
      
      console.log('\n   方案 B: 检查密码是否正确');
      console.log('   ────────────────────────────────────────────');
      console.log('   在命令行测试:');
      console.log(`   mysql -h ${config.host} -P ${config.port} -u ${config.user} -p`);
      console.log('   如果能连接，说明密码是对的');
      
      console.log('\n   方案 C: 创建新用户（推荐）');
      console.log('   ────────────────────────────────────────────');
      console.log('   在 MySQL 中执行:');
      console.log('   CREATE USER \'nextjs_user\'@\'localhost\' IDENTIFIED WITH mysql_native_password BY \'secure_password\';');
      console.log(`   GRANT ALL PRIVILEGES ON ${config.database}.* TO 'nextjs_user'@'localhost';`);
      console.log('   FLUSH PRIVILEGES;');
      console.log('   然后更新 .env.local 中的 DB_USER 和 DB_PASSWORD');
    } else if (error.code === 'ECONNREFUSED') {
      console.log('\n📋 MySQL 服务可能没有运行');
      console.log('   请确保 MySQL 服务已启动');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.log('\n📋 数据库不存在');
      console.log(`   请创建数据库: CREATE DATABASE ${config.database};`);
    }
  }
}

diagnose().catch(console.error);

