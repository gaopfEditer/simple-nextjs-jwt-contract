import { useCallback, useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import ChatBox from '@/components/ChatBox';
import { getCurrentUser } from '@/lib/api';
import StatsDisplay from '@/components/StatsDisplay';
import { AppShell, AppTabs, PageContainer, InfoRow, LoadingState } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Home as HomeIcon, LayoutDashboard, Bot } from 'lucide-react';
import { cn } from '@/lib/utils';

type TabType = 'chat' | 'home' | 'dashboard' | 'openclaw';

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<TabType>('chat');
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [openclawClients, setOpenclawClients] = useState<{ id: string; clientType: string }[]>([]);
  const [openclawLoading, setOpenclawLoading] = useState(false);
  const [selectedOpenclawId, setSelectedOpenclawId] = useState<string | null>(null);
  const [openclawError, setOpenclawError] = useState<string | null>(null);

  useEffect(() => {
    async function checkAuth() {
      try {
        const userData = await getCurrentUser();
        setUser(userData);
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, []);

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
        if (!data.success || !data.sent) setOpenclawError('下发失败或客户端已断开');
        else setOpenclawError(null);
      })
      .catch(() => setOpenclawError('下发请求失败'));
  };

  const tabs = [
    { value: 'chat', label: '聊天框', icon: <MessageSquare className="h-4 w-4" /> },
    { value: 'home', label: '首页', icon: <HomeIcon className="h-4 w-4" /> },
    { value: 'dashboard', label: '仪表盘', icon: <LayoutDashboard className="h-4 w-4" /> },
    { value: 'openclaw', label: 'OpenClaw', icon: <Bot className="h-4 w-4" /> },
  ];

  return (
    <>
      <Head>
        <title>消息中心 - JWT 认证系统</title>
        <meta name="description" content="消息中心、首页和仪表盘" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <AppShell user={user}>
        <AppTabs tabs={tabs} activeTab={activeTab} onTabChange={(v) => setActiveTab(v as TabType)} />
        <PageContainer>
          {activeTab === 'chat' && <ChatBox />}
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
                  <CardDescription>访问示例文章或进入管理页面</CardDescription>
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
                {loading ? (
                  <LoadingState />
                ) : user ? (
                  <div className="space-y-4">
                    <h1 className="text-2xl font-bold">欢迎回来，{user.email}</h1>
                    <InfoRow label="用户 ID" value={user.id} />
                    <InfoRow label="邮箱" value={user.email} />
                    <InfoRow label="账户状态" value={user.is_enabled ? '已启用' : '已禁用'} />
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
            <div className="mx-auto max-w-2xl space-y-4">
              <h1 className="text-2xl font-bold">OpenClaw 会话</h1>
              <p className="text-sm text-muted-foreground">点击会话即向该客户端下发「会话选中」消息。</p>
              {openclawLoading && <LoadingState />}
              {openclawError && <Alert variant="destructive"><AlertDescription>{openclawError}</AlertDescription></Alert>}
              {!openclawLoading && openclawClients.length === 0 && (
                <p className="text-sm text-muted-foreground">暂无 OpenClaw 会话</p>
              )}
              <div className="grid gap-2">
                {openclawClients.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleSelectOpenclawSession(c.id)}
                    className={cn(
                      'rounded-lg border p-4 text-left transition-colors hover:bg-accent',
                      selectedOpenclawId === c.id && 'border-primary bg-accent'
                    )}
                  >
                    <span className="font-mono text-sm">{c.id}</span>
                    {selectedOpenclawId === c.id && <Badge className="mt-2">已选中</Badge>}
                  </button>
                ))}
              </div>
            </div>
          )}
        </PageContainer>
      </AppShell>
    </>
  );
}
