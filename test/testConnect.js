// 远程数据库和Redis连接测试
require('dotenv').config({ path: '.env.local' });

const mysql = require('mysql2/promise');
const redis = require('redis');
const https = require('https');
const http = require('http');

// 配置
const DB_CONFIG = {
  // host: "60.205.120.196",
  // port: parseInt("3306"),
  // database: "wails-contract-warn",
  // user: "root",
  // password: "b01c044f2e0bf36e",
  // connectTimeout: 10000, // 10秒连接超时
  // connectionLimit: 1,
  // enableKeepAlive: true,
  // keepAliveInitialDelay: 0,
  // ssl: false,
  host: "113.90.157.137",
  port: parseInt("3388"),
  database: "nextjs_jwt",
  user: "root",
  password: "Cambridge#*DR",
  connectTimeout: 10000, // 10秒连接超时
  connectionLimit: 1,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  ssl: false,
};

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// 测试MySQL（带重试）
async function testMySQL(retries = 3) {
  console.log('\n=== 测试 MySQL 连接 ===');
  console.log(`主机: ${DB_CONFIG.host}:${DB_CONFIG.port}`);
  console.log(`数据库: ${DB_CONFIG.database}`);
  console.log(`用户: ${DB_CONFIG.user}`);
  
  for (let i = 0; i < retries; i++) {
    if (i > 0) {
      console.log(`\n🔄 重试连接 (${i + 1}/${retries})...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    try {
      const startTime = Date.now();
      const connection = await Promise.race([
        mysql.createConnection(DB_CONFIG),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('连接超时')), DB_CONFIG.connectTimeout)
        )
      ]);
      
      const connectTime = Date.now() - startTime;
      console.log(`✅ MySQL 连接成功 (${connectTime}ms)`);
      
      // 测试查询
      const [rows] = await connection.execute('SELECT VERSION() as version, NOW() as time');
      console.log(`✅ 查询成功: MySQL ${rows[0].version}, 服务器时间: ${rows[0].time}`);
      
      // 测试表
      const [tables] = await connection.execute('SHOW TABLES');
      console.log(`✅ 数据库表数量: ${tables.length}`);
      
      await connection.end();
      return { success: true, time: connectTime };
    } catch (error) {
      const isLastAttempt = i === retries - 1;
      console.log(`❌ MySQL 连接失败: ${error.message}`);
      console.log(`   错误代码: ${error.code || 'N/A'}`);
      console.log(`   SQL状态: ${error.sqlState || 'N/A'}`);
      
      if (isLastAttempt) {
        return { success: false, error: error.message, code: error.code };
      }
    }
  }
}

// 测试Redis
async function testRedis() {
  console.log('\n=== 测试 Redis 连接 ===');
  console.log(`URL: ${REDIS_URL.replace(/:[^:@]+@/, ':****@')}`);
  
  try {
    const startTime = Date.now();
    const client = redis.createClient({ url: REDIS_URL });
    
    client.on('error', (err) => {
      console.log(`❌ Redis 错误: ${err.message}`);
    });
    
    await client.connect();
    const connectTime = Date.now() - startTime;
    console.log(`✅ Redis 连接成功 (${connectTime}ms)`);
    
    // 测试SET/GET
    await client.set('test_key', 'test_value');
    const value = await client.get('test_key');
    console.log(`✅ SET/GET 测试成功: ${value}`);
    
    await client.del('test_key');
    await client.quit();
    return { success: true, time: connectTime };
  } catch (error) {
    console.log(`❌ Redis 连接失败: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// 获取当前公网IP（带超时和错误处理）
async function getPublicIP() {
  const timeout = 5000;
  const urls = [
    'https://api.ipify.org?format=json',
    'https://api64.ipify.org?format=json',
    'http://ip-api.com/json'
  ];
  
  for (const url of urls) {
    try {
      return await Promise.race([
        new Promise((resolve, reject) => {
          const protocol = url.startsWith('https') ? https : http;
          const req = protocol.get(url, { timeout }, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
              try {
                const json = JSON.parse(data);
                resolve(json.ip || json.query || '无法获取');
              } catch (e) {
                reject(e);
              }
            });
          });
          req.on('error', reject);
          req.on('timeout', () => {
            req.destroy();
            reject(new Error('超时'));
          });
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('超时')), timeout)
        )
      ]);
    } catch (error) {
      // 继续尝试下一个URL
      continue;
    }
  }
  
  return '无法获取';
}

