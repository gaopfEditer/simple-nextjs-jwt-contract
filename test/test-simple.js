// 最简单的测试 - 直接测试服务器是否响应
const http = require('http');

const port = process.env.PORT || 3123;

console.log(`测试服务器 http://localhost:${port}/api/tradingview/receive`);

const data = JSON.stringify({
  ticker: 'BTCUSDT',
  time: '2024-01-15T10:30:00Z',
  close: 45000.5,
  message: 'test message'
});

const req = http.request({
  hostname: 'localhost',
  port: port,
  path: '/api/tradingview/receive',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
}, (res) => {
  console.log(`\n✅ 收到响应！`);
  console.log(`状态码: ${res.statusCode}`);
  
  let body = '';
  res.on('data', (chunk) => {
    body += chunk;
  });
  
  res.on('end', () => {
    console.log('响应内容:', body);
    try {
      const parsed = JSON.parse(body);
      console.log('解析后的响应:', JSON.stringify(parsed, null, 2));
    } catch (e) {
      console.log('响应不是JSON格式');
    }
  });
});

req.on('error', (error) => {
  console.error(`\n❌ 连接错误: ${error.message}`);
  console.error('请确保服务器正在运行: pnpm dev');
  process.exit(1);
});

req.write(data);
req.end();

