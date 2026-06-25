/**
 * Deal-Video WebSocket + API 测试
 *
 * 1. 连接 ws://127.0.0.1:3123/api/ws?type=deal-video  （勿用仅 IPv6 的 localhost 若服务未绑 127.0.0.1）
 * 2. 调用 POST http://localhost:3123/api/deal-video/receive
 * 3. 等待收到 deal_video_task 消息
 *
 * 用法: node test/test-deal-video-ws.js [videoUrl]
 */

const WebSocket = require('ws');
const http = require('http');

const BASE = process.env.BASE_URL || 'http://127.0.0.1:3123';
const WS_BASE = BASE.replace(/^http/, 'ws');
const TEST_VIDEO_URL =
  process.argv[2] || 'https://www.youtube.com/watch?v=EdEojM6acfk';

function callDealVideoApi(videoUrl) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ videoUrl, meta: { source: 'test-deal-video-ws' } });
    const url = new URL(`${BASE}/api/deal-video/receive`);
    const req = http.request(
      {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
        timeout: 10000,
      },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          try {
            resolve({ statusCode: res.statusCode, body: JSON.parse(data) });
          } catch {
            resolve({ statusCode: res.statusCode, body: data });
          }
        });
      }
    );
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('API timeout'));
    });
    req.write(body);
    req.end();
  });
}

function connectDealVideoWs() {
  return new Promise((resolve, reject) => {
    const wsUrl = `${WS_BASE}/api/ws?type=deal-video`;
    console.log('> 连接 WebSocket:', wsUrl);
    const ws = new WebSocket(wsUrl);
    let clientId = null;
    let receivedTask = false;

    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error('超时：未收到 deal_video_task'));
    }, 15000);

    ws.on('open', () => {
      console.log('> WebSocket 已连接 (type=deal-video)');
    });

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type === 'welcome') {
          clientId = msg.clientId;
          console.log('> 收到 welcome, clientId:', clientId);
          ws.send(
            JSON.stringify({
              type: 'connected',
              clientId,
              deviceInfo: { platform: process.platform, hostname: require('os').hostname() },
            })
          );
          setTimeout(async () => {
            console.log('> 调用 Deal-Video API, videoUrl:', TEST_VIDEO_URL);
            try {
              const result = await callDealVideoApi(TEST_VIDEO_URL);
              console.log('> API 响应:', result.statusCode, JSON.stringify(result.body, null, 2));
            } catch (e) {
              clearTimeout(timeout);
              ws.close();
              reject(e);
            }
          }, 300);
          return;
        }
        if (msg.type === 'deal_video_task') {
          receivedTask = true;
          console.log('> [OK] 收到 deal_video_task:');
          console.log('>   videoUrl:', msg.videoUrl);
          console.log('>   timestamp:', msg.timestamp);
          clearTimeout(timeout);
          setTimeout(() => {
            ws.close();
            resolve(msg);
          }, 2000);
        }
      } catch (e) {
        console.log('> 原始消息:', raw.toString().slice(0, 120));
      }
    });

    ws.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });

    ws.on('close', () => {
      if (!receivedTask) {
        clearTimeout(timeout);
        reject(new Error('WebSocket 已关闭，未收到 deal_video_task'));
      }
    });
  });
}

connectDealVideoWs()
  .then(() => {
    console.log('\n[OK] Deal-Video 测试通过');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n[FAIL]', err.message);
    process.exit(1);
  });
