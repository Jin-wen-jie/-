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
