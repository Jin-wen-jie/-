import { describe, expect, it, vi } from "vitest";
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
  seedSpecs,
} from "./seed-specs.js";
import { productSpecs } from "./schema.js";

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

  it("inserts seeds atomically and ignores comparison-key conflicts", async () => {
    const onConflictDoNothing = vi.fn().mockResolvedValue(undefined);
    const values = vi.fn().mockReturnValue({ onConflictDoNothing });
    const insert = vi.fn().mockReturnValue({ values });
    const select = vi.fn(() => {
      throw new Error("seedSpecs must not query before inserting");
    });

    await seedSpecs({ insert, select } as never);

    expect(select).not.toHaveBeenCalled();
    expect(insert).toHaveBeenCalledTimes(INITIAL_SPECS.length);
    expect(values).toHaveBeenCalledTimes(INITIAL_SPECS.length);
    expect(onConflictDoNothing).toHaveBeenCalledTimes(INITIAL_SPECS.length);
    expect(onConflictDoNothing).toHaveBeenCalledWith({
      target: productSpecs.comparisonKey,
    });
  });
});
