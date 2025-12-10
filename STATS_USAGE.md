# 访问统计功能使用说明

## 功能概述

本系统实现了完整的访问统计功能，支持：
- **总访问量统计**：记录所有页面访问
- **独立访客统计**：基于IP和User-Agent识别唯一访客
- **文章阅读量统计**：记录每篇文章的阅读次数和独立读者数
- **访客信息收集**：自动收集IP、设备类型、浏览器、操作系统等信息
- **多站点支持**：通过站点ID区分不同站点的数据

## 数据库表结构

### 1. visits 表 - 访问记录表
记录每次访问的详细信息：
- IP地址、User-Agent
- 设备类型（desktop/mobile/tablet/bot）
- 浏览器和操作系统信息
- 访问路径、来源页面等

### 2. article_views 表 - 文章阅读量表
记录文章阅读情况：
- 文章ID
- 访客ID（用于去重）
- 阅读次数
- 首次和最后阅读时间

### 3. site_stats 表 - 站点统计汇总表（可选）
用于快速查询的汇总数据。

## 初始化数据库

运行以下SQL创建表结构：

```bash
mysql -u root -p your_database < database/schema.sql
```

或者直接在MySQL客户端执行 `database/schema.sql` 文件。

## API 端点

### 1. 记录访问
```http
POST /api/stats/track
```
自动记录页面访问，无需手动调用（已在 `_app.tsx` 中自动集成）。

### 2. 记录文章阅读
```http
POST /api/stats/article
Content-Type: application/json

{
  "articleId": "article-123"
}
```

### 3. 获取站点统计概览
```http
GET /api/stats/overview
```
返回：
```json
{
  "siteId": "default",
  "totalVisits": 30567,
  "uniqueVisitors": 14156,
  "totalArticleViews": 388
}
```

### 4. 获取文章阅读量
```http
GET /api/stats/article?articleId=article-123
```
返回：
```json
{
  "articleId": "article-123",
  "views": 388,
  "uniqueReaders": 256
}
```

### 5. 获取最近访问记录
```http
GET /api/stats/recent?limit=50
```

### 6. 获取热门文章
```http
GET /api/stats/popular?limit=10
```

## 前端使用

### 1. 自动跟踪页面访问

已在 `_app.tsx` 中自动集成，无需额外配置。每次页面访问都会自动记录。

### 2. 显示站点统计

使用 `StatsDisplay` 组件：

```tsx
import StatsDisplay from '@/components/StatsDisplay';

export default function HomePage() {
  return (
    <div>
      <h1>首页</h1>
      <StatsDisplay />
    </div>
  );
}
```

显示效果：
```
本站总访问量 30567 次  本站总访客数 14156 人  文章总阅读量 388 次
```

### 3. 跟踪文章阅读

使用 `useTrackArticleView` Hook：

```tsx
import { useTrackArticleView } from '@/lib/use-stats';

export default function ArticlePage({ articleId }: { articleId: string }) {
  // 自动跟踪文章阅读
  useTrackArticleView(articleId);
  
  return <div>文章内容...</div>;
}
```

### 4. 显示文章阅读量

使用 `ArticleStats` 组件：

```tsx
import ArticleStats from '@/components/ArticleStats';

export default function ArticlePage({ articleId }: { articleId: string }) {
  return (
    <div>
      <h1>文章标题</h1>
      <ArticleStats articleId={articleId} />
      <div>文章内容...</div>
    </div>
  );
}
```

显示效果：
```
本文总阅读量 388 次
```

### 5. 使用自定义 Hook

```tsx
import { useSiteStats, useArticleStats } from '@/lib/use-stats';

function MyComponent() {
  const { stats, loading, error } = useSiteStats();
  const { stats: articleStats } = useArticleStats('article-123');
  
  if (loading) return <div>加载中...</div>;
  if (error) return <div>错误: {error}</div>;
  
  return (
    <div>
      <p>总访问量: {stats?.totalVisits}</p>
      <p>独立访客: {stats?.uniqueVisitors}</p>
      <p>文章阅读量: {articleStats?.views}</p>
    </div>
  );
}
```

## 多站点支持

通过设置请求头 `X-Site-ID` 来区分不同站点：

```tsx
// 在 API 调用时设置
axios.get('/api/stats/overview', {
  headers: {
    'X-Site-ID': 'site-1'
  }
});
```

或者在环境变量中设置：
```env
SITE_ID=site-1
```

## 访客识别机制

系统使用以下方式识别唯一访客：
1. 基于 IP 地址和 User-Agent 生成唯一哈希值
2. 相同 IP + User-Agent 组合被视为同一访客
3. 支持 IPv4 和 IPv6

## 设备信息检测

系统自动检测：
- **设备类型**：desktop / mobile / tablet / bot
- **浏览器**：Chrome, Firefox, Safari, Edge, Opera, IE 等
- **操作系统**：Windows, macOS, Linux, Android, iOS 等

## 示例页面

访问以下URL查看示例：
- 首页：`/` - 显示站点统计
- 文章页面：`/article/1` - 显示文章阅读量统计

## 注意事项

1. **性能考虑**：访问记录是异步的，不会阻塞页面加载
2. **隐私保护**：IP地址仅用于统计，建议在生产环境中遵守相关隐私法规
3. **数据清理**：建议定期清理旧数据，避免表过大影响性能
4. **去重逻辑**：同一访客多次访问同一文章，阅读量会累加，但独立读者数只计算一次

## 数据维护

### 清理旧数据

```sql
-- 删除30天前的访问记录
DELETE FROM visits WHERE created_at < DATE_SUB(NOW(), INTERVAL 30 DAY);

-- 删除30天前的文章阅读记录
DELETE FROM article_views WHERE last_view_at < DATE_SUB(NOW(), INTERVAL 30 DAY);
```

### 查看统计数据

```sql
-- 查看今日访问量
SELECT COUNT(*) FROM visits 
WHERE DATE(created_at) = CURDATE();

-- 查看今日独立访客数
SELECT COUNT(DISTINCT visitor_id) FROM visits 
WHERE DATE(created_at) = CURDATE();

-- 查看热门文章
SELECT article_id, SUM(view_count) as total_views
FROM article_views
GROUP BY article_id
ORDER BY total_views DESC
LIMIT 10;
```

## 故障排查

1. **统计数据不更新**：检查数据库连接和表结构是否正确
2. **访客数异常**：检查IP获取逻辑，确保正确获取真实IP（考虑代理情况）
3. **设备信息不准确**：User-Agent解析可能不完美，可考虑使用专业库如 `ua-parser-js`

