import React from 'react';
import { useArticleStats } from '@/lib/use-stats';
import styles from '@/styles/StatsDisplay.module.css';

interface ArticleStatsProps {
  articleId: string;
  className?: string;
}

export default function ArticleStats({ articleId, className }: ArticleStatsProps) {
  const { stats, loading, error } = useArticleStats(articleId);

  if (loading) {
    return (
      <div className={`${styles.articleStats} ${className || ''}`}>
        <span className={styles.loading}>加载中...</span>
      </div>
    );
  }

  if (error || !stats) {
    return null;
  }

  return (
    <div className={`${styles.articleStats} ${className || ''}`}>
      <span className={styles.articleStatLabel}>本文总阅读量</span>
      <span className={styles.articleStatValue}>{stats.views.toLocaleString()}</span>
      <span className={styles.articleStatUnit}>次</span>
    </div>
  );
}

