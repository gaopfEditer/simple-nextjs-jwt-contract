// 检查服务器是否正在运行
const http = require('http');

const port = process.env.PORT || 3123;
const url = `http://localhost:${port}`;

console.log(`检查服务器是否在端口 ${port} 上运行...`);

const req = http.request({
  hostname: 'localhost',
  port: port,
  path: '/',
  method: 'GET',
  timeout: 3000
}, (res) => {
  console.log(`✅ 服务器正在运行！状态码: ${res.statusCode}`);
  console.log(`   服务器地址: ${url}`);
  process.exit(0);
});

req.on('error', (error) => {
  console.error(`❌ 无法连接到服务器: ${error.message}`);
  console.error(`   请确保服务器正在运行: pnpm dev`);
  console.error(`   检查端口 ${port} 是否被占用`);
  process.exit(1);
});

req.on('timeout', () => {
  console.error(`❌ 连接超时`);
  console.error(`   服务器可能没有响应`);
  req.destroy();
  process.exit(1);
});

req.end();

