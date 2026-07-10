import { describe, expect, it } from "vitest";
import { eligibleForRanking } from "./view-models.js";

describe("eligibleForRanking", () => {
  it.each(["RECHECK", "INVALID", "OUT_OF_STOCK", "NEEDS_REVIEW"] as const)(
    "excludes %s listings",
    (status) => {
      expect(
        eligibleForRanking({
          status,
          approved: true,
          lastVerifiedAt: new Date(),
        }),
      ).toBe(false);
    },
  );
});
