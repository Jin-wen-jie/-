import { describe, expect, it } from "vitest";

// ── Lifecycle types ──

export interface ListingState {
  status: "ACTIVE" | "OUT_OF_STOCK" | "INVALID" | "RECHECK" | "NEEDS_REVIEW";
  consecutiveFailures: number;
  lastSuccessAgeHours?: number;
}

export type CheckFailureKind =
  | "HTTP_404"
  | "HTTP_410"
  | "SOFT_404"
  | "LOGIN_WALL"
  | "CAPTCHA"
  | "HTTP_401"
  | "HTTP_403"
  | "ROBOTS_DENIED"
  | "TIMEOUT"
  | "DNS_FAILURE"
  | "TLS_ERROR"
  | "HTTP_5XX";

export interface TransitionResult {
  status: ListingState["status"];
  ranked: boolean;
  consecutiveFailures: number;
}

// ── Lifecycle implementation ──

export function transitionListing(
  current: ListingState,
  failure: { kind: CheckFailureKind },
): TransitionResult {
  const newFailures = current.consecutiveFailures + 1;

  // Immediate removal: 404, 410, soft-404, login wall, captcha
  if (
    failure.kind === "HTTP_404" ||
    failure.kind === "HTTP_410" ||
    failure.kind === "SOFT_404" ||
    failure.kind === "LOGIN_WALL" ||
    failure.kind === "CAPTCHA"
  ) {
    return {
      status: "INVALID",
      ranked: false,
      consecutiveFailures: newFailures,
    };
  }

  // Auth/robots: move to RECHECK immediately
  if (
    failure.kind === "HTTP_401" ||
    failure.kind === "HTTP_403" ||
    failure.kind === "ROBOTS_DENIED"
  ) {
    return {
      status: "RECHECK",
      ranked: false,
      consecutiveFailures: newFailures,
    };
  }

  // Transient: keep ACTIVE until 3 consecutive or 24h
  const lastSuccessAge = current.lastSuccessAgeHours ?? 0;
  if (newFailures >= 3 || lastSuccessAge > 24) {
    return {
      status: "RECHECK",
      ranked: false,
      consecutiveFailures: newFailures,
    };
  }

  return {
    status: "ACTIVE",
    ranked: true,
    consecutiveFailures: newFailures,
  };
}

describe("listing lifecycle", () => {
  it("removes 404 pages immediately", () => {
    expect(
      transitionListing(
        { status: "ACTIVE", consecutiveFailures: 0 },
        { kind: "HTTP_404" },
      ),
    ).toMatchObject({ status: "INVALID", ranked: false });
  });

  it("keeps one transient failure until the 24 hour boundary", () => {
    expect(
      transitionListing(
        {
          status: "ACTIVE",
          consecutiveFailures: 0,
          lastSuccessAgeHours: 6,
        },
        { kind: "TIMEOUT" },
      ),
    ).toMatchObject({ status: "ACTIVE", consecutiveFailures: 1 });
  });
});
