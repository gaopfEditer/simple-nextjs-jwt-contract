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

interface OrderForm {
  action: 'buy' | 'sell';
  symbol: string;
  amount: number;
  price?: number;
  orderType: 'limit' | 'market';
  leverage?: number;
  stopLoss?: number;
  takeProfit?: number;
}

export default function WebSocketPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('未连接');
  const [clientId, setClientId] = useState<string>('');
  const [boundTo, setBoundTo] = useState<string>('');
  const [bindTargetId, setBindTargetId] = useState('');
  const [orderForm, setOrderForm] = useState<OrderForm>({
    action: 'buy',
    symbol: 'BTC/USDT',
    amount: 0.01,
    price: 50000,
    orderType: 'limit',
    leverage: 10,
    stopLoss: 49000,
    takeProfit: 52000
  });
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
    if (!isConnected || !wsRef.current) {
      return;
    }

    // 构建订单对象（只包含有值的字段）
    const order: any = {
      action: orderForm.action,
      symbol: orderForm.symbol,
      amount: orderForm.amount,
      orderType: orderForm.orderType
    };

    if (orderForm.orderType === 'limit' && orderForm.price) {
      order.price = orderForm.price;
    }

    if (orderForm.leverage) {
      order.leverage = orderForm.leverage;
    }

    if (orderForm.stopLoss) {
      order.stopLoss = orderForm.stopLoss;
    }

    if (orderForm.takeProfit) {
      order.takeProfit = orderForm.takeProfit;
    }

    wsRef.current.send(JSON.stringify(order));
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
        <h3>发送订单</h3>
        <div className={styles.orderForm}>
          <div className={styles.formRow}>
            <label>操作类型:</label>
            <select
              value={orderForm.action}
              onChange={(e) => setOrderForm({ ...orderForm, action: e.target.value as 'buy' | 'sell' })}
              className={styles.select}
            >
              <option value="buy">买入</option>
              <option value="sell">卖出</option>
            </select>
          </div>
          
          <div className={styles.formRow}>
            <label>交易对:</label>
            <input
              type="text"
              value={orderForm.symbol}
              onChange={(e) => setOrderForm({ ...orderForm, symbol: e.target.value })}
              className={styles.input}
              placeholder="BTC/USDT"
            />
          </div>
          
          <div className={styles.formRow}>
            <label>数量:</label>
            <input
              type="number"
              value={orderForm.amount}
              onChange={(e) => setOrderForm({ ...orderForm, amount: parseFloat(e.target.value) || 0 })}
              className={styles.input}
              step="0.0001"
            />
          </div>
          
          <div className={styles.formRow}>
            <label>订单类型:</label>
            <select
              value={orderForm.orderType}
              onChange={(e) => setOrderForm({ ...orderForm, orderType: e.target.value as 'limit' | 'market' })}
              className={styles.select}
            >
              <option value="limit">限价</option>
              <option value="market">市价</option>
            </select>
          </div>
          
          {orderForm.orderType === 'limit' && (
            <div className={styles.formRow}>
              <label>价格:</label>
              <input
                type="number"
                value={orderForm.price || ''}
                onChange={(e) => setOrderForm({ ...orderForm, price: parseFloat(e.target.value) || undefined })}
                className={styles.input}
                step="0.01"
              />
            </div>
          )}
          
          <div className={styles.formRow}>
            <label>杠杆倍数 (可选):</label>
            <input
              type="number"
              value={orderForm.leverage || ''}
              onChange={(e) => setOrderForm({ ...orderForm, leverage: parseFloat(e.target.value) || undefined })}
              className={styles.input}
              step="1"
            />
          </div>
          
          <div className={styles.formRow}>
            <label>止损价格 (可选):</label>
            <input
              type="number"
              value={orderForm.stopLoss || ''}
              onChange={(e) => setOrderForm({ ...orderForm, stopLoss: parseFloat(e.target.value) || undefined })}
              className={styles.input}
              step="0.01"
            />
          </div>
          
          <div className={styles.formRow}>
            <label>止盈价格 (可选):</label>
            <input
              type="number"
              value={orderForm.takeProfit || ''}
              onChange={(e) => setOrderForm({ ...orderForm, takeProfit: parseFloat(e.target.value) || undefined })}
              className={styles.input}
              step="0.01"
            />
          </div>
          
          <button
            onClick={sendOrder}
            disabled={!isConnected || !boundTo}
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

