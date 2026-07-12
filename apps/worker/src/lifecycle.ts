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

export function transitionListing(
  current: ListingState,
  failure: { kind: CheckFailureKind },
): TransitionResult {
  const consecutiveFailures = current.consecutiveFailures + 1;

  if (
    failure.kind === "HTTP_404" ||
    failure.kind === "HTTP_410" ||
    failure.kind === "SOFT_404" ||
    failure.kind === "LOGIN_WALL" ||
    failure.kind === "CAPTCHA"
  ) {
    return { status: "INVALID", ranked: false, consecutiveFailures };
  }

  if (
    failure.kind === "HTTP_401" ||
    failure.kind === "HTTP_403" ||
    failure.kind === "ROBOTS_DENIED"
  ) {
    return { status: "RECHECK", ranked: false, consecutiveFailures };
  }

  const lastSuccessAge = current.lastSuccessAgeHours ?? 0;
  if (consecutiveFailures >= 3 || lastSuccessAge > 24) {
    return { status: "RECHECK", ranked: false, consecutiveFailures };
  }

  return { status: "ACTIVE", ranked: true, consecutiveFailures };
}
