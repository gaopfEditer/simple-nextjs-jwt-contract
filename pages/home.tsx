import { useCallback, useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import ChatBox from '@/components/ChatBox';
import { getCurrentUser } from '@/lib/api';
import StatsDisplay from '@/components/StatsDisplay';
import styles from '../styles/HomePage.module.css';

type TabType = 'chat' | 'home' | 'dashboard' | 'openclaw';

export default function HomePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('chat');
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [openclawClients, setOpenclawClients] = useState<{ id: string; clientType: string }[]>([]);
  const [openclawLoading, setOpenclawLoading] = useState(false);
  const [selectedOpenclawId, setSelectedOpenclawId] = useState<string | null>(null);
  const [openclawError, setOpenclawError] = useState<string | null>(null);

  // 检查用户登录状态
  useEffect(() => {
    async function checkAuth() {
      try {
        const userData = await getCurrentUser();
        setUser(userData);
      } catch (error) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, []);

  // OpenClaw：拉取会话列表，并轮询以便每连接一个就新增到列表
  const fetchOpenclawClients = useCallback(async () => {
    try {
      const res = await fetch('/api/openclaw/clients');
      const data = await res.json().catch(() => ({})) as { success?: boolean; clients?: { id: string; clientType: string }[] };
      if (data.success && Array.isArray(data.clients)) {
        setOpenclawClients(data.clients);
      } else {
        setOpenclawClients([]);
      }
      setOpenclawError(null);
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
    const timer = setInterval(fetchOpenclawClients, 3000);
    return () => clearInterval(timer);
  }, [activeTab, fetchOpenclawClients]);

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

  return (
    <>
      <Head>
        <title>消息中心 - JWT 认证系统</title>
        <meta name="description" content="消息中心、首页和仪表盘" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
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
              <span>聊天框</span>
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
          </div>
        </div>

        <main className={styles.main}>
          {activeTab === 'chat' && (
            <div className={styles.tabContent}>
              <ChatBox />
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
                  <p className={styles.sectionDesc}>
                    访问示例文章查看阅读量统计，或进入管理页面查看详细数据
                  </p>
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

          {activeTab === 'openclaw' && (
            <div className={styles.tabContent}>
              <div className={styles.openclawContent}>
                <h1 className={styles.title}>OpenClaw 会话</h1>
                <p className={styles.description}>
                  当前已连接的 type=openclaw 客户端。点击会话即向该客户端下发「会话选中」消息。
                </p>
                {openclawLoading && <div className={styles.loading}>加载中...</div>}
                {openclawError && (
                  <div className={styles.openclawError}>{openclawError}</div>
                )}
                {!openclawLoading && openclawClients.length === 0 && (
                  <div className={styles.openclawEmpty}>暂无 OpenClaw 会话，请使用 type=openclaw 连接 WebSocket。</div>
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
                          {selectedOpenclawId === c.id && <span className={styles.openclawItemBadge}>已选中</span>}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {activeTab === 'dashboard' && (
            <div className={styles.tabContent}>
              <div className={styles.dashboardContent}>
                {loading ? (
                  <div className={styles.loading}>加载中...</div>
                ) : user ? (
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
        </main>
      </div>
    </>
  );
}

