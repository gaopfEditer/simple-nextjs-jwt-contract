// Node.js 脚本：测试 TradingView API
const http = require('http');

const data = JSON.stringify({
  ticker: 'BTCUSDT',
  time: '2024-01-15T10:30:00Z',
  close: 45000.5,
  message: 'BTCUSDT 上插针 | 2024-01-15T10:30:00Z | 价格:45000.5 | 15M@45100+1H@45200'
});

// 从环境变量读取端口，默认为3000
// 也可以通过命令行参数指定: PORT=3123 node test/test-tradingview-api.js
const port = process.env.PORT || 3123;

console.log('提示: 如果服务器运行在其他端口，请设置环境变量 PORT=端口号');

const options = {
  hostname: 'localhost',
  port: parseInt(port, 10),
  path: '/api/tradingview/receive',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data, 'utf8')
  },
  timeout: 10000
};

console.log('发送请求到:', `http://${options.hostname}:${options.port}${options.path}`);
console.log('请求数据:', data);

const req = http.request(options, (res) => {
  let responseData = '';

  console.log('\n状态码:', res.statusCode);
  console.log('响应头:', res.headers);

  res.on('data', (chunk) => {
    responseData += chunk;
  });

  res.on('end', () => {
    // 根据状态码判断是否成功
    if (res.statusCode >= 200 && res.statusCode < 300) {
      console.log(`\n✅ 请求成功！状态码: ${res.statusCode}`);
      try {
        const parsed = JSON.parse(responseData);
        console.log('响应数据:', JSON.stringify(parsed, null, 2));
      } catch (e) {
        console.log('响应数据（原始）:', responseData);
      }
    } else {
      console.error(`\n❌ 请求失败！状态码: ${res.statusCode}`);
      try {
        const parsed = JSON.parse(responseData);
        console.error('错误响应:', JSON.stringify(parsed, null, 2));
      } catch (e) {
        console.error('错误响应（原始）:', responseData);
      }
      process.exit(1);
    }
  });
});

req.on('error', (error) => {
  console.error('\n❌ 请求失败！');
  console.error('错误:', error.message);
  console.error('可能的原因:');
  console.error('  1. 服务器未运行 (请运行: npm run dev 或 pnpm dev)');
  console.error('  2. 端口不正确');
  console.error('  3. 网络连接问题');
});

req.on('timeout', () => {
  console.error('\n❌ 请求超时！');
  req.destroy();
});

req.setTimeout(10000, () => {
  req.destroy();
});

req.write(data);
req.end();

