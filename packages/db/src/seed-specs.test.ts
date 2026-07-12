import { describe, expect, it } from "vitest";
import {
  buildComparisonKey as buildDomainComparisonKey,
  type AccessMode,
  type ComparisonKeyInput,
  type Delivery,
  type Ownership,
} from "@compare/domain";
import {
  INITIAL_SPECS,
  buildComparisonKey,
} from "./seed-specs.js";

const DELIVERIES = new Set<Delivery>([
  "ACCOUNT",
  "TOPUP",
  "API_QUOTA",
  "INVITE_SEAT",
]);
const ACCESS_MODES = new Set<AccessMode>(["EXCLUSIVE", "SHARED"]);
const OWNERSHIPS = new Set<Ownership>([
  "TRANSFERRED",
  "RETAINED",
  "NOT_APPLICABLE",
]);

describe("spec seeds", () => {
  it("uses the domain comparison key helper", () => {
    for (const spec of INITIAL_SPECS) {
      expect(buildComparisonKey(spec)).toBe(
        buildDomainComparisonKey(spec as ComparisonKeyInput),
      );
    }
  });

  it("uses only domain enum values", () => {
    for (const spec of INITIAL_SPECS) {
      expect(DELIVERIES.has(spec.delivery as Delivery)).toBe(true);
      expect(ACCESS_MODES.has(spec.accessMode as AccessMode)).toBe(true);
      expect(OWNERSHIPS.has(spec.ownership as Ownership)).toBe(true);
    }
  });

  it("has a unique comparison key for every seed", () => {
    const keys = INITIAL_SPECS.map(buildComparisonKey);

    expect(new Set(keys).size).toBe(keys.length);
  });

  it("includes quota in the comparison key", () => {
    const spec = INITIAL_SPECS[0];
    expect(spec).toBeDefined();

    expect(
      buildComparisonKey({ ...spec!, quota: `${spec!.quota}-different` }),
    ).not.toBe(buildComparisonKey(spec!));
  });
});
