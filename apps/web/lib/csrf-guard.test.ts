import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { assertCsrfRequest, assertSameOriginRequest } from "./csrf-guard.js";

const token = "csrf-token";
const tokenHash = createHash("sha256").update(token).digest("hex");

describe("CSRF request guard", () => {
  it("allows an open-access mutation only from the same origin", () => {
    expect(() =>
      assertSameOriginRequest({
        origin: "https://admin.example",
        expectedOrigin: "https://admin.example",
      }),
    ).not.toThrow();
    expect(() =>
      assertSameOriginRequest({
        origin: "https://evil.example",
        expectedOrigin: "https://admin.example",
      }),
    ).toThrow("ORIGIN_MISMATCH");
  });

  it("accepts a matching token from the expected origin", () => {
    expect(() =>
      assertCsrfRequest({
        csrfToken: token,
        csrfTokenHash: tokenHash,
        origin: "https://admin.example",
        expectedOrigin: "https://admin.example",
      }),
    ).not.toThrow();
  });

  it("rejects a mismatched token or origin", () => {
    expect(() =>
      assertCsrfRequest({
        csrfToken: "wrong",
        csrfTokenHash: tokenHash,
        origin: "https://admin.example",
        expectedOrigin: "https://admin.example",
      }),
    ).toThrow("CSRF_MISMATCH");
    expect(() =>
      assertCsrfRequest({
        csrfToken: token,
        csrfTokenHash: tokenHash,
        origin: "https://evil.example",
        expectedOrigin: "https://admin.example",
      }),
    ).toThrow("ORIGIN_MISMATCH");
  });
});
