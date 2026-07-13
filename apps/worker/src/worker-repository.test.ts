import {
  createDb,
  discoveryCandidates,
  type Db,
} from "@compare/db";
import { describe, expect, it, vi } from "vitest";
import {
  createWorkerRepository,
  createWorkerRepositoryFromDb,
  mergeCandidateExtraction,
} from "./worker-repository.js";
import type { ValidatorResponse } from "./validator-client.js";
import { ValidatorClientError } from "./validator-client.js";

const CANDIDATE_VALIDATION_LEASE_MS = 5 * 60 * 1_000;
const repositoryValidationResult = {
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
    stockText: "in stock",
    stockQuantity: 5,
    buyAction: true,
    pageFingerprint: "page-hash",
    platformLinks: [],
    confidence: { title: 1, price: 1, availability: 1 },
  },
} satisfies ValidatorResponse;

vi.mock("@compare/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@compare/db")>();
  return { ...actual, createDb: vi.fn() };
});

describe("worker repository mappings", () => {
  it("claims candidates with one conditional update returning the winner", async () => {
    const returning = vi.fn().mockResolvedValue([{
      id: "candidate-1",
      productUrl: "https://shop.example/item/1",
      claimedAt: new Date("2026-07-13T00:10:00.000Z"),
    }]);
    const where = vi.fn().mockReturnValue({ returning });
    const set = vi.fn().mockReturnValue({ where });
    const update = vi.fn().mockReturnValue({ set });
    const select = vi.fn();
    const db = { update, select } as unknown as Db;
    const now = new Date("2026-07-13T00:10:00.000Z");
    const repository = createWorkerRepositoryFromDb(db, {
      now: () => now,
      candidateLeaseMs: CANDIDATE_VALIDATION_LEASE_MS,
    });

    await expect(
      repository.claimCandidateForValidation("candidate-1"),
    ).resolves.toEqual({
      id: "candidate-1",
      productUrl: "https://shop.example/item/1",
      claimedAt: new Date("2026-07-13T00:10:00.000Z"),
    });

    expect(update).toHaveBeenCalledOnce();
    expect(select).not.toHaveBeenCalled();
    expect(set).toHaveBeenCalledWith({ status: "VALIDATING", updatedAt: now });
    expect(returning).toHaveBeenCalledWith({
      id: discoveryCandidates.id,
      productUrl: discoveryCandidates.productUrl,
      claimedAt: discoveryCandidates.updatedAt,
    });
    expectSqlCondition(where.mock.calls[0]?.[0], {
      sql: expect.stringMatching(
        /"id" = \$1.*"status" in \(\$2, \$3\).*"status" = \$4.*"updated_at" < \$5/s,
      ),
      params: [
        "candidate-1",
        "DISCOVERED",
        "RETRY_WAIT",
        "VALIDATING",
        "2026-07-13T00:05:00.000Z",
      ],
    });
  });

  it.each(["success", "failure"] as const)(
    "rejects a stale candidate %s save with the lease fencing condition",
    async (outcome) => {
      const limit = vi.fn().mockResolvedValue([{ extractionResult: {} }]);
      const selectWhere = vi.fn().mockReturnValue({ limit });
      const from = vi.fn().mockReturnValue({ where: selectWhere });
      const select = vi.fn().mockReturnValue({ from });
      const returning = vi.fn().mockResolvedValue([]);
      const updateWhere = vi.fn().mockReturnValue({ returning });
      const set = vi.fn().mockReturnValue({ where: updateWhere });
      const update = vi.fn().mockReturnValue({ set });
      const values = vi.fn().mockResolvedValue(undefined);
      const insert = vi.fn().mockReturnValue({ values });
      const tx = { select, update, insert };
      const db = {
        transaction: vi.fn(async (operation: (transaction: typeof tx) => unknown) =>
          operation(tx)),
      } as unknown as Db;
      const repository = createWorkerRepositoryFromDb(db);
      const claimedAt = new Date("2026-07-13T00:00:00.000Z");

      const saved = outcome === "success"
        ? await repository.saveCandidateValidation(
          "candidate-1",
          repositoryValidationResult,
          claimedAt,
        )
        : await repository.saveCandidateFailure(
          "candidate-1",
          new ValidatorClientError("TIMEOUT", "TIMEOUT"),
          claimedAt,
        );

      expect(saved).toBe(false);
      expect(insert).not.toHaveBeenCalled();
      expect(returning).toHaveBeenCalledOnce();
      expectSqlCondition(updateWhere.mock.calls[0]?.[0], {
        sql: expect.stringMatching(
          /"id" = \$1.*"status" = \$2.*"updated_at" = \$3/s,
        ),
        params: [
          "candidate-1",
          "VALIDATING",
          "2026-07-13T00:00:00.000Z",
        ],
      });
    },
  );

  it("lists pending and expired validating candidates but excludes fresh leases", async () => {
    const limit = vi.fn().mockResolvedValue([
      { id: "candidate-pending" },
      { id: "candidate-expired" },
    ]);
    const orderBy = vi.fn().mockReturnValue({ limit });
    const where = vi.fn().mockReturnValue({ orderBy });
    const from = vi.fn().mockReturnValue({ where });
    const select = vi.fn().mockReturnValue({ from });
    const db = { select } as unknown as Db;
    const repository = createWorkerRepositoryFromDb(db, {
      now: () => new Date("2026-07-13T00:10:00.000Z"),
      candidateLeaseMs: CANDIDATE_VALIDATION_LEASE_MS,
    });

    await expect(repository.listCandidateIdsForValidation()).resolves.toEqual([
      "candidate-pending",
      "candidate-expired",
    ]);
    expectSqlCondition(where.mock.calls[0]?.[0], {
      sql: expect.stringMatching(
        /"status" in \(\$1, \$2\).*"status" = \$3.*"updated_at" < \$4/s,
      ),
      params: [
        "DISCOVERED",
        "RETRY_WAIT",
        "VALIDATING",
        "2026-07-13T00:05:00.000Z",
      ],
    });
  });

  it("awaits closing the underlying postgres client", async () => {
    let finishClosing!: () => void;
    const end = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finishClosing = resolve;
        }),
    );
    vi.mocked(createDb).mockReturnValue({ $client: { end } } as never);
    const repository = createWorkerRepository("postgres://worker-db");

    const closing = repository.close();
    let settled = false;
    void closing.then(() => {
      settled = true;
    });
    await Promise.resolve();

    expect(end).toHaveBeenCalledOnce();
    expect(settled).toBe(false);
    finishClosing();
    await closing;
    expect(settled).toBe(true);
  });

  it("returns only ids won by conflict-safe discovered-link inserts", async () => {
    const limit = vi.fn().mockResolvedValue([]);
    const where = vi.fn().mockReturnValue({ limit });
    const from = vi.fn().mockReturnValue({ where });
    const select = vi.fn().mockReturnValue({ from });
    const returning = vi.fn()
      .mockResolvedValueOnce([{ id: "candidate-winner" }])
      .mockResolvedValueOnce([]);
    const onConflictDoNothing = vi.fn().mockReturnValue({ returning });
    const values = vi.fn().mockReturnValue({ onConflictDoNothing });
    const db = {
      select,
      insert: vi.fn().mockReturnValue({ values }),
    } as unknown as Db;
    const repository = createWorkerRepositoryFromDb(db);

    const insertedIds = await repository.saveDiscoveredPlatformLinks([
      "https://shop.example/item/new-1",
      "https://shop.example/item/new-1",
    ]);

    expect(insertedIds).toEqual(["candidate-winner"]);
    expect(onConflictDoNothing).toHaveBeenCalledOnce();
    expect(onConflictDoNothing).toHaveBeenCalledWith({
      target: discoveryCandidates.urlFingerprint,
    });
    expect(returning).toHaveBeenCalledWith({ id: discoveryCandidates.id });
    expect(select).not.toHaveBeenCalled();
  });

  it("attempts at most 50 discovered-link inserts", async () => {
    const returning = vi.fn().mockResolvedValue([]);
    const onConflictDoNothing = vi.fn().mockReturnValue({ returning });
    const values = vi.fn().mockReturnValue({ onConflictDoNothing });
    const db = {
      insert: vi.fn().mockReturnValue({ values }),
    } as unknown as Db;
    const repository = createWorkerRepositoryFromDb(db);

    await repository.saveDiscoveredPlatformLinks(
      Array.from(
        { length: 60 },
        (_, index) => `https://pay.ldxp.cn/item/${index}`,
      ),
    );

    expect(values).toHaveBeenCalledTimes(50);
    expect(onConflictDoNothing).toHaveBeenCalledTimes(50);
  });

  it("skips discovered links longer than 2048 characters", async () => {
    const values = vi.fn();
    const db = {
      insert: vi.fn().mockReturnValue({ values }),
    } as unknown as Db;
    const repository = createWorkerRepositoryFromDb(db);

    await expect(repository.saveDiscoveredPlatformLinks([
      `https://pay.ldxp.cn/item/${"x".repeat(2_048)}`,
    ])).resolves.toEqual([]);

    expect(values).not.toHaveBeenCalled();
  });

  it("preserves manual investigation evidence when validation refreshes fields", () => {
    const validation = {
      extraction: {
        title: "K12 refreshed title",
        price: "12.00",
        currency: "CNY",
        availability: "OUT_OF_STOCK",
        stockText: "库存 0",
        stockQuantity: 0,
        buyAction: false,
        pageFingerprint: "new-page-hash",
        confidence: { title: 0.9, price: 0.8, availability: 1 },
      },
    } as ValidatorResponse;

    expect(
      mergeCandidateExtraction(
        {
          focus: "K12",
          note: "商铺公告明确写明 K12 已拉闸",
          sourceUrl: "https://shop.example/source",
          merchantName: "调查商铺",
        },
        validation,
        new Date("2026-07-12T00:00:00.000Z"),
      ),
    ).toMatchObject({
      focus: "K12",
      note: "商铺公告明确写明 K12 已拉闸",
      sourceUrl: "https://shop.example/source",
      merchantName: "调查商铺",
      pageTitle: "K12 refreshed title",
      price: "12.00",
      availability: "OUT_OF_STOCK",
      inventory: 0,
      observedAt: "2026-07-12T00:00:00.000Z",
    });
  });
});

function expectSqlCondition(
  condition: unknown,
  expected: { sql: unknown; params: unknown[] },
): void {
  const query = (condition as {
    toQuery: (config: unknown) => { sql: string; params: unknown[] };
  }).toQuery({
    casing: {
      getColumnCasing: (column: { name: string }) => column.name,
    },
    escapeName: (name: string) => `"${name}"`,
    escapeParam: (index: number) => `$${index + 1}`,
    escapeString: (value: string) => `'${value.replaceAll("'", "''")}'`,
  });
  expect(query).toEqual(expect.objectContaining(expected));
}
