import React from 'react';
import { useArticleStats } from '@/lib/use-stats';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface ArticleStatsProps {
  articleId: string;
  className?: string;
}

export default function ArticleStats({ articleId, className }: ArticleStatsProps) {
  const { stats, loading, error } = useArticleStats(articleId);

  if (loading) {
    return <Skeleton className={cn('h-6 w-40', className)} />;
  }

  if (error || !stats) return null;

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span className="text-sm text-muted-foreground">本文总阅读量</span>
      <Badge variant="secondary">{stats.views.toLocaleString()} 次</Badge>
    </div>
  );
}
