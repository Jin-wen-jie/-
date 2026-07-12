import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  assertAdminMutation: vi.fn(),
  normalizeCandidate: vi.fn(),
}));

vi.mock("../../../../../lib/candidate-repository", () => ({
  normalizeCandidate: mocks.normalizeCandidate,
}));

vi.mock("../../../../../lib/server-auth", () => ({
  assertAdminMutation: mocks.assertAdminMutation,
}));

import { POST } from "./route.js";

describe("candidate normalize API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.assertAdminMutation.mockResolvedValue({ ok: true });
  });

  it("returns 409 when the candidate status cannot be normalized", async () => {
    mocks.normalizeCandidate.mockResolvedValue({
      ok: false,
      reason: "INVALID_STATUS",
    });
    const request = new Request(
      "http://localhost/api/candidates/candidate-1/normalize",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ specId: "spec-1" }),
      },
    );

    const response = await POST(request, {
      params: Promise.resolve({ id: "candidate-1" }),
    });

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: "当前状态不允许修改规格",
    });
    expect(mocks.normalizeCandidate).toHaveBeenCalledWith(
      "candidate-1",
      "spec-1",
    );
  });
});
