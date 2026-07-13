import { describe, expect, it, vi } from "vitest";
import {
  createJobHandlers,
  type WorkerRepository,
} from "./job-handlers.js";
import { QUEUES } from "./queue.js";
import type { ValidatorResponse } from "./validator-client.js";

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

function createRepository(): WorkerRepository {
  return {
    listCandidateIdsForValidation: vi.fn().mockResolvedValue([]),
    getCandidateForValidation: vi.fn().mockResolvedValue({
      id: "candidate-1",
      productUrl: "https://shop.example/item/1",
    }),
    markCandidateValidating: vi.fn().mockResolvedValue(undefined),
    saveCandidateValidation: vi.fn().mockResolvedValue(undefined),
    saveCandidateFailure: vi.fn().mockResolvedValue(undefined),
    saveDiscoveredPlatformLinks: vi.fn().mockResolvedValue([]),
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
    expect(repository.markCandidateValidating).toHaveBeenCalledWith(
      "candidate-1",
    );
    expect(validate).toHaveBeenCalledWith("https://shop.example/item/1");
    expect(repository.saveCandidateValidation).toHaveBeenCalledWith(
      "candidate-1",
      validationResult,
    );
  });

  it("records candidate failures before letting pg-boss retry", async () => {
    const repository = createRepository();
    const failure = new Error("validator unavailable");
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
    );
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

  it.each(["get", "mark"] as const)(
    "propagates candidate repository %s failures as fatal",
    async (operation) => {
      const repository = createRepository();
      const failure = new Error(`candidate ${operation} failed`);
      if (operation === "get") {
        vi.mocked(repository.getCandidateForValidation).mockRejectedValue(
          failure,
        );
      } else {
        vi.mocked(repository.markCandidateValidating).mockRejectedValue(failure);
      }
      const handlers = createJobHandlers({
        repository,
        validate: vi.fn().mockResolvedValue(validationResult),
        enqueue: vi.fn(),
      });

      await expect(
        handlers.validateCandidate({ candidateId: "candidate-1" }),
      ).rejects.toBe(failure);
      expect(repository.saveCandidateFailure).not.toHaveBeenCalled();
    },
  );

  it("propagates candidate discovery and enqueue failures as fatal", async () => {
    const discoveryFailure = new Error("candidate discovery write failed");
    const repository = createRepository();
    vi.mocked(repository.saveDiscoveredPlatformLinks).mockRejectedValue(
      discoveryFailure,
    );
    const handlers = createJobHandlers({
      repository,
      validate: vi.fn().mockResolvedValue({
        ...validationResult,
        extraction: {
          ...validationResult.extraction,
          platformLinks: ["https://shop.example/item/new"],
        },
      }),
      enqueue: vi.fn(),
    });

    await expect(
      handlers.validateCandidate({ candidateId: "candidate-1" }),
    ).rejects.toBe(discoveryFailure);
    expect(repository.saveCandidateFailure).not.toHaveBeenCalled();

    vi.mocked(repository.saveDiscoveredPlatformLinks).mockResolvedValue([
      "candidate-new",
    ]);
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

  it("propagates candidate failure persistence errors as fatal", async () => {
    const repository = createRepository();
    const validatorFailure = new Error("validator timeout");
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
      validate: vi.fn().mockRejectedValue(new Error("validator timeout")),
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
      validate: vi.fn().mockRejectedValue(new Error("validator timeout")),
      enqueue: vi.fn(),
    });

    await expect(
      handlers.revalidateListing({ listingId: "listing-1" }),
    ).rejects.toBe(failure);
  });

  it("enqueues the exact candidate ids inserted from discovered links", async () => {
    const repository = createRepository();
    vi.mocked(repository.saveDiscoveredPlatformLinks).mockResolvedValue(
      ["candidate-new-1", "candidate-new-2"],
    );
    const enqueue = vi.fn().mockResolvedValue(undefined);
    const validate = vi.fn().mockResolvedValue({
      ...validationResult,
      extraction: {
        ...validationResult.extraction,
        platformLinks: [
          "https://shop.example/item/new-1",
          "https://shop.example/item/new-2",
        ],
      },
    });
    const handlers = createJobHandlers({ repository, validate, enqueue });

    await handlers.validateCandidate({ candidateId: "candidate-1" });

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
    expect(repository.listCandidateIdsForValidation).not.toHaveBeenCalled();
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
