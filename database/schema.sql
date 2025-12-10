-- 用户表
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '用户ID',
  `email` VARCHAR(255) NOT NULL COMMENT '邮箱',
  `password` VARCHAR(255) NOT NULL COMMENT '密码（已加密）',
  `is_enabled` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '用户是否正常启用',
  `last_login_at` DATETIME NULL DEFAULT NULL COMMENT '最后登录时间',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_email` (`email`),
  KEY `idx_is_enabled` (`is_enabled`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

-- 访问记录表
CREATE TABLE IF NOT EXISTS `visits` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '访问ID',
  `site_id` VARCHAR(100) NOT NULL DEFAULT 'default' COMMENT '站点ID，用于多站点支持',
  `visitor_id` VARCHAR(64) NOT NULL COMMENT '访客唯一标识（基于IP+User-Agent的哈希）',
  `ip_address` VARCHAR(45) NOT NULL COMMENT 'IP地址（支持IPv6）',
  `user_agent` TEXT COMMENT 'User-Agent字符串',
  `device_type` VARCHAR(50) COMMENT '设备类型（desktop/mobile/tablet/bot）',
  `browser` VARCHAR(100) COMMENT '浏览器名称',
  `browser_version` VARCHAR(50) COMMENT '浏览器版本',
  `os` VARCHAR(100) COMMENT '操作系统',
  `os_version` VARCHAR(50) COMMENT '操作系统版本',
  `referer` TEXT COMMENT '来源页面',
  `path` VARCHAR(500) COMMENT '访问路径',
  `query_string` TEXT COMMENT '查询参数',
  `country` VARCHAR(100) COMMENT '国家',
  `region` VARCHAR(100) COMMENT '地区',
  `city` VARCHAR(100) COMMENT '城市',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '访问时间',
  PRIMARY KEY (`id`),
  KEY `idx_site_id` (`site_id`),
  KEY `idx_visitor_id` (`visitor_id`),
  KEY `idx_ip_address` (`ip_address`),
  KEY `idx_path` (`path`(255)),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_site_created` (`site_id`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='访问记录表';

-- 文章阅读量表
CREATE TABLE IF NOT EXISTS `article_views` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '记录ID',
  `site_id` VARCHAR(100) NOT NULL DEFAULT 'default' COMMENT '站点ID',
  `article_id` VARCHAR(255) NOT NULL COMMENT '文章ID或路径',
  `visitor_id` VARCHAR(64) NOT NULL COMMENT '访客唯一标识',
  `ip_address` VARCHAR(45) NOT NULL COMMENT 'IP地址',
  `view_count` INT UNSIGNED NOT NULL DEFAULT 1 COMMENT '阅读次数（同一访客可能多次阅读）',
  `first_view_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '首次阅读时间',
  `last_view_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '最后阅读时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_article_visitor` (`site_id`, `article_id`, `visitor_id`),
  KEY `idx_site_article` (`site_id`, `article_id`),
  KEY `idx_article_id` (`article_id`),
  KEY `idx_first_view_at` (`first_view_at`),
  KEY `idx_last_view_at` (`last_view_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='文章阅读量表';

-- 站点统计汇总表（可选，用于快速查询）
CREATE TABLE IF NOT EXISTS `site_stats` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '统计ID',
  `site_id` VARCHAR(100) NOT NULL DEFAULT 'default' COMMENT '站点ID',
  `stat_date` DATE NOT NULL COMMENT '统计日期',
  `total_visits` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '总访问量',
  `unique_visitors` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '独立访客数',
  `total_article_views` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '文章总阅读量',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_site_date` (`site_id`, `stat_date`),
  KEY `idx_stat_date` (`stat_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='站点统计汇总表';

