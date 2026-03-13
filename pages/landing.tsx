import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import styles from '@/styles/Landing.module.css';

const PRODUCT_NAME = 'Launch';
const TAGLINE = '从想法到上线，更简单';

export default function LandingPage() {
  const [navScrolled, setNavScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setNavScrolled(window.scrollY > 24);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className={styles.root}>
      <Head>
        <title>{PRODUCT_NAME} — {TAGLINE}</title>
        <meta name="description" content={`${PRODUCT_NAME} 帮助团队更快交付产品。自动化工作流、实时协作、一键部署。`} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <header className={`${styles.nav} ${navScrolled ? styles.navScrolled : ''}`}>
        <div className={styles.navInner}>
          <Link href="/landing" className={styles.logo}>{PRODUCT_NAME}</Link>
          <nav className={styles.navLinks}>
            <Link href="#features" className={styles.navLink}>功能</Link>
            <Link href="/login" className={styles.navLink}>登录</Link>
            <Link href="/register" className={styles.ctaNav}>免费开始</Link>
          </nav>
        </div>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroGrid}>
          <div>
            <div className={styles.heroBadge}>
              <span>◆</span> 现已开放注册
            </div>
            <h1 className={styles.heroTitle}>
              为现代团队打造的 <span className={styles.heroTitleAccent}>智能工作台</span>
            </h1>
            <p className={styles.heroLead}>
              自动化流程、实时协作与一键部署，让交付更可控。无需复杂配置，几分钟即可上手。
            </p>
            <div className={styles.heroCtas}>
              <Link href="/register" className={styles.btnPrimary}>
                免费试用
                <span aria-hidden>→</span>
              </Link>
              <Link href="#features" className={styles.btnSecondary}>
                了解功能
              </Link>
            </div>
          </div>
          <div className={styles.heroVisual} aria-hidden>
            <div className={styles.heroVisualBar}>
              <span className={styles.heroVisualDot} />
              <span className={styles.heroVisualDot} />
              <span className={styles.heroVisualDot} />
            </div>
          </div>
        </div>
      </section>

      <section id="features" className={styles.section}>
        <div className={styles.sectionHeader}>
          <p className={styles.sectionLabel}>功能</p>
          <h2 className={styles.sectionTitle}>你需要的，都在这里</h2>
          <p className={styles.sectionDesc}>
            从协作到发布，一个平台覆盖完整工作流。
          </p>
        </div>
        <div className={styles.featuresGrid}>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>⚡</div>
            <h3 className={styles.featureTitle}>自动化工作流</h3>
            <p className={styles.featureDesc}>
              配置一次，持续运行。构建、测试、部署自动串联，减少重复操作。
            </p>
          </div>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>👥</div>
            <h3 className={styles.featureTitle}>实时协作</h3>
            <p className={styles.featureDesc}>
              评论、任务与状态同步更新，团队信息一致，沟通成本更低。
            </p>
          </div>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>🚀</div>
            <h3 className={styles.featureTitle}>一键部署</h3>
            <p className={styles.featureDesc}>
              连接仓库即可发布。支持预览与环境切换，发布更安全可控。
            </p>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.ctaBlock}>
          <h2 className={styles.ctaTitle}>准备好加速交付了吗？</h2>
          <p className={styles.ctaText}>
            加入数千团队，用 {PRODUCT_NAME} 更高效地交付产品。无需信用卡即可开始。
          </p>
          <Link href="/register" className={styles.btnPrimary}>
            免费开始
            <span aria-hidden>→</span>
          </Link>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <span className={styles.footerLogo}>{PRODUCT_NAME}</span>
          <div className={styles.footerLinks}>
            <Link href="/login" className={styles.footerLink}>登录</Link>
            <Link href="/register" className={styles.footerLink}>注册</Link>
            <Link href="/" className={styles.footerLink}>控制台</Link>
          </div>
          <span className={styles.footerCopy}>© {new Date().getFullYear()} {PRODUCT_NAME}. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
}
