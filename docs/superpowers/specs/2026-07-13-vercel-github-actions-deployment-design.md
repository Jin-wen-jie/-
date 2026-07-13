# Vercel 与 GitHub Actions 公网部署设计

## 目标

将当前比价后台改造成无需银行卡的公网部署：GitHub `main` 自动部署到 Vercel Hobby，网页通过长期有效的 HTTPS 地址随时访问；Supabase 提供 PostgreSQL；GitHub Actions 每小时执行一次有限时采集任务。

## 非目标

- 不使用 GitHub Pages 承载后端。GitHub Pages 仅用于静态文件，无法运行当前 Next.js API、数据库访问和采集逻辑。
- 不在 Vercel 请求生命周期中运行常驻 pg-boss Worker 或 Fastify Validator。
- 不承诺 GitHub Actions 在整点精确启动。计划任务可能因平台负载延迟，但可随时手动触发。
- 本阶段不重写为 Cloudflare Workers/D1，也不实现尚未配置凭据的 X、Telegram 真实连接器。

## 架构

```text
GitHub main
  |-- push --------------------> Vercel Hobby -> Next.js Web/API
  |                                  |
  |                                  v
  |                             Supabase PostgreSQL
  |
  `-- hourly/workflow_dispatch -> GitHub Actions
                                     |-- migrate + idempotent seed
                                     |-- local Fastify Validator
                                     `-- one-shot Worker batch
                                               |
                                               v
                                          Supabase PostgreSQL
```

### Vercel Web

`apps/web` 继续使用 Next.js App Router、服务端 API 和现有管理员会话。Vercel 从 GitHub `main` 自动构建，构建命令会先构建 `@compare/domain` 与 `@compare/db`，再构建 `@compare/web`。运行时通过 Supabase Session Pooler 连接数据库。

Vercel 环境变量：

- `DATABASE_URL`
- `SESSION_SECRET`
- `ADMIN_INITIAL_USERNAME`
- `ADMIN_INITIAL_PASSWORD`

管理员初始密码只用于首次引导，部署成功后必须通过应用内改密流程替换。

### Supabase PostgreSQL

沿用已创建的 `ai-price-intelligence` 免费项目和 IPv4 Session Pooler。迁移与种子必须幂等；GitHub Actions 每次采集前运行迁移与种子，避免代码和数据库结构漂移。连接串只存入平台 Secret，不写入仓库、构建产物或日志。

### 一次性 Worker

新增一个有限生命周期的 Worker 入口，复用现有 repository、job handlers 和 validator client，不依赖 pg-boss 常驻调度：

1. 获取待验证候选并放入内存队列。
2. 以默认并发度 `4` 处理最多 `50` 个候选。
3. 新发现的平台链接写入数据库，并在本批剩余额度内继续处理。
4. 获取待复检商品，以默认并发度 `4` 处理最多 `50` 个商品。
5. 输出不包含 URL、令牌或响应正文的汇总计数后退出。

`WORKER_DEADLINE_MS=1500000` 是 25 分钟软截止：到点后 Worker 停止领取或启动新实体，已启动实体允许有界收尾；单 URL 与数据库操作由代码层的独立有界超时约束。GitHub Actions collect job 的 30 分钟超时是最终硬上限。批次上限、并发度和软截止通过非敏感环境变量覆盖，但默认值必须适用于免费 runner。

单条候选或商品失败时记录脱敏错误类别并继续处理；数据库连接、迁移、种子或 Validator 启动失败时整个工作流失败。

### GitHub Actions

工作流在以下场景运行：

- `schedule: 0 * * * *`，每小时计划执行。
- `workflow_dispatch`，允许在 GitHub 页面手动执行。

执行顺序：安装固定 pnpm 版本、安装依赖、构建共享包/Validator/Worker、迁移、种子、后台启动 Validator、轮询 `/health`、执行一次性 Worker、上传简短 job summary。任何步骤不得打印 Secret。

GitHub Actions Secrets：

- `DATABASE_URL`
- `VALIDATOR_SHARED_TOKEN`

## 生产 ESM

`@compare/domain` 和 `@compare/db` 必须构建到 `dist` 并通过 package exports 提供运行时 JavaScript 与类型声明。所有 NodeNext 相对导入使用 `.js` 后缀。原生 Node 导入 `apps/worker/dist/index.js` 和一次性入口必须成功，不能依赖 tsx 在生产环境解释 workspace TypeScript 源码。

## 安全边界

- `.env`、数据库密码、管理员密码和共享令牌保持 Git 忽略。
- Validator 只在 GitHub runner 的 loopback 地址监听，不暴露公网端口。
- GitHub Actions 日志只输出计数和稳定错误码，不输出待采集 URL、页面内容或授权头。
- Vercel Preview 与 Production 均不得使用硬编码开发令牌。
- 公共研究候选继续以 `REVIEW_REQUIRED` 进入系统，不自动批准或形成欺诈结论。

## 测试与验收

### 自动验证

- 一次性 Worker 的队列上限、并发上限、失败隔离、新发现链接和超时均有单元测试。
- 生产 ESM 回归测试构建共享包与 Worker 后使用原生 Node 导入产物。
- 工作流静态测试锁定每小时 cron、手动触发、Secret 引用、健康检查和 job 超时。
- 完整运行 `pnpm lint`、`pnpm typecheck`、`pnpm test`、`pnpm build`。

### 公网验收

- GitHub `main` 包含最终提交，且 `.env` 未被跟踪。
- Vercel Production 部署成功，HTTPS 登录页返回 `200` 或预期重定向，静态资源无 `404`。
- 登录后候选、商品和设置页面可读取 Supabase 数据。
- GitHub Actions 手动采集成功，随后计划任务显示为每小时配置。
- Actions 与 Vercel 日志不出现数据库密码、管理员密码或共享令牌。

## 回滚

Vercel 保留上一个成功部署，可在 Dashboard 中即时回滚。数据库迁移必须只做向前兼容变更；若采集工作流异常，可禁用 schedule 而不影响 Web 访问和人工审核。
