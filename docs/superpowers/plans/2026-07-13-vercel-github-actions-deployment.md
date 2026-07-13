# Vercel 与 GitHub Actions 公网部署实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将比价后台从会休眠的单容器方案改为 Vercel 持续可访问 Web、Supabase PostgreSQL 和每小时 GitHub Actions 一次性采集。

**Architecture:** Vercel 只运行 `apps/web`；GitHub Actions 每小时在临时 runner 内启动 Validator 并执行有限时 Worker 批次；两者通过 Supabase Session Pooler 共享数据库。共享 workspace 包必须先编译为原生 ESM，生产环境不得解释 TypeScript 源码。

**Tech Stack:** pnpm 10.28.2、TypeScript 5.8、Node.js 24、Next.js 16、Fastify 5、pg-boss 12、PostgreSQL/Supabase、GitHub Actions、Vercel Hobby、Vitest 4。

---

### Task 0: 关闭平台链接协议与路径边界缺口

**Files:**
- Modify: `apps/validator/src/validator.test.ts`
- Modify: `apps/validator/src/extract-product.ts`

- [ ] **Step 1: 写入协议和跨平台路径的失败测试**

扩展平台链接测试，输入同时包含：

```html
<a href="https://pay.ldxp.cn/shop/store-a">LDXP shop</a>
<a href="https://pay.ldxp.cn/item/item-a">LDXP item</a>
<a href="https://store.codesky.qzz.io/item/8">Codesky item</a>
<a href="https://shop.gptmf.com/buy/26">GPTMF buy</a>
<a href="ftp://pay.ldxp.cn/item/evil">FTP</a>
<a href="https://store.codesky.qzz.io/buy/1">Wrong Codesky path</a>
<a href="https://shop.gptmf.com/item/1">Wrong GPTMF path</a>
<a href="https://user:pass@pay.ldxp.cn/item/secret">Credentials</a>
<a href="https://pay.ldxp.cn:8443/item/port">Non-standard port</a>
```

期望只返回前四个 HTTP(S) 标准端口、无凭据、平台路径匹配的 URL。

- [ ] **Step 2: 运行测试确认当前提取过宽**

Run: `pnpm exec vitest run apps/validator/src/validator.test.ts`

Expected: FAIL，实际结果额外包含 FTP、跨平台路径、凭据或非标准端口 URL。

- [ ] **Step 3: 实现平台规则映射**

使用结构化规则代替全局路径并集：

```ts
const PLATFORM_RULES = [
  { domain: "ldxp.cn", paths: ["/shop/", "/item/"] },
  { domain: "codesky.qzz.io", paths: ["/item/"] },
  { domain: "gptmf.com", paths: ["/buy/"] },
] as const;
```

只允许 `http:`/`https:`、空 `username/password`，且端口为空或与协议标准端口一致；域名必须完全相等或以 `.${domain}` 结尾；路径必须匹配该域名自己的规则。

- [ ] **Step 4: 验证并提交安全修复**

Run: `pnpm exec vitest run apps/validator/src/validator.test.ts`

Run: `pnpm --filter @compare/validator typecheck`

Expected: PASS。

```bash
git add apps/validator/src/validator.test.ts apps/validator/src/extract-product.ts
git commit -m "fix: enforce platform discovery URL boundaries"
```

### Task 1: 修复共享包与 Worker 的生产 ESM

**Files:**
- Create: `tests/worker-runtime-esm.test.ts`
- Modify: `packages/domain/package.json`
- Modify: `packages/domain/tsconfig.json`
- Modify: `packages/db/package.json`
- Modify: `packages/db/tsconfig.json`
- Modify: `packages/db/src/client.ts`
- Modify: `packages/db/src/seed-run.ts`
- Modify: `packages/db/src/seed-watch-sources.ts`
- Modify: `packages/db/src/seed-candidates.ts`
- Modify: `packages/db/src/seed-specs.ts`
- Modify: `apps/worker/tsconfig.json`
- Modify: `apps/worker/package.json`
- Modify: `Dockerfile.web`
- Modify: `Dockerfile.worker`

- [ ] **Step 1: 写入会失败的原生 ESM 回归测试**

