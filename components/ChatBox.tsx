import { useState, useEffect, useRef } from 'react';
import styles from '../styles/ChatBox.module.css';

interface Message {
  id: number;
  source: string;
  source_id?: string;
  type: string;
  title?: string;
  content: string;
  metadata?: any;
  sender?: string;
  sender_id?: string;
  created_at: string;
}

interface WebSocketMessage {
  type: string;
  message?: Message;
  timestamp: string;
}

interface ChatBoxProps {
  filterSource?: 'tradingview' | 'exclude_tradingview' | null;
  title?: string;
}

export default function ChatBox({ filterSource = null, title = '消息中心' }: ChatBoxProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('未连接');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const autoScrollRef = useRef<boolean>(true);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef<number>(0);
  const maxReconnectAttempts = 5;
  const reconnectDelay = 3000;

  // 使用 useRef 保存 filterSource，避免重复连接
  const filterSourceRef = useRef(filterSource);
  useEffect(() => {
    filterSourceRef.current = filterSource;
  }, [filterSource]);

  // 自动滚动到底部
  const scrollToBottom = () => {
    if (autoScrollRef.current && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 连接WebSocket
  useEffect(() => {
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
        reconnectAttemptsRef.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          console.log('[WebSocket] 收到原始消息:', event.data);
          const data: WebSocketMessage = JSON.parse(event.data);
          console.log('[WebSocket] 解析后的消息:', data);
          
          // 处理心跳包
          if (data.type === 'heartbeat') {
            console.log('[WebSocket] 收到心跳包');
            // 响应心跳
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({
                type: 'pong',
                timestamp: new Date().toISOString()
              }));
            }
            return;
          }

          // 处理收到的消息
          if (data.type === 'message_received' && data.message) {
            // 根据filterSource过滤消息（使用ref获取最新值）
            const currentFilter = filterSourceRef.current;
            let shouldShow = true;
            if (currentFilter === 'tradingview') {
              // 只显示 tradingview 来源的消息
              shouldShow = data.message.source === 'tradingview' || data.message.type === 'trading_signal';
            } else if (currentFilter === 'exclude_tradingview') {
              // 排除 tradingview 来源的消息
              shouldShow = data.message.source !== 'tradingview' && data.message.type !== 'trading_signal';
            }
            
            if (!shouldShow) {
              return;
            }
            
            setMessages((prev) => {
              // 避免重复消息
              const exists = prev.some(msg => msg.id === data.message!.id);
              if (exists) {
                return prev;
              }
              // 最多保留500条消息
              const newMessages = [...prev, data.message!];
              return newMessages.slice(-500);
            });
          } else {
            // 调试：输出其他类型的消息
            console.log('[WebSocket] ⚠️ 收到其他类型消息:', data.type, data);
          }
        } catch (error) {
          console.error('[WebSocket] ❌ 解析消息错误:', error, '原始数据:', event.data);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket 错误:', error);
        setConnectionStatus('连接错误');
      };

      ws.onclose = (event) => {
        console.log('WebSocket 连接已关闭', event.code);
        setIsConnected(false);
        setConnectionStatus('已断开');
        
        // 自动重连
        if (event.code !== 1000 && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          const delay = reconnectDelay * reconnectAttemptsRef.current;
          setConnectionStatus(`正在重连 (${reconnectAttemptsRef.current}/${maxReconnectAttempts})...`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
          setConnectionStatus('连接失败（已停止重连）');
        }
      };
    };

    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close(1000, '组件卸载');
      }
    };
  }, []);

  // 处理滚动事件，检测用户是否手动滚动
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const element = e.currentTarget;
    const isAtBottom = element.scrollHeight - element.scrollTop - element.clientHeight < 50;
    autoScrollRef.current = isAtBottom;
  };

  // 格式化时间
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
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

  // 格式化完整时间
  const formatFullTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('zh-CN');
  };

  // 获取消息来源显示名称
  const getSourceName = (source: string) => {
    const sourceMap: { [key: string]: string } = {
      'telegram': 'Telegram',
      'tradingview': 'TradingView',
      'api': 'API',
      'webhook': 'Webhook',
      'system': '系统'
    };
    return sourceMap[source] || source;
  };

  // 获取消息类型显示样式
  const getMessageTypeStyle = (msg: Message) => {
    if (msg.source === 'tradingview' || msg.type === 'trading_signal') {
      return styles.tradingSignal;
    }
    return '';
  };

  // 渲染TradingView交易信号的特殊显示
  const renderTradingViewMessage = (msg: Message) => {
    if (msg.source !== 'tradingview' && msg.type !== 'trading_signal') {
      return null;
    }

    const metadata = msg.metadata || {};
    const ticker = metadata.ticker || 'N/A';
    const close = metadata.close;
    const time = metadata.time;

    return (
      <div className={styles.tradingViewInfo}>
        <div className={styles.tickerBadge}>
          <span className={styles.tickerLabel}>交易对:</span>
          <span className={styles.tickerValue}>{ticker}</span>
        </div>
        {close !== null && close !== undefined && (
          <div className={styles.priceBadge}>
            <span className={styles.priceLabel}>价格:</span>
            <span className={styles.priceValue}>{close.toLocaleString()}</span>
          </div>
        )}
        {time && (
          <div className={styles.timeBadge}>
            <span className={styles.timeLabel}>时间:</span>
            <span className={styles.timeValue}>{new Date(time).toLocaleString('zh-CN')}</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={styles.chatContainer}>
      <div className={styles.chatHeader}>
        <h2>{title}</h2>
        <div className={styles.status}>
          <span className={`${styles.statusIndicator} ${isConnected ? styles.connected : styles.disconnected}`}>
            {isConnected ? '●' : '○'}
          </span>
          <span>{connectionStatus}</span>
          {messages.length > 0 && (
            <span className={styles.messageCount}>({messages.length})</span>
          )}
        </div>
      </div>
      
      <div 
        className={styles.messagesContainer}
        onScroll={handleScroll}
      >
        {messages.length === 0 ? (
          <div className={styles.emptyState}>
            <p>暂无消息</p>
            <p className={styles.emptyHint}>等待接收消息...</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`${styles.messageItem} ${getMessageTypeStyle(msg)}`}>
              <div className={styles.messageHeader}>
                <span className={styles.messageSource}>
                  {getSourceName(msg.source)}
                </span>
                {msg.sender && (
                  <span className={styles.messageSender}>
                    @{msg.sender}
                  </span>
                )}
                <span className={styles.messageTime}>
                  {formatTime(msg.created_at)}
                </span>
              </div>
              {msg.title && (
                <div className={styles.messageTitle}>
                  {msg.title}
                </div>
              )}
              {/* TradingView交易信号特殊显示 */}
              {renderTradingViewMessage(msg)}
              <div className={styles.messageContent}>
                {msg.content}
              </div>
              {msg.metadata && Object.keys(msg.metadata).length > 0 && (
                <details className={styles.messageMetadata}>
                  <summary>详细信息</summary>
                  <pre>{JSON.stringify(msg.metadata, null, 2)}</pre>
                </details>
              )}
              <div className={styles.messageFooter}>
                <span className={styles.messageId}>ID: {msg.id}</span>
                <span className={styles.messageFullTime}>{formatFullTime(msg.created_at)}</span>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className={styles.chatFooter}>
        <button
          className={styles.scrollToBottomBtn}
          onClick={() => {
            autoScrollRef.current = true;
            scrollToBottom();
          }}
          disabled={messages.length === 0}
        >
          滚动到底部
        </button>
        {messages.length > 0 && (
          <button
            className={styles.clearBtn}
            onClick={() => {
              if (confirm('确定要清空所有消息吗？')) {
                setMessages([]);
              }
            }}
          >
            清空消息
          </button>
        )}
      </div>
    </div>
  );
}

