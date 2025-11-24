# 阿里云服务器 MongoDB 和 PostgreSQL 服务管理指南

## 一、MongoDB 服务管理

### 1. 检查 MongoDB 服务状态

```bash
# 检查 MongoDB 是否运行
sudo systemctl status mongod
# 或者
sudo systemctl status mongodb
```

### 2. 启动 MongoDB 服务

```bash
# 启动 MongoDB
sudo systemctl start mongod
# 或者
sudo systemctl start mongodb

# 设置开机自启动
sudo systemctl enable mongod
```

### 3. 停止 MongoDB 服务

```bash
sudo systemctl stop mongod
```

### 4. 重启 MongoDB 服务

```bash
sudo systemctl restart mongod
```

### 5. 连接 MongoDB 并验证数据库

```bash
# 使用命令行连接 MongoDB
mongo mongodb://admin:5GwYsADkufxyYjer@60.205.120.196:27017/fastgpt?authSource=admin

# 或者使用 mongosh (MongoDB 6.0+)
mongosh "mongodb://admin:5GwYsADkufxyYjer@60.205.120.196:27017/fastgpt?authSource=admin"

# 在 MongoDB shell 中执行以下命令：
# 查看所有数据库
show dbs

# 切换到 fastgpt 数据库
use fastgpt

# 查看当前数据库的所有集合
show collections

# 查看数据库统计信息
db.stats()
```

### 6. 检查 MongoDB 端口是否监听

```bash
# 检查 27017 端口是否在监听
sudo netstat -tlnp | grep 27017
# 或者
sudo ss -tlnp | grep 27017
```

### 7. 查看 MongoDB 日志

```bash
# 查看 MongoDB 日志（路径可能不同）
sudo tail -f /var/log/mongodb/mongod.log
# 或者
sudo journalctl -u mongod -f
```

---

## 二、PostgreSQL 服务管理

### 1. 检查 PostgreSQL 服务状态

```bash
# 检查 PostgreSQL 是否运行
sudo systemctl status postgresql
# 或者（根据版本可能不同）
sudo systemctl status postgresql-16
sudo systemctl status postgresql-15
```

### 2. 启动 PostgreSQL 服务

```bash
# 启动 PostgreSQL
sudo systemctl start postgresql
# 或者
sudo systemctl start postgresql-16

# 设置开机自启动
sudo systemctl enable postgresql
```

### 3. 停止 PostgreSQL 服务

```bash
sudo systemctl stop postgresql
```

### 4. 重启 PostgreSQL 服务

```bash
sudo systemctl restart postgresql
```

### 5. 连接 PostgreSQL 并验证数据库

```bash
# 使用 psql 连接 PostgreSQL
psql -h 60.205.120.196 -p 7007 -U postgres -d postgres

# 或者使用连接字符串
psql "postgresql://postgres:WeSDalsf2kpxrNJN@60.205.120.196:7007/postgres"

# 在 PostgreSQL shell 中执行以下命令：
# 列出所有数据库
\l
# 或者
SELECT datname FROM pg_database;

# 查看当前数据库
SELECT current_database();

# 查看数据库大小
SELECT pg_size_pretty(pg_database_size('postgres'));

# 查看所有表
\dt

# 查看数据库版本
SELECT version();

# 退出
\q
```

### 6. 检查 PostgreSQL 端口是否监听

```bash
# 检查 7007 端口是否在监听
sudo netstat -tlnp | grep 7007
# 或者
sudo ss -tlnp | grep 7007
```

### 7. 查看 PostgreSQL 配置

```bash
# 查看 PostgreSQL 配置文件位置
sudo -u postgres psql -c "SHOW config_file;"

# 查看 postgresql.conf
sudo cat /etc/postgresql/*/main/postgresql.conf | grep -E "port|listen_addresses"
```

### 8. 修改 PostgreSQL 监听地址和端口

如果需要修改 PostgreSQL 的监听地址和端口：

```bash
# 编辑配置文件（路径可能不同）
sudo nano /etc/postgresql/*/main/postgresql.conf

# 修改以下配置：
# listen_addresses = '*'  # 允许所有 IP 连接
# port = 7007             # 修改端口

# 编辑 pg_hba.conf 允许远程连接
sudo nano /etc/postgresql/*/main/pg_hba.conf

# 添加一行：
# host    all             all             0.0.0.0/0               md5

# 重启服务
sudo systemctl restart postgresql
```

---

## 三、Redis 服务管理

### 1. 检查 Redis 服务状态

```bash
sudo systemctl status redis
# 或者
sudo systemctl status redis-server
```

### 2. 启动 Redis 服务

```bash
sudo systemctl start redis
sudo systemctl enable redis
```

### 3. 连接 Redis 并测试

```bash
# 使用 redis-cli 连接
redis-cli -h 60.205.120.196 -p 6379 -a foobared

# 在 Redis shell 中：
# 测试连接
PING
# 应该返回 PONG

# 设置和获取值
SET test_key "test_value"
GET test_key

# 查看所有键
KEYS *

# 退出
exit
```