`tests/worker-runtime-esm.test.ts` 使用 `spawnSync` 依次执行构建和原生导入：

```ts
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

function run(command: string, args: string[]) {
  return spawnSync(command, args, {
    cwd: process.cwd(),
    encoding: "utf8",
    shell: process.platform === "win32",
    env: { ...process.env, NODE_ENV: "production" },
  });
}

describe("worker production ESM", () => {
  it("builds workspace dependencies and imports worker output with Node", () => {
    const build = run("pnpm", ["--filter", "@compare/worker...", "build"]);
    expect(build.status, `${build.stdout}\n${build.stderr}`).toBe(0);

    const loaded = run("node", [
      "--input-type=module",
      "--eval",
      "await import('./apps/worker/dist/index.js')",
    ]);
    expect(loaded.status, `${loaded.stdout}\n${loaded.stderr}`).toBe(0);
  });
});
```

- [ ] **Step 2: 运行测试确认当前生产导入失败**

Run: `pnpm exec vitest run tests/worker-runtime-esm.test.ts`

Expected: FAIL，stderr 包含 `ERR_MODULE_NOT_FOUND`，并指向 `packages/db/src/schema` 或未构建的 workspace 入口。

- [ ] **Step 3: 将 domain/db 改为可构建的 NodeNext 包**

两个 package 增加 `build: tsc -p tsconfig.json`，运行时入口指向 `dist`；为开发与类型检查保留源文件类型入口，避免干净工作树在首次构建前无法解析：

```json
{
  "main": "./dist/index.js",
  "types": "./src/index.ts",
  "exports": {
    ".": {
      "types": "./src/index.ts",
      "import": "./dist/index.js",
      "default": "./dist/index.js"
    }
  }
}
```

DB 使用相同结构，但入口为 `dist/client.js` 与 `src/client.ts`。三个 Node 包的 tsconfig 删除 `bundler` 覆盖，继承根配置的 `NodeNext`。DB 内所有相对 import/export 添加 `.js` 后缀，例如：

```ts
import * as schema from "./schema.js";
export * from "./schema.js";
export { seedCandidates } from "./seed-candidates.js";
```

- [ ] **Step 4: 让 Docker 与递归构建先构建依赖**

`Dockerfile.worker` 使用：

```dockerfile
RUN pnpm --filter @compare/worker... build
```

`Dockerfile.web` 使用：

```dockerfile
RUN pnpm --filter @compare/web... build
```

- [ ] **Step 5: 验证 ESM、类型和完整构建**

Run: `pnpm exec vitest run tests/worker-runtime-esm.test.ts`

Run: `pnpm typecheck`

Run: `pnpm build`

Expected: 全部 exit `0`；原生导入不启动 Worker，也不要求 `DATABASE_URL`。

- [ ] **Step 6: 提交 ESM 修复**

```bash
git add tests/worker-runtime-esm.test.ts packages/domain packages/db apps/worker/tsconfig.json apps/worker/package.json Dockerfile.web Dockerfile.worker
git commit -m "fix: build workspace packages for production ESM"
```

### Task 2: 实现有限时一次性 Worker

**Files:**
- Create: `apps/worker/src/run-batch.ts`
- Create: `apps/worker/src/run-batch.test.ts`
- Create: `apps/worker/src/run-once.ts`
- Modify: `apps/worker/package.json`

- [ ] **Step 1: 为动态内存队列写失败测试**

测试构造 `sweepCandidates`、`validateCandidate`、`sweepListings`、`revalidateListing` 四个 handler，并断言：候选/商品各不超过限制；并发不超过 `4`；单项失败会计数但不终止；验证候选时新增的 ID 会在剩余额度内继续处理；截止时间到达后不再启动新任务。

核心测试 API 固定为：

```ts
const result = await runWorkerBatch({
  createHandlers: (enqueue) => createHandlers({ enqueue }),
  candidateLimit: 50,
  listingLimit: 50,
  concurrency: 4,
  deadlineMs: 25 * 60_000,
  now: () => clock,
});

expect(result).toEqual({
  candidates: { attempted: 3, succeeded: 2, failed: 1 },
  listings: { attempted: 2, succeeded: 2, failed: 0 },
  timedOut: false,
});
```

