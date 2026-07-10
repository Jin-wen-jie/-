# AI 商品公开链接比价后台

面向单一管理员的后台系统，用于调查公开网络中的 AI 数字商品，自动发现并人工审核后生成价格榜和货源榜。

## 技术栈

- **pnpm** TypeScript 单仓库
- **Next.js 16** + React 19 管理后台
- **PostgreSQL 17** + Drizzle ORM
- **pg-boss** 持久任务队列
- Node.js worker + Fastify validator
- Docker Compose 部署

## 项目结构

```text
apps/
  web/          Next.js 管理后台（唯一管理员认证、候选审核、榜单、设置）
  worker/       后台 worker（来源发现、链接复检、任务调度）
  validator/    隔离 URL 验证器（SSRF 防护、商品信息抽取）
packages/
  domain/       纯函数（规格键、价格排名、货源排名）
  db/           Drizzle schema、迁移、管理员引导
  config/       环境变量与配置
tests/
  fixtures/     测试夹具（X/TG API 响应、商品页 HTML）
  e2e/          Playwright E2E 测试
```

## 本地启动

### 前置条件

- Node.js 24+
- pnpm 10.28+
- Docker Desktop（或 Docker Engine + Docker Compose）

### 1. 启动基础设施

```bash
docker compose up -d postgres
```

### 2. 安装依赖

```bash
pnpm install
```

### 3. 运行数据库迁移

```bash
pnpm db:generate
pnpm db:migrate
```

### 4. 启动开发服务器

```bash
pnpm dev
```

- Web 后台: http://localhost:3000
- Validator: http://localhost:3001

### 5. 首次登录

访问 http://localhost:3000/login，使用部署环境变量中的初始用户名和密码登录。首次登录后系统强制修改密码。

### 默认凭据（开发环境）

- 用户名: `owner`
- 密码: `CHANGE-ME-AT-FIRST-LOGIN`

## 外部凭据配置

### X (Twitter)

在 `.env` 或部署环境中设置:

```bash
X_BEARER_TOKEN=your-bearer-token
```

需要 X Developer App 的 Bearer Token 和相应 API 权限。

### Telegram

```bash
TELEGRAM_API_ID=your-api-id
TELEGRAM_API_HASH=your-api-hash
TELEGRAM_SESSION_STRING=your-encrypted-session
```

使用专用用户账号的 MTProto 会话进行公共内容搜索。

**缺少凭据时**：对应连接器显示为"未配置"，手工补链和其余功能保持可用。

## 测试

```bash
# 单元测试
pnpm test

# 类型检查
pnpm typecheck

# E2E 测试（需要先启动开发服务器）
pnpm test:e2e
```

## 生产部署

### Docker Compose（完整栈）

```bash
# 复制环境配置
cp .env.example .env
# 编辑 .env 填入真实凭据

# 构建并启动
docker compose up -d --build
```

服务端口：
- HTTPS: 443（Caddy 反向代理）
- Web 内部: 3000
- Validator 内部: 3001
- PostgreSQL 内部: 5432

### 数据库备份

```bash
docker compose exec postgres pg_dump -U postgres compare > backup.sql
```

### 恢复

```bash
docker compose exec -T postgres psql -U postgres compare < backup.sql
```

## 安全设计

- 唯一管理员账号：`admin_accounts` 表约束 `id = 1`，不提供注册
- 密码使用 Argon2id，初始密码一次性引导，重启不重置
- 会话 Cookie: `HttpOnly; Secure; SameSite=Strict`
- CSRF 防护：同步器令牌 + Origin 检查
- Validator SSRF 防护：阻断环回、私网、链路本地、CGNAT、组播地址
- 远端 HTML 只抽取文本，绝不渲染
- 外链 `target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer"`
- 密钥和凭据不写入仓库或日志

## 不绕过限制

- 不绕过登录墙、验证码、robots.txt、403/401
- 不进入私人群组或获取私人凭据
- 不伪装用户代理绕过反爬
- 尊重 `Retry-After`、速率限制和平台频控

## 许可证

Private — 仅供授权管理员使用。
