// Node.js 脚本：使用 axios 测试消息API（如果已安装）
// 如果没有安装 axios，运行: npm install axios

let axios;
try {
  axios = require('axios');
} catch (e) {
  console.error('❌ 未安装 axios，请运行: npm install axios');
  console.log('或者使用 test-message-api.js');
  process.exit(1);
}

const url = 'http://localhost:3000/api/messages/receive';
const data = {
  source: 'telegram',
  content: '这是一条测试消息',
  sender: 'test_user',
  title: '测试标题'
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
  console.log('\n✅ 请求成功！');
  console.log('状态码:', response.status);
  console.log('响应数据:', JSON.stringify(response.data, null, 2));
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
    console.error('  1. 服务器未运行 (请运行: npm run dev)');
    console.error('  2. 端口不正确');
    console.error('  3. 网络连接问题');
  } else {
    // 其他错误
    console.error('错误:', error.message);
  }
  process.exit(1);
});

