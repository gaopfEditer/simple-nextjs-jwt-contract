import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { getCurrentUser, logout as apiLogout } from '@/lib/api';
import { getPostList, getProductList, Post, Product } from '@/lib/external-api';
import { removeToken } from '@/lib/auth';
import { AppNavbar, LoadingState, PageContainer, InfoRow } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'posts' | 'products'>('posts');

  const [posts, setPosts] = useState<Post[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [postsPage, setPostsPage] = useState(1);
  const [postsTotal, setPostsTotal] = useState(0);

  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsPage, setProductsPage] = useState(1);
  const [productsTotal, setProductsTotal] = useState(0);

  useEffect(() => {
    async function loadUser() {
      try {
        const userData = await getCurrentUser();
        setUser(userData);
      } catch {
        router.push('/login');
      } finally {
        setLoading(false);
      }
    }
    loadUser();
  }, [router]);

  useEffect(() => {
    async function loadPosts() {
      if (activeTab === 'posts' && user) {
        setPostsLoading(true);
        try {
          const data = await getPostList(postsPage, 10);
          setPosts(data.list);
          setPostsTotal(data.total);
        } catch (error: any) {
          console.error('加载帖子列表失败:', error);
        } finally {
          setPostsLoading(false);
        }
      }
    }
    loadPosts();
  }, [activeTab, postsPage, user]);

  useEffect(() => {
    async function loadProducts() {
      if (activeTab === 'products' && user) {
        setProductsLoading(true);
        try {
          const data = await getProductList(productsPage, 10);
          setProducts(data.list);
          setProductsTotal(data.total);
        } catch (error: any) {
          console.error('加载产品列表失败:', error);
        } finally {
          setProductsLoading(false);
        }
      }
    }
    loadProducts();
  }, [activeTab, productsPage, user]);

  const handleLogout = async () => {
    try {
      await apiLogout();
      removeToken();
      router.push('/');
    } catch (error) {
      console.error('登出失败:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <AppNavbar />
        <LoadingState />
      </div>
    );
  }

  if (!user) return null;

  const renderList = (
    items: (Post | Product)[],
    isLoading: boolean,
    page: number,
    total: number,
    setPage: (p: number) => void
  ) => (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          第 {page} 页 / 共 {Math.ceil(total / 10) || 1} 页（共 {total} 条）
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1 || isLoading}
          >
            上一页
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(page + 1)}
            disabled={page >= Math.ceil(total / 10) || isLoading}
          >
            下一页
          </Button>
        </div>
      </div>
      {isLoading ? (
        <LoadingState />
      ) : items.length > 0 ? (
        <div className="space-y-3">
          {items.map((item) => (
            <Card key={item.id}>
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">ID: {item.id}</Badge>
                  <Badge variant="outline">编码: {item.code}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <p><span className="text-muted-foreground">产品类型:</span> {item.product_type}</p>
                <p><span className="text-muted-foreground">产品名称:</span> {item.product_name}</p>
                <p><span className="text-muted-foreground">创建时间:</span> {new Date(item.created_at).toLocaleString('zh-CN')}</p>
                <p><span className="text-muted-foreground">更新时间:</span> {new Date(item.updated_at).toLocaleString('zh-CN')}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <p className="py-8 text-center text-sm text-muted-foreground">暂无数据</p>
      )}
    </div>
  );

  return (
    <>
      <Head>
        <title>仪表板 - JWT 认证系统</title>
        <meta name="description" content="用户仪表板" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
          <div className="container flex h-14 max-w-screen-2xl items-center justify-between">
            <Link href="/" className="font-semibold">JWT 认证系统</Link>
            <Button variant="outline" size="sm" onClick={handleLogout}>登出</Button>
          </div>
        </header>

        <PageContainer className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>欢迎回来，{user.email}</CardTitle>
              <CardDescription>您的账户信息概览</CardDescription>
            </CardHeader>
            <CardContent>
              <InfoRow label="用户 ID" value={user.id} />
              <InfoRow label="邮箱" value={user.email} />
              <InfoRow label="账户状态" value={user.is_enabled ? '已启用' : '已禁用'} />
              {user.last_login_at && (
                <InfoRow label="最后登录时间" value={new Date(user.last_login_at).toLocaleString('zh-CN')} />
              )}
              {user.created_at && (
                <InfoRow label="注册时间" value={new Date(user.created_at).toLocaleString('zh-CN')} />
              )}
              <div className="pt-4">
                <Button asChild>
                  <Link href="/">返回首页</Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>业务数据</CardTitle>
              <CardDescription>帖子与产品列表</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'posts' | 'products')}>
                <TabsList>
                  <TabsTrigger value="posts">帖子列表</TabsTrigger>
                  <TabsTrigger value="products">产品列表</TabsTrigger>
                </TabsList>
                <TabsContent value="posts">{renderList(posts, postsLoading, postsPage, postsTotal, setPostsPage)}</TabsContent>
                <TabsContent value="products">{renderList(products, productsLoading, productsPage, productsTotal, setProductsPage)}</TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </PageContainer>
      </div>
    </>
  );
}
