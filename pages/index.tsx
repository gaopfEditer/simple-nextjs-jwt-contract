import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import ChatBox from '@/components/ChatBox';
import { getCurrentUser } from '@/lib/api';
import StatsDisplay from '@/components/StatsDisplay';
import GeminiChat from '@/components/GeminiChat';
import styles from '../styles/HomePage.module.css';

type TabType = 'chat' | 'signals' | 'home' | 'dashboard' | 'openclaw' | 'gemini';

export interface OpenClawDeviceInfo {
  systemType?: string;
  platform?: string;
  release?: string;
  hostname?: string;
  username?: string;
  arch?: string;
}

export interface OpenClawClientItem {
  id: string;
  clientType: string;
  deviceInfo?: OpenClawDeviceInfo | null;
}

export default function Home() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false); // 直接设为false，不等待
  const [openclawClients, setOpenclawClients] = useState<OpenClawClientItem[]>([]);
  const [openclawLoading, setOpenclawLoading] = useState(false);
  const [selectedOpenclawId, setSelectedOpenclawId] = useState<string | null>(null);
  const [openclawError, setOpenclawError] = useState<string | null>(null);
  const [openclawWsConnected, setOpenclawWsConnected] = useState(false);
  const [openclawProxyError, setOpenclawProxyError] = useState(false);
  const [openclawInput, setOpenclawInput] = useState('');
  const [openclawSending, setOpenclawSending] = useState(false);
  const [openclawHistory, setOpenclawHistory] = useState<Record<string, any[]>>({});
  const openclawWsRef = useRef<WebSocket | null>(null);

  // 首次加载时，从 localStorage 恢复上一次的 Tab（避免组件重挂载后总是回到首页）
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const saved = window.localStorage.getItem('home_activeTab');
      if (saved === 'chat' || saved === 'signals' || saved === 'home' || saved === 'dashboard' || saved === 'openclaw' || saved === 'gemini') {
        setActiveTab(saved);
      }
    } catch {
      // ignore
    }
  }, []);

  // 每次切换 Tab 时持久化当前 Tab
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem('home_activeTab', activeTab);
    } catch {
      // ignore
    }
  }, [activeTab]);

  useEffect(() => {
    // 异步获取用户信息，不阻塞页面渲染
    getCurrentUser()
      .then(userData => {
        setUser(userData);
      })
      .catch(() => {
        // 静默失败
        setUser(null);
      });
  }, []);

  // OpenClaw：拉取会话列表，并轮询以便每连接一个就新增到列表
  const fetchOpenclawClients = useCallback(async () => {
    try {
      const res = await fetch(`/api/openclaw/clients?t=${Date.now()}`, { cache: 'no-store' });
      const text = await res.text();
      const isJson = (res.headers.get('content-type') || '').includes('application/json');
      if (!isJson || text.trim().startsWith('<')) {
        throw new Error('接口返回非 JSON，请确认服务已用 node server.js 启动');
      }
      const data = JSON.parse(text) as { success?: boolean; clients?: OpenClawClientItem[]; _proxyError?: string };
      if (data._proxyError) {
        setOpenclawError(`无法连接服务端 (3123)：${data._proxyError}。请使用 npm run dev 启动（node server.js）`);
        setOpenclawClients([]);
        setOpenclawProxyError(true);
      } else {
        setOpenclawProxyError(false);
        if (data.success && Array.isArray(data.clients)) {
          setOpenclawClients(data.clients);
        } else {
          setOpenclawClients([]);
        }
        setOpenclawError(null);
      }
    } catch (err) {
      setOpenclawError((err as Error).message || '获取会话列表失败');
      setOpenclawClients([]);
    } finally {
      setOpenclawLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab !== 'openclaw') return;
    setOpenclawLoading(true);
    setOpenclawError(null);
    fetchOpenclawClients();
    const intervalMs = openclawProxyError ? 30000 : 8000;
    const timer = setInterval(fetchOpenclawClients, intervalMs);
    return () => clearInterval(timer);
  }, [activeTab, fetchOpenclawClients, openclawProxyError]);

  // OpenClaw 页签：像聊天室一样先连接 ws://.../api/ws，作为控制端客户端
  useEffect(() => {
    if (activeTab !== 'openclaw') return;
    const protocol = typeof window !== 'undefined' && window.location?.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = typeof window !== 'undefined' ? window.location.host : '';
    const wsUrl = `${protocol}//${host}/api/ws`;
    setOpenclawWsConnected(false);
    const ws = new WebSocket(wsUrl);
    openclawWsRef.current = ws;
    ws.onopen = () => {
      setOpenclawWsConnected(true);
      const deviceInfo = {
        platform: typeof navigator !== 'undefined' ? navigator.platform : '',
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent?.slice(0, 120) : '',
        language: typeof navigator !== 'undefined' ? navigator.language : '',
      };
      ws.send(JSON.stringify({ type: 'connected', deviceInfo }));
    };
    ws.onclose = () => setOpenclawWsConnected(false);
    ws.onerror = () => setOpenclawWsConnected(false);
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data as string);
        if (data.type === 'openclaw_list_updated' && Array.isArray(data.clients)) {
          setOpenclawClients(data.clients as OpenClawClientItem[]);
          return;
        }
        if (data.type === 'openclaw_history' && data.clientId && data.message) {
          const clientId = data.clientId as string;
          setOpenclawHistory((prev) => {
            const prevList = prev[clientId] || [];
            const nextList = [...prevList, data.message].slice(-50);
            return { ...prev, [clientId]: nextList };
          });
          return;
        }
      } catch {
        // ignore
      }
    };
    return () => {
      if (openclawWsRef.current === ws) {
        openclawWsRef.current = null;
        ws.close();
      }
      setOpenclawWsConnected(false);
    };
  }, [activeTab]);

  // 切换到指定 OpenClaw 会话并下发消息
  const handleSelectOpenclawSession = (clientId: string) => {
    setSelectedOpenclawId(clientId);
    fetch('/api/openclaw/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId,
        type: 'session_selected',
        message: '当前会话已被选中',
        timestamp: new Date().toISOString(),
      }),
    })
      .then((res) => res.json())
      .then((data: { success?: boolean; sent?: boolean }) => {
        if (!data.success || !data.sent) {
          setOpenclawError('下发失败或客户端已断开');
        } else {
          setOpenclawError(null);
        }
      })
      .catch(() => setOpenclawError('下发请求失败'));
  };

  // 向已选中的 OpenClaw 客户端原样发送输入的消息
  const handleSendOpenclawMessage = () => {
    const clientId = selectedOpenclawId;
    const content = openclawInput.trim();
    if (!clientId || !content) return;
    setOpenclawSending(true);
    setOpenclawError(null);
    fetch('/api/openclaw/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId,
        type: 'user_message',
        content,
        timestamp: new Date().toISOString(),
      }),
    })
      .then((res) => res.json())
      .then((data: { success?: boolean; sent?: boolean }) => {
        if (data.success && data.sent) {
          setOpenclawInput('');
        } else {
          setOpenclawError('发送失败或客户端已断开');
        }
      })
      .catch(() => setOpenclawError('发送请求失败'))
      .finally(() => setOpenclawSending(false));
  };

  return (
    <>
      <Head>
        <title>JWT 认证系统</title>
        <meta name="description" content="Next.js JWT 认证示例" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className={styles.container}>
        <nav className={styles.nav}>
          <div className={styles.navContent}>
            <Link href="/" className={styles.logo}>
              JWT 认证系统
            </Link>
            <div className={styles.navLinks}>
              {user ? (
                <>
                  <Link href="/dashboard" className={styles.navLink}>
                    仪表盘
                  </Link>
                  <Link href="/login" className={styles.navLink}>
                    登出
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/login" className={styles.navLink}>
                    登录
                  </Link>
                  <Link href="/register" className={styles.navLink}>
                    注册
                  </Link>
                </>
              )}
            </div>
          </div>
        </nav>

        <div className={styles.tabsContainer}>
          <div className={styles.tabs}>
            <button
              className={`${styles.tab} ${activeTab === 'chat' ? styles.active : ''}`}
              onClick={() => setActiveTab('chat')}
            >
              <span className={styles.tabIcon}>💬</span>
              <span>聊天室</span>
            </button>
            <button
              className={`${styles.tab} ${activeTab === 'signals' ? styles.active : ''}`}
              onClick={() => setActiveTab('signals')}
            >
              <span className={styles.tabIcon}>📢</span>
              <span>信号列表</span>
            </button>
            <button
              className={`${styles.tab} ${activeTab === 'home' ? styles.active : ''}`}
              onClick={() => setActiveTab('home')}
            >
              <span className={styles.tabIcon}>🏠</span>
              <span>首页</span>
            </button>
            <button
              className={`${styles.tab} ${activeTab === 'dashboard' ? styles.active : ''}`}
              onClick={() => setActiveTab('dashboard')}
            >
              <span className={styles.tabIcon}>📊</span>
              <span>仪表盘</span>
            </button>
            <button
              className={`${styles.tab} ${activeTab === 'openclaw' ? styles.active : ''}`}
              onClick={() => setActiveTab('openclaw')}
            >
              <span className={styles.tabIcon}>🦾</span>
              <span>OpenClaw</span>
            </button>
            <button
              className={`${styles.tab} ${activeTab === 'gemini' ? styles.active : ''}`}
              onClick={() => setActiveTab('gemini')}
            >
              <span className={styles.tabIcon}>🤖</span>
              <span>Gemini</span>
            </button>
          </div>
        </div>

        <main className={styles.main}>
          {activeTab === 'chat' && (
            <div className={styles.tabContent}>
              <ChatBox filterSource="exclude_tradingview" title="聊天室" />
            </div>
          )}

          {activeTab === 'signals' && (
            <div className={styles.tabContent}>
              <ChatBox filterSource="tradingview" title="信号列表" />
            </div>
          )}

          {activeTab === 'home' && (
            <div className={styles.tabContent}>
              <div className={styles.homeContent}>
                <h1 className={styles.title}>欢迎使用 JWT 认证系统</h1>
                <p className={styles.description}>
                  这是一个基于 Next.js 和 JWT 的用户认证示例项目
                </p>

                {/* 显示访问统计 */}
                <StatsDisplay />

                <div className={styles.demoSection}>
                  <h2 className={styles.sectionTitle}>示例功能</h2>
                  <p className={styles.sectionDesc}>访问示例文章查看阅读量统计，或进入管理页面查看详细数据</p>
                  <div className={styles.actions}>
                    <Link href="/article/1" className="btn btn-secondary">
                      查看示例文章 1
                    </Link>
                    <Link href="/article/2" className="btn btn-secondary">
                      查看示例文章 2
                    </Link>
                    <Link href="/stats/admin" className="btn btn-primary">
                      访问统计管理
                    </Link>
                  </div>
                </div>

                {user ? (
                  <div className={styles.userInfo}>
                    <p>欢迎回来，{user.email}！</p>
                    <p className={styles.email}>邮箱: {user.email}</p>
                    <div className={styles.actions}>
                      <Link href="/dashboard" className="btn btn-primary">
                        进入仪表板
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className={styles.actions}>
                    <Link href="/login" className="btn btn-primary">
                      登录
                    </Link>
                    <Link href="/register" className="btn btn-secondary">
                      注册
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'dashboard' && (
            <div className={styles.tabContent}>
              <div className={styles.dashboardContent}>
                {user ? (
                  <>
                    <h1 className={styles.title}>欢迎回来，{user.email}！</h1>
                    <div className={styles.userInfo}>
                      <div className={styles.infoItem}>
                        <span className={styles.label}>用户 ID:</span>
                        <span className={styles.value}>{user.id}</span>
                      </div>
                      <div className={styles.infoItem}>
                        <span className={styles.label}>邮箱:</span>
                        <span className={styles.value}>{user.email}</span>
                      </div>
                      <div className={styles.infoItem}>
                        <span className={styles.label}>账户状态:</span>
                        <span className={styles.value}>
                          {user.is_enabled ? '已启用' : '已禁用'}
                        </span>
                      </div>
                      {user.last_login_at && (
                        <div className={styles.infoItem}>
                          <span className={styles.label}>最后登录时间:</span>
                          <span className={styles.value}>
                            {new Date(user.last_login_at).toLocaleString('zh-CN')}
                          </span>
                        </div>
                      )}
                      {user.created_at && (
                        <div className={styles.infoItem}>
                          <span className={styles.label}>注册时间:</span>
                          <span className={styles.value}>
                            {new Date(user.created_at).toLocaleString('zh-CN')}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className={styles.actions}>
                      <Link href="/dashboard" className="btn btn-primary">
                        查看完整仪表盘
                      </Link>
                    </div>
                  </>
                ) : (
                  <div className={styles.notLoggedIn}>
                    <p>请先登录以查看仪表盘</p>
                    <div className={styles.actions}>
                      <Link href="/login" className="btn btn-primary">
                        登录
                      </Link>
                      <Link href="/register" className="btn btn-secondary">
                        注册
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'openclaw' && (
            <div className={styles.tabContent}>
              <div className={styles.openclawContent}>
                <h1 className={styles.title}>OpenClaw 会话</h1>
                <p className={styles.description}>
                  本页已连接 WS，作为控制端客户端。下列为已连接的 type=openclaw 客户端（每 8 秒刷新）。点击会话即向该客户端下发「会话选中」消息（消息中会附带所有 openclaw 客户端的 id 与设备/用户信息）。
                </p>
                <div className={styles.openclawToolbar}>
                  <span className={styles.openclawCount}>当前 {openclawClients.length} 个会话</span>
                  {openclawWsConnected && <span className={styles.openclawWsStatus}>控制端已连接 WS</span>}
                  <button type="button" className={styles.openclawRefreshBtn} onClick={() => { setOpenclawLoading(true); fetchOpenclawClients(); }} disabled={openclawLoading}>
                    {openclawLoading ? '刷新中…' : '刷新'}
                  </button>
                </div>
                {openclawLoading && openclawClients.length === 0 && <div className={styles.loading}>加载中...</div>}
                {openclawError && (
                  <div className={styles.openclawError}>{openclawError}</div>
                )}
                {!openclawLoading && openclawClients.length === 0 && (
                  <div className={styles.openclawEmpty}>
                    暂无 OpenClaw 会话。
                    <br />
                    请用 <strong>npm run dev</strong> 启动服务（node server.js），然后运行 <strong>node test/test-openclaw-ws-webhook.js</strong>，连接后会在此列出（约 5 秒内可看到）。
                  </div>
                )}
                {!openclawLoading && openclawClients.length > 0 && (
                  <ul className={styles.openclawList}>
                    {openclawClients.map((c) => (
                      <li key={c.id} className={styles.openclawItem}>
                        <button
                          type="button"
                          className={selectedOpenclawId === c.id ? styles.openclawItemActive : styles.openclawItemBtn}
                          onClick={() => handleSelectOpenclawSession(c.id)}
                        >
                          <span className={styles.openclawItemId}>{c.id}</span>
                          {c.deviceInfo && (
                            <span className={styles.openclawItemDevice}>
                              {[c.deviceInfo.systemType, c.deviceInfo.platform, c.deviceInfo.hostname, c.deviceInfo.username].filter(Boolean).join(' · ') || '未知设备'}
                            </span>
                          )}
                          {selectedOpenclawId === c.id && <span className={styles.openclawItemBadge}>已选中</span>}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {selectedOpenclawId && (
                  <>
                    <div className={styles.openclawHistory}>
                      <div className={styles.openclawHistoryHeader}>
                        <span className={styles.openclawHistoryTitle}>会话历史</span>
                      </div>
                      <div className={styles.openclawHistoryBody}>
                        {(openclawHistory[selectedOpenclawId] || []).length === 0 && (
                          <div className={styles.openclawHistoryEmpty}>暂无历史消息</div>
                        )}
                        {(openclawHistory[selectedOpenclawId] || []).map((msg: any, idx: number) => (
                          <div key={idx} className={styles.openclawHistoryItem}>
                            <div className={styles.openclawHistoryMeta}>
                              <span className={styles.openclawHistoryTag}>{msg.status || msg.type || '消息'}</span>
                              <span className={styles.openclawHistoryTime}>
                                {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString('zh-CN') : ''}
                              </span>
                            </div>
                            {msg.original_content && (
                              <div className={styles.openclawHistoryOriginal}>
                                <span className={styles.openclawHistoryLabel}>指令：</span>
                                <span>{msg.original_content}</span>
                              </div>
                            )}
                            {msg.response && (
                              <pre className={styles.openclawHistoryResponse}>{msg.response}</pre>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  <div className={styles.openclawSend}>
                    <input
                      type="text"
                      className={styles.openclawInput}
                      placeholder="输入消息，将原样发送给选中的客户端…"
                      value={openclawInput}
                      onChange={(e) => setOpenclawInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendOpenclawMessage()}
                      disabled={openclawSending}
                    />
                    <button
                      type="button"
                      className={styles.openclawSendBtn}
                      onClick={handleSendOpenclawMessage}
                      disabled={openclawSending || !openclawInput.trim()}
                    >
                      {openclawSending ? '发送中…' : '发送'}
                    </button>
                  </div>
                  </>
                )}
              </div>
            </div>
          )}

          {activeTab === 'gemini' && (
            <div className={styles.tabContent}>
              <GeminiChat />
            </div>
          )}
        </main>
      </div>
    </>
  );
}

