import { beforeEach, describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";

const mocks = vi.hoisted(() => ({
  getDatabase: vi.fn(),
}));

vi.mock("./database", () => ({
  getDatabase: mocks.getDatabase,
}));

import { normalizeCandidate } from "./candidate-repository.js";

function createDatabase({
  status,
}: {
  status: string;
}) {
  const limit = vi
    .fn()
    .mockResolvedValueOnce([{ id: "candidate-1", status }])
    .mockResolvedValueOnce([{ comparisonKey: "spec-key" }]);
  const selectQuery = {
    from: vi.fn(),
    where: vi.fn(),
    limit,
  };
  selectQuery.from.mockReturnValue(selectQuery);
  selectQuery.where.mockReturnValue(selectQuery);

  const returning = vi.fn().mockResolvedValue([{ id: "candidate-1" }]);
  const updateQuery = {
    set: vi.fn(),
    where: vi.fn(),
    returning,
  };
  updateQuery.set.mockReturnValue(updateQuery);
  updateQuery.where.mockImplementation((condition: { getSQL(): unknown }) => {
    const query = new PgDialect().sqlToQuery(condition.getSQL() as never);
    const requiredParams = [
      "candidate-1",
      "DISCOVERED",
      "REVIEW_REQUIRED",
    ];
    const guardsAgainstStatusRace = requiredParams.every((param) =>
      query.params.includes(param),
    );
    returning.mockResolvedValueOnce(
      guardsAgainstStatusRace ? [] : [{ id: "candidate-1" }],
    );
    return updateQuery;
  });

  const auditValues = vi.fn().mockResolvedValue(undefined);
  const tx = {
    select: vi.fn().mockReturnValue(selectQuery),
    update: vi.fn().mockReturnValue(updateQuery),
    insert: vi.fn().mockReturnValue({ values: auditValues }),
  };
  const transaction = vi.fn(
    async (callback: (transaction: typeof tx) => unknown) => callback(tx),
  );

  return {
    db: { transaction },
    auditValues,
    insert: tx.insert,
    returning,
    update: tx.update,
  };
}

describe("candidate repository normalization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each(["APPROVED", "REJECTED"])(
    "does not mutate or audit a %s candidate",
    async (status) => {
      const database = createDatabase({ status });
      mocks.getDatabase.mockReturnValue(database.db);

      await expect(
        normalizeCandidate("candidate-1", "spec-1"),
      ).resolves.toEqual({ ok: false, reason: "INVALID_STATUS" });
      expect(database.update).not.toHaveBeenCalled();
      expect(database.insert).not.toHaveBeenCalled();
      expect(database.auditValues).not.toHaveBeenCalled();
    },
  );

  it("does not audit when an allowed candidate changes status before update", async () => {
    const database = createDatabase({
      status: "REVIEW_REQUIRED",
    });
    mocks.getDatabase.mockReturnValue(database.db);

    await expect(
      normalizeCandidate("candidate-1", "spec-1"),
    ).resolves.toEqual({ ok: false, reason: "INVALID_STATUS" });
    expect(database.update).toHaveBeenCalled();
    expect(database.returning).toHaveBeenCalled();
    expect(database.insert).not.toHaveBeenCalled();
    expect(database.auditValues).not.toHaveBeenCalled();
  });
});
