import { describe, expect, it } from "vitest";

// Define interfaces and pure functions for candidate workflow

export interface DiscoveryCandidate {
  id: string;
  productUrl: string;
  sourceType: "x" | "telegram" | "manual";
  discoveryEventId: string | null;
  status:
    | "DISCOVERED"
    | "VALIDATING"
    | "RETRY_WAIT"
    | "REVIEW_REQUIRED"
    | "APPROVED"
    | "REJECTED";
  comparisonKey: string | null;
}

export function createManualCandidate(params: {
  productUrl: string;
}): Omit<DiscoveryCandidate, "id"> {
  return {
    productUrl: params.productUrl,
    sourceType: "manual",
    discoveryEventId: null,
    status: "DISCOVERED",
    comparisonKey: null,
  };
}

export class SpecIncompleteError extends Error {
  constructor() {
    super("SPEC_INCOMPLETE");
    this.name = "SpecIncompleteError";
  }
}

export function approveCandidate(candidate: {
  id: string;
  comparisonKey: string | null;
}): { status: "APPROVED" } {
  if (!candidate.comparisonKey) {
    throw new SpecIncompleteError();
  }
  return { status: "APPROVED" };
}

describe("candidate workflow", () => {
  it("creates manual candidates without a fake discovery event", () => {
    const row = createManualCandidate({
      productUrl: "https://shop.example/p/1",
    });
    expect(row).toMatchObject({
      sourceType: "manual",
      discoveryEventId: null,
      status: "DISCOVERED",
    });
  });

  it("requires a complete normalized spec before approval", async () => {
    await expect(
      (async () =>
        approveCandidate({
          id: "candidate-1",
          comparisonKey: null,
        }))(),
    ).rejects.toThrow(SpecIncompleteError);
  });
});
