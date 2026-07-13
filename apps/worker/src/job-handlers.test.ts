import { describe, expect, it, vi } from "vitest";
import {
  createJobHandlers,
  type WorkerRepository,
} from "./job-handlers.js";
import { QUEUES } from "./queue.js";
import {
  ValidatorClientError,
  ValidatorInfrastructureError,
  type ValidatorResponse,
} from "./validator-client.js";

const validationResult = {
  originalUrl: "https://shop.example/item/1",
  finalUrl: "https://shop.example/item/1",
  redirectChain: [],
  httpStatus: 200,
  elapsedMs: 25,
  extraction: {
    title: "GPT K12",
    price: "10.00",
    currency: "CNY",
    availability: "IN_STOCK",
    stockText: "有货",
    stockQuantity: 5,
    buyAction: true,
    pageFingerprint: "page-hash",
    platformLinks: [],
    confidence: { title: 1, price: 1, availability: 1 },
  },
} satisfies ValidatorResponse;
const candidateClaimedAt = new Date("2026-07-13T00:00:00.000Z");

function createRepository(): WorkerRepository {
  return {
    listCandidateIdsForValidation: vi.fn().mockResolvedValue([]),
    claimCandidateForValidation: vi.fn().mockResolvedValue({
      id: "candidate-1",
      productUrl: "https://shop.example/item/1",
      claimedAt: candidateClaimedAt,
    }),
    saveCandidateValidation: vi.fn().mockResolvedValue({
      saved: true,
      discoveredIds: [],
    }),
    saveCandidateFailure: vi.fn().mockResolvedValue(true),
    listListingIdsForRevalidation: vi.fn().mockResolvedValue([]),
    getListingForRevalidation: vi.fn().mockResolvedValue(null),
    saveListingRevalidation: vi.fn().mockResolvedValue(undefined),
  };
}

