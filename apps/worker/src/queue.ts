// Queue names
export const QUEUES = {
  DISCOVER_SOURCE: "discover-source",
  VALIDATE_CANDIDATE: "validate-candidate",
  REVALIDATE_LISTING: "revalidate-listing",
  REFRESH_FX: "refresh-fx",
} as const;

export interface QueueConfig {
  queueName: string;
  cron: string;
  enabled: boolean;
}

export const DEFAULT_SCHEDULE: QueueConfig[] = [
  {
    queueName: QUEUES.DISCOVER_SOURCE,
    cron: "*/30 * * * *",
    enabled: true,
  },
  {
    queueName: QUEUES.VALIDATE_CANDIDATE,
    cron: "*/5 * * * *",
    enabled: true,
  },
  {
    queueName: QUEUES.REVALIDATE_LISTING,
    cron: "0 */6 * * *",
    enabled: true,
  },
  {
    queueName: QUEUES.REFRESH_FX,
    cron: "0 0 * * *",
    enabled: true,
  },
];

export function getQueueConfig(): QueueConfig[] {
  return DEFAULT_SCHEDULE;
}

export interface QueueBoss {
  createQueue: (name: string) => Promise<unknown>;
  schedule: (
    name: string,
    cron: string,
    data?: object | null,
  ) => Promise<unknown>;
  send: (
    name: string,
    data?: object | null,
    options?: {
      singletonKey?: string;
      retryLimit?: number;
      retryDelay?: number;
      retryBackoff?: boolean;
    },
  ) => Promise<string | null>;
}

export async function configureQueues(boss: QueueBoss): Promise<void> {
  for (const queue of getQueueConfig().filter((item) => item.enabled)) {
    await boss.createQueue(queue.queueName);
    await boss.schedule(queue.queueName, queue.cron, { kind: "sweep" });
  }
}

type EntityQueue =
  | typeof QUEUES.VALIDATE_CANDIDATE
  | typeof QUEUES.REVALIDATE_LISTING;

export async function enqueueEntityJob(
  boss: QueueBoss,
  queue: EntityQueue,
  entityId: string,
): Promise<string | null> {
  const data = queue === QUEUES.VALIDATE_CANDIDATE
    ? { candidateId: entityId }
    : { listingId: entityId };
  return boss.send(queue, data, {
    singletonKey: `${queue}:${entityId}`,
    retryLimit: 3,
    retryDelay: 30,
    retryBackoff: true,
  });
}
