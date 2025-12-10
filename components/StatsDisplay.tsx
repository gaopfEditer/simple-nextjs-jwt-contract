import React from 'react';
import { useSiteStats } from '@/lib/use-stats';
import { useSite } from '@/lib/site-context';
import styles from '@/styles/StatsDisplay.module.css';

interface StatsDisplayProps {
  className?: string;
  showLabels?: boolean;
}

export default function StatsDisplay({ className, showLabels = true }: StatsDisplayProps) {
  const { stats, loading, error } = useSiteStats();
  const { currentSiteId } = useSite();

  if (loading) {
    return (
      <div className={`${styles.statsContainer} ${className || ''}`}>
        <div className={styles.loading}>加载中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${styles.statsContainer} ${className || ''}`}>
        <div className={styles.error}>加载失败: {error}</div>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <div className={`${styles.statsContainer} ${className || ''}`}>
      {showLabels && (
        <>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>
              本站总访问量 {currentSiteId !== 'local' && `(${currentSiteId})`}
            </span>
            <span className={styles.statValue}>{stats.totalVisits.toLocaleString()}</span>
            <span className={styles.statUnit}>次</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>本站总访客数</span>
            <span className={styles.statValue}>{stats.uniqueVisitors.toLocaleString()}</span>
            <span className={styles.statUnit}>人</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>文章总阅读量</span>
            <span className={styles.statValue}>{stats.totalArticleViews.toLocaleString()}</span>
            <span className={styles.statUnit}>次</span>
          </div>
        </>
      )}
      {!showLabels && (
        <>
          <span className={styles.statValue}>{stats.totalVisits.toLocaleString()}</span>
          <span className={styles.statUnit}>次</span>
          <span className={styles.statValue}>{stats.uniqueVisitors.toLocaleString()}</span>
          <span className={styles.statUnit}>人</span>
          <span className={styles.statValue}>{stats.totalArticleViews.toLocaleString()}</span>
          <span className={styles.statUnit}>次</span>
        </>
      )}
    </div>
  );
}