describe("worker job handlers", () => {
  it("validates a candidate and persists the observation", async () => {
    const repository = createRepository();
    const validate = vi.fn().mockResolvedValue(validationResult);
    const handlers = createJobHandlers({
      repository,
      validate,
      enqueue: vi.fn(),
    });

    await expect(
      handlers.validateCandidate({ candidateId: "candidate-1" }),
    ).resolves.toEqual({ status: "validated" });
    expect(repository.claimCandidateForValidation).toHaveBeenCalledWith(
      "candidate-1",
    );
    expect(validate).toHaveBeenCalledWith("https://shop.example/item/1");
    expect(repository.saveCandidateValidation).toHaveBeenCalledWith(
      "candidate-1",
      validationResult,
      candidateClaimedAt,
    );
  });

  it("records candidate failures before letting pg-boss retry", async () => {
    const repository = createRepository();
    const failure = new ValidatorClientError("TIMEOUT", "TIMEOUT");
    const handlers = createJobHandlers({
      repository,
      validate: vi.fn().mockRejectedValue(failure),
      enqueue: vi.fn(),
    });

    await expect(
      handlers.validateCandidate({ candidateId: "candidate-1" }),
    ).rejects.toMatchObject({
      name: "PersistedEntityFailure",
      message: "CANDIDATE_VALIDATION_FAILED",
    });
    expect(repository.saveCandidateFailure).toHaveBeenCalledWith(
      "candidate-1",
      failure,
      candidateClaimedAt,
    );
  });

  it.each([
    new ValidatorInfrastructureError("VALIDATOR_AUTH_FAILED"),
    new Error("unknown validator failure"),
  ])("does not persist candidate infrastructure failures", async (failure) => {
    const repository = createRepository();
    const handlers = createJobHandlers({
      repository,
      validate: vi.fn().mockRejectedValue(failure),
      enqueue: vi.fn(),
    });

    await expect(
      handlers.validateCandidate({ candidateId: "candidate-1" }),
    ).rejects.toBe(failure);
    expect(repository.saveCandidateFailure).not.toHaveBeenCalled();
  });

  it("propagates candidate observation persistence failures as fatal", async () => {
    const repository = createRepository();
    const failure = new Error("database write failed");
    vi.mocked(repository.saveCandidateValidation).mockRejectedValue(failure);
    const handlers = createJobHandlers({
      repository,
      validate: vi.fn().mockResolvedValue(validationResult),
      enqueue: vi.fn(),
    });

    await expect(
      handlers.validateCandidate({ candidateId: "candidate-1" }),
    ).rejects.toBe(failure);
    expect(repository.saveCandidateFailure).not.toHaveBeenCalled();
  });

  it("propagates candidate claim failures as fatal", async () => {
    const repository = createRepository();
    const failure = new Error("candidate claim failed");
    vi.mocked(repository.claimCandidateForValidation).mockRejectedValue(failure);
    const handlers = createJobHandlers({
      repository,
      validate: vi.fn().mockResolvedValue(validationResult),
      enqueue: vi.fn(),
    });

    await expect(
      handlers.validateCandidate({ candidateId: "candidate-1" }),
    ).rejects.toBe(failure);
    expect(repository.saveCandidateFailure).not.toHaveBeenCalled();
  });

  it("lets only the atomic claim winner validate a candidate", async () => {
    const repository = createRepository();
    vi.mocked(repository.claimCandidateForValidation)
      .mockResolvedValueOnce({
        id: "candidate-1",
        productUrl: "https://shop.example/item/1",
        claimedAt: candidateClaimedAt,
      })
      .mockResolvedValueOnce(null);
    const validate = vi.fn().mockResolvedValue(validationResult);
    const handlers = createJobHandlers({
      repository,
      validate,
      enqueue: vi.fn(),
    });

    await expect(
      Promise.all([
        handlers.validateCandidate({ candidateId: "candidate-1" }),
        handlers.validateCandidate({ candidateId: "candidate-1" }),
      ]),
    ).resolves.toEqual([
      { status: "validated" },
      { status: "missing" },
    ]);
    expect(validate).toHaveBeenCalledOnce();
    expect(repository.saveCandidateValidation).toHaveBeenCalledOnce();
  });

  it("recovers a candidate after an interrupted validation lease expires", async () => {
    const leasedAt = new Date("2026-07-13T00:00:00.000Z");
    let now = new Date("2026-07-13T00:04:59.999Z");
    const repository = createRepository();
    vi.mocked(repository.claimCandidateForValidation).mockImplementation(
      async () => {
        if (now.getTime() - leasedAt.getTime() <= 300_000) return null;
        return {
          id: "candidate-1",
          productUrl: "https://shop.example/item/1",
          claimedAt: now,
        };
      },
    );
    const validate = vi.fn().mockResolvedValue(validationResult);
    const handlers = createJobHandlers({
      repository,
      validate,
      enqueue: vi.fn(),
    });

    await expect(
      handlers.validateCandidate({ candidateId: "candidate-1" }),
    ).resolves.toEqual({ status: "missing" });
    expect(validate).not.toHaveBeenCalled();

    now = new Date("2026-07-13T00:05:00.001Z");
    await expect(
      handlers.validateCandidate({ candidateId: "candidate-1" }),
    ).resolves.toEqual({ status: "validated" });
    expect(validate).toHaveBeenCalledOnce();
  });

  it("lets the renewed lease win when an expired owner finishes later", async () => {
    const oldClaimedAt = new Date("2026-07-13T00:00:00.000Z");
    const newClaimedAt = new Date("2026-07-13T00:06:00.000Z");
    let currentLease = oldClaimedAt;
    let notifyOldStarted!: () => void;
    let releaseOld!: () => void;
    const oldStarted = new Promise<void>((resolve) => {
      notifyOldStarted = resolve;
    });
    const oldRelease = new Promise<void>((resolve) => {
      releaseOld = resolve;
    });
    const repository = createRepository();
    vi.mocked(repository.claimCandidateForValidation)
      .mockResolvedValueOnce({
        id: "candidate-1",
        productUrl: "https://shop.example/item/1",
        claimedAt: oldClaimedAt,
      })
      .mockResolvedValueOnce({
        id: "candidate-1",
        productUrl: "https://shop.example/item/1",
        claimedAt: newClaimedAt,
      });
    const savedLeases: Date[] = [];
    vi.mocked(repository.saveCandidateValidation).mockImplementation(
      async (_id, _result, claimedAt) => {
        if (claimedAt.getTime() !== currentLease.getTime()) {
          return { saved: false, discoveredIds: [] };
        }
        savedLeases.push(claimedAt);
        return { saved: true, discoveredIds: [] };
      },
    );
    const oldHandlers = createJobHandlers({
      repository,
      validate: vi.fn(async () => {
        notifyOldStarted();
        await oldRelease;
        return validationResult;
      }),
      enqueue: vi.fn(),
    });
    const newHandlers = createJobHandlers({
      repository,
      validate: vi.fn().mockResolvedValue(validationResult),
      enqueue: vi.fn(),
    });

    const oldRun = oldHandlers.validateCandidate({ candidateId: "candidate-1" });
    await oldStarted;
    currentLease = newClaimedAt;
    await expect(
      newHandlers.validateCandidate({ candidateId: "candidate-1" }),
    ).resolves.toEqual({ status: "validated" });
    releaseOld();

    await expect(oldRun).resolves.toEqual({ status: "missing" });
    expect(savedLeases).toEqual([newClaimedAt]);
  });

  it("stops candidate failure side effects after losing the lease", async () => {
    const repository = createRepository();
    const claimedAt = new Date("2026-07-13T00:00:00.000Z");
    vi.mocked(repository.claimCandidateForValidation).mockResolvedValue({
      id: "candidate-1",
      productUrl: "https://shop.example/item/1",
      claimedAt,
    });
    vi.mocked(repository.saveCandidateFailure).mockResolvedValue(false);
    const handlers = createJobHandlers({
      repository,
      validate: vi.fn().mockRejectedValue(
        new ValidatorClientError("TIMEOUT", "TIMEOUT"),
      ),
      enqueue: vi.fn(),
    });

    await expect(
      handlers.validateCandidate({ candidateId: "candidate-1" }),
    ).resolves.toEqual({ status: "missing" });
    expect(repository.saveCandidateFailure).toHaveBeenCalledWith(
      "candidate-1",
      expect.any(ValidatorClientError),
      claimedAt,
    );
  });

  it("propagates atomic candidate discovery and enqueue failures as fatal", async () => {
    const discoveryFailure = new Error("candidate discovery write failed");
    const repository = createRepository();
    vi.mocked(repository.saveCandidateValidation).mockRejectedValue(
      discoveryFailure,
    );
    const enqueue = vi.fn();
    const handlers = createJobHandlers({
      repository,
      validate: vi.fn().mockResolvedValue({
        ...validationResult,
        extraction: {
          ...validationResult.extraction,
          platformLinks: ["https://shop.example/item/new"],
        },
      }),
      enqueue,
    });

    await expect(
      handlers.validateCandidate({ candidateId: "candidate-1" }),
    ).rejects.toBe(discoveryFailure);
    expect(repository.saveCandidateFailure).not.toHaveBeenCalled();
    expect(enqueue).not.toHaveBeenCalled();

    vi.mocked(repository.saveCandidateValidation).mockResolvedValue({
      saved: true,
      discoveredIds: ["candidate-new"],
    });
    const enqueueFailure = new Error("in-memory enqueue failed");
    const enqueueHandlers = createJobHandlers({
      repository,
      validate: vi.fn().mockResolvedValue({
        ...validationResult,
        extraction: {
          ...validationResult.extraction,
          platformLinks: ["https://shop.example/item/new"],
        },
      }),
      enqueue: vi.fn().mockRejectedValue(enqueueFailure),
    });

    await expect(
      enqueueHandlers.validateCandidate({ candidateId: "candidate-1" }),
    ).rejects.toBe(enqueueFailure);
    expect(repository.saveCandidateFailure).not.toHaveBeenCalled();
  });

  it("enqueues only ids returned by the atomic candidate save", async () => {
    const repository = createRepository();
    vi.mocked(repository.saveCandidateValidation).mockResolvedValue({
      saved: true,
      discoveredIds: ["candidate-new-1", "candidate-new-2"],
    });
    const enqueue = vi.fn().mockResolvedValue(undefined);
    const handlers = createJobHandlers({
      repository,
      validate: vi.fn().mockResolvedValue({
        ...validationResult,
        extraction: {
          ...validationResult.extraction,
          platformLinks: ["https://pay.ldxp.cn/item/source"],
        },
      }),
      enqueue,
    });

    await expect(
      handlers.validateCandidate({ candidateId: "candidate-1" }),
    ).resolves.toEqual({ status: "validated" });
    expect(enqueue).toHaveBeenNthCalledWith(
      1,
      QUEUES.VALIDATE_CANDIDATE,
      "candidate-new-1",
    );
    expect(enqueue).toHaveBeenNthCalledWith(
      2,
      QUEUES.VALIDATE_CANDIDATE,
      "candidate-new-2",
    );
  });

  it("does not discover or enqueue after losing the candidate lease", async () => {
    const repository = createRepository();
    vi.mocked(repository.saveCandidateValidation).mockResolvedValue({
      saved: false,
      discoveredIds: [],
    });
    const enqueue = vi.fn();
    const handlers = createJobHandlers({
      repository,
      validate: vi.fn().mockResolvedValue({
        ...validationResult,
        extraction: {
          ...validationResult.extraction,
          platformLinks: ["https://pay.ldxp.cn/item/stale"],
        },
      }),
      enqueue,
    });

    await expect(
      handlers.validateCandidate({ candidateId: "candidate-1" }),
    ).resolves.toEqual({ status: "missing" });
    expect(enqueue).not.toHaveBeenCalled();
  });

  it("propagates candidate failure persistence errors as fatal", async () => {
    const repository = createRepository();
    const validatorFailure = new ValidatorClientError("TIMEOUT", "TIMEOUT");
    const persistenceFailure = new Error("candidate failure write failed");
    vi.mocked(repository.saveCandidateFailure).mockRejectedValue(
      persistenceFailure,
    );
    const handlers = createJobHandlers({
      repository,
      validate: vi.fn().mockRejectedValue(validatorFailure),
      enqueue: vi.fn(),
    });

    await expect(
      handlers.validateCandidate({ candidateId: "candidate-1" }),
    ).rejects.toBe(persistenceFailure);
  });

  it("returns a failed outcome after persisting a listing timeout", async () => {
    const repository = createRepository();
    vi.mocked(repository.getListingForRevalidation).mockResolvedValue({
      id: "listing-1",
      originalUrl: "https://shop.example/item/1",
      status: "ACTIVE",
      consecutiveFailures: 0,
      lastSuccessAt: new Date("2026-07-12T00:00:00.000Z"),
    });
    const handlers = createJobHandlers({
      repository,
      validate: vi.fn().mockRejectedValue(
        new ValidatorClientError("TIMEOUT", "TIMEOUT"),
      ),
      enqueue: vi.fn(),
      now: () => new Date("2026-07-12T01:00:00.000Z"),
    });

    await expect(
      handlers.revalidateListing({ listingId: "listing-1" }),
    ).resolves.toMatchObject({ outcome: "failed" });
    expect(repository.saveListingRevalidation).toHaveBeenCalledWith(
      "listing-1",
      expect.objectContaining({ failureKind: "TIMEOUT" }),
    );
  });

  it.each([
    new ValidatorInfrastructureError("VALIDATOR_UNAVAILABLE"),
    new Error("unknown validator failure"),
  ])("does not persist listing infrastructure failures", async (failure) => {
    const repository = createRepository();
    vi.mocked(repository.getListingForRevalidation).mockResolvedValue({
      id: "listing-1",
      originalUrl: "https://shop.example/item/1",
      status: "ACTIVE",
      consecutiveFailures: 0,
      lastSuccessAt: null,
    });
    const handlers = createJobHandlers({
      repository,
      validate: vi.fn().mockRejectedValue(failure),
      enqueue: vi.fn(),
    });

    await expect(
      handlers.revalidateListing({ listingId: "listing-1" }),
    ).rejects.toBe(failure);
    expect(repository.saveListingRevalidation).not.toHaveBeenCalled();
  });

  it("returns a succeeded outcome after persisting a listing observation", async () => {
    const repository = createRepository();
    vi.mocked(repository.getListingForRevalidation).mockResolvedValue({
      id: "listing-1",
      originalUrl: "https://shop.example/item/1",
      status: "RECHECK",
      consecutiveFailures: 2,
      lastSuccessAt: null,
    });
    const handlers = createJobHandlers({
      repository,
      validate: vi.fn().mockResolvedValue(validationResult),
      enqueue: vi.fn(),
    });

    await expect(
      handlers.revalidateListing({ listingId: "listing-1" }),
    ).resolves.toEqual({ outcome: "succeeded", status: "ACTIVE" });
    expect(repository.saveListingRevalidation).toHaveBeenCalledWith(
      "listing-1",
      expect.objectContaining({
        status: "ACTIVE",
        consecutiveFailures: 0,
        observation: validationResult,
      }),
    );
  });

  it("propagates listing persistence failures as fatal", async () => {
    const repository = createRepository();
    const failure = new Error("listing persistence failed");
    vi.mocked(repository.getListingForRevalidation).mockResolvedValue({
      id: "listing-1",
      originalUrl: "https://shop.example/item/1",
      status: "ACTIVE",
      consecutiveFailures: 0,
      lastSuccessAt: null,
    });
    vi.mocked(repository.saveListingRevalidation).mockRejectedValue(failure);
    const handlers = createJobHandlers({
      repository,
      validate: vi.fn().mockRejectedValue(
        new ValidatorClientError("TIMEOUT", "TIMEOUT"),
      ),
      enqueue: vi.fn(),
    });

    await expect(
      handlers.revalidateListing({ listingId: "listing-1" }),
    ).rejects.toBe(failure);
  });

  it("sweeps pending candidates into singleton entity jobs", async () => {
    const repository = createRepository();
    vi.mocked(repository.listCandidateIdsForValidation).mockResolvedValue([
      "candidate-1",
      "candidate-2",
    ]);
    const enqueue = vi.fn().mockResolvedValue("job-id");
    const handlers = createJobHandlers({
      repository,
      validate: vi.fn(),
      enqueue,
    });

    await expect(handlers.sweepCandidates()).resolves.toEqual({ queued: 2 });
    expect(enqueue).toHaveBeenNthCalledWith(
      1,
      QUEUES.VALIDATE_CANDIDATE,
      "candidate-1",
    );
    expect(enqueue).toHaveBeenNthCalledWith(
      2,
      QUEUES.VALIDATE_CANDIDATE,
      "candidate-2",
    );
  });
});
