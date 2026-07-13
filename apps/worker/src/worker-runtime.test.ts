import { describe, expect, it, vi } from "vitest";
import { PersistedEntityFailure } from "./job-handlers.js";
import { registerWorkers } from "./worker-runtime.js";
import { QUEUES } from "./queue.js";

describe("worker runtime", () => {
  it("registers all queues and routes entity jobs", async () => {
    const boss = { work: vi.fn().mockResolvedValue("worker-id") };
    const handlers = {
      validateCandidate: vi.fn().mockResolvedValue({ status: "validated" }),
      sweepCandidates: vi.fn().mockResolvedValue({ queued: 0 }),
      revalidateListing: vi.fn().mockResolvedValue({
        outcome: "succeeded",
        status: "ACTIVE",
      }),
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

    const retryFailure = new PersistedEntityFailure();
    handlers.validateCandidate.mockRejectedValueOnce(retryFailure);
    await expect(
      validateWorker([{ data: { candidateId: "candidate-retry" } }]),
    ).rejects.toBe(retryFailure);

    const secondRegistration = boss.work.mock.calls[1];
    expect(secondRegistration).toBeDefined();
    if (!secondRegistration) {
      throw new Error("listing worker was not registered");
    }
    const listingWorker = secondRegistration[1] as (
      jobs: Array<{ data: { listingId: string } }>,
    ) => Promise<unknown>;
    handlers.revalidateListing.mockResolvedValueOnce({
      outcome: "failed",
      status: "RECHECK",
    });
    await expect(
      listingWorker([{ data: { listingId: "listing-1" } }]),
    ).resolves.toEqual([{ outcome: "failed", status: "RECHECK" }]);
  });
});
