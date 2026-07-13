import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildComparisonKey, type ComparisonKeyInput } from "@compare/domain";
import { productSpecs } from "@compare/db";

const routeSource = readFileSync(
  fileURLToPath(new URL("./route.ts", import.meta.url)),
  "utf8",
);

const mocks = vi.hoisted(() => ({
  assertAdminMutation: vi.fn(),
  authorizeAdminRequest: vi.fn(),
  getDatabase: vi.fn(),
}));

vi.mock("../../../lib/database", () => ({
  getDatabase: mocks.getDatabase,
}));

vi.mock("../../../lib/server-auth", () => ({
  assertAdminMutation: mocks.assertAdminMutation,
  authorizeAdminRequest: mocks.authorizeAdminRequest,
}));

import { GET, POST } from "./route.js";

const validSpec: ComparisonKeyInput = {
  provider: "OpenAI",
  productLine: "ChatGPT",
  plan: "Team",
  delivery: "ACCOUNT",
  accessMode: "SHARED",
  ownership: "RETAINED",
  region: "global",
  qualification: "K12",
  validity: "1year",
  commitment: "monthly",
  quota: "100 USD",
};

function postRequest(spec: object = validSpec): Request {
  return new Request("http://localhost/api/specs", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(spec),
  });
}

function createPostDatabase(returnedRows: Array<{ id: string }>) {
  const limit = vi.fn().mockResolvedValue([]);
  const where = vi.fn().mockReturnValue({ limit });
  const from = vi.fn().mockReturnValue({ where });
  const select = vi.fn().mockReturnValue({ from });
  const returning = vi.fn().mockResolvedValue(returnedRows);
  const onConflictDoNothing = vi.fn().mockReturnValue({ returning });
  const values = vi.fn().mockReturnValue({ onConflictDoNothing });
  const insert = vi.fn().mockReturnValue({ values });

  return {
    db: { insert, select },
    insert,
    onConflictDoNothing,
    returning,
    select,
  };
}

describe("specs API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.assertAdminMutation.mockResolvedValue({ ok: true });
    mocks.authorizeAdminRequest.mockResolvedValue({ ok: true });
  });

  it("imports the comparison-key authority directly from the domain package", () => {
    expect(routeSource).toContain(
      'import { buildComparisonKey } from "@compare/domain";',
    );
    expect(routeSource).toContain('import { productSpecs } from "@compare/db";');
  });

  it("includes quota in the GET projection", async () => {
    const from = vi.fn().mockResolvedValue([]);
    const select = vi.fn().mockReturnValue({ from });
    mocks.getDatabase.mockReturnValue({ select });

    const response = await GET();

    expect(response.status).toBe(200);
    expect(select).toHaveBeenCalledWith(
      expect.objectContaining({ quota: productSpecs.quota }),
    );
  });

  it("creates a trimmed spec with the domain key without a duplicate precheck", async () => {
    const database = createPostDatabase([{ id: "spec-1" }]);
    mocks.getDatabase.mockReturnValue(database.db);
    const padded = Object.fromEntries(
      Object.entries(validSpec).map(([key, value]) => [key, ` ${value} `]),
    );

    const response = await POST(postRequest(padded));

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      id: "spec-1",
      ...validSpec,
      comparisonKey: buildComparisonKey(validSpec),
    });
    expect(database.select).not.toHaveBeenCalled();
    expect(database.onConflictDoNothing).toHaveBeenCalledWith({
      target: productSpecs.comparisonKey,
    });
    expect(database.returning).toHaveBeenCalled();
  });

  it("returns 409 when the unique insert loses a race", async () => {
    const database = createPostDatabase([]);
    mocks.getDatabase.mockReturnValue(database.db);

    const response = await POST(postRequest());

    expect(response.status).toBe(409);
    expect(database.select).not.toHaveBeenCalled();
    expect(database.insert).toHaveBeenCalledWith(productSpecs);
  });
});
