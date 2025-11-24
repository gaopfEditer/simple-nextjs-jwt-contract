// 测试 JWT token 生成，用于对比不同系统的 token
// 使用方法: node scripts/test-jwt.js

require('dotenv').config({ path: '.env.local' });
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// 测试用 payload
const payload = {
  userId: 1,
  email: '1241961245@qq.com',
};

console.log('🔍 JWT Token 生成测试\n');
console.log('配置信息:');
console.log(`- Secret: ${JWT_SECRET ? '已设置 (长度: ' + JWT_SECRET.length + ')' : '未设置'}`);
console.log(`- Payload:`, payload);
console.log('');

// 生成 token
const token = jwt.sign(payload, JWT_SECRET, {
  expiresIn: '7d',
  algorithm: 'HS256',
});

console.log('生成的 Token:');
console.log(token);
console.log('');

// 解码 token（不验证签名，仅查看内容）
try {
  const decoded = jwt.decode(token, { complete: true });
  console.log('Token 结构:');
  console.log('- Header:', decoded.header);
  console.log('- Payload:', decoded.payload);
  console.log('');
  
  console.log('Payload 详细信息:');
  console.log(`  - userId: ${decoded.payload.userId}`);
  console.log(`  - email: ${decoded.payload.email}`);
  console.log(`  - iat (签发时间): ${decoded.payload.iat} (${new Date(decoded.payload.iat * 1000).toISOString()})`);
  console.log(`  - exp (过期时间): ${decoded.payload.exp} (${new Date(decoded.payload.exp * 1000).toISOString()})`);
  console.log('');
  
  // 验证 token
  try {
    const verified = jwt.verify(token, JWT_SECRET);
    console.log('✅ Token 验证成功');
  } catch (err) {
    console.log('❌ Token 验证失败:', err.message);
  }
} catch (err) {
  console.log('❌ 解码失败:', err.message);
}

console.log('\n📝 说明:');
console.log('- 即使使用相同的 secret 和 payload，每次生成的 token 都不同');
console.log('- 因为 iat (签发时间) 和 exp (过期时间) 每次都会更新');
console.log('- 如果两个系统要生成相同的 token，需要：');
console.log('  1. 相同的 secret');
console.log('  2. 相同的 payload 结构（字段名、值）');
console.log('  3. 相同的 iat 和 exp（需要精确到秒）');
console.log('  4. 相同的算法（通常都是 HS256）');

