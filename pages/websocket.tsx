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

export default function WebSocketPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('未连接');
  const [clientId, setClientId] = useState<string>('');
  const [boundTo, setBoundTo] = useState<string>('');
  const [bindTargetId, setBindTargetId] = useState('');
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
  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const connect = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
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
      addMessage({
        type: 'system',
        message: '已成功连接到服务器',
        timestamp: new Date().toISOString()
      });
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // 保存客户端ID
        if (data.type === 'welcome' && data.clientId) {
          setClientId(data.clientId);
        }
        
        // 处理绑定成功
        if (data.type === 'bind_success' && data.targetClientId) {
          setBoundTo(data.targetClientId);
        }
        
        // 处理解绑成功或绑定丢失
        if (data.type === 'unbind_success' || data.type === 'bind_lost') {
          setBoundTo('');
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

    ws.onclose = () => {
      console.log('WebSocket 连接已关闭');
      setIsConnected(false);
      setConnectionStatus('已断开');
      addMessage({
        type: 'system',
        message: '连接已断开',
        timestamp: new Date().toISOString()
      });
    };
  };

  const disconnect = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
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

    try {
      // 解析 JSON，移除注释
      const cleanedJson = orderJson.replace(/\/\/.*$/gm, '').trim();
      const order = JSON.parse(cleanedJson);
      
      // 直接发送订单对象
      wsRef.current.send(JSON.stringify(order));
      
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
  };

  const addMessage = (message: Message) => {
    setMessages((prev) => [...prev, message]);
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('zh-CN');
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
          onClick={connect} 
          disabled={isConnected}
          className={styles.button}
        >
          连接
        </button>
        <button 
          onClick={disconnect} 
          disabled={!isConnected}
          className={styles.button}
        >
          断开
        </button>
        <button 
          onClick={() => setMessages([])}
          className={styles.button}
        >
          清空消息
        </button>
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
        </div>
      </div>

      <div className={styles.orderSection}>
        <h3>发送订单（粘贴 JSON 格式）</h3>
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

