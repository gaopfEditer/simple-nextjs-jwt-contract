# Windows 连接虚拟机 MySQL 指南

## MySQL 配置信息

根据 `docker-compose.yml` 配置：

- **主机**: `192.168.246.131`
- **端口**: `3306`
- **Root 密码**: `root_password`
- **数据库**: `nextjs_jwt`
- **普通用户**: `nextjs_user`
- **普通用户密码**: `nextjs_password`

## 步骤 1: 配置 MySQL 允许远程连接

MySQL 8.0 默认只允许 root 从 localhost 连接，需要先配置：

```bash
# 在虚拟机中运行
chmod +x enable-mysql-remote.sh
sudo ./enable-mysql-remote.sh
```

或者手动执行：

```bash
docker-compose exec mysql mysql -uroot -proot_password -e "
CREATE USER IF NOT EXISTS 'root'@'%' IDENTIFIED BY 'root_password';
GRANT ALL PRIVILEGES ON *.* TO 'root'@'%' WITH GRANT OPTION;
FLUSH PRIVILEGES;
"
```

## 步骤 2: 开放防火墙端口

```bash
# CentOS/RHEL
sudo firewall-cmd --permanent --add-port=3306/tcp
sudo firewall-cmd --reload

# Ubuntu/Debian
sudo ufw allow 3306/tcp
```

## 步骤 3: 在 Windows 中连接

### 方法 1: 使用 MySQL Workbench（推荐）

1. 下载安装 [MySQL Workbench](https://dev.mysql.com/downloads/workbench/)
2. 打开 MySQL Workbench
3. 点击 "+" 创建新连接
4. 填写连接信息：
   - **Connection Name**: `虚拟机 MySQL`
   - **Hostname**: `192.168.246.131`
   - **Port**: `3306`
   - **Username**: `root`
   - **Password**: `root_password`
5. 点击 "Test Connection" 测试连接
6. 点击 "OK" 保存并连接

### 方法 2: 使用 Navicat

1. 打开 Navicat
2. 点击 "连接" -> "MySQL"
3. 填写信息：
   - **连接名**: `虚拟机 MySQL`
   - **主机**: `192.168.246.131`
   - **端口**: `3306`
   - **用户名**: `root`
   - **密码**: `root_password`
4. 点击 "测试连接"
5. 点击 "确定" 连接

### 方法 3: 使用 DBeaver

1. 下载安装 [DBeaver](https://dbeaver.io/download/)
2. 打开 DBeaver
3. 点击 "新建连接" -> "MySQL"
4. 填写信息：
   - **主机**: `192.168.246.131`
   - **端口**: `3306`
   - **数据库**: `nextjs_jwt`
   - **用户名**: `root`
   - **密码**: `root_password`
5. 点击 "测试连接"
6. 点击 "完成" 连接

### 方法 4: 使用命令行（需要安装 MySQL 客户端）

```bash
# 在 Windows PowerShell 或 CMD 中
mysql -h 192.168.246.131 -P 3306 -u root -p
# 输入密码: root_password
```

### 方法 5: 使用 VS Code 扩展

1. 安装 "MySQL" 扩展（作者：cweijan）
2. 点击扩展图标
3. 添加连接：
   - **Host**: `192.168.246.131`
   - **Port**: `3306`
   - **User**: `root`
   - **Password**: `root_password`
   - **Database**: `nextjs_jwt`

## 方法 6: 使用 phpMyAdmin（Web 界面）

如果 phpMyAdmin 服务已启动，可以直接在浏览器访问：

```
http://192.168.246.131:8080
```

登录信息：
- **服务器**: `mysql`（容器内）或 `192.168.246.131`（外部）
- **用户名**: `root`
- **密码**: `root_password`

## 连接字符串示例

### Node.js

```javascript
const mysql = require('mysql2');
const connection = mysql.createConnection({
  host: '192.168.246.131',
  port: 3306,
  user: 'root',
  password: 'root_password',
  database: 'nextjs_jwt'
});
```

### Python

```python
import mysql.connector

conn = mysql.connector.connect(
    host='192.168.246.131',
    port=3306,
    user='root',
    password='root_password',
    database='nextjs_jwt'
)
```

### JDBC (Java)

```
jdbc:mysql://192.168.246.131:3306/nextjs_jwt?user=root&password=root_password
```

## 测试连接

### 在 Windows PowerShell 中测试

```powershell
# 使用 Test-NetConnection 测试端口
Test-NetConnection -ComputerName 192.168.246.131 -Port 3306
```

### 使用 telnet 测试

```cmd
telnet 192.168.246.131 3306
```

## 故障排查

### 问题 1: 无法连接

1. **检查 MySQL 容器是否运行**:
   ```bash
   docker-compose ps mysql
   ```

2. **检查端口映射**:
   ```bash
   docker-compose ps
   # 应该看到 0.0.0.0:3306->3306/tcp
   ```

3. **检查防火墙**:
   ```bash
   # 在虚拟机中
   sudo firewall-cmd --list-ports
   # 或
   sudo ufw status
   ```

4. **检查 MySQL 日志**:
   ```bash
   docker-compose logs mysql
   ```

### 问题 2: 连接被拒绝

确保已运行 `enable-mysql-remote.sh` 配置远程访问。

### 问题 3: 认证失败

检查密码是否正确：
- Root 密码: `root_password`
- 普通用户密码: `nextjs_password`

## 安全建议

1. **修改默认密码**:
   ```bash
   # 在 docker-compose.yml 中修改
   MYSQL_ROOT_PASSWORD=your_secure_password
   ```

2. **限制访问 IP**（可选）:
   ```sql
   -- 只允许特定 IP 连接
   CREATE USER 'root'@'192.168.246.%' IDENTIFIED BY 'password';
   ```

3. **使用普通用户而非 root**:
   - 用户名: `nextjs_user`
   - 密码: `nextjs_password`
   - 只授予必要权限

## 快速连接命令

```bash
# 在虚拟机中配置远程访问
./enable-mysql-remote.sh

# 开放防火墙
sudo firewall-cmd --permanent --add-port=3306/tcp && sudo firewall-cmd --reload
```

然后在 Windows 中使用任何 MySQL 客户端工具连接即可！





