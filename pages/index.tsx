import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/api';
import styles from '../styles/Home.module.css';

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      try {
        const userData = await getCurrentUser();
        setUser(userData);
      } catch (error) {
        // 未登录
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, []);

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>加载中...</div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>JWT 认证系统</title>
        <meta name="description" content="Next.js JWT 认证示例" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className={styles.container}>
        <main className={styles.main}>
          <h1 className={styles.title}>欢迎使用 JWT 认证系统</h1>
          <p className={styles.description}>
            这是一个基于 Next.js 和 JWT 的用户认证示例项目
          </p>

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
        </main>
      </div>
    </>
  );
}

