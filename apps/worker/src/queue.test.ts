import { describe, expect, it, vi } from "vitest";
import {
  configureQueues,
  enqueueEntityJob,
  QUEUES,
} from "./queue.js";

function createBoss() {
  return {
    createQueue: vi.fn().mockResolvedValue(undefined),
    schedule: vi.fn().mockResolvedValue(undefined),
    send: vi.fn().mockResolvedValue("job-id"),
  };
}

describe("worker queue configuration", () => {
  it("creates and schedules every enabled queue", async () => {
    const boss = createBoss();

    await configureQueues(boss);

    expect(boss.createQueue).toHaveBeenCalledTimes(4);
    expect(boss.schedule).toHaveBeenCalledWith(
      QUEUES.DISCOVER_SOURCE,
      "*/30 * * * *",
      { kind: "sweep" },
    );
    expect(boss.schedule).toHaveBeenCalledWith(
      QUEUES.REVALIDATE_LISTING,
      "0 */6 * * *",
      { kind: "sweep" },
    );
  });

  it("uses an entity singleton key and exponential retries", async () => {
    const boss = createBoss();

    await expect(
      enqueueEntityJob(boss, QUEUES.VALIDATE_CANDIDATE, "candidate-1"),
    ).resolves.toBe("job-id");
    expect(boss.send).toHaveBeenCalledWith(
      QUEUES.VALIDATE_CANDIDATE,
      { candidateId: "candidate-1" },
      {
        singletonKey: "validate-candidate:candidate-1",
        retryLimit: 3,
        retryDelay: 30,
        retryBackoff: true,
      },
    );
  });
});
