const https = require('https');

const BINANCE_API_ENDPOINTS = [
  'https://api.binance.com',
  'https://api-gcp.binance.com',
  'https://api1.binance.com',
  'https://api2.binance.com',
  'https://api3.binance.com',
  'https://api4.binance.com',
];

// 测试单个端点
function testEndpoint(url) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const req = https.get(`${url}/api/v3/ping`, (res) => {
      const responseTime = Date.now() - startTime;
      resolve({
        url,
        status: 'SUCCESS',
        statusCode: res.statusCode,
        responseTime: `${responseTime}ms`
      });
    });

    req.setTimeout(5000, () => {
      req.destroy();
      resolve({
        url,
        status: 'TIMEOUT',
        statusCode: null,
        responseTime: '>5000ms'
      });
    });

    req.on('error', (error) => {
      resolve({
        url,
        status: 'ERROR',
        statusCode: null,
        responseTime: null,
        error: error.message
      });
    });
  });
}

// 测试所有端点
async function testAllEndpoints() {
  console.log('🔍 测试 Binance API 端点可用性...\n');
  
  for (const endpoint of BINANCE_API_ENDPOINTS) {
    const result = await testEndpoint(endpoint);
    
    if (result.status === 'SUCCESS') {
      console.log(`✅ ${endpoint}`);
      console.log(`   状态: ${result.statusCode} | 响应时间: ${result.responseTime}`);
    } else {
      console.log(`❌ ${endpoint}`);
      console.log(`   状态: ${result.status} | 错误: ${result.error || '连接失败'}`);
    }
    console.log('');
  }
}

testAllEndpoints();