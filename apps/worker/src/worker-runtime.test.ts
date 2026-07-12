import { describe, expect, it, vi } from "vitest";
import { registerWorkers } from "./worker-runtime.js";
import { QUEUES } from "./queue.js";

describe("worker runtime", () => {
  it("registers all queues and routes entity jobs", async () => {
    const boss = { work: vi.fn().mockResolvedValue("worker-id") };
    const handlers = {
      validateCandidate: vi.fn().mockResolvedValue({ status: "validated" }),
      sweepCandidates: vi.fn().mockResolvedValue({ queued: 0 }),
      revalidateListing: vi.fn().mockResolvedValue({ status: "ACTIVE" }),
      sweepListings: vi.fn().mockResolvedValue({ queued: 0 }),
    };

    await registerWorkers(boss, handlers);

    expect(boss.work).toHaveBeenCalledTimes(4);
    expect(boss.work.mock.calls.map((call) => call[0])).toEqual([
      QUEUES.VALIDATE_CANDIDATE,
      QUEUES.REVALIDATE_LISTING,
      QUEUES.DISCOVER_SOURCE,
      QUEUES.REFRESH_FX,
    ]);

    const firstRegistration = boss.work.mock.calls[0];
    expect(firstRegistration).toBeDefined();
    if (!firstRegistration) throw new Error("validate worker was not registered");
    const validateWorker = firstRegistration[1] as (
      jobs: Array<{ data: { candidateId: string } }>,
    ) => Promise<unknown>;
    await validateWorker([{ data: { candidateId: "candidate-1" } }]);
    expect(handlers.validateCandidate).toHaveBeenCalledWith({
      candidateId: "candidate-1",
    });
  });
});
