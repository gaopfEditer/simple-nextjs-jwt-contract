// Node.js 脚本：测试 TradingView API (HTTPS 版本)
// 专门用于测试生产环境的 HTTPS 接口

const https = require('https');
const { URL } = require('url');

// ============================================
// 测试数据配置
// ============================================

// 新格式测试数据（推荐）
// 格式：{{ticker}} | {{type}} | {{time}} | {{close}} | {{high}} | {{low}} ; {{描述}}
const testDataList = [
  // 测试数据 1: RSI超买信号
  'BTCUSDT | RSI超买 | 2024-01-15T10:30:00Z | 45000.5 | 45100 | 44900 ; BTCUSDT RSI超买 | 时间:2024-01-15T10:30:00Z | 价格:45000.5 | 最高:45100 | 最低:44900',
  // 测试数据 2: RSI超卖信号
  'ETHUSDT | RSI超卖 | 2024-01-15T11:00:00Z | 2800.5 | 2810 | 2795 ; ETHUSDT RSI超卖 | 时间:2024-01-15T11:00:00Z | 价格:2800.5 | 最高:2810 | 最低:2795',
  // 测试数据 3: MACD金叉
  'BTCUSDT | MACD金叉 | 2024-01-15T12:00:00Z | 45200 | 45300 | 45100 ; BTCUSDT MACD金叉 | 时间:2024-01-15T12:00:00Z | 价格:45200 | 最高:45300 | 最低:45100',
  // 测试数据 4: 上插针信号
  'BTCUSDT | 上插针 | 2024-01-15T13:00:00Z | 45000.5 | 45100 | 44900 ; BTCUSDT 上插针 | 时间:2024-01-15T13:00:00Z | 价格:45000.5 | 最高:45100 | 最低:44900',
  // 测试数据 5: 使用当前时间
  `BTCUSDT | 测试信号 | ${new Date().toISOString()} | 45000.5 | 45100 | 44900 ; BTCUSDT 测试信号 | 时间:${new Date().toISOString()} | 价格:45000.5 | 最高:45100 | 最低:44900`
];

// 旧格式测试数据（兼容）
const oldFormatData = {
  ticker: 'BTCUSDT',
  time: new Date().toISOString(),
  close: 45000.5,
  message: 'BTCUSDT 上插针 | ' + new Date().toISOString() + ' | 价格:45000.5 | 15M@45100+1H@45200'
};

// 选择测试数据
// 可以通过环境变量 TEST_INDEX 选择测试数据（0-4），或 TEST_FORMAT=old 使用旧格式
const useNewFormat = process.env.TEST_FORMAT !== 'old';
const testIndex = parseInt(process.env.TEST_INDEX || '0', 10);
const selectedData = useNewFormat 
  ? testDataList[testIndex % testDataList.length] 
  : oldFormatData;

const data = JSON.stringify(selectedData);

// 目标 URL（可以通过环境变量覆盖）
const targetUrl = process.env.URL || 'https://bz.a.gaopf.top';

console.log('🚀 TradingView API 测试工具 (HTTPS)');
console.log('================================');
console.log('目标地址:', targetUrl);
console.log('数据格式:', useNewFormat ? `新格式（测试数据 ${testIndex + 1}/${testDataList.length}）` : '旧格式（兼容）');
console.log('提示: 可以通过环境变量控制');
console.log('  TEST_FORMAT=old - 使用旧格式');
console.log('  TEST_INDEX=0-4  - 选择新格式测试数据（默认0）');
console.log('  URL=...         - 指定目标URL');
console.log('');

// 解析 URL
let url;
try {
  url = new URL(targetUrl);
  if (url.pathname === '/') {
    url.pathname = '/api/tradingview/receive';
  }
} catch (error) {
  console.error('❌ URL 格式错误:', targetUrl);
  console.error('   正确格式: https://hostname 或 https://hostname:port');
  process.exit(1);
}

if (url.protocol !== 'https:') {
  console.warn('⚠️  警告: 目标 URL 不是 HTTPS，建议使用 HTTPS');
}

// 构建请求选项
const options = {
  hostname: url.hostname,
  port: url.port || 443,
  path: url.pathname || '/api/tradingview/receive',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data, 'utf8'),
    'User-Agent': 'TradingView-Webhook-Test/1.0'
  },
  timeout: 30000, // 30 秒超时
  // 如果使用自签名证书，取消下面的注释
  // rejectUnauthorized: false
};

// 如果环境变量设置了，禁用证书验证（仅用于测试自签名证书）
if (process.env.REJECT_UNAUTHORIZED === 'false') {
  options.rejectUnauthorized = false;
  console.warn('⚠️  警告: SSL 证书验证已禁用（仅用于测试）');
}

console.log('📤 发送请求...');
console.log('   URL:', `${url.protocol}//${options.hostname}:${options.port}${options.path}`);
console.log('   方法: POST');
console.log('   数据:', data);
console.log('');

const req = https.request(options, (res) => {
  let responseData = '';

  console.log('📥 收到响应');
  console.log('   状态码:', res.statusCode);
  console.log('   状态消息:', res.statusMessage);
  console.log('   响应头:', JSON.stringify(res.headers, null, 2));
  console.log('');

  res.on('data', (chunk) => {
    responseData += chunk;
  });

  res.on('end', () => {
    // 根据状态码判断是否成功
    if (res.statusCode >= 200 && res.statusCode < 300) {
      console.log('✅ 请求成功！');
      console.log('   状态码:', res.statusCode);
      try {
        const parsed = JSON.parse(responseData);
        console.log('   响应数据:', JSON.stringify(parsed, null, 2));
      } catch (e) {
        console.log('   响应数据（原始）:', responseData);
      }
      console.log('');
      console.log('✨ 测试完成');
    } else {
      console.error('❌ 请求失败！');
      console.error('   状态码:', res.statusCode);
      try {
        const parsed = JSON.parse(responseData);
        console.error('   错误响应:', JSON.stringify(parsed, null, 2));
      } catch (e) {
        console.error('   错误响应（原始）:', responseData);
      }
      process.exit(1);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ 请求失败！');
  console.error('   错误:', error.message);
  console.error('   错误代码:', error.code);
  console.error('');
  console.error('可能的原因:');
  console.error('  1. 服务器未运行或无法访问');
  console.error('  2. URL 或端口不正确');
  console.error('  3. 网络连接问题');
  console.error('  4. SSL 证书问题');
  console.error('  5. 防火墙阻止连接');
  console.error('');
  if (error.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' || error.code === 'CERT_HAS_EXPIRED') {
    console.error('提示: 如果是自签名证书或证书过期，可以设置:');
    console.error('  REJECT_UNAUTHORIZED=false node test/test-tradingview-api-https.js');
  }
  process.exit(1);
});

req.on('timeout', () => {
  console.error('❌ 请求超时！');
  console.error('   超时时间: 30 秒');
  req.destroy();
  process.exit(1);
});

req.setTimeout(30000, () => {
  req.destroy();
});

// 发送请求
req.write(data);
req.end();

console.log('⏳ 等待响应...');
console.log('');

