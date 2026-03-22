// Node.js 脚本：测试 TradingView API
const https = require('https');
const http = require('http');
const { URL } = require('url');

// 新格式测试数据（推荐）
// 格式：{{ticker}} | {{type}} | {{time}} | {{close}} | {{high}} | {{low}} ; {{描述}}
const newFormatData = JSON.stringify('MYXUSDT | RSI超买 | 2024-01-15T10:30:00Z | 45000.5 | 45100 | 44900 | 15m ; MYXUSDT RSI超买 | 时间:2024-01-15T10:30:00Z | 价格:45000.5 | 最高:45100 | 最低:44900');

// 旧格式测试数据（兼容）
const oldFormatData = JSON.stringify({
  ticker: 'MYXUSDT',
  time: '2024-01-15T10:30:00Z',
  close: 45000.5,
  message: 'MYXUSDT 上插针 | 2024-01-15T10:30:00Z | 价格:45000.5 | 15M@45100+1H@45200'
});

// 使用新格式（可以通过环境变量 TEST_FORMAT=old 切换到旧格式）
const useNewFormat = process.env.TEST_FORMAT !== 'old';
const data = useNewFormat ? newFormatData : oldFormatData;

// 设置 isLocal 变量
// 可以通过环境变量 IS_LOCAL 控制
// true = 本地测试 (http://localhost:3123) - 默认值
// false = 生产服务器 (https://bz.a.gaopf.top)
// 使用方式:
//   IS_LOCAL=true node test/test-tradingview-api.js   # 本地测试
//   IS_LOCAL=false node test/test-tradingview-api.js  # 生产服务器
const isLocal = false;

// 根据 isLocal 选择目标 URL
const targetUrl = process.env.URL || (isLocal 
  ? 'http://localhost:3123/api/tradingview/receive' 
  : 'https://bz.a.gaopf.top/api/tradingview/receive');

console.log('🚀 TradingView API 测试工具');
console.log('================================');
console.log('测试模式:', isLocal ? '本地测试' : '生产服务器');
console.log('数据格式:', useNewFormat ? '新格式（推荐）' : '旧格式（兼容）');
console.log('提示: 可以通过环境变量控制');
console.log('  IS_LOCAL=true  - 使用本地测试 (http://localhost:3123)');
console.log('  IS_LOCAL=false - 使用生产服务器 (https://bz.a.gaopf.top)');
console.log('  TEST_FORMAT=new - 使用新格式（默认）');
console.log('  TEST_FORMAT=old - 使用旧格式');
console.log('  或直接设置 URL 环境变量指定地址');
console.log('');

// 解析 URL
let url;
try {
  url = new URL(targetUrl);
} catch (error) {
  console.error('❌ URL 格式错误:', targetUrl);
  console.error('   正确格式: http://hostname:port 或 https://hostname:port');
  process.exit(1);
}

const isHttps = url.protocol === 'https:';
const httpModule = isHttps ? https : http;

// 构建请求选项
const options = {
  hostname: url.hostname,
  port: url.port || (isHttps ? 443 : 80),
  path: url.pathname || '/api/tradingview/receive',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data, 'utf8')
  },
  timeout: 10000
};

// 如果是 HTTPS 且使用自签名证书，可能需要禁用证书验证（仅用于测试）
if (isHttps && process.env.REJECT_UNAUTHORIZED === 'false') {
  options.rejectUnauthorized = false;
  console.warn('⚠️  警告: SSL 证书验证已禁用（仅用于测试）');
}

// 构建显示用的 URL（默认端口不显示）
const displayPort = (isHttps && options.port === 443) || (!isHttps && options.port === 80)
  ? ''
  : `:${options.port}`;
const displayUrl = `${url.protocol}//${options.hostname}${displayPort}${options.path}`;

console.log('📤 发送请求...');
console.log('   目标地址:', displayUrl);
console.log('   完整路径:', options.path);
console.log('   请求数据:', data);
console.log('');

const req = httpModule.request(options, (res) => {
  let responseData = '';

  console.log('📥 收到响应');
  console.log('   状态码:', res.statusCode);
  console.log('   状态消息:', res.statusMessage);

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
  console.error('  1. 服务器未运行');
  console.error('  2. URL 或端口不正确');
  console.error('  3. 网络连接问题');
  console.error('  4. SSL 证书问题（如果是 HTTPS）');
  console.error('  5. 防火墙阻止连接');
  if (isHttps && error.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE') {
    console.error('');
    console.error('提示: 如果是自签名证书，可以设置:');
    console.error('  REJECT_UNAUTHORIZED=false node test/test-tradingview-api.js');
  }
  process.exit(1);
});

req.on('timeout', () => {
  console.error('❌ 请求超时！');
  console.error('   超时时间: 10 秒');
  req.destroy();
  process.exit(1);
});

req.setTimeout(10000, () => {
  req.destroy();
});

// 发送请求
req.write(data);
req.end();

console.log('⏳ 等待响应...');
console.log('');

