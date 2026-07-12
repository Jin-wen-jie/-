import { timingSafeEqual } from "node:crypto";
import { hashToken } from "./auth";

export function assertCsrfRequest(input: {
  csrfToken: string | null;
  csrfTokenHash: string | null;
  origin: string | null;
  expectedOrigin: string;
}): void {
  if (input.origin !== input.expectedOrigin) {
    throw new Error("ORIGIN_MISMATCH");
  }
  if (!input.csrfToken || !input.csrfTokenHash) {
    throw new Error("CSRF_MISMATCH");
  }

  const actual = Buffer.from(hashToken(input.csrfToken), "utf8");
  const expected = Buffer.from(input.csrfTokenHash, "utf8");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    throw new Error("CSRF_MISMATCH");
  }
}
