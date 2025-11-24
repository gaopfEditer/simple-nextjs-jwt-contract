const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const WebSocket = require('ws');

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

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
            handleHttpPush(data, res);
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
        
        if (!clientId) {
          // 新客户端，分配 ID（只在首次连接时创建）
          const newClientId = generateClientId();
          httpClients.set(newClientId, {
            id: newClientId,
            boundTo: null,
            messageQueue: [],
            lastPollTime: Date.now()
          });
          
          // 直接返回欢迎消息（不放入队列，立即返回）
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            type: 'welcome',
            clientId: newClientId,
            message: '欢迎连接到 WebSocket 服务器！',
            timestamp: new Date().toISOString()
          }));
        //   console.log(`新的 HTTP 客户端已连接: ${newClientId}`);
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
  function handleHttpPush(data, res) {
    try {
      console.log('收到 HTTP 推送消息:', data);
      
      // 处理连接确认消息，分配客户端 ID（如果还没有）
      if (data.type === 'connected') {
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
      boundTo: null
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

  // 定期清理不活跃的 HTTP 客户端（超过 5 分钟没有轮询）
  setInterval(() => {
    const now = Date.now();
    const timeout = 5 * 60 * 1000; // 5 分钟
    
    for (const [clientId, clientInfo] of httpClients.entries()) {
      if (clientInfo.lastPollTime && (now - clientInfo.lastPollTime) > timeout) {
        console.log(`清理不活跃的 HTTP 客户端: ${clientId}`);
        httpClients.delete(clientId);
        
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
  }, 60000); // 每分钟检查一次

  server
    .once('error', (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> 服务器已启动: http://${hostname}:${port}`);
      console.log(`> WebSocket 服务器已启动: ws://${hostname}:${port}/api/ws`);
    });
});

