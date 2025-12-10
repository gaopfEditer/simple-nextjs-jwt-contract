import { useRouter } from 'next/router';
import Head from 'next/head';
import { useTrackArticleView } from '@/lib/use-stats';
import ArticleStats from '@/components/ArticleStats';
import styles from '@/styles/Article.module.css';

// 示例文章内容
const articles: Record<string, { title: string; content: string }> = {
  '1': {
    title: '如何实现访问统计功能',
    content: `
      本文介绍了如何在 Next.js 应用中实现完整的访问统计功能。
      包括总访问量、独立访客数、文章阅读量等统计指标。
      
      主要功能包括：
      1. 自动记录访问信息（IP、设备、浏览器等）
      2. 统计总访问量和独立访客数
      3. 记录文章阅读量
      4. 支持多站点数据维护
    `,
  },
  '2': {
    title: 'JWT 认证最佳实践',
    content: `
      JWT (JSON Web Token) 是一种流行的身份认证方式。
      本文介绍 JWT 的使用场景、安全注意事项和最佳实践。
    `,
  },
  '3': {
    title: 'Next.js 性能优化技巧',
    content: `
      Next.js 提供了多种性能优化手段。
      包括代码分割、图片优化、静态生成等。
    `,
  },
};

export default function ArticlePage() {
  const router = useRouter();
  const { id } = router.query;
  const articleId = id as string;

  // 自动跟踪文章阅读
  useTrackArticleView(articleId);

  const article = articleId ? articles[articleId] : null;

  if (!articleId || !article) {
    return (
      <div className={styles.container}>
        <Head>
          <title>文章不存在</title>
        </Head>
        <main className={styles.main}>
          <h1>文章不存在</h1>
          <p>请检查文章ID是否正确。</p>
        </main>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>{article.title}</title>
        <meta name="description" content={article.content.substring(0, 150)} />
      </Head>
      <div className={styles.container}>
        <main className={styles.main}>
          <article className={styles.article}>
            <h1 className={styles.title}>{article.title}</h1>
            
            {/* 显示文章阅读量统计 */}
            <ArticleStats articleId={articleId} />
            
            <div className={styles.content}>
              {article.content.split('\n').map((paragraph, index) => (
                paragraph.trim() && (
                  <p key={index}>{paragraph.trim()}</p>
                )
              ))}
            </div>
          </article>
        </main>
      </div>
    </>
  );
}

