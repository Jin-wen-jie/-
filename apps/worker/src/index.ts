import { PgBoss } from "pg-boss";
import { createJobHandlers } from "./job-handlers.js";
import {
  configureQueues,
  enqueueEntityJob,
  type QueueBoss,
} from "./queue.js";
import { validateUrl } from "./validator-client.js";
import { createWorkerRepository } from "./worker-repository.js";
import {
  registerWorkers,
  type RuntimeBoss,
} from "./worker-runtime.js";

export interface WorkerConfig {
  databaseUrl: string;
  validatorBaseUrl: string;
  validatorSharedToken: string;
}

export interface WorkerRuntime {
  stop: () => Promise<void>;
}

export async function startWorker(config: WorkerConfig): Promise<WorkerRuntime> {
  const boss = new PgBoss(config.databaseUrl);
  boss.on("error", (error) => {
    // eslint-disable-next-line no-console
    console.error("pg-boss error:", error.message);
  });

  await boss.start();
  await configureQueues(boss as unknown as QueueBoss);

  const repository = createWorkerRepository(config.databaseUrl);
  const handlers = createJobHandlers({
    repository,
    validate: (url) =>
      validateUrl(
        url,
        config.validatorBaseUrl,
        config.validatorSharedToken,
      ),
    enqueue: (queue, id) =>
      enqueueEntityJob(boss as unknown as QueueBoss, queue, id),
  });
  await registerWorkers(boss as unknown as RuntimeBoss, handlers);

  // eslint-disable-next-line no-console
  console.log("Worker ready: pg-boss queues and handlers registered");

  return {
    stop: () => boss.stop({ graceful: true, timeout: 30_000 }),
  };
}

const isMain = process.argv[1]?.includes("index");
if (isMain) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required");

  const runtime = await startWorker({
    databaseUrl,
    validatorBaseUrl:
      process.env.VALIDATOR_BASE_URL ?? "http://localhost:3001",
    validatorSharedToken:
      process.env.VALIDATOR_SHARED_TOKEN ?? "dev-token",
  });

  let stopping = false;
  const shutdown = async () => {
    if (stopping) return;
    stopping = true;
    // eslint-disable-next-line no-console
    console.log("Worker shutting down...");
    await runtime.stop();
  };
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}
