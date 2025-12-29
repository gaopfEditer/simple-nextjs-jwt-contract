// Node.js 脚本：测试消息API
const http = require('http');

const data = JSON.stringify({
  source: 'telegram',
  content: '这是一条测试消息',
  sender: 'test_user',
  title: '测试标题'
});

console.log('发送的数据:', data);
console.log('数据长度:', data.length);

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/messages/receive',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(data, 'utf8')
  }
};

console.log('请求选项:', {
  ...options,
  headers: options.headers
});

const req = http.request(options, (res) => {
  console.log(`\n状态码: ${res.statusCode}`);
  console.log(`状态消息: ${res.statusMessage}`);
  console.log(`响应头:`, res.headers);
  
  let responseData = '';
  
  res.on('data', (chunk) => {
    responseData += chunk.toString();
  });
  
  res.on('end', () => {
    console.log('\n响应内容:');
    if (responseData) {
      try {
        const json = JSON.parse(responseData);
        console.log(JSON.stringify(json, null, 2));
      } catch (e) {
        console.log('原始响应:', responseData);
        console.error('解析JSON错误:', e.message);
      }
    } else {
      console.log('(空响应)');
    }
    
    if (res.statusCode !== 200) {
      console.error(`\n❌ 请求失败，状态码: ${res.statusCode}`);
      process.exit(1);
    } else {
      console.log('\n✅ 请求成功！');
    }
  });
});

req.on('error', (error) => {
  console.error('❌ 请求错误:', error.message);
  if (error.code) {
    console.error('错误代码:', error.code);
  }
  process.exit(1);
});

// 设置超时
req.setTimeout(10000, () => {
  console.error('❌ 请求超时');
  req.destroy();
  process.exit(1);
});

req.write(data);
req.end();

