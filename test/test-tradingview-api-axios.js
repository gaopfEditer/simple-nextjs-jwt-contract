// Node.js 脚本：使用 axios 测试 TradingView API（如果已安装）
// 如果没有安装 axios，运行: npm install axios

let axios;
try {
  axios = require('axios');
} catch (e) {
  console.error('❌ 未安装 axios，请运行: npm install axios');
  console.log('或者使用 test-tradingview-api.js');
  process.exit(1);
}

// 从环境变量读取端口，默认为3000
// 也可以通过命令行参数指定: PORT=3123 node test/test-tradingview-api-axios.js
const port = process.env.PORT || 3123;
const url = `http://localhost:${port}/api/tradingview/receive`;

console.log('提示: 如果服务器运行在其他端口，请设置环境变量 PORT=端口号');
const data = {
  ticker: 'BTCUSDT',
  time: '2024-01-15T10:30:00Z',
  close: 45000.5,
  message: 'BTCUSDT 上插针 | 2024-01-15T10:30:00Z | 价格:45000.5 | 15M@45100+1H@45200'
};

console.log('发送请求到:', url);
console.log('请求数据:', JSON.stringify(data, null, 2));

axios.post(url, data, {
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 10000
})
.then(response => {
  if (response.status >= 200 && response.status < 300) {
    console.log(`\n✅ 请求成功！状态码: ${response.status}`);
    console.log('响应数据:', JSON.stringify(response.data, null, 2));
  } else {
    console.error(`\n⚠️ 请求返回非成功状态码: ${response.status}`);
    console.error('响应数据:', JSON.stringify(response.data, null, 2));
    process.exit(1);
  }
})
.catch(error => {
  console.error('\n❌ 请求失败！');
  if (error.response) {
    // 服务器返回了错误响应
    console.error('状态码:', error.response.status);
    console.error('响应头:', error.response.headers);
    console.error('响应数据:', JSON.stringify(error.response.data, null, 2));
  } else if (error.request) {
    // 请求已发送但没有收到响应
    console.error('错误: 没有收到响应');
    console.error('请求配置:', error.config);
    console.error('可能的原因:');
    console.error('  1. 服务器未运行 (请运行: npm run dev 或 pnpm dev)');
    console.error('  2. 端口不正确');
    console.error('  3. 网络连接问题');
  } else {
    // 其他错误
    console.error('错误:', error.message);
  }
  process.exit(1);
});