- [ ] **Step 2: 运行测试确认一次性入口尚不存在**

Run: `pnpm exec vitest run apps/worker/src/run-batch.test.ts`

Expected: FAIL with `Cannot find module './run-batch.js'`。

- [ ] **Step 3: 实现可测试的批次调度器**

`runWorkerBatch` 接收 handler 工厂与限制，使用两个去重内存队列。它将自己的 enqueue 回调传给工厂，回调按 `QUEUES.VALIDATE_CANDIDATE` 和 `QUEUES.REVALIDATE_LISTING` 加入对应队列；先调用两个 sweep，再以固定数量 worker loop 消费。每个实体调用用 `try/catch` 隔离，日志只输出稳定错误类别与计数，不输出实体 URL。

公开类型：

```ts
export interface BatchResult {
  candidates: { attempted: number; succeeded: number; failed: number };
  listings: { attempted: number; succeeded: number; failed: number };
  timedOut: boolean;
}

type BatchQueue =
  | typeof QUEUES.VALIDATE_CANDIDATE
  | typeof QUEUES.REVALIDATE_LISTING;

export async function runWorkerBatch(options: {
  createHandlers: (
    enqueue: (queue: BatchQueue, id: string) => Promise<void>,
  ) => ReturnType<typeof createJobHandlers>;
  candidateLimit: number;
  listingLimit: number;
  concurrency: number;
  deadlineMs: number;
  now?: () => number;
}): Promise<BatchResult>;
```

- [ ] **Step 4: 实现生产 CLI 入口**

`run-once.ts` 校验环境变量和正整数配置，创建 repository 与 handlers，然后调用 `runWorkerBatch`：

```ts
const databaseUrl = requiredEnv("DATABASE_URL");
const validatorBaseUrl = process.env.VALIDATOR_BASE_URL ?? "http://127.0.0.1:3001";
const validatorSharedToken = requiredEnv("VALIDATOR_SHARED_TOKEN");

const result = await runWorkerBatch({
  createHandlers: (enqueue) =>
    createHandlers({
      databaseUrl,
      validatorBaseUrl,
      validatorSharedToken,
      enqueue,
    }),
  candidateLimit: positiveInt("CANDIDATE_LIMIT", 50),
  listingLimit: positiveInt("LISTING_LIMIT", 50),
  concurrency: positiveInt("WORKER_CONCURRENCY", 4),
  deadlineMs: positiveInt("WORKER_DEADLINE_MS", 25 * 60_000),
});
```

`apps/worker/package.json` 增加：

```json
"run-once": "node dist/run-once.js"
```

- [ ] **Step 5: 验证批次行为和原生 CLI 导入**

Run: `pnpm exec vitest run apps/worker/src/run-batch.test.ts apps/worker/src/job-handlers.test.ts`

Run: `pnpm --filter @compare/worker... build`

Run: `node --input-type=module --eval "await import('./apps/worker/dist/run-once.js')"`

Expected: 测试通过；导入不执行 CLI，只有直接运行 `node dist/run-once.js` 才读取 Secret 并启动任务。

- [ ] **Step 6: 提交一次性 Worker**

```bash
git add apps/worker/src/run-batch.ts apps/worker/src/run-batch.test.ts apps/worker/src/run-once.ts apps/worker/package.json
git commit -m "feat: add bounded one-shot collection worker"
```

### Task 3: 添加 GitHub Actions 每小时采集

