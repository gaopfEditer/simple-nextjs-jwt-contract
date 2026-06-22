import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useSite } from '@/lib/site-context';
import SiteSelector from '@/components/SiteSelector';
import axios from 'axios';
import { AppNavbar, LoadingState, PageContainer } from '@/components/layout/AppShell';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface Visit {
  id: number;
  ip_address: string;
  device_type: string;
  browser: string;
  os: string;
  path: string;
  created_at: string;
}

interface Article {
  article_id: string;
  view_count: number;
  unique_readers: number;
}

export default function StatsAdmin() {
  const { currentSiteId } = useSite();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'visits' | 'articles'>('visits');

  useEffect(() => {
    loadData();
  }, [currentSiteId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsRes, visitsRes, articlesRes] = await Promise.all([
        axios.get('/api/stats/overview', { headers: { 'X-Site-ID': currentSiteId } }),
        axios.get('/api/stats/recent?limit=100&days=30', { headers: { 'X-Site-ID': currentSiteId } }),
        axios.get('/api/stats/popular?limit=100', { headers: { 'X-Site-ID': currentSiteId } }),
      ]);
      setStats(statsRes.data);
      setVisits(visitsRes.data.visits);
      setArticles(articlesRes.data.articles);
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = stats
    ? [
        { label: '总访问量', value: stats.totalVisits.toLocaleString() },
        { label: '独立访客', value: stats.uniqueVisitors.toLocaleString() },
        { label: '文章阅读量', value: stats.totalArticleViews.toLocaleString() },
      ]
    : [];

  return (
    <>
      <Head>
        <title>访问统计管理</title>
      </Head>
      <div className="min-h-screen bg-background">
        <AppNavbar />
        <PageContainer className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">访问统计管理</h1>
              <p className="text-muted-foreground">查看站点访问与文章阅读数据</p>
            </div>
            <SiteSelector />
          </div>

          {loading ? (
            <LoadingState />
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                {statCards.map((item) => (
                  <Card key={item.label}>
                    <CardContent className="p-6">
                      <p className="text-sm text-muted-foreground">{item.label}</p>
                      <p className="text-3xl font-bold">{item.value}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'visits' | 'articles')}>
                <TabsList>
                  <TabsTrigger value="visits">访问记录 ({visits.length})</TabsTrigger>
                  <TabsTrigger value="articles">文章列表 ({articles.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="visits">
                  <Card>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>时间</TableHead>
                            <TableHead>IP地址</TableHead>
                            <TableHead>设备</TableHead>
                            <TableHead>浏览器</TableHead>
                            <TableHead>操作系统</TableHead>
                            <TableHead>访问路径</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {visits.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                暂无访问记录
                              </TableCell>
                            </TableRow>
                          ) : (
                            visits.map((visit) => (
                              <TableRow key={visit.id}>
                                <TableCell>{new Date(visit.created_at).toLocaleString('zh-CN')}</TableCell>
                                <TableCell>{visit.ip_address}</TableCell>
                                <TableCell><Badge variant="outline">{visit.device_type}</Badge></TableCell>
                                <TableCell>{visit.browser}</TableCell>
                                <TableCell>{visit.os}</TableCell>
                                <TableCell className="max-w-[200px] truncate font-mono text-xs">{visit.path}</TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="articles">
                  <Card>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>文章ID</TableHead>
                            <TableHead>阅读量</TableHead>
                            <TableHead>独立读者</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {articles.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                                暂无文章数据
                              </TableCell>
                            </TableRow>
                          ) : (
                            articles.map((article) => (
                              <TableRow key={article.article_id}>
                                <TableCell className="font-mono">{article.article_id}</TableCell>
                                <TableCell><strong>{article.view_count.toLocaleString()}</strong></TableCell>
                                <TableCell>{article.unique_readers.toLocaleString()}</TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </>
          )}
        </PageContainer>
      </div>
    </>
  );
}