---

## 四、防火墙配置

### 1. 检查防火墙状态

```bash
# CentOS/RHEL
sudo firewall-cmd --list-all

# Ubuntu/Debian
sudo ufw status
```

### 2. 开放端口（CentOS/RHEL）

```bash
# 开放 MongoDB 端口
sudo firewall-cmd --permanent --add-port=27017/tcp

# 开放 PostgreSQL 端口
sudo firewall-cmd --permanent --add-port=7007/tcp

# 开放 Redis 端口
sudo firewall-cmd --permanent --add-port=6379/tcp

# 重新加载防火墙
sudo firewall-cmd --reload
```

### 3. 开放端口（Ubuntu/Debian）

```bash
# 开放 MongoDB 端口
sudo ufw allow 27017/tcp

# 开放 PostgreSQL 端口
sudo ufw allow 7007/tcp

# 开放 Redis 端口
sudo ufw allow 6379/tcp

# 启用防火墙
sudo ufw enable
```

---

## 五、阿里云安全组配置

1. 登录阿里云控制台
2. 进入 **ECS 实例** → 选择你的服务器
3. 点击 **安全组** → **配置规则**
4. 添加以下入站规则：
   - **MongoDB**: 端口 27017，协议 TCP，源地址 0.0.0.0/0（或指定 IP）
   - **PostgreSQL**: 端口 7007，协议 TCP，源地址 0.0.0.0/0（或指定 IP）
   - **Redis**: 端口 6379，协议 TCP，源地址 0.0.0.0/0（或指定 IP）

---

## 六、快速检查脚本

创建一个检查脚本 `check-services.sh`：

```bash
#!/bin/bash

echo "=== 检查服务状态 ==="
echo ""

echo "MongoDB 状态:"
sudo systemctl is-active mongod || sudo systemctl is-active mongodb || echo "未运行"

echo ""
echo "PostgreSQL 状态:"
sudo systemctl is-active postgresql || echo "未运行"

echo ""
echo "Redis 状态:"
sudo systemctl is-active redis || sudo systemctl is-active redis-server || echo "未运行"

echo ""
echo "=== 检查端口监听 ==="
echo ""

echo "MongoDB 端口 27017:"
sudo netstat -tlnp | grep 27017 || echo "未监听"

echo ""
echo "PostgreSQL 端口 7007:"
sudo netstat -tlnp | grep 7007 || echo "未监听"

echo ""
echo "Redis 端口 6379:"
sudo netstat -tlnp | grep 6379 || echo "未监听"
```

使用方法：
```bash
chmod +x check-services.sh
./check-services.sh
```

---

## 七、常见问题排查

### MongoDB 连接被拒绝
1. 检查服务是否启动：`sudo systemctl status mongod`
2. 检查端口是否监听：`sudo netstat -tlnp | grep 27017`
3. 检查防火墙和安全组配置
4. 检查 MongoDB 配置文件中的 `bindIp` 设置

### PostgreSQL 连接被拒绝
1. 检查服务是否启动：`sudo systemctl status postgresql`
2. 检查端口是否监听：`sudo netstat -tlnp | grep 7007`
3. 检查 `postgresql.conf` 中的 `listen_addresses` 和 `port`
4. 检查 `pg_hba.conf` 中的访问控制规则
5. 检查防火墙和安全组配置

### Redis 连接超时
1. 检查服务是否启动：`sudo systemctl status redis`
2. 检查端口是否监听：`sudo netstat -tlnp | grep 6379`
3. 检查 Redis 配置文件中的 `bind` 和 `protected-mode` 设置
4. 检查防火墙和安全组配置

---

## 八、验证数据库存在的完整流程

### MongoDB
```bash
# 1. 启动服务
sudo systemctl start mongod

# 2. 连接并验证
mongosh "mongodb://admin:5GwYsADkufxyYjer@localhost:27017/fastgpt?authSource=admin"

# 3. 在 MongoDB shell 中
show dbs                    # 查看所有数据库
use fastgpt                 # 切换到 fastgpt 数据库
show collections           # 查看集合
db.stats()                 # 查看数据库统计
```

### PostgreSQL
```bash
# 1. 启动服务
sudo systemctl start postgresql

# 2. 连接并验证
psql "postgresql://postgres:WeSDalsf2kpxrNJN@localhost:7007/postgres"

# 3. 在 PostgreSQL shell 中
\l                         # 列出所有数据库
SELECT datname FROM pg_database;  # 查看数据库列表
\c postgres                # 连接到 postgres 数据库
\dt                        # 查看所有表
SELECT version();          # 查看版本
```

---

## 注意事项

1. **安全建议**：
   - 不要在生产环境使用弱密码
   - 限制安全组规则，只允许必要的 IP 访问
   - 定期更新数据库软件

2. **备份**：
   - 定期备份数据库
   - 测试恢复流程

3. **监控**：
   - 监控服务状态
   - 监控数据库性能
   - 设置日志轮转


