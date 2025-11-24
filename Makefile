.PHONY: help build up down restart logs clean test

# 默认目标
help:
	@echo "可用的命令:"
	@echo "  make build      - 构建 Docker 镜像"
	@echo "  make up         - 启动所有服务"
	@echo "  make down       - 停止并删除所有容器"
	@echo "  make restart    - 重启所有服务"
	@echo "  make logs       - 查看所有服务日志"
	@echo "  make logs-app   - 查看应用日志"
	@echo "  make logs-db    - 查看数据库日志"
	@echo "  make clean      - 清理所有容器、镜像和卷"
	@echo "  make test       - 运行测试"
	@echo "  make shell      - 进入应用容器"
	@echo "  make db-shell   - 进入数据库容器"

# 构建镜像
build:
	docker-compose build

# 启动服务
up:
	docker-compose up -d

# 停止服务
down:
	docker-compose down

# 重启服务
restart:
	docker-compose restart

# 查看日志
logs:
	docker-compose logs -f

# 查看应用日志
logs-app:
	docker-compose logs -f app

# 查看数据库日志
logs-db:
	docker-compose logs -f mysql

# 清理所有资源
clean:
	docker-compose down -v
	docker rmi $$(docker images -q nextjs-jwt-app) 2>/dev/null || true
	docker system prune -f

# 进入应用容器
shell:
	docker-compose exec app sh

# 进入数据库容器
db-shell:
	docker-compose exec mysql mysql -u nextjs_user -pnextjs_password nextjs_jwt

# 备份数据库
backup:
	docker-compose exec mysql mysqldump -u root -proot_password nextjs_jwt > backup_$$(date +%Y%m%d_%H%M%S).sql
	@echo "数据库已备份到 backup_*.sql"

# 查看服务状态
ps:
	docker-compose ps

# 查看资源使用
stats:
	docker stats

# 重新构建并启动
rebuild:
	docker-compose up -d --build

