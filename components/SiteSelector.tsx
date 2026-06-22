import React from 'react';
import { useSite } from '@/lib/site-context';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export default function SiteSelector() {
  const { currentSiteId, setCurrentSiteId, sites, loading } = useSite();

  if (loading) {
    return <p className="text-sm text-muted-foreground">加载站点列表...</p>;
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
      <Label htmlFor="site-select" className="shrink-0">选择站点</Label>
      <select
        id="site-select"
        value={currentSiteId}
        onChange={(e) => setCurrentSiteId(e.target.value)}
        className={cn(
          'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm',
          'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring sm:max-w-xs'
        )}
      >
        {sites.length === 0 ? (
          <option value="local">local (暂无数据)</option>
        ) : (
          sites.map((site) => (
            <option key={site.siteId} value={site.siteId}>
              {site.siteId === 'local' ? 'local (本地)' : site.siteId} ({site.totalVisits} 次访问, {site.uniqueVisitors} 访客)
            </option>
          ))
        )}
      </select>
      <span className="text-sm text-muted-foreground">
        当前: <strong className="text-foreground">{currentSiteId === 'local' ? 'local (本地)' : currentSiteId}</strong>
      </span>
    </div>
  );
}
