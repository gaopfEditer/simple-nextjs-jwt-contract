# 手动下载镜像方案

如果网络问题无法解决，可以手动下载镜像：

## 方法 1: 在其他能访问的机器上下载并导出

```bash
# 在能访问外网的机器上
docker pull node:20-alpine
docker pull mysql:8.0
docker save node:20-alpine mysql:8.0 -o images.tar

# 传输到服务器
scp images.tar user@server:/path/

# 在服务器上导入
docker load -i images.tar
```

## 方法 2: 使用阿里云镜像仓库

如果有阿里云账号，可以使用阿里云容器镜像服务：

1. 登录阿里云控制台
2. 进入容器镜像服务
3. 创建镜像仓库，同步 Docker Hub 的镜像
4. 使用阿里云镜像地址

## 方法 3: 使用内网镜像仓库

如果有内网镜像仓库，配置使用内网地址。

