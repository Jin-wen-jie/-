import type { ComparisonKeyInput } from "./types.js";

export function buildComparisonKey(input: ComparisonKeyInput): string {
  const parts = [
    input.provider,
    input.productLine,
    input.plan,
    input.delivery,
    input.accessMode,
    input.ownership,
    input.region,
    input.qualification,
    input.validity,
    input.commitment,
    input.quota,
  ];
  return parts.join("|");
}
