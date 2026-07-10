# DeepSeek 项目交接

## 接手指令

你正在接手一个尚未开始业务编码、但设计和实施计划已经批准的项目。不要重新做需求讨论，也不要缩小范围。先完整阅读以下两个文件，再从实施计划 Task 1 开始按 TDD 顺序执行：

1. `docs/superpowers/specs/2026-07-10-ai-price-intelligence-design.md`
2. `docs/superpowers/plans/2026-07-10-ai-price-intelligence.md`

实现工作必须在隔离工作树中进行：

```powershell
Set-Location 'C:\Users\32398\Desktop\自动比价\.worktrees\implementation'
git branch --show-current
git status --short
```

预期分支：`feat/ai-price-intelligence`。预期工作区干净。

## 用户目标

为一名调查 AI 数字商品市场的博主建立公网私有后台：

- 系统只有一个管理员账号和密码，不提供注册或多管理员。
- 自动从 X 公开内容和 Telegram 公共内容中发现 AI 商品链接。
- 管理员可手工补充商品链接。
- 链接必须匿名公开可访问，页面确实展示正常售卖的商品。
- 候选必须人工审核后才能进入榜单。
- 页面直接展示具体商品页链接；能确认时同时展示发现帖子和店铺主页。
- 从价格和货源两个角度分别排名，不同规格不得混排。
- 货源有明确数字时按库存量；没有数字时根据有货文字、新鲜度、链接稳定性和商家有效商品广度估算，并明确显示“估算”和置信度。
- 用于公开来源调查和比价，不购买商品、不获取账号凭据、不进入私人群组、不绕过登录或验证码。

用户已选择“标准实现版”，并明确授权按既定设计直接推进，不需要再次询问技术选型。

## 已批准技术方案

- pnpm TypeScript 单仓库。
- Next.js 16 + React 19 管理后台。
- PostgreSQL + Drizzle ORM。
- pg-boss 持久任务队列。
- Node worker 负责来源连接器、调度和生命周期。
- 独立 Fastify validator 负责 SSRF 安全检查、网页抓取和商品字段抽取；validator 不持有数据库、X 或 Telegram 凭据。
- X 使用官方 Recent Search API。
- Telegram 使用专用用户账号的 MTProto 公共内容搜索；Bot API 不能冒充全局搜索。
- Docker Compose 部署 web、worker、validator、postgres 和 HTTPS 反向代理。

## 当前 Git 状态

已完成并提交：

- `430973b`：完整设计规格。
- `3222f4f`：12 个阶段的详细实施计划。
- `1dbfaef`：忽略本地 `.worktrees/`。

当前没有 `package.json`、应用源码、数据库迁移或自动化测试。不要声称网站已经实现。

主工作区：

```text
C:\Users\32398\Desktop\自动比价
```

隔离实现工作区：

```text
C:\Users\32398\Desktop\自动比价\.worktrees\implementation
```

## 真实外部限制

- X 自动发现需要有效的 Developer App、Bearer Token、API 权限和额度。
- Telegram 全局公共搜索需要 `api_id`、`api_hash`、专用用户会话，并受账号可见范围和 `FLOOD_WAIT` 限制。
- 当前工作区没有这些真实凭据。
- 缺少凭据时必须把对应连接器显示为“未配置”，不能伪装成“没有结果”。
- 手工补链、候选审核、商品验证、榜单和演示数据必须仍可完整运行。
- 不得把密钥、Telegram session、密码或 Cookie 写进仓库或日志。

## 执行要求

1. 按实施计划 Task 1 到 Task 12 顺序推进。
2. 每个行为先写测试，确认因缺少实现而失败，再写最小实现让测试通过。
3. 每个 Task 完成后运行计划指定的测试和类型检查，并提交一次清晰 Git commit。
4. 不在 `main` 直接开发；只在 `feat/ai-price-intelligence` worktree 工作。
5. UI 使用固定表格、价格榜/货源榜标签页、清晰外链和紧凑运营后台布局，不使用瀑布流营销卡片。
6. 外链必须使用新窗口、`noopener noreferrer` 和 `no-referrer`。
7. 远端 HTML 只抽取并转义文本，绝不原样渲染。
8. 每次 DNS 解析和重定向都必须执行 SSRF 防护。
9. 只有审核通过、ACTIVE、24 小时内验证成功的商品进入榜单。
10. 最终必须运行 lint、typecheck、单元/集成测试、Playwright E2E，并完成桌面与移动截图检查。

## 完成标准

只有以下证据同时成立才可宣称完成：

- 唯一管理员登录、锁定、首次改密和会话撤销真实可用。
- 手工候选和模拟 X/TG 候选均能验证、审核、归一化和入榜。
- 商品页、来源帖子和可空店铺主页链接能安全打开。
- 价格榜按目标购买数量计算最低总支出和有效单位价。
- 货源榜严格区分明确库存与估算库存，并展示置信度。
- 未审核、缺货、失效、复检和超过 24 小时未验证的商品不进入榜单。
- X/TG 缺少凭据时后台显示真实状态。
- SSRF、登录墙、验证码、软 404、重定向至私网和超大响应测试通过。
- Docker 本地栈可启动，前端在桌面和移动视口无重叠或溢出。

从 `docs/superpowers/plans/2026-07-10-ai-price-intelligence.md` 的 Task 1 开始，不要重新规划项目。
