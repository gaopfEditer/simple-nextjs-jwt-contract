import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useSite } from '@/lib/site-context';
import SiteSelector from '@/components/SiteSelector';
import axios from 'axios';
import styles from '@/styles/StatsAdmin.module.css';

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
        axios.get('/api/stats/overview', {
          headers: { 'X-Site-ID': currentSiteId },
        }),
        axios.get('/api/stats/recent?limit=100', {
          headers: { 'X-Site-ID': currentSiteId },
        }),
        axios.get('/api/stats/popular?limit=100', {
          headers: { 'X-Site-ID': currentSiteId },
        }),
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

  return (
    <>
      <Head>
        <title>访问统计管理</title>
      </Head>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>访问统计管理</h1>
          <SiteSelector />
        </div>

        {loading ? (
          <div className={styles.loading}>加载中...</div>
        ) : (
          <>
            {/* 统计概览 */}
            {stats && (
              <div className={styles.statsOverview}>
                <div className={styles.statCard}>
                  <div className={styles.statValue}>{stats.totalVisits.toLocaleString()}</div>
                  <div className={styles.statLabel}>总访问量</div>
                </div>
                <div className={styles.statCard}>
                  <div className={styles.statValue}>{stats.uniqueVisitors.toLocaleString()}</div>
                  <div className={styles.statLabel}>独立访客</div>
                </div>
                <div className={styles.statCard}>
                  <div className={styles.statValue}>{stats.totalArticleViews.toLocaleString()}</div>
                  <div className={styles.statLabel}>文章阅读量</div>
                </div>
              </div>
            )}

            {/* 标签页 */}
            <div className={styles.tabs}>
              <button
                className={`${styles.tab} ${activeTab === 'visits' ? styles.active : ''}`}
                onClick={() => setActiveTab('visits')}
              >
                访问记录 ({visits.length})
              </button>
              <button
                className={`${styles.tab} ${activeTab === 'articles' ? styles.active : ''}`}
                onClick={() => setActiveTab('articles')}
              >
                文章列表 ({articles.length})
              </button>
            </div>

            {/* 访问记录 */}
            {activeTab === 'visits' && (
              <div className={styles.tableContainer}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>时间</th>
                      <th>IP地址</th>
                      <th>设备</th>
                      <th>浏览器</th>
                      <th>操作系统</th>
                      <th>访问路径</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visits.length === 0 ? (
                      <tr>
                        <td colSpan={6} className={styles.empty}>
                          暂无访问记录
                        </td>
                      </tr>
                    ) : (
                      visits.map((visit) => (
                        <tr key={visit.id}>
                          <td>{new Date(visit.created_at).toLocaleString('zh-CN')}</td>
                          <td>{visit.ip_address}</td>
                          <td>
                            <span className={styles.badge}>{visit.device_type}</span>
                          </td>
                          <td>{visit.browser}</td>
                          <td>{visit.os}</td>
                          <td className={styles.path}>{visit.path}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* 文章列表 */}
            {activeTab === 'articles' && (
              <div className={styles.tableContainer}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>文章ID</th>
                      <th>阅读量</th>
                      <th>独立读者</th>
                    </tr>
                  </thead>
                  <tbody>
                    {articles.length === 0 ? (
                      <tr>
                        <td colSpan={3} className={styles.empty}>
                          暂无文章数据
                        </td>
                      </tr>
                    ) : (
                      articles.map((article) => (
                        <tr key={article.article_id}>
                          <td className={styles.articleId}>{article.article_id}</td>
                          <td>
                            <strong>{article.view_count.toLocaleString()}</strong>
                          </td>
                          <td>{article.unique_readers.toLocaleString()}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

