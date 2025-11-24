# 🚀 启动和访问指南

## 1. 启动服务

```bash
# 构建并启动（如果还没构建）
sudo docker-compose up -d --build

# 或者只启动（已构建）
sudo docker-compose up -d
```

## 2. 检查服务状态

```bash
# 查看所有容器状态
sudo docker-compose ps

# 或者使用 docker 命令
sudo docker ps

# 查看详细状态
sudo docker-compose ps -a
```

## 3. 查看日志

```bash
# 查看所有服务日志
sudo docker-compose logs -f

# 查看应用日志
sudo docker-compose logs -f app

# 查看数据库日志
sudo docker-compose logs -f mysql

# 查看最近100行日志
sudo docker-compose logs --tail=100 app
```

## 4. 端口配置

docker-compose.yml 中已配置的端口：
- **应用**: 3000 (容器) -> 3000 (主机)
- **MySQL**: 3306 (容器) -> 3306 (主机)
- **phpMyAdmin**: 80 (容器) -> 8080 (主机)

### 修改端口（如果需要）

编辑 `docker-compose.yml`：

```yaml
app:
  ports:
    - "3000:3000"  # 改为 "8080:3000" 表示主机8080端口映射到容器3000端口
```

## 5. 开放防火墙端口（Linux虚拟机）

### CentOS/RHEL

```bash
# 开放端口
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --permanent --add-port=3306/tcp
sudo firewall-cmd --permanent --add-port=8080/tcp

# 重新加载防火墙
sudo firewall-cmd --reload

# 查看开放的端口
sudo firewall-cmd --list-ports
```

### Ubuntu/Debian

```bash
# 开放端口
sudo ufw allow 3000/tcp
sudo ufw allow 3306/tcp
sudo ufw allow 8080/tcp

# 启用防火墙（如果还没启用）
sudo ufw enable

# 查看状态
sudo ufw status
```

### 临时关闭防火墙（测试用，不推荐生产环境）

```bash
# CentOS/RHEL
sudo systemctl stop firewalld

# Ubuntu/Debian
sudo ufw disable
```

## 6. 从 Windows 访问

### 方法 1: 使用虚拟机 IP 地址

```bash
# 在虚拟机中查看 IP 地址
ip addr show
# 或
ifconfig
# 或
hostname -I
```

然后在 Windows 浏览器中访问：
- **应用**: `http://虚拟机IP:3000`
- **phpMyAdmin**: `http://虚拟机IP:8080`

### 方法 2: 使用 localhost（如果使用端口转发）

如果虚拟机配置了端口转发（如 VirtualBox、VMware、Hyper-V）：
- **应用**: `http://localhost:3000`
- **phpMyAdmin**: `http://localhost:8080`

### 方法 3: 使用 SSH 隧道（推荐，安全）

```bash
# 在 Windows PowerShell 或 CMD 中
ssh -L 3000:localhost:3000 -L 8080:localhost:8080 user@虚拟机IP
```

然后在 Windows 浏览器访问：
- **应用**: `http://localhost:3000`
- **phpMyAdmin**: `http://localhost:8080`

## 7. 测试连接

### 在虚拟机中测试

```bash
# 测试应用
curl http://localhost:3000

# 测试 phpMyAdmin
curl http://localhost:8080
```

### 在 Windows 中测试

```powershell
# PowerShell 中测试
Invoke-WebRequest -Uri http://虚拟机IP:3000

# 或使用浏览器直接访问
# http://虚拟机IP:3000
```

## 8. 常用管理命令

```bash
# 启动服务
sudo docker-compose up -d

# 停止服务
sudo docker-compose stop

# 停止并删除容器
sudo docker-compose down

# 重启服务
sudo docker-compose restart

# 重启特定服务
sudo docker-compose restart app

# 查看资源使用
sudo docker stats

# 进入容器
sudo docker-compose exec app sh
sudo docker-compose exec mysql bash
```

## 9. 故障排查

### 端口被占用

```bash
# 检查端口占用
sudo netstat -tlnp | grep 3000
sudo ss -tlnp | grep 3000

# 如果被占用，修改 docker-compose.yml 中的端口映射
```

### 无法从 Windows 访问

1. **检查防火墙**：确保虚拟机防火墙已开放端口
2. **检查 IP 地址**：确保使用正确的虚拟机 IP
3. **检查网络模式**：确保虚拟机网络配置正确（NAT、桥接等）
4. **检查 Docker 端口映射**：`sudo docker-compose ps` 查看端口映射

### 检查端口监听

```bash
# 检查端口是否在监听
sudo netstat -tlnp | grep -E "3000|3306|8080"
```

## 10. 快速启动脚本

创建 `start.sh`：

```bash
#!/bin/bash
echo "启动服务..."
sudo docker-compose up -d

echo "等待服务启动..."
sleep 5

echo "检查服务状态..."
sudo docker-compose ps

echo "查看应用日志..."
sudo docker-compose logs --tail=20 app

echo ""
echo "服务已启动！"
echo "应用地址: http://$(hostname -I | awk '{print $1}'):3000"
echo "phpMyAdmin: http://$(hostname -I | awk '{print $1}'):8080"
```

使用方法：
```bash
chmod +x start.sh
sudo ./start.sh
```

