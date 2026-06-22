import { useCallback, useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import ChatBox from '@/components/ChatBox';
import { getCurrentUser } from '@/lib/api';
import StatsDisplay from '@/components/StatsDisplay';
import GeminiChat from '@/components/GeminiChat';
import { AppShell, AppTabs, PageContainer, InfoRow, LoadingState } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Radio, Home as HomeIcon, LayoutDashboard, Bot, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

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

  const tabs = [
    { value: 'chat', label: '聊天室', icon: <MessageSquare className="h-4 w-4" /> },
    { value: 'signals', label: '信号列表', icon: <Radio className="h-4 w-4" /> },
    { value: 'home', label: '首页', icon: <HomeIcon className="h-4 w-4" /> },
    { value: 'dashboard', label: '仪表盘', icon: <LayoutDashboard className="h-4 w-4" /> },
    { value: 'openclaw', label: 'OpenClaw', icon: <Bot className="h-4 w-4" /> },
    { value: 'gemini', label: 'Gemini', icon: <Bot className="h-4 w-4" /> },
  ];

  return (
    <>
      <Head>
        <title>JWT 认证系统</title>
        <meta name="description" content="Next.js JWT 认证示例" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <AppShell user={user}>
        <AppTabs tabs={tabs} activeTab={activeTab} onTabChange={(v) => setActiveTab(v as TabType)} />

        <PageContainer>
          {activeTab === 'chat' && <ChatBox filterSource="exclude_tradingview" title="聊天室" />}
          {activeTab === 'signals' && <ChatBox filterSource="tradingview" title="信号列表" />}

          {activeTab === 'home' && (
            <div className="mx-auto max-w-3xl space-y-8">
              <div className="space-y-2 text-center">
                <h1 className="text-3xl font-bold tracking-tight">欢迎使用 JWT 认证系统</h1>
                <p className="text-muted-foreground">这是一个基于 Next.js 和 JWT 的用户认证示例项目</p>
              </div>
              <StatsDisplay />
              <Card>
                <CardHeader>
                  <CardTitle>示例功能</CardTitle>
                  <CardDescription>访问示例文章查看阅读量统计，或进入管理页面查看详细数据</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-3">
                  <Button variant="outline" asChild><Link href="/article/1">查看示例文章 1</Link></Button>
                  <Button variant="outline" asChild><Link href="/article/2">查看示例文章 2</Link></Button>
                  <Button asChild><Link href="/stats/admin">访问统计管理</Link></Button>
                </CardContent>
              </Card>
              {user ? (
                <Card>
                  <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-medium">欢迎回来，{user.email}</p>
                      <p className="text-sm text-muted-foreground">邮箱: {user.email}</p>
                    </div>
                    <Button asChild><Link href="/dashboard">进入仪表板</Link></Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="flex justify-center gap-3">
                  <Button asChild><Link href="/login">登录</Link></Button>
                  <Button variant="outline" asChild><Link href="/register">注册</Link></Button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'dashboard' && (
            <Card className="mx-auto max-w-2xl">
              <CardContent className="p-6">
                {user ? (
                  <div className="space-y-4">
                    <h1 className="text-2xl font-bold">欢迎回来，{user.email}</h1>
                    <InfoRow label="用户 ID" value={user.id} />
                    <InfoRow label="邮箱" value={user.email} />
                    <InfoRow label="账户状态" value={user.is_enabled ? '已启用' : '已禁用'} />
                    {user.last_login_at && (
                      <InfoRow label="最后登录时间" value={new Date(user.last_login_at).toLocaleString('zh-CN')} />
                    )}
                    {user.created_at && (
                      <InfoRow label="注册时间" value={new Date(user.created_at).toLocaleString('zh-CN')} />
                    )}
                    <Button asChild><Link href="/dashboard">查看完整仪表盘</Link></Button>
                  </div>
                ) : (
                  <div className="space-y-4 text-center">
                    <p className="text-muted-foreground">请先登录以查看仪表盘</p>
                    <div className="flex justify-center gap-3">
                      <Button asChild><Link href="/login">登录</Link></Button>
                      <Button variant="outline" asChild><Link href="/register">注册</Link></Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {activeTab === 'openclaw' && (
            <div className="mx-auto max-w-3xl space-y-6">
              <div>
                <h1 className="text-2xl font-bold">OpenClaw 会话</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  本页已连接 WS，作为控制端客户端。点击会话即向该客户端下发「会话选中」消息。
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="secondary">当前 {openclawClients.length} 个会话</Badge>
                {openclawWsConnected && <Badge>控制端已连接 WS</Badge>}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setOpenclawLoading(true); fetchOpenclawClients(); }}
                  disabled={openclawLoading}
                >
                  <RefreshCw className={cn('mr-1 h-3 w-3', openclawLoading && 'animate-spin')} />
                  {openclawLoading ? '刷新中…' : '刷新'}
                </Button>
              </div>
              {openclawLoading && openclawClients.length === 0 && <LoadingState />}
              {openclawError && (
                <Alert variant="destructive"><AlertDescription>{openclawError}</AlertDescription></Alert>
              )}
              {!openclawLoading && openclawClients.length === 0 && (
                <Card>
                  <CardContent className="py-8 text-center text-sm text-muted-foreground">
                    暂无 OpenClaw 会话。请用 <strong>npm run dev</strong> 启动服务，然后运行{' '}
                    <strong>node test/test-openclaw-ws-webhook.js</strong> 连接。
                  </CardContent>
                </Card>
              )}
              {openclawClients.length > 0 && (
                <div className="grid gap-2">
                  {openclawClients.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleSelectOpenclawSession(c.id)}
                      className={cn(
                        'flex flex-col items-start rounded-lg border p-4 text-left transition-colors hover:bg-accent',
                        selectedOpenclawId === c.id && 'border-primary bg-accent'
                      )}
                    >
                      <span className="font-mono text-sm">{c.id}</span>
                      {c.deviceInfo && (
                        <span className="mt-1 text-xs text-muted-foreground">
                          {[c.deviceInfo.systemType, c.deviceInfo.platform, c.deviceInfo.hostname, c.deviceInfo.username].filter(Boolean).join(' · ') || '未知设备'}
                        </span>
                      )}
                      {selectedOpenclawId === c.id && <Badge className="mt-2">已选中</Badge>}
                    </button>
                  ))}
                </div>
              )}
              {selectedOpenclawId && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">会话历史</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {(openclawHistory[selectedOpenclawId] || []).length === 0 ? (
                      <p className="text-sm text-muted-foreground">暂无历史消息</p>
                    ) : (
                      (openclawHistory[selectedOpenclawId] || []).map((msg: any, idx: number) => (
                        <div key={idx} className="rounded-lg border p-3 text-sm">
                          <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                            <Badge variant="outline">{msg.status || msg.type || '消息'}</Badge>
                            <span>{msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString('zh-CN') : ''}</span>
                          </div>
                          {msg.original_content && (
                            <p><span className="text-muted-foreground">指令：</span>{msg.original_content}</p>
                          )}
                          {msg.response && (
                            <pre className="mt-2 overflow-auto rounded bg-muted p-2 text-xs">{msg.response}</pre>
                          )}
                        </div>
                      ))
                    )}
                    <div className="flex gap-2 pt-2">
                      <Input
                        placeholder="输入消息，将原样发送给选中的客户端…"
                        value={openclawInput}
                        onChange={(e) => setOpenclawInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendOpenclawMessage()}
                        disabled={openclawSending}
                      />
                      <Button onClick={handleSendOpenclawMessage} disabled={openclawSending || !openclawInput.trim()}>
                        {openclawSending ? '发送中…' : '发送'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {activeTab === 'gemini' && <GeminiChat />}
        </PageContainer>
      </AppShell>
    </>
  );
}

