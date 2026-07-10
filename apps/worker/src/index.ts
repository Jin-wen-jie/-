import { getQueueConfig } from "./queue.js";
import { revalidateListing, discoverSource } from "./jobs/revalidate.js";

export interface WorkerConfig {
  validatorBaseUrl: string;
  validatorSharedToken: string;
}

export async function startWorker(config: WorkerConfig): Promise<void> {
  console.log("Worker starting...");
  const queues = getQueueConfig();
  console.log(
    `Configured ${queues.length} queues:`,
    queues.map((q) => q.queueName).join(", "),
  );

  const ctx = {
    baseUrl: config.validatorBaseUrl,
    token: config.validatorSharedToken,
  };

  // In production: connect to pg-boss and register job handlers
  // For now: log startup
  console.log("Worker ready. Validator:", config.validatorBaseUrl);

  // Keep process alive
  process.on("SIGTERM", () => {
    console.log("Worker shutting down...");
    process.exit(0);
  });
}

// Run if main
const isMain = process.argv[1]?.includes("index");
if (isMain) {
  const config: WorkerConfig = {
    validatorBaseUrl: process.env.VALIDATOR_BASE_URL ?? "http://localhost:3001",
    validatorSharedToken: process.env.VALIDATOR_SHARED_TOKEN ?? "dev-token",
  };
  startWorker(config);
}
