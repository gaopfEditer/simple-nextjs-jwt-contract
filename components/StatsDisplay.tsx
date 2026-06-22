import React from 'react';
import { useSiteStats } from '@/lib/use-stats';
import { useSite } from '@/lib/site-context';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface StatsDisplayProps {
  className?: string;
  showLabels?: boolean;
}

export default function StatsDisplay({ className, showLabels = true }: StatsDisplayProps) {
  const { stats, loading, error } = useSiteStats();
  const { currentSiteId } = useSite();

  if (loading) {
    return (
      <div className={cn('grid gap-4 sm:grid-cols-3', className)}>
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="mb-2 h-4 w-24" />
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <p className={cn('text-sm text-destructive', className)}>加载失败: {error}</p>
    );
  }

  if (!stats) return null;

  const items = [
    {
      label: `本站总访问量${currentSiteId !== 'local' ? ` (${currentSiteId})` : ''}`,
      value: stats.totalVisits.toLocaleString(),
      unit: '次',
    },
    { label: '本站总访客数', value: stats.uniqueVisitors.toLocaleString(), unit: '人' },
    { label: '文章总阅读量', value: stats.totalArticleViews.toLocaleString(), unit: '次' },
  ];

  if (!showLabels) {
    return (
      <div className={cn('flex flex-wrap gap-4 text-sm', className)}>
        {items.map((item) => (
          <span key={item.label}>
            <span className="font-semibold">{item.value}</span> {item.unit}
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className={cn('grid gap-4 sm:grid-cols-3', className)}>
      {items.map((item) => (
        <Card key={item.label}>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">{item.label}</p>
            <p className="mt-1 text-2xl font-bold tracking-tight">
              {item.value}
              <span className="ml-1 text-sm font-normal text-muted-foreground">{item.unit}</span>
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
