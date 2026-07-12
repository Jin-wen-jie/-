import { describe, expect, it } from "vitest";
import { transitionListing } from "./lifecycle.js";

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

  it("moves the third transient failure to recheck", () => {
    expect(
      transitionListing(
        {
          status: "ACTIVE",
          consecutiveFailures: 2,
          lastSuccessAgeHours: 6,
        },
        { kind: "DNS_FAILURE" },
      ),
    ).toMatchObject({
      status: "RECHECK",
      ranked: false,
      consecutiveFailures: 3,
    });
  });
});
