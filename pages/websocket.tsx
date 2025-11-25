import { useState, useEffect, useRef } from 'react';
import styles from '../styles/WebSocket.module.css';

interface Message {
  type: string;
  message?: string;
  original?: any;
  from?: string;
  order?: any;
  timestamp: string;
  clientId?: string;
  targetClientId?: string;
  fromClientId?: string;
}

interface DeviceInfo {
  brand?: string;
  model?: string;
  product?: string;
  release?: string;
  sdkInt?: number;
  width?: number;
  height?: number;
  androidId?: string;
  deviceName?: string;
}

interface ClientInfo {
  id: string;
  ip?: string;
  userAgent?: string;
  createdAt?: string;
  lastPollTime?: string;
  inactiveMinutes?: number;
  boundTo?: string;
  queueLength?: number;
  deviceInfo?: DeviceInfo | null;
  readyState?: string;
  type?: string;
}

interface OrderHistory {
  order: any;
  timestamp: string;
  id: string;
}

export default function WebSocketPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('未连接');
  const [clientId, setClientId] = useState<string>('');
  const [boundTo, setBoundTo] = useState<string>('');
  const [bindTargetId, setBindTargetId] = useState('');
  const [availableClients, setAvailableClients] = useState<ClientInfo[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [orderJson, setOrderJson] = useState(`{
  "action": "buy",
  "symbol": "BTC/USDT",
  "amount": 0.01,
  "price": 50000,
  "orderType": "limit",
  "leverage": 10,
  "stopLoss": 49000,
  "takeProfit": 52000
}`);
  const [orderHistory, setOrderHistory] = useState<OrderHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const sendOrderDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef<number>(0);
  const maxReconnectAttempts = 5; // 最大重连次数
  const reconnectDelay = 3000; // 重连延迟（毫秒）
  const heartbeatTimeout = 120000; // 心跳超时时间（120秒，服务器30秒发送一次，允许4次丢失）
  const lastHeartbeatRef = useRef<number>(0); // 初始化为0，表示还未收到心跳
  const missedHeartbeatCountRef = useRef<number>(0); // 连续丢失心跳的次数
  const maxMissedHeartbeats = 5; // 连续丢失5次心跳（150秒）才断开

  // 过滤超过一个月的历史订单
  const filterRecentHistory = (history: OrderHistory[]): OrderHistory[] => {
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    const oneMonthAgoTime = oneMonthAgo.getTime();
    
    return history.filter((item) => {
      const itemTime = new Date(item.timestamp).getTime();
      return itemTime >= oneMonthAgoTime;
    });
  };

  // 加载历史订单
  useEffect(() => {
    try {
      const saved = localStorage.getItem('orderHistory');
      if (saved) {
        const history = JSON.parse(saved) as OrderHistory[];
        // 过滤掉超过一个月的数据
        const recentHistory = filterRecentHistory(history);
        setOrderHistory(recentHistory);
        // 如果过滤后有变化，更新 localStorage
        if (recentHistory.length !== history.length) {
          localStorage.setItem('orderHistory', JSON.stringify(recentHistory));
        }
      }
    } catch (e) {
      console.error('加载历史订单失败:', e);
    }
  }, []);

  // 保存历史订单到 localStorage
  const saveOrderToHistory = (order: any) => {
    try {
      const historyItem: OrderHistory = {
        order: order,
        timestamp: new Date().toISOString(),
        id: `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };
      // 添加新订单，然后过滤超过一个月的数据
      const newHistory = filterRecentHistory([historyItem, ...orderHistory]);
      // 最多保存100条
      const limitedHistory = newHistory.slice(0, 100);
      setOrderHistory(limitedHistory);
      localStorage.setItem('orderHistory', JSON.stringify(limitedHistory));
    } catch (e) {
      console.error('保存历史订单失败:', e);
    }
  };

  // 清空历史订单
  const clearOrderHistory = () => {
    setOrderHistory([]);
    localStorage.removeItem('orderHistory');
    addMessage({
      type: 'system',
      message: '历史订单已清空',
      timestamp: new Date().toISOString()
    });
  };

  // 检查是否是重复订单（一个月内相同订单）
  const checkDuplicateOrder = (order: any): OrderHistory | null => {
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    const oneMonthAgoTime = oneMonthAgo.getTime();
    
    for (const historyItem of orderHistory) {
      const historyTime = new Date(historyItem.timestamp).getTime();
      // 只检查一个月内的订单
      if (historyTime >= oneMonthAgoTime) {
        // 比较订单内容（排除时间戳等字段）
        const orderStr = JSON.stringify({
          action: order.action,
          symbol: order.symbol,
          amount: order.amount,
          price: order.price,
          orderType: order.orderType,
          leverage: order.leverage,
          stopLoss: order.stopLoss,
          takeProfit: order.takeProfit
        });
        const historyOrderStr = JSON.stringify({
          action: historyItem.order.action,
          symbol: historyItem.order.symbol,
          amount: historyItem.order.amount,
          price: historyItem.order.price,
          orderType: historyItem.order.orderType,
          leverage: historyItem.order.leverage,
          stopLoss: historyItem.order.stopLoss,
          takeProfit: historyItem.order.takeProfit
        });
        if (orderStr === historyOrderStr) {
          return historyItem;
        }
      }
    }
    return null;
  };

  // 格式化时间差
  const formatTimeAgo = (timestamp: string): string => {
    const now = new Date().getTime();
    const past = new Date(timestamp).getTime();
    const diff = now - past;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      return `${days}天前`;
    } else if (hours > 0) {
      return `${hours}小时前`;
    } else if (minutes > 0) {
      return `${minutes}分钟前`;
    } else {
      return '刚刚';
    }
  };

  // 组件挂载时自动连接
  useEffect(() => {
    // 延迟一下再连接，确保所有状态已初始化
    const timer = setTimeout(() => {
      connect();
    }, 100);
    
    return () => {
      clearTimeout(timer);
      // 清理定时器
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 移除自动滚动到底部，让用户手动控制滚动位置
  // useEffect(() => {
  //   messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  // }, [messages]);

  const connect = () => {
    // 如果已经连接且是 OPEN 状态，不重复连接
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('连接已存在且处于 OPEN 状态，跳过连接');
      return;
    }

    // 只有在连接已关闭或正在关闭时才清理旧连接
    // 绝对不关闭 OPEN 状态的连接！
    if (wsRef.current) {
      const currentState = wsRef.current.readyState;
      console.log('检查旧连接状态:', currentState, 'OPEN=', WebSocket.OPEN);
      
      if (currentState === WebSocket.OPEN) {
        // 如果连接是 OPEN 状态，绝对不能关闭！
        console.log('连接处于 OPEN 状态，不关闭，直接返回');
        return;
      } else if (currentState === WebSocket.CONNECTING) {
        // 如果正在连接，等待完成
        console.log('连接正在建立中，等待完成...');
        return;
      } else if (currentState === WebSocket.CLOSED || currentState === WebSocket.CLOSING) {
        // 只有在连接已关闭或正在关闭时才清理
        console.log('清理已关闭的连接');
        wsRef.current = null;
      } else {
        // 其他未知状态，也不关闭，只清理引用
        console.log('连接处于未知状态，只清理引用，不关闭');
        wsRef.current = null;
      }
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/ws`;
    
    setConnectionStatus('正在连接...');
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket 连接已建立');
      setIsConnected(true);
      setConnectionStatus('已连接');
      reconnectAttemptsRef.current = 0; // 重置重连次数
      // 重置心跳时间，等待收到第一个心跳包
      lastHeartbeatRef.current = 0; // 0表示还未收到心跳
      missedHeartbeatCountRef.current = 0; // 重置丢失心跳计数
      
      // 清除之前的重连定时器
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      
      // 延迟启动心跳检测，给服务器时间发送第一个心跳（服务器每30秒发送一次）
      // 心跳检测只用于日志记录，不用于主动断开连接
      setTimeout(() => {
        startHeartbeatCheck();
      }, 40000); // 40秒后开始检测，此时应该已经收到第一个心跳了
      
      addMessage({
        type: 'system',
        message: '已成功连接到服务器',
        timestamp: new Date().toISOString()
      });
      // 连接成功后自动刷新客户端列表并绑定第一个设备
      setTimeout(async () => {
        const clients = await fetchAvailableClients();
        // 自动绑定第一个设备
        if (clients.length > 0 && !boundTo && wsRef.current) {
          const firstClient = clients[0];
          console.log('自动绑定第一个设备:', firstClient.id);
          setBindTargetId(firstClient.id);
          wsRef.current.send(JSON.stringify({
            type: 'bind',
            targetClientId: firstClient.id,
            timestamp: new Date().toISOString()
          }));
        }
      }, 1500);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // 处理心跳包
        if (data.type === 'heartbeat') {
          const now = Date.now();
          lastHeartbeatRef.current = now;
          missedHeartbeatCountRef.current = 0; // 重置丢失心跳计数
          console.log('收到心跳包，已更新心跳时间:', new Date(now).toLocaleTimeString());
          // 响应心跳
          if (ws.readyState === WebSocket.OPEN) {
            try {
              ws.send(JSON.stringify({
                type: 'pong',
                timestamp: new Date().toISOString()
              }));
              console.log('已发送心跳响应 (pong)');
            } catch (e) {
              console.error('发送心跳响应失败:', e);
            }
          }
          return; // 心跳包不显示在消息列表中
        }
        
        // 处理 pong 响应（如果服务器发送）
        if (data.type === 'pong') {
          lastHeartbeatRef.current = Date.now();
          return; // pong 也不显示
        }
        
        // 保存客户端ID
        if (data.type === 'welcome' && data.clientId) {
          setClientId(data.clientId);
        }
        
        // 处理绑定成功
        if (data.type === 'bind_success' && data.targetClientId) {
          setBoundTo(data.targetClientId);
          // 刷新客户端列表以更新绑定状态
          setTimeout(() => {
            fetchAvailableClients();
          }, 300);
        }
        
        // 处理解绑成功或绑定丢失
        if (data.type === 'unbind_success' || data.type === 'bind_lost') {
          setBoundTo('');
          // 刷新客户端列表以更新绑定状态
          setTimeout(() => {
            fetchAvailableClients();
          }, 300);
        }
        
        addMessage(data);
      } catch (error) {
        console.error('解析消息错误:', error);
        addMessage({
          type: 'error',
          message: '无法解析服务器消息',
          timestamp: new Date().toISOString()
        });
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket 错误:', error);
      setConnectionStatus('连接错误');
      addMessage({
        type: 'error',
        message: '连接发生错误',
        timestamp: new Date().toISOString()
      });
    };

    ws.onclose = (event) => {
      console.log('WebSocket 连接已关闭', event.code, event.reason, 'wasClean:', event.wasClean);
      setIsConnected(false);
      setConnectionStatus('已断开');
      
      // 清除心跳检测
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
      
      // 只有在非正常关闭且不是手动断开时才重连
      // 1000: 正常关闭
      // 1001: 端点离开（如页面关闭）
      // 1005: 无状态码（不应该出现）
      // 1006: 异常关闭（连接丢失）
      if (event.code !== 1000 && event.code !== 1001 && event.code !== 1005) {
        console.log('非正常关闭，准备重连，关闭代码:', event.code, '原因:', event.reason);
        // 延迟一下再重连，避免立即重连导致的问题
        setTimeout(() => {
          attemptReconnect();
        }, 1000);
      } else {
        console.log('正常关闭，不进行重连，关闭代码:', event.code);
        addMessage({
          type: 'system',
          message: '连接已断开',
          timestamp: new Date().toISOString()
        });
      }
    };
  };

  const disconnect = () => {
    // 清除重连定时器，防止手动断开后自动重连
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    // 清除心跳检测
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
    if (wsRef.current) {
      // 使用正常关闭代码，避免触发重连
      wsRef.current.close(1000, '用户手动断开');
      wsRef.current = null;
    }
  };

  // 启动心跳检测（只有在连续多次收不到心跳时才断开）
  const startHeartbeatCheck = () => {
    // 清除之前的定时器
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }
    
    // 每30秒检查一次心跳（服务器每30秒发送一次）
    heartbeatIntervalRef.current = setInterval(() => {
      // 如果还未收到任何心跳，跳过检测（等待第一个心跳）
      if (lastHeartbeatRef.current === 0) {
        console.log('心跳检测: 等待第一个心跳包...');
        return;
      }
      
      const now = Date.now();
      const timeSinceLastHeartbeat = now - lastHeartbeatRef.current;
      
      // 如果超过一个心跳周期（30秒）没收到心跳，增加丢失计数
      if (timeSinceLastHeartbeat > 30000) {
        missedHeartbeatCountRef.current++;
        console.warn(`心跳丢失 (${Math.floor(timeSinceLastHeartbeat / 1000)}秒)，连续丢失 ${missedHeartbeatCountRef.current}/${maxMissedHeartbeats} 次`);
        
        // 只有在连续丢失多次心跳后才断开
        if (missedHeartbeatCountRef.current >= maxMissedHeartbeats) {
          console.error(`连续丢失 ${maxMissedHeartbeats} 次心跳，主动断开连接`);
          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.close(1006, '心跳连续丢失');
          }
        }
      } else {
        // 收到心跳，重置计数
        if (missedHeartbeatCountRef.current > 0) {
          console.log(`心跳恢复，距离上次心跳 ${Math.floor(timeSinceLastHeartbeat / 1000)} 秒，重置丢失计数`);
          missedHeartbeatCountRef.current = 0;
        } else {
          console.log(`心跳检测: 距离上次心跳 ${Math.floor(timeSinceLastHeartbeat / 1000)} 秒，连接正常`);
        }
      }
    }, 30000); // 每30秒检查一次（与服务器心跳频率一致）
  };

  // 尝试重连
  const attemptReconnect = () => {
    // 如果已经连接，不重连
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('连接已恢复，取消重连');
      reconnectAttemptsRef.current = 0;
      setIsConnected(true);
      setConnectionStatus('已连接');
      return;
    }
    
    // 如果已经达到最大重连次数，停止重连
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      console.error('已达到最大重连次数，停止重连');
      setConnectionStatus('连接失败（已停止重连）');
      addMessage({
        type: 'error',
        message: `连接失败，已尝试 ${maxReconnectAttempts} 次重连`,
        timestamp: new Date().toISOString()
      });
      return;
    }

    reconnectAttemptsRef.current++;
    const delay = reconnectDelay * reconnectAttemptsRef.current; // 递增延迟
    
    setConnectionStatus(`正在重连 (${reconnectAttemptsRef.current}/${maxReconnectAttempts})...`);
    addMessage({
      type: 'system',
      message: `正在尝试重连 (${reconnectAttemptsRef.current}/${maxReconnectAttempts})...`,
      timestamp: new Date().toISOString()
    });

    reconnectTimeoutRef.current = setTimeout(() => {
      // 重连前再次检查连接状态
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        console.log('重连前检查：连接已恢复，取消重连');
        reconnectAttemptsRef.current = 0;
        setIsConnected(true);
        setConnectionStatus('已连接');
        return;
      }
      console.log(`尝试重连 (${reconnectAttemptsRef.current}/${maxReconnectAttempts})`);
      connect();
    }, delay);
  };

  const sendMessage = () => {
    if (!input.trim() || !isConnected || !wsRef.current) {
      return;
    }

    const message = {
      type: 'message',
      message: input,
      from: '客户端',
      timestamp: new Date().toISOString()
    };

    wsRef.current.send(JSON.stringify(message));
    setInput('');
  };

  const sendBroadcast = () => {
    if (!input.trim() || !isConnected || !wsRef.current) {
      return;
    }

    const message = {
      type: 'message',
      message: input,
      from: '客户端',
      broadcast: true,
      timestamp: new Date().toISOString()
    };

    wsRef.current.send(JSON.stringify(message));
    setInput('');
  };

  const bindToClient = () => {
    if (!bindTargetId.trim() || !isConnected || !wsRef.current) {
      return;
    }

    wsRef.current.send(JSON.stringify({
      type: 'bind',
      targetClientId: bindTargetId.trim(),
      timestamp: new Date().toISOString()
    }));
  };

  const unbind = () => {
    if (!isConnected || !wsRef.current) {
      return;
    }

    wsRef.current.send(JSON.stringify({
      type: 'unbind',
      timestamp: new Date().toISOString()
    }));
  };

  const sendOrder = () => {
    if (!isConnected || !wsRef.current || !orderJson.trim()) {
      return;
    }

    // 防抖：清除之前的定时器
    if (sendOrderDebounceRef.current) {
      clearTimeout(sendOrderDebounceRef.current);
    }

    // 设置新的定时器（500ms防抖）
    sendOrderDebounceRef.current = setTimeout(() => {
      // 再次检查连接状态
      if (!isConnected || !wsRef.current || !orderJson.trim()) {
        return;
      }

      try {
        // 解析 JSON，移除注释
        const cleanedJson = orderJson.replace(/\/\/.*$/gm, '').trim();
        const order = JSON.parse(cleanedJson);
        
        // 检查是否是重复订单
        const duplicate = checkDuplicateOrder(order);
        if (duplicate) {
          const timeAgo = formatTimeAgo(duplicate.timestamp);
          addMessage({
            type: 'warning',
            message: `检测到重复订单！在 ${timeAgo} 已经发送过相同的订单`,
            order: order,
            timestamp: new Date().toISOString()
          });
          // 询问是否继续发送
          if (!confirm(`检测到重复订单！在 ${timeAgo} 已经发送过相同的订单。是否继续发送？`)) {
            return;
          }
        }
        
        // 直接发送订单对象
        if (wsRef.current) {
          wsRef.current.send(JSON.stringify(order));
        }
        
        // 保存到历史记录
        saveOrderToHistory(order);
        
        // 添加本地消息显示
        addMessage({
          type: 'system',
          message: '订单已发送',
          order: order,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('JSON 解析错误:', error);
        addMessage({
          type: 'error',
          message: `JSON 格式错误: ${error instanceof Error ? error.message : '未知错误'}`,
          timestamp: new Date().toISOString()
        });
      }
    }, 500);
  };

  const addMessage = (message: Message) => {
    setMessages((prev) => [...prev, message]);
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('zh-CN');
  };

  const fetchAvailableClients = async (): Promise<ClientInfo[]> => {
    setLoadingClients(true);
    try {
      // 获取 HTTP 客户端列表
      const httpResponse = await fetch('/debug/http-clients');
      const httpData = await httpResponse.json();
      
      // 获取 WebSocket 客户端列表
      const wsResponse = await fetch('/debug/ws-clients');
      const wsData = await wsResponse.json();
      
      // 合并客户端列表，排除当前客户端，并且只显示有设备信息的客户端
      let allClients: ClientInfo[] = [
        ...(httpData.clients || []).map((c: ClientInfo) => ({ ...c, type: 'HTTP' })),
        ...(wsData.clients || []).map((c: ClientInfo) => ({ ...c, type: 'WebSocket' }))
      ].filter((c: ClientInfo) => 
        c.id !== clientId && 
        c.deviceInfo && 
        c.deviceInfo.deviceName && 
        c.deviceInfo.deviceName !== 'unknown'
      );
      
      // 过滤重复的 androidId，只保留最新时间的
      const androidIdMap = new Map<string, ClientInfo>();
      const noAndroidIdClients: ClientInfo[] = [];
      
      allClients.forEach((client) => {
        if (client.deviceInfo && client.deviceInfo.androidId && client.deviceInfo.androidId !== 'unknown') {
          const androidId = client.deviceInfo.androidId;
          const existing = androidIdMap.get(androidId);
          
          if (!existing) {
            // 如果没有已存在的，直接添加
            androidIdMap.set(androidId, client);
          } else {
            // 如果已存在，比较时间，保留最新的
            // 使用 createdAt 或 lastPollTime 来判断时间
            const existingTime = existing.createdAt 
              ? new Date(existing.createdAt).getTime() 
              : (existing.lastPollTime ? new Date(existing.lastPollTime).getTime() : 0);
            const currentTime = client.createdAt 
              ? new Date(client.createdAt).getTime() 
              : (client.lastPollTime ? new Date(client.lastPollTime).getTime() : 0);
            
            if (currentTime > existingTime) {
              androidIdMap.set(androidId, client);
            }
          }
        } else {
          // 没有 androidId 的客户端，单独存储（不进行去重）
          noAndroidIdClients.push(client);
        }
      });
      
      // 将 Map 转换回数组，并合并没有 androidId 的客户端
      allClients = Array.from(androidIdMap.values()).concat(noAndroidIdClients);
      
      setAvailableClients(allClients);
      return allClients;
    } catch (error) {
      console.error('获取客户端列表失败:', error);
      addMessage({
        type: 'error',
        message: '获取客户端列表失败',
        timestamp: new Date().toISOString()
      });
      return [];
    } finally {
      setLoadingClients(false);
    }
  };

  const bindToClientById = (targetId: string) => {
    if (!isConnected || !wsRef.current) {
      return;
    }
    setBindTargetId(targetId);
    wsRef.current.send(JSON.stringify({
      type: 'bind',
      targetClientId: targetId,
      timestamp: new Date().toISOString()
    }));
  };


  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>WebSocket 测试客户端</h1>
        <div className={styles.status}>
          <span className={`${styles.statusIndicator} ${isConnected ? styles.connected : styles.disconnected}`}>
            {isConnected ? '●' : '○'}
          </span>
          <span>{connectionStatus}</span>
          {clientId && <span className={styles.clientId}>ID: {clientId}</span>}
          {boundTo && <span className={styles.boundTo}>绑定到: {boundTo}</span>}
        </div>
      </div>

      <div className={styles.controls}>
        <button 
          onClick={() => setMessages([])}
          className={styles.button}
        >
          清空消息
        </button>
        {!isConnected && (
          <button 
            onClick={connect} 
            className={styles.button}
          >
            重新连接
          </button>
        )}
      </div>

      <div className={styles.bindSection}>
        <h3>客户端绑定</h3>
        <div className={styles.bindControls}>
          <input
            type="text"
            value={bindTargetId}
            onChange={(e) => setBindTargetId(e.target.value)}
            placeholder="输入目标客户端ID..."
            disabled={!isConnected}
            className={styles.input}
          />
          <button
            onClick={bindToClient}
            disabled={!isConnected || !bindTargetId.trim()}
            className={styles.button}
          >
            绑定
          </button>
          <button
            onClick={unbind}
            disabled={!isConnected || !boundTo}
            className={styles.button}
          >
            解绑
          </button>
          <button
            onClick={fetchAvailableClients}
            disabled={loadingClients}
            className={styles.button}
          >
            {loadingClients ? '加载中...' : '刷新客户端列表'}
          </button>
        </div>
        
        {availableClients.length > 0 && (
          <div className={styles.clientsList}>
            <h4>可用客户端列表 ({availableClients.length})</h4>
            <div className={styles.clientsGrid}>
              {availableClients.map((client) => (
                <div 
                  key={client.id} 
                  className={`${styles.clientCard} ${boundTo === client.id ? styles.bound : ''}`}
                  onClick={() => bindToClientById(client.id)}
                >
                  <div className={styles.clientId}>{client.id}</div>
                  {client.deviceInfo && (
                    <div className={styles.deviceInfo}>
                      <div className={styles.deviceName}>
                        {client.deviceInfo.deviceName || `${client.deviceInfo.brand} ${client.deviceInfo.model}`}
                      </div>
                      <div className={styles.deviceDetails}>
                        <span>Android {client.deviceInfo.release}</span>
                        {client.deviceInfo.androidId && (
                          <span className={styles.androidId}>
                            ID: {client.deviceInfo.androidId.substring(0, 8)}...
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  {!client.deviceInfo && (
                    <div className={styles.noDeviceInfo}>无设备信息</div>
                  )}
                  <div className={styles.clientMeta}>
                    <span className={styles.clientType}>{client.type || (client.readyState ? 'WebSocket' : 'HTTP')}</span>
                    {client.ip && client.ip !== 'unknown' && (
                      <span className={styles.clientIp}>IP: {client.ip}</span>
                    )}
                  </div>
                  {boundTo === client.id && (
                    <div className={styles.boundBadge}>已绑定</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className={styles.orderSection}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <h3>发送订单（粘贴 JSON 格式）</h3>
          <div>
            <button
              onClick={() => setShowHistory(!showHistory)}
              className={styles.button}
              style={{ marginRight: '10px' }}
            >
              {showHistory ? '隐藏历史' : '查看历史'}
            </button>
            {orderHistory.length > 0 && (
              <button
                onClick={clearOrderHistory}
                className={styles.button}
              >
                清空历史
              </button>
            )}
          </div>
        </div>
        
        {showHistory && orderHistory.length > 0 && (
          <div className={styles.historySection} style={{ marginBottom: '20px', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', maxHeight: '300px', overflowY: 'auto' }}>
            <h4>历史订单（最近一个月，共 {orderHistory.length} 条）</h4>
            {orderHistory.map((item) => (
              <div key={item.id} style={{ marginBottom: '10px', padding: '8px', border: '1px solid #eee', borderRadius: '4px', cursor: 'pointer' }}
                onClick={() => setOrderJson(JSON.stringify(item.order, null, 2))}>
                <div style={{ fontSize: '12px', color: '#666' }}>
                  {new Date(item.timestamp).toLocaleString('zh-CN')} ({formatTimeAgo(item.timestamp)})
                </div>
                <div style={{ fontSize: '14px', marginTop: '4px' }}>
                  {item.order.action} {item.order.symbol} {item.order.amount} @ {item.order.price || '市价'}
                </div>
              </div>
            ))}
          </div>
        )}
        
        <div className={styles.orderForm}>
          <textarea
            value={orderJson}
            onChange={(e) => setOrderJson(e.target.value)}
            placeholder={`{\n  "action": "buy",\n  "symbol": "BTC/USDT",\n  "amount": 0.01,\n  "price": 50000,\n  "orderType": "limit",\n  "leverage": 10,\n  "stopLoss": 49000,\n  "takeProfit": 52000\n}`}
            disabled={!isConnected}
            className={styles.orderTextarea}
            rows={12}
          />
          <button
            onClick={sendOrder}
            disabled={!isConnected || !boundTo || !orderJson.trim()}
            className={styles.sendOrderButton}
          >
            发送订单
          </button>
          {!boundTo && (
            <div className={styles.warning}>请先绑定目标客户端才能发送订单</div>
          )}
        </div>
      </div>

      <div className={styles.messages}>
        {messages.map((msg, index) => (
          <div key={index} className={`${styles.message} ${styles[msg.type]}`}>
            <div className={styles.messageHeader}>
              <span className={styles.messageType}>{msg.type}</span>
              <span className={styles.messageTime}>{formatTime(msg.timestamp)}</span>
            </div>
            <div className={styles.messageContent}>
              {msg.type === 'echo' && msg.original ? (
                <div>
                  <div>原始消息: {JSON.stringify(msg.original, null, 2)}</div>
                  <div>服务器响应: {msg.message}</div>
                </div>
              ) : msg.type === 'broadcast' ? (
                <div>
                  <strong>{msg.from}:</strong> {msg.message}
                </div>
              ) : msg.type === 'order_forwarded' ? (
                <div>
                  <div><strong>收到转发的订单:</strong></div>
                  <pre>{JSON.stringify(msg.order, null, 2)}</pre>
                  <div>来自客户端: {msg.fromClientId || '未知'}</div>
                </div>
              ) : msg.type === 'order_success' ? (
                <div>
                  <div><strong>订单转发成功</strong></div>
                  <pre>{JSON.stringify(msg.order, null, 2)}</pre>
                  <div>目标客户端: {msg.targetClientId || '未知'}</div>
                </div>
              ) : msg.type === 'order_error' ? (
                <div>
                  <div><strong>订单错误:</strong> {msg.message}</div>
                  {msg.order && <pre>{JSON.stringify(msg.order, null, 2)}</pre>}
                </div>
              ) : (
                <div>{msg.message || JSON.stringify(msg, null, 2)}</div>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className={styles.inputArea}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              sendMessage();
            }
          }}
          placeholder="输入消息..."
          disabled={!isConnected}
          className={styles.input}
        />
        <button
          onClick={sendMessage}
          disabled={!isConnected || !input.trim()}
          className={styles.sendButton}
        >
          发送
        </button>
        <button
          onClick={sendBroadcast}
          disabled={!isConnected || !input.trim()}
          className={styles.sendButton}
        >
          广播
        </button>
      </div>
    </div>
  );
}