**Files:**
- Create: `.github/workflows/hourly-collection.yml`
- Create: `tests/hourly-workflow.test.ts`
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`

- [ ] **Step 1: 添加 YAML 解析器并写失败测试**

Run: `pnpm add -Dw yaml@2.8.1`

测试用 `yaml.parse` 读取工作流，断言：

```ts
expect(workflow.on.schedule).toEqual([{ cron: "0 * * * *" }]);
expect(workflow.on).toHaveProperty("workflow_dispatch");
expect(workflow.jobs.collect["timeout-minutes"]).toBe(30);
expect(serialized).toContain("secrets.DATABASE_URL");
expect(serialized).toContain("secrets.VALIDATOR_SHARED_TOKEN");
expect(serialized).toContain("http://127.0.0.1:3001/health");
expect(serialized).toContain("pnpm --filter @compare/worker run-once");
```

- [ ] **Step 2: 运行测试确认工作流缺失**

Run: `pnpm exec vitest run tests/hourly-workflow.test.ts`

Expected: FAIL with `ENOENT` for `.github/workflows/hourly-collection.yml`。

- [ ] **Step 3: 实现每小时与手动工作流**

工作流固定包含：

```yaml
name: Hourly collection

on:
  schedule:
    - cron: "0 * * * *"
  workflow_dispatch:

concurrency:
  group: hourly-collection
  cancel-in-progress: false

jobs:
  collect:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    env:
      DATABASE_URL: ${{ secrets.DATABASE_URL }}
      VALIDATOR_SHARED_TOKEN: ${{ secrets.VALIDATOR_SHARED_TOKEN }}
      VALIDATOR_BASE_URL: http://127.0.0.1:3001
      CANDIDATE_LIMIT: "50"
      LISTING_LIMIT: "50"
      WORKER_CONCURRENCY: "4"
      WORKER_DEADLINE_MS: "1500000"
```

步骤使用 `actions/checkout@v4`、`pnpm/action-setup@v4`、`actions/setup-node@v4`；执行 frozen install、`pnpm --filter @compare/worker... build`、Validator build、`pnpm db:migrate`、`pnpm db:seed`。后台启动 Validator 后最多轮询 `/health` 30 秒，设置 `trap` 在退出时终止 Validator，最后运行 `pnpm --filter @compare/worker run-once`。

- [ ] **Step 4: 验证 YAML 和静态安全契约**

Run: `pnpm exec vitest run tests/hourly-workflow.test.ts tests/workspace.test.ts`

Expected: PASS；工作流中不存在真实连接串、密码或令牌。

- [ ] **Step 5: 提交工作流**

```bash
git add .github/workflows/hourly-collection.yml tests/hourly-workflow.test.ts package.json pnpm-lock.yaml
git commit -m "ci: run bounded collection every hour"
```

### Task 4: 添加 Vercel 单体仓库配置

**Files:**
- Create: `apps/web/vercel.json`
- Create: `tests/vercel-config.test.ts`
- Modify: `README.md`

- [ ] **Step 1: 写入会失败的结构化配置测试**

测试使用 `JSON.parse` 读取 `apps/web/vercel.json`，断言：

```ts
expect(config.framework).toBe("nextjs");
expect(config.installCommand).toContain("pnpm install --frozen-lockfile");
expect(config.buildCommand).toBe("cd ../.. && pnpm --filter @compare/web... build");
```

README 测试或 workspace 测试同时断言部署文档只列变量名，不包含真实 Secret。

- [ ] **Step 2: 运行测试确认配置缺失**

Run: `pnpm exec vitest run tests/vercel-config.test.ts`

Expected: FAIL with `ENOENT` for `apps/web/vercel.json`。

- [ ] **Step 3: 添加 Vercel 配置和部署说明**

`apps/web/vercel.json`：

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "nextjs",
  "installCommand": "cd ../.. && corepack enable && pnpm install --frozen-lockfile",
  "buildCommand": "cd ../.. && pnpm --filter @compare/web... build"
}
```

README 说明 Vercel Root Directory 设为 `apps/web`，启用包含 Root Directory 外部源文件，并列出 Vercel/GitHub Actions 的环境变量名、每小时调度可能延迟、手动触发方式和首次登录后改密要求。

- [ ] **Step 4: 验证 Web 生产构建**

Run: `pnpm exec vitest run tests/vercel-config.test.ts tests/workspace.test.ts`

Run: `pnpm --filter @compare/web... build`

Expected: PASS，Next.js 生产构建 exit `0`。

- [ ] **Step 5: 提交 Vercel 配置和文档**

```bash
git add apps/web/vercel.json tests/vercel-config.test.ts README.md
git commit -m "docs: configure Vercel monorepo deployment"
```

