import { useState, FormEvent } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { register } from '@/lib/api';
import { setToken } from '@/lib/auth';
import styles from '../styles/Auth.module.css';

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await register(email, password);
      setToken(response.token);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || '注册失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>注册 - JWT 认证系统</title>
        <meta name="description" content="用户注册页面" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div className={styles.container}>
        <div className={styles.authBox}>
          <h1 className={styles.title}>注册</h1>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email">邮箱</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="请输入邮箱"
              />
            </div>
            <div className="form-group">
              <label htmlFor="password">密码</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="请输入密码（至少 6 位）"
                minLength={6}
              />
            </div>
            {error && <div className="error-message">{error}</div>}
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? '注册中...' : '注册'}
            </button>
          </form>
          <p className={styles.footer}>
            已有账号？<Link href="/login">立即登录</Link>
          </p>
        </div>
      </div>
    </>
  );
}

