// 测试多个服务的连接脚本
// 使用方法: node testEndServer.js

// Redis 连接参数
const REDIS_URL = 'redis://default:foobared@60.205.120.196:6379';

// MongoDB 连接参数
const MONGODB_URI = 'mongodb://admin:5GwYsADkufxyYjer@60.205.120.196:27017/fastgpt?authSource=admin&directConnection=true&replicaSet=rs0';
const MONGODB_LOG_URI = 'mongodb://admin:5GwYsADkufxyYjer@60.205.120.196:27017/fastgpt?authSource=admin&directConnection=true&replicaSet=rs0';

// PostgreSQL 连接参数
const PG_URL = 'postgresql://postgres:WeSDalsf2kpxrNJN@60.205.120.196:7007/postgres';

// 测试结果汇总
const results = {
  redis: { success: false, error: null },
  mongodb: { success: false, error: null },
  mongodbLog: { success: false, error: null },
  postgresql: { success: false, error: null }
};

// 等待函数
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 测试 Redis 连接
async function testRedis() {
  console.log('\n=== 测试 Redis 连接 ===');
  console.log('Redis URL:', REDIS_URL.replace(/:[^:@]+@/, ':****@')); // 隐藏密码
  
  const maxRetries = 5;
  let lastError = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // 动态导入 redis 模块
      const redis = require('redis');
      const client = redis.createClient({ url: REDIS_URL });
      
      // 设置连接超时
      client.on('error', (err) => {
        lastError = err;
      });
      
      await Promise.race([
        client.connect(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('连接超时')), 5000)
        )
      ]);
      
      console.log('✅ Redis 连接成功！');
      
      // 测试 SET/GET
      await client.set('test_key', 'test_value');
      const value = await client.get('test_key');
      console.log('✅ Redis 测试 SET/GET 成功:', value);
      
      await client.del('test_key');
      await client.quit();
      results.redis.success = true;
      return;
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries) {
        console.log(`   尝试 ${attempt}/${maxRetries} 失败，${error.message}，等待 1 秒后重试...`);
        await sleep(1000);
      }
    }
  }
  
  // 5次都失败
  console.error(`❌ Redis 测试失败: 已尝试 ${maxRetries} 次`);
  console.error('错误信息:', lastError?.message || '连接失败');
  results.redis.error = lastError?.message || '连接失败';
  
  if (lastError?.code === 'MODULE_NOT_FOUND') {
    console.error('💡 提示: 请先安装 redis 包: npm install redis 或 pnpm add redis');
  }
}

// 测试 MongoDB 连接
async function testMongoDB(uri, name) {
  console.log(`\n=== 测试 ${name} 连接 ===`);
  console.log('MongoDB URI:', uri.replace(/:[^:@]+@/, ':****@')); // 隐藏密码
  
  const maxRetries = 5;
  let lastError = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const { MongoClient } = require('mongodb');
      const client = new MongoClient(uri, {
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 5000
      });
      
      await client.connect();
      console.log(`✅ ${name} 连接成功！`);
      
      // 测试数据库操作
      const db = client.db();
      const collections = await db.listCollections().toArray();
      console.log(`✅ ${name} 数据库操作成功，找到 ${collections.length} 个集合`);
      
      await client.close();
      return { success: true, error: null };
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries) {
        console.log(`   尝试 ${attempt}/${maxRetries} 失败，${error.message}，等待 1 秒后重试...`);
        await sleep(1000);
      }
    }
  }
  
  // 5次都失败
  console.error(`❌ ${name} 测试失败: 已尝试 ${maxRetries} 次`);
  console.error('错误信息:', lastError?.message || '连接失败');
  
  if (lastError?.code === 'MODULE_NOT_FOUND') {
    console.error('💡 提示: 请先安装 mongodb 包: npm install mongodb 或 pnpm add mongodb');
  }
  
  return { success: false, error: lastError?.message || '连接失败' };
}

// 测试 PostgreSQL 连接
async function testPostgreSQL() {
  console.log('\n=== 测试 PostgreSQL 连接 ===');
  console.log('PostgreSQL URL:', PG_URL.replace(/:[^:@]+@/, ':****@')); // 隐藏密码
  
  const maxRetries = 5;
  let lastError = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const { Client } = require('pg');
      const client = new Client({ 
        connectionString: PG_URL,
        connectionTimeoutMillis: 5000
      });
      
      await client.connect();
      console.log('✅ PostgreSQL 连接成功！');
      
      // 测试查询
      const result = await client.query('SELECT version() as version, current_database() as database');
      console.log('✅ PostgreSQL 测试查询成功:');
      console.log('  数据库版本:', result.rows[0].version.split('\n')[0]);
      console.log('  当前数据库:', result.rows[0].database);
      
      await client.end();
      results.postgresql.success = true;
      return;
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries) {
        console.log(`   尝试 ${attempt}/${maxRetries} 失败，${error.message}，等待 1 秒后重试...`);
        await sleep(1000);
      }
    }
  }
  
  // 5次都失败
  console.error(`❌ PostgreSQL 测试失败: 已尝试 ${maxRetries} 次`);
  console.error('错误信息:', lastError?.message || '连接失败');
  results.postgresql.error = lastError?.message || '连接失败';
  
  if (lastError?.code === 'MODULE_NOT_FOUND') {
    console.error('💡 提示: 请先安装 pg 包: npm install pg 或 pnpm add pg');
  }
}

// 主函数
async function runTests() {
  console.log('🚀 开始测试所有服务连接...\n');
  
  // 测试 Redis
  await testRedis();
  
  // 测试 MongoDB
  const mongodbResult = await testMongoDB(MONGODB_URI, 'MongoDB');
  results.mongodb = mongodbResult;
  
  // 测试 MongoDB 日志库
  const mongodbLogResult = await testMongoDB(MONGODB_LOG_URI, 'MongoDB 日志库');
  results.mongodbLog = mongodbLogResult;
  
  // 测试 PostgreSQL
  await testPostgreSQL();
  
  // 输出测试结果汇总
  console.log('\n' + '='.repeat(50));
  console.log('📊 测试结果汇总');
  console.log('='.repeat(50));
  
  const testResults = [
    { name: 'Redis', result: results.redis },
    { name: 'MongoDB', result: results.mongodb },
    { name: 'MongoDB 日志库', result: results.mongodbLog },
    { name: 'PostgreSQL', result: results.postgresql }
  ];
  
  testResults.forEach(({ name, result }) => {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${name}: ${result.success ? '成功' : '失败'}`);
    if (result.error) {
      console.log(`   错误: ${result.error}`);
    }
  });
  
  const successCount = testResults.filter(t => t.result.success).length;
  const totalCount = testResults.length;
  
  console.log('\n' + '='.repeat(50));
  console.log(`总计: ${successCount}/${totalCount} 个服务连接成功`);
  console.log('='.repeat(50));
  
  // 如果有失败的测试，退出码为 1
  if (successCount < totalCount) {
    process.exit(1);
  }
}

// 运行测试
runTests().catch((error) => {
  console.error('❌ 测试过程中发生未预期的错误:', error);
  process.exit(1);
});

