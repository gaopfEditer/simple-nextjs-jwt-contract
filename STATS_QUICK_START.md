# 访问统计功能快速启动指南

## 1. 初始化数据库

执行数据库迁移脚本创建统计表：

```bash
# 方式1：使用 MySQL 命令行
mysql -u root -p your_database < database/schema.sql

# 方式2：在 MySQL 客户端中执行
mysql -u root -p
use your_database;
source database/schema.sql;
```

或者直接复制 `database/schema.sql` 中的表结构到你的数据库管理工具中执行。

## 2. 验证安装

启动应用后，访问首页 `/`，你应该能看到统计数据组件。

如果数据为空，这是正常的（首次使用）。访问几个页面后，数据会自动记录。

## 3. 测试功能

### 测试访问统计

1. 访问首页：`http://localhost:3000/`
2. 查看页面上的统计数据（初始为0）
3. 刷新页面几次，访问量应该增加
4. 使用不同浏览器或设备访问，访客数应该增加

### 测试文章阅读统计

1. 访问示例文章：`http://localhost:3000/article/1`
2. 页面会自动记录阅读
3. 刷新页面，阅读量会增加
4. 查看页面上的"本文总阅读量"统计

## 4. 查看数据库记录

```sql
-- 查看访问记录
SELECT * FROM visits ORDER BY created_at DESC LIMIT 10;

-- 查看文章阅读记录
SELECT * FROM article_views ORDER BY last_view_at DESC LIMIT 10;

-- 查看统计数据
SELECT 
  COUNT(*) as total_visits,
  COUNT(DISTINCT visitor_id) as unique_visitors
FROM visits;
```

## 5. 常见问题

### Q: 统计数据不显示？
A: 检查：
1. 数据库表是否已创建
2. 数据库连接配置是否正确
3. 浏览器控制台是否有错误

### Q: 访问量不增加？
A: 检查：
1. API `/api/stats/track` 是否正常响应
2. 数据库是否有写入权限
3. 查看服务器日志是否有错误

### Q: 如何重置统计数据？
A: 执行以下SQL：
```sql
TRUNCATE TABLE visits;
TRUNCATE TABLE article_views;
```

## 6. 多站点配置

如果需要支持多个站点，可以通过以下方式：

### 方式1：环境变量
```env
SITE_ID=site-1
```

### 方式2：请求头
在 API 调用时设置：
```tsx
axios.get('/api/stats/overview', {
  headers: {
    'X-Site-ID': 'site-1'
  }
});
```

## 7. 生产环境注意事项

1. **性能优化**：定期清理旧数据，避免表过大
2. **隐私合规**：确保遵守 GDPR、CCPA 等隐私法规
3. **数据备份**：定期备份统计数据
4. **监控告警**：监控 API 性能和错误率

## 8. 下一步

- 查看 `STATS_USAGE.md` 了解详细使用说明
- 自定义统计组件样式
- 添加更多统计维度（如地区分布、设备分布等）
- 集成地理位置服务获取更详细的地区信息

