// 加载环境变量（必须在最前面）
// 优先加载 .env.local，如果不存在则加载 .env
require('dotenv').config({ path: '.env.local' });
// 如果 .env.local 不存在，尝试加载 .env（用于兼容性）
if (!process.env.DB_HOST && !process.env.DB_USER) {
  require('dotenv').config();
}

const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const WebSocket = require('ws');
const mysql = require('mysql2/promise');

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// 数据库配置（与lib/db-connection.ts保持一致）
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'nextjs_jwt',
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  multipleStatements: false,
};

// 创建数据库连接池
let dbPool = null;
function getDbPool() {
  if (!dbPool) {
    console.log('[数据库] 创建连接池...');
    console.log('[数据库] 配置:', {
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.user,
      database: dbConfig.database,
      passwordSet: !!dbConfig.password,
    });
    
    dbPool = mysql.createPool(dbConfig);
    
    // 测试连接
    dbPool.getConnection()
      .then((connection) => {
        console.log('[数据库] ✅ 连接池创建成功');
        connection.release();
      })
      .catch((error) => {
        console.error('[数据库] ❌ 连接失败:', error.message);
        console.error('[数据库] 错误代码:', error.code);
        console.error('[数据库] 请检查:');
        console.error('  1. MySQL 服务是否运行');
        console.error('  2. 环境变量是否正确设置 (.env 文件)');
        console.error('  3. 数据库配置是否正确');
      });
  }
  return dbPool;
}

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      const pathname = parsedUrl.pathname;
      
      // 处理 HTTP 推送接口（用于 AutoJS 等客户端发送消息）
      if (pathname === '/push' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => {
          body += chunk.toString();
        });
        req.on('end', () => {
          try {
            const data = JSON.parse(body);
            handleHttpPush(data, req, res);
          } catch (e) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Invalid JSON' }));
          }
        });
        return;
      }
      
      // 处理 HTTP 轮询接口（用于 AutoJS 等客户端接收消息）
      if (pathname === '/poll' && req.method === 'GET') {
        const clientId = parsedUrl.query.clientId;
        const clientIp = req.socket.remoteAddress || req.headers['x-forwarded-for'] || 'unknown';
        const userAgent = req.headers['user-agent'] || 'unknown';
        
        if (!clientId) {
          // 新客户端，分配 ID（只在首次连接时创建）
          const newClientId = generateClientId();
          httpClients.set(newClientId, {
            id: newClientId,
            boundTo: null,
            messageQueue: [],
            lastPollTime: Date.now(),
            ip: clientIp,
            userAgent: userAgent,
            createdAt: new Date().toISOString(),
            deviceInfo: null
          });
          
          // 直接返回欢迎消息（不放入队列，立即返回）
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            type: 'welcome',
            clientId: newClientId,
            message: '欢迎连接到 WebSocket 服务器！',
            timestamp: new Date().toISOString()
          }));
          // console.log(`[新 HTTP 客户端] ID: ${newClientId}, IP: ${clientIp}, User-Agent: ${userAgent.substring(0, 80)}`);
          return;
        }
        
        // 检查客户端是否存在
        const clientInfo = httpClients.get(clientId);
        if (!clientInfo) {
          // 客户端不存在，返回错误（不创建新客户端）
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            error: 'Client not found',
            message: '客户端不存在，请重新连接'
          }));
          return;
        }
        
        // 更新最后轮询时间
        clientInfo.lastPollTime = Date.now();
        
        // 返回队列中的消息（如果有）
        if (clientInfo.messageQueue.length > 0) {
          const message = clientInfo.messageQueue.shift();
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(message));
        } else {
          // 没有消息，返回 null
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end('null');
        }
        return;
      }
      
      // 调试接口：查看所有 HTTP 客户端
      if (pathname === '/debug/http-clients' && req.method === 'GET') {
        const clientsList = Array.from(httpClients.entries()).map(([id, info]) => ({
          id,
          ip: info.ip || 'unknown',
          userAgent: info.userAgent || 'unknown',
          createdAt: info.createdAt || 'unknown',
          lastPollTime: info.lastPollTime ? new Date(info.lastPollTime).toISOString() : 'unknown',
          inactiveMinutes: info.lastPollTime ? Math.floor((Date.now() - info.lastPollTime) / 1000 / 60) : 'unknown',
          boundTo: info.boundTo,
          queueLength: info.messageQueue.length,
          deviceInfo: info.deviceInfo || null
        }));
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          total: httpClients.size,
          clients: clientsList
        }, null, 2));
        return;
      }
      
      // 调试接口：查看所有 WebSocket 客户端
      if (pathname === '/debug/ws-clients' && req.method === 'GET') {
        const clientsList = Array.from(clients.entries()).map(([ws, info]) => ({
          id: info.id,
          boundTo: typeof info.boundTo === 'object' ? 'WebSocket' : info.boundTo,
          deviceInfo: info.deviceInfo || null,
          readyState: ws.readyState === WebSocket.OPEN ? 'OPEN' : ws.readyState === WebSocket.CONNECTING ? 'CONNECTING' : ws.readyState === WebSocket.CLOSING ? 'CLOSING' : 'CLOSED'
        }));
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          total: clients.size,
          clients: clientsList
        }, null, 2));
        return;
      }
      
      // 立即触发消息转发接口（用于API创建消息后立即转发）
      if (pathname === '/api/messages/forward' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => {
          body += chunk.toString();
        });
        req.on('end', () => {
          try {
            // 如果请求体中有消息数据，直接转发
            if (body) {
              const messageData = JSON.parse(body);
              if (messageData.id && messageData.content) {
                // 直接转发消息，不需要从数据库读取
                forwardMessageToClients(messageData).then(forwardedCount => {
                  console.log(`[立即转发] 消息 ID: ${messageData.id} 已转发给 ${forwardedCount} 个客户端`);
                }).catch(err => {
                  console.error('[立即转发] 转发失败:', err);
                });
              }
            }
            
            // 同时触发一次数据库检查（用于转发之前未转发的消息）
            checkAndForwardMessages().catch(err => {
              // 静默处理数据库错误
            });
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: true,
              message: '已触发消息转发'
            }));
          } catch (e) {
            // 如果解析失败，只触发数据库检查
            checkAndForwardMessages().catch(err => {
              // 静默处理数据库错误
            });
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: true,
              message: '已触发消息转发检查'
            }));
          }
        });
        return;
      }
      
      // 其他请求交给 Next.js 处理
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  // 创建 WebSocket 服务器
  const wss = new WebSocket.Server({ 
    server,
    path: '/api/ws'
  });

  // 存储所有连接的客户端
  const clients = new Map(); // 使用 Map 存储客户端及其绑定关系
  // Map<ws, { id: string, boundTo: ws | null }>
  
  // 存储 HTTP 客户端（用于 AutoJS 等不支持 WebSocket 的客户端）
  const httpClients = new Map(); // Map<clientId, { id: string, boundTo: string | null, messageQueue: Array }>
  
  // 生成客户端 ID
  function generateClientId() {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  // 处理 HTTP 推送消息
  function handleHttpPush(data, req, res) {
    try {
      const clientIp = req.socket.remoteAddress || req.headers['x-forwarded-for'] || 'unknown';
      const clientPort = req.socket.remotePort || 'unknown';
      console.log(`收到 HTTP 推送消息 [${clientIp}:${clientPort}]:`, data);
      
      // 处理连接确认消息，分配客户端 ID（如果还没有）
      if (data.type === 'connected') {
        // 如果消息中有 clientId，更新该客户端的设备信息
        if (data.clientId && data.deviceInfo) {
          const clientInfo = httpClients.get(data.clientId);
          if (clientInfo) {
            clientInfo.deviceInfo = data.deviceInfo;
            console.log(`HTTP 客户端 ${data.clientId} 设备信息:`, JSON.stringify(data.deviceInfo));
          }
        }
        // 如果消息中没有 clientId，说明是新客户端，已经在 /poll 中处理了
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: '消息已接收' }));
        return;
      }
      
      // 处理绑定请求
      if (data.type === 'bind' && data.clientId && data.targetClientId) {
        const clientInfo = httpClients.get(data.clientId);
        if (!clientInfo) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Client not found' }));
          return;
        }
        
        // 查找目标客户端（WebSocket 或 HTTP）
        let targetFound = false;
        for (const [targetWs, targetInfo] of clients.entries()) {
          if (targetInfo.id === data.targetClientId) {
            clientInfo.boundTo = data.targetClientId;
            targetFound = true;
            break;
          }
        }
        
        if (!targetFound && httpClients.has(data.targetClientId)) {
          clientInfo.boundTo = data.targetClientId;
          targetFound = true;
        }
        
        if (targetFound) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            type: 'bind_success',
            message: `已成功绑定到客户端: ${data.targetClientId}`,
            targetClientId: data.targetClientId,
            timestamp: new Date().toISOString()
          }));
          console.log(`HTTP 客户端 ${data.clientId} 已绑定到 ${data.targetClientId}`);
        } else {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            type: 'bind_error',
            message: `未找到目标客户端: ${data.targetClientId}`,
            timestamp: new Date().toISOString()
          }));
        }
        return;
      }
      
      // 处理订单数据（从 HTTP 客户端转发到绑定的目标）
      if (data.action && (data.action === 'buy' || data.action === 'sell') && data.clientId) {
        const clientInfo = httpClients.get(data.clientId);
        if (!clientInfo) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Client not found' }));
          return;
        }
        
        const validation = validateOrder(data);
        
        if (!validation.valid) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            type: 'order_error',
            message: `订单验证失败: ${validation.error}`,
            order: data,
            timestamp: new Date().toISOString()
          }));
          console.log(`订单验证失败 (${data.clientId}):`, validation.error);
          return;
        }
        
        // 订单格式正确，转发给绑定的连接者
        let forwarded = false;
        
        if (clientInfo.boundTo) {
          // 查找目标客户端（WebSocket 或 HTTP）
          let targetWs = null;
          let targetHttpClient = null;
          
          for (const [targetWsKey, targetInfo] of clients.entries()) {
            if (targetInfo.id === clientInfo.boundTo) {
              targetWs = targetWsKey;
              break;
            }
          }
          
          if (!targetWs && httpClients.has(clientInfo.boundTo)) {
            targetHttpClient = httpClients.get(clientInfo.boundTo);
          }
          
          if (targetWs && targetWs.readyState === WebSocket.OPEN) {
            targetWs.send(JSON.stringify({
              type: 'order_forwarded',
              order: data,
              fromClientId: data.clientId,
              timestamp: new Date().toISOString()
            }));
            forwarded = true;
            console.log(`订单已从 HTTP 客户端 ${data.clientId} 转发到 WebSocket 客户端 ${clientInfo.boundTo}:`, data);
          } else if (targetHttpClient) {
            targetHttpClient.messageQueue.push({
              type: 'order_forwarded',
              order: data,
              fromClientId: data.clientId,
              timestamp: new Date().toISOString()
            });
            forwarded = true;
            console.log(`订单已从 HTTP 客户端 ${data.clientId} 转发到 HTTP 客户端 ${clientInfo.boundTo}:`, data);
          }
        }
        
        if (forwarded) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            type: 'order_success',
            message: '订单已成功转发',
            order: data,
            targetClientId: clientInfo.boundTo,
            timestamp: new Date().toISOString()
          }));
        } else {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            type: 'order_error',
            message: '未绑定目标客户端，无法转发订单',
            order: data,
            timestamp: new Date().toISOString()
          }));
        }
        return;
      }
      
      // 其他消息
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, message: '消息已接收' }));
    } catch (e) {
      console.error('处理 HTTP 推送消息错误:', e);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal server error' }));
    }
  }

  // 订单数据验证函数
  function validateOrder(order) {
    // 必需字段检查
    if (!order.action || !['buy', 'sell'].includes(order.action)) {
      return { valid: false, error: 'action 必须是 "buy" 或 "sell"' };
    }
    
    if (!order.symbol || typeof order.symbol !== 'string') {
      return { valid: false, error: 'symbol 必须是字符串' };
    }
    
    if (typeof order.amount !== 'number' || order.amount <= 0) {
      return { valid: false, error: 'amount 必须是大于 0 的数字' };
    }
    
    if (!order.orderType || !['limit', 'market'].includes(order.orderType)) {
      return { valid: false, error: 'orderType 必须是 "limit" 或 "market"' };
    }
    
    // 限价单必须要有价格
    if (order.orderType === 'limit' && (typeof order.price !== 'number' || order.price <= 0)) {
      return { valid: false, error: '限价单必须提供有效的 price' };
    }
    
    // 可选字段类型检查
    if (order.price !== undefined && (typeof order.price !== 'number' || order.price <= 0)) {
      return { valid: false, error: 'price 必须是大于 0 的数字' };
    }
    
    if (order.leverage !== undefined && (typeof order.leverage !== 'number' || order.leverage <= 0)) {
      return { valid: false, error: 'leverage 必须是大于 0 的数字' };
    }
    
    if (order.stopLoss !== undefined && (typeof order.stopLoss !== 'number' || order.stopLoss <= 0)) {
      return { valid: false, error: 'stopLoss 必须是大于 0 的数字' };
    }
    
    if (order.takeProfit !== undefined && (typeof order.takeProfit !== 'number' || order.takeProfit <= 0)) {
      return { valid: false, error: 'takeProfit 必须是大于 0 的数字' };
    }
    
    return { valid: true };
  }

  wss.on('connection', (ws, req) => {
    const clientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log(`新的 WebSocket 连接已建立: ${clientId}`);
    
    clients.set(ws, {
      id: clientId,
      boundTo: null,
      deviceInfo: null
    });

    // 发送欢迎消息
    ws.send(JSON.stringify({
      type: 'welcome',
      message: '欢迎连接到 WebSocket 服务器！',
      clientId: clientId,
      timestamp: new Date().toISOString()
    }));

    // 处理接收到的消息
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        console.log('收到消息:', data);
        
        const clientInfo = clients.get(ws);
        if (!clientInfo) {
          return;
        }

        // 处理连接确认消息（存储设备信息）
        if (data.type === 'connected' && data.deviceInfo) {
          clientInfo.deviceInfo = data.deviceInfo;
          console.log(`客户端 ${clientInfo.id} 设备信息:`, JSON.stringify(data.deviceInfo));
          return;
        }

        // 处理绑定请求
        if (data.type === 'bind' && data.targetClientId) {
          let targetWs = null;
          let targetHttpClient = null;
          
          // 先查找 WebSocket 客户端
          for (const [targetWsKey, targetInfo] of clients.entries()) {
            if (targetInfo.id === data.targetClientId && targetWsKey !== ws) {
              targetWs = targetWsKey;
              break;
            }
          }
          
          // 如果没找到，查找 HTTP 客户端
          if (!targetWs && httpClients.has(data.targetClientId)) {
            targetHttpClient = httpClients.get(data.targetClientId);
          }
          
          if (targetWs && targetWs.readyState === WebSocket.OPEN) {
            clientInfo.boundTo = targetWs; // WebSocket 客户端，存储 WebSocket 对象
            ws.send(JSON.stringify({
              type: 'bind_success',
              message: `已成功绑定到客户端: ${data.targetClientId}`,
              targetClientId: data.targetClientId,
              timestamp: new Date().toISOString()
            }));
            console.log(`客户端 ${clientInfo.id} 已绑定到 ${data.targetClientId}`);
          } else if (targetHttpClient) {
            clientInfo.boundTo = data.targetClientId; // HTTP 客户端，存储字符串 ID
            ws.send(JSON.stringify({
              type: 'bind_success',
              message: `已成功绑定到客户端: ${data.targetClientId}`,
              targetClientId: data.targetClientId,
              timestamp: new Date().toISOString()
            }));
            console.log(`客户端 ${clientInfo.id} 已绑定到 HTTP 客户端 ${data.targetClientId}`);
          } else {
            ws.send(JSON.stringify({
              type: 'bind_error',
              message: `未找到目标客户端: ${data.targetClientId}`,
              timestamp: new Date().toISOString()
            }));
          }
          return;
        }

        // 处理解绑请求
        if (data.type === 'unbind') {
          clientInfo.boundTo = null;
          ws.send(JSON.stringify({
            type: 'unbind_success',
            message: '已解除绑定',
            timestamp: new Date().toISOString()
          }));
          console.log(`客户端 ${clientInfo.id} 已解除绑定`);
          return;
        }

        // 处理订单数据
        if (data.action && (data.action === 'buy' || data.action === 'sell')) {
          const validation = validateOrder(data);
          
          if (!validation.valid) {
            ws.send(JSON.stringify({
              type: 'order_error',
              message: `订单验证失败: ${validation.error}`,
              order: data,
              timestamp: new Date().toISOString()
            }));
            console.log(`订单验证失败 (${clientInfo.id}):`, validation.error);
            return;
          }

          // 订单格式正确，转发给绑定的连接者
          let forwarded = false;
          
          // 检查是否是 WebSocket 客户端
          if (clientInfo.boundTo && typeof clientInfo.boundTo === 'object' && clientInfo.boundTo.readyState === WebSocket.OPEN) {
            const targetInfo = clients.get(clientInfo.boundTo);
            clientInfo.boundTo.send(JSON.stringify({
              type: 'order_forwarded',
              order: data,
              fromClientId: clientInfo.id,
              timestamp: new Date().toISOString()
            }));
            
            ws.send(JSON.stringify({
              type: 'order_success',
              message: '订单已成功转发',
              order: data,
              targetClientId: targetInfo.id,
              timestamp: new Date().toISOString()
            }));
            
            console.log(`订单已从 ${clientInfo.id} 转发到 ${targetInfo.id}:`, data);
            forwarded = true;
          } 
          // 检查是否是 HTTP 客户端（boundTo 是字符串 ID）
          else if (clientInfo.boundTo && typeof clientInfo.boundTo === 'string') {
            const targetHttpClient = httpClients.get(clientInfo.boundTo);
            if (targetHttpClient) {
              targetHttpClient.messageQueue.push({
                type: 'order_forwarded',
                order: data,
                fromClientId: clientInfo.id,
                timestamp: new Date().toISOString()
              });
              
              ws.send(JSON.stringify({
                type: 'order_success',
                message: '订单已成功转发',
                order: data,
                targetClientId: clientInfo.boundTo,
                timestamp: new Date().toISOString()
              }));
              
              console.log(`订单已从 ${clientInfo.id} 转发到 HTTP 客户端 ${clientInfo.boundTo}:`, data);
              forwarded = true;
            }
          }
          
          if (!forwarded) {
            ws.send(JSON.stringify({
              type: 'order_error',
              message: '未绑定目标客户端，无法转发订单',
              order: data,
              timestamp: new Date().toISOString()
            }));
            console.log(`订单转发失败 (${clientInfo.id}): 未绑定目标客户端`);
          }
          return;
        }

        // 其他消息处理（保持原有功能）
        // 回显消息给发送者
        ws.send(JSON.stringify({
          type: 'echo',
          original: data,
          message: '服务器已收到您的消息',
          timestamp: new Date().toISOString()
        }));

        // 广播消息给所有客户端（可选）
        if (data.broadcast) {
          clients.forEach((clientInfo, clientWs) => {
            if (clientWs !== ws && clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({
                type: 'broadcast',
                from: data.from || '匿名',
                message: data.message,
                timestamp: new Date().toISOString()
              }));
            }
          });
        }
      } catch (error) {
        console.error('解析消息错误:', error);
        ws.send(JSON.stringify({
          type: 'error',
          message: '消息格式错误',
          timestamp: new Date().toISOString()
        }));
      }
    });

    // 处理连接关闭
    ws.on('close', () => {
      console.log(`WebSocket 连接已关闭: ${clientId}`);
      const clientInfo = clients.get(ws);
      
      // 解除所有绑定到此客户端的连接（WebSocket 和 HTTP）
      clients.forEach((info, otherWs) => {
        if (info.boundTo === ws || info.boundTo === clientId) {
          info.boundTo = null;
          if (otherWs.readyState === WebSocket.OPEN) {
            otherWs.send(JSON.stringify({
              type: 'bind_lost',
              message: '绑定的目标客户端已断开连接',
              timestamp: new Date().toISOString()
            }));
          }
        }
      });
      
      // 解除 HTTP 客户端绑定到此客户端的连接
      httpClients.forEach((httpInfo, httpId) => {
        if (httpInfo.boundTo === clientId) {
          httpInfo.boundTo = null;
          httpInfo.messageQueue.push({
            type: 'bind_lost',
            message: '绑定的目标客户端已断开连接',
            timestamp: new Date().toISOString()
          });
        }
      });
      
      clients.delete(ws);
    });

    // 处理错误
    ws.on('error', (error) => {
      console.error(`WebSocket 错误 (${clientId}):`, error);
      clients.delete(ws);
    });

    // 定期发送心跳（可选）
    const heartbeat = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'heartbeat',
          timestamp: new Date().toISOString()
        }));
      } else {
        clearInterval(heartbeat);
      }
    }, 30000); // 每30秒发送一次心跳

    ws.on('close', () => {
      clearInterval(heartbeat);
    });
  });

  // 转发消息到所有WebSocket客户端
  async function forwardMessageToClients(message) {
    const messageData = {
      type: 'message_received',
      message: {
        id: message.id,
        source: message.source,
        source_id: message.source_id,
        type: message.type,
        title: message.title,
        content: message.content,
        metadata: message.metadata,
        sender: message.sender,
        sender_id: message.sender_id,
        created_at: message.created_at
      },
      timestamp: new Date().toISOString()
    };

    let forwardedCount = 0;
    const messageJson = JSON.stringify(messageData);

    console.log(`[WebSocket转发] 准备转发消息，当前WebSocket客户端数: ${clients.size}`);
    console.log(`[WebSocket转发] 消息数据:`, JSON.stringify(messageData, null, 2));

    // 转发给所有WebSocket客户端
    clients.forEach((clientInfo, ws) => {
      const state = ws.readyState;
      console.log(`[WebSocket转发] 客户端 ${clientInfo.id} 状态: ${state} (OPEN=${WebSocket.OPEN})`);
      
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(messageJson);
          forwardedCount++;
          console.log(`[WebSocket转发] 消息已发送到客户端 ${clientInfo.id}`);
        } catch (error) {
          console.error(`[WebSocket转发] 转发消息到WebSocket客户端失败 (${clientInfo.id}):`, error);
        }
      } else {
        console.log(`[WebSocket转发] 跳过客户端 ${clientInfo.id}，状态不是OPEN (${state})`);
      }
    });

    // 转发给所有HTTP客户端（放入消息队列）
    httpClients.forEach((httpInfo, httpId) => {
      try {
        httpInfo.messageQueue.push(messageData);
        forwardedCount++;
      } catch (error) {
        console.error(`转发消息到HTTP客户端失败 (${httpId}):`, error);
      }
    });

    if (forwardedCount > 0) {
      console.log(`[WebSocket转发] 消息已转发给 ${forwardedCount} 个客户端:`, {
        id: message.id,
        source: message.source,
        type: message.type,
        content: message.content?.substring(0, 50)
      });
    } else {
      console.warn(`[WebSocket转发] 警告：消息 ID: ${message.id} 没有转发给任何客户端（当前连接数: WebSocket=${clients.size}, HTTP=${httpClients.size}）`);
    }

    return forwardedCount;
  }

  // 检查并转发未转发的消息
  async function checkAndForwardMessages() {
    try {
      const pool = getDbPool();
      
      // 获取未转发的消息（最多100条）
      let rows;
      try {
        [rows] = await pool.execute(
          'SELECT * FROM messages WHERE forwarded = 0 ORDER BY created_at ASC LIMIT 100'
        );
      } catch (error) {
        // 如果是连接错误，静默处理，不输出日志（避免刷屏）
        if (error.code === 'ECONNREFUSED' || error.code === 'PROTOCOL_CONNECTION_LOST') {
          // 连接失败，直接返回，不处理
          return;
        }
        // 其他错误才输出
        console.error('[消息转发] 数据库查询错误:', error.message);
        return;
      }

      if (!rows || rows.length === 0) {
        return;
      }

      console.log(`[消息转发] 发现 ${rows.length} 条未转发的消息，开始转发...`);

      for (const row of rows) {
        try {
          // 解析metadata（如果是JSON字符串）
          let metadata = row.metadata;
          if (metadata && typeof metadata === 'string') {
            try {
              metadata = JSON.parse(metadata);
            } catch (e) {
              // 如果解析失败，保持原样
            }
          }

          const message = {
            id: row.id,
            source: row.source,
            source_id: row.source_id,
            type: row.type,
            title: row.title,
            content: row.content,
            metadata: metadata,
            sender: row.sender,
            sender_id: row.sender_id,
            created_at: row.created_at
          };

          // 转发消息
          console.log(`[消息转发] 准备转发消息 ID: ${row.id}, 内容: ${row.content?.substring(0, 50)}...`);
          const forwardedCount = await forwardMessageToClients(message);
          console.log(`[消息转发] 消息 ID: ${row.id} 已转发给 ${forwardedCount} 个客户端`);

          // 标记为已转发
          if (forwardedCount > 0) {
            await pool.execute(
              'UPDATE messages SET forwarded = 1 WHERE id = ?',
              [row.id]
            );
            console.log(`[消息转发] 消息 ID: ${row.id} 已标记为已转发`);
          } else {
            console.warn(`[消息转发] 警告：消息 ID: ${row.id} 没有转发给任何客户端`);
          }
        } catch (error) {
          console.error(`转发消息失败 (ID: ${row.id}):`, error);
        }
      }

      console.log(`[消息转发] 转发完成，处理了 ${rows.length} 条消息`);
    } catch (error) {
      // 静默处理错误，避免日志刷屏
      // 只在非连接错误时输出
      if (error.code !== 'ECONNREFUSED' && error.code !== 'PROTOCOL_CONNECTION_LOST') {
        console.error('[消息转发] 处理消息时出错:', error.message);
      }
    }
  }

  // 定期检查并转发未转发的消息（每1秒检查一次，确保消息及时转发）
  setInterval(() => {
    checkAndForwardMessages();
  }, 1000); // 每1秒检查一次

  // 定期清理不活跃的 HTTP 客户端（超过 5 分钟没有轮询）
  setInterval(() => {
    const now = Date.now();
    const timeout = 5 * 60 * 1000; // 5 分钟
    
    const totalClients = httpClients.size;
    let cleanedCount = 0;
    
    for (const [clientId, clientInfo] of httpClients.entries()) {
      if (clientInfo.lastPollTime && (now - clientInfo.lastPollTime) > timeout) {
        const inactiveTime = Math.floor((now - clientInfo.lastPollTime) / 1000 / 60); // 分钟
        console.log(`[清理不活跃客户端] ID: ${clientId}, IP: ${clientInfo.ip || 'unknown'}, 创建时间: ${clientInfo.createdAt || 'unknown'}, 不活跃时间: ${inactiveTime}分钟`);
        httpClients.delete(clientId);
        cleanedCount++;
        
        // 解除所有绑定到此客户端的连接
        clients.forEach((info, ws) => {
          if (info.boundTo === clientId) {
            info.boundTo = null;
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({
                type: 'bind_lost',
                message: '绑定的目标客户端已断开连接',
                timestamp: new Date().toISOString()
              }));
            }
          }
        });
        
        // 解除 HTTP 客户端绑定到此客户端的连接
        httpClients.forEach((httpInfo, httpId) => {
          if (httpInfo.boundTo === clientId) {
            httpInfo.boundTo = null;
            httpInfo.messageQueue.push({
              type: 'bind_lost',
              message: '绑定的目标客户端已断开连接',
              timestamp: new Date().toISOString()
            });
          }
        });
      }
    }
    
    // 输出清理统计信息
    if (cleanedCount > 0) {
      console.log(`[客户端清理统计] 总客户端数: ${totalClients}, 已清理: ${cleanedCount}, 剩余: ${httpClients.size}`);
    }
  }, 60000); // 每分钟检查一次

  server
    .once('error', (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, async () => {
      console.log(`> 服务器已启动: http://${hostname}:${port}`);
      console.log(`> WebSocket 服务器已启动: ws://${hostname}:${port}/api/ws`);
      console.log(`> 消息API: http://${hostname}:${port}/api/messages/receive`);
      
      // 服务器启动后立即检查一次未转发的消息
      setTimeout(() => {
        console.log('> 检查未转发的消息...');
        checkAndForwardMessages();
      }, 2000); // 延迟2秒，确保数据库连接已建立
    });
});