// 主函数
async function main() {
  console.log('🔍 开始测试远程连接...\n');
  
  // 显示当前公网IP（不阻塞主流程）
  getPublicIP().then(ip => {
    if (ip !== '无法获取') {
      console.log(`📍 当前公网IP: ${ip}`);
    }
  }).catch(() => {
    // 静默失败
  });
  
  const mysqlResult = await testMySQL(3);
  const redisResult = await testRedis();
  
  // 如果MySQL失败，再获取IP显示解决方案
  if (!mysqlResult.success) {
    const publicIP = await getPublicIP();
    if (publicIP !== '无法获取') {
      console.log(`\n📍 当前公网IP: ${publicIP}`);
    }
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('📊 测试结果汇总:');
  console.log(`   MySQL: ${mysqlResult.success ? '✅ 成功' : '❌ 失败'}`);
  
  if (!mysqlResult.success) {
    // 获取公网IP用于显示解决方案
    let publicIP = '无法获取';
    try {
      publicIP = await getPublicIP();
    } catch (e) {
      // 忽略错误
    }
    
    // 处理不同的错误类型
    if (mysqlResult.error?.includes('not allowed to connect')) {
      console.log(`\n💡 MySQL授权问题说明:`);
      console.log(`   即使 MySQL bind-address 设置为 0.0.0.0，`);
      console.log(`   也需要在用户权限表中授权你的IP: ${publicIP}`);
      console.log(`\n📋 解决方案（在MySQL服务器 ${DB_CONFIG.host} 上执行）:`);
      console.log(`\n   1. 检查当前用户权限:`);
      console.log(`   SELECT user, host FROM mysql.user WHERE user='${DB_CONFIG.user}';`);
      console.log(`\n   2. 授权你的IP:`);
      if (publicIP !== '无法获取') {
        console.log(`   GRANT ALL PRIVILEGES ON \`${DB_CONFIG.database}\`.* TO '${DB_CONFIG.user}'@'${publicIP}' IDENTIFIED BY '${DB_CONFIG.password}';`);
      }
      console.log(`   FLUSH PRIVILEGES;`);
      console.log(`\n   3. 或者允许所有IP（测试环境可用）:`);
      console.log(`   GRANT ALL PRIVILEGES ON \`${DB_CONFIG.database}\`.* TO '${DB_CONFIG.user}'@'%' IDENTIFIED BY '${DB_CONFIG.password}';`);
      console.log(`   FLUSH PRIVILEGES;`);
    } else if (mysqlResult.code === 'ECONNRESET' || mysqlResult.error?.includes('ECONNRESET')) {
      console.log(`\n💡 连接被重置 (ECONNRESET) 问题说明:`);
      console.log(`   连接被服务器主动关闭，可能原因:`);
      console.log(`   1. MySQL服务器防火墙阻止连接`);
      console.log(`   2. MySQL服务器配置限制`);
      console.log(`   3. 网络不稳定或超时`);
      console.log(`\n📋 解决方案:`);
      console.log(`\n   1. 检查MySQL服务器防火墙:`);
      console.log(`   sudo ufw status`);
      console.log(`   sudo firewall-cmd --list-all`);
      console.log(`   # 确保 3306 端口开放`);
      console.log(`\n   2. 检查MySQL是否允许远程连接:`);
      console.log(`   SHOW VARIABLES LIKE 'bind_address';`);
      console.log(`   # 应该显示: bind_address | 0.0.0.0 或 127.0.0.1`);
      console.log(`\n   3. 检查用户权限:`);
      console.log(`   SELECT user, host FROM mysql.user WHERE user='${DB_CONFIG.user}';`);
      if (publicIP !== '无法获取') {
        console.log(`   # 确保有 '${DB_CONFIG.user}'@'${publicIP}' 或 '${DB_CONFIG.user}'@'%' 的授权`);
      }
      console.log(`\n   4. 检查MySQL错误日志:`);
      console.log(`   sudo tail -f /var/log/mysql/error.log`);
    } else if (mysqlResult.code === 'ETIMEDOUT' || mysqlResult.error?.includes('timeout')) {
      console.log(`\n💡 连接超时问题说明:`);
      console.log(`   无法在指定时间内连接到MySQL服务器`);
      console.log(`\n📋 解决方案:`);
      console.log(`   1. 检查网络连接: ping ${DB_CONFIG.host}`);
      console.log(`   2. 检查端口是否开放: telnet ${DB_CONFIG.host} ${DB_CONFIG.port}`);
      console.log(`   3. 检查防火墙设置`);
      console.log(`   4. 检查MySQL服务是否运行`);
    }
    
    console.log(`\n   5. 检查 MySQL 配置:`);
    console.log(`   SHOW VARIABLES LIKE 'bind_address';`);
    console.log(`   # 应该显示: bind_address | 0.0.0.0`);
    console.log(`\n   6. 检查防火墙:`);
    console.log(`   # 确保 3306 端口开放`);
    console.log(`   sudo ufw status | grep 3306`);
    console.log(`   # 或`);
    console.log(`   sudo firewall-cmd --list-ports | grep 3306`);
  }
  
  console.log(`   Redis: ${redisResult.success ? '✅ 成功' : '❌ 失败'}`);
  console.log('='.repeat(50));
}

main().catch(console.error);

