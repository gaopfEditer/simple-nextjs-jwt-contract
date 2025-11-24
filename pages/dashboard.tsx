import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { getCurrentUser, logout as apiLogout } from '@/lib/api';
import { getPostList, getProductList, Post, Product } from '@/lib/external-api';
import { removeToken } from '@/lib/auth';
import styles from '../styles/Dashboard.module.css';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'posts' | 'products'>('posts');
  
  // 帖子列表
  const [posts, setPosts] = useState<Post[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [postsPage, setPostsPage] = useState(1);
  const [postsTotal, setPostsTotal] = useState(0);
  
  // 产品列表
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsPage, setProductsPage] = useState(1);
  const [productsTotal, setProductsTotal] = useState(0);

  useEffect(() => {
    async function loadUser() {
      try {
        const userData = await getCurrentUser();
        setUser(userData);
      } catch (error) {
        // 未授权，跳转到登录页
        router.push('/login');
      } finally {
        setLoading(false);
      }
    }
    loadUser();
  }, [router]);

  // 加载帖子列表
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

  // 加载产品列表
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
      <div className={styles.container}>
        <div className={styles.loading}>加载中...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <>
      <Head>
        <title>仪表板 - JWT 认证系统</title>
        <meta name="description" content="用户仪表板" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div className={styles.container}>
        <nav className={styles.nav}>
          <div className={styles.navContent}>
            <Link href="/" className={styles.logo}>
              JWT 认证系统
            </Link>
            <button onClick={handleLogout} className="btn btn-secondary">
              登出
            </button>
          </div>
        </nav>
        <main className={styles.main}>
          <div className={styles.card}>
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
              <Link href="/" className="btn btn-primary">
                返回首页
              </Link>
            </div>
          </div>

          {/* 业务数据展示 */}
          <div className={styles.card}>
            <div className={styles.tabs}>
              <button
                className={`${styles.tab} ${activeTab === 'posts' ? styles.active : ''}`}
                onClick={() => setActiveTab('posts')}
              >
                帖子列表
              </button>
              <button
                className={`${styles.tab} ${activeTab === 'products' ? styles.active : ''}`}
                onClick={() => setActiveTab('products')}
              >
                产品列表
              </button>
            </div>

            {activeTab === 'posts' && (
              <div className={styles.listContainer}>
                <div className={styles.listHeader}>
                  <h2>帖子列表</h2>
                  <div className={styles.pagination}>
                    <button
                      className="btn btn-secondary"
                      onClick={() => setPostsPage(Math.max(1, postsPage - 1))}
                      disabled={postsPage === 1 || postsLoading}
                    >
                      上一页
                    </button>
                    <span className={styles.pageInfo}>
                      第 {postsPage} 页 / 共 {Math.ceil(postsTotal / 10)} 页（共 {postsTotal} 条）
                    </span>
                    <button
                      className="btn btn-secondary"
                      onClick={() => setPostsPage(postsPage + 1)}
                      disabled={postsPage >= Math.ceil(postsTotal / 10) || postsLoading}
                    >
                      下一页
                    </button>
                  </div>
                </div>
                {postsLoading ? (
                  <div className={styles.loading}>加载中...</div>
                ) : posts.length > 0 ? (
                  <div className={styles.list}>
                    {posts.map((post) => (
                      <div key={post.id} className={styles.listItem}>
                        <div className={styles.listItemHeader}>
                          <span className={styles.listItemId}>ID: {post.id}</span>
                          <span className={styles.listItemCode}>编码: {post.code}</span>
                        </div>
                        <div className={styles.listItemContent}>
                          <p><strong>产品类型:</strong> {post.product_type}</p>
                          <p><strong>产品名称:</strong> {post.product_name}</p>
                          <p><strong>创建时间:</strong> {new Date(post.created_at).toLocaleString('zh-CN')}</p>
                          <p><strong>更新时间:</strong> {new Date(post.updated_at).toLocaleString('zh-CN')}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={styles.empty}>暂无数据</div>
                )}
              </div>
            )}

            {activeTab === 'products' && (
              <div className={styles.listContainer}>
                <div className={styles.listHeader}>
                  <h2>产品列表</h2>
                  <div className={styles.pagination}>
                    <button
                      className="btn btn-secondary"
                      onClick={() => setProductsPage(Math.max(1, productsPage - 1))}
                      disabled={productsPage === 1 || productsLoading}
                    >
                      上一页
                    </button>
                    <span className={styles.pageInfo}>
                      第 {productsPage} 页 / 共 {Math.ceil(productsTotal / 10)} 页（共 {productsTotal} 条）
                    </span>
                    <button
                      className="btn btn-secondary"
                      onClick={() => setProductsPage(productsPage + 1)}
                      disabled={productsPage >= Math.ceil(productsTotal / 10) || productsLoading}
                    >
                      下一页
                    </button>
                  </div>
                </div>
                {productsLoading ? (
                  <div className={styles.loading}>加载中...</div>
                ) : products.length > 0 ? (
                  <div className={styles.list}>
                    {products.map((product) => (
                      <div key={product.id} className={styles.listItem}>
                        <div className={styles.listItemHeader}>
                          <span className={styles.listItemId}>ID: {product.id}</span>
                          <span className={styles.listItemCode}>编码: {product.code}</span>
                        </div>
                        <div className={styles.listItemContent}>
                          <p><strong>产品类型:</strong> {product.product_type}</p>
                          <p><strong>产品名称:</strong> {product.product_name}</p>
                          <p><strong>创建时间:</strong> {new Date(product.created_at).toLocaleString('zh-CN')}</p>
                          <p><strong>更新时间:</strong> {new Date(product.updated_at).toLocaleString('zh-CN')}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={styles.empty}>暂无数据</div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  );
}

