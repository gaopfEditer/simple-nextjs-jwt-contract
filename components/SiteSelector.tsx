import React from 'react';
import { useSite } from '@/lib/site-context';
import styles from '@/styles/SiteSelector.module.css';

export default function SiteSelector() {
  const { currentSiteId, setCurrentSiteId, sites, loading } = useSite();

  if (loading) {
    return <div className={styles.selector}>加载站点列表...</div>;
  }

  return (
    <div className={styles.selector}>
      <label htmlFor="site-select" className={styles.label}>
        选择站点:
      </label>
      <select
        id="site-select"
        value={currentSiteId}
        onChange={(e) => setCurrentSiteId(e.target.value)}
        className={styles.select}
      >
        {sites.length === 0 ? (
          <option value="local">local (暂无数据)</option>
        ) : (
          sites.map((site) => (
            <option key={site.siteId} value={site.siteId}>
              {site.siteId === 'local' ? 'local (本地)' : site.siteId} 
              {' '}({site.totalVisits} 次访问, {site.uniqueVisitors} 访客)
            </option>
          ))
        )}
      </select>
      <span className={styles.info}>
        当前站点: <strong>{currentSiteId === 'local' ? 'local (本地)' : currentSiteId}</strong>
      </span>
    </div>
  );
}