### Task 5: 完整验证并推送 GitHub main

**Files:**
- Delete: `docs/superpowers/plans/2026-07-12-northflank-free-deployment.md`（若仍为未跟踪旧草案，则直接移除，不提交）
- Verify: repository-wide

- [ ] **Step 1: 确认仓库不跟踪 Secret 与生成文件**

Run: `git ls-files | rg "(^|/)(\.env($|\.)|node_modules|\.next|dist)(/|$)"`

Expected: 无 Secret、依赖或构建产物命中。

Run: `git status --short`

Expected: 仅允许 Next 自动生成的 `apps/web/next-env.d.ts` 差异；若它只在 `.next/types` 与 `.next/dev/types` 间切换，不纳入提交。

- [ ] **Step 2: 运行完整质量门禁**

Run: `pnpm lint`

Run: `pnpm typecheck`

Run: `pnpm test`

Run: `pnpm build`

Run: `node --input-type=module --eval "await import('./apps/worker/dist/index.js'); await import('./apps/worker/dist/run-once.js')"`

Expected: 全部 exit `0`，无测试失败或生产导入错误。

- [ ] **Step 3: 进行最终只读代码审查**

检查从 `e4d0c19` 到 HEAD 的提交和未提交差异，重点确认 Secret、工作流 shell、批次截止时间、失败隔离、Vercel monorepo 路径和数据库迁移顺序。所有 P0/P1 问题修复并复审后才能推送。

- [ ] **Step 4: 推送最终 HEAD 到 GitHub main**

Run: `git push origin HEAD:main`

Expected: 远端 `main` 指向当前已验证 HEAD；`.env` 不在远端树中。

### Task 6: 配置 Secrets 并执行首次部署

**Resources:**
- GitHub repository: `Jin-wen-jie/-`
- Supabase project: `ai-price-intelligence`
- Vercel project: `ai-price-intelligence`

- [ ] **Step 1: 配置 GitHub Actions Secrets**

在 GitHub 仓库 Settings -> Secrets and variables -> Actions 中保存 `DATABASE_URL` 与随机 `VALIDATOR_SHARED_TOKEN`。保存前后均不得读取或输出已有 Secret 值。

- [ ] **Step 2: 手动运行 Hourly collection**

在 Actions 页面执行 `workflow_dispatch`，确认迁移、种子、Validator health 与一次性 Worker 均成功。只报告汇总计数和 job URL，不报告 Secret 或候选 URL。

- [ ] **Step 3: 从 GitHub 导入 Vercel**

选择仓库 `Jin-wen-jie/-`，Root Directory 设置为 `apps/web`，启用包含根目录外源文件。配置 Production/Preview 环境变量：`DATABASE_URL`、随机 `SESSION_SECRET`、`ADMIN_INITIAL_USERNAME=owner`、随机 `ADMIN_INITIAL_PASSWORD`。

- [ ] **Step 4: 创建 Vercel Production 部署**

提交部署后等待 build 和 deployment 均为 Ready。若失败，读取构建日志定位根因；不得通过改用付费实例绕过构建问题。

### Task 7: 公网验收

**Resources:**
- Vercel production URL
- GitHub Actions run

- [ ] **Step 1: 验证公网 HTTP 与静态资源**

对 Production URL 执行 HTTPS 请求，确认首页/登录页为 `200` 或预期 `30x`；从 HTML 中抽取同源 JS/CSS 地址并确认无 `404`。

- [ ] **Step 2: 验证登录和数据库页面**

使用初始管理员账号登录，确认候选、商品、来源和设置页面可加载 Supabase 数据；随后在应用内修改初始密码。

- [ ] **Step 3: 验证计划任务和日志脱敏**

确认 GitHub Actions 显示 cron `0 * * * *`，最近一次手动运行成功；检查 Actions 与 Vercel 日志中没有数据库密码、管理员密码或共享令牌。

- [ ] **Step 4: 记录最终状态**

输出 Vercel HTTPS URL、GitHub `main` HEAD、最近 Actions run 状态、已验证页面和免费方案限制。只有这些证据齐全后才声明部署完成。
