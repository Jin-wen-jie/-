import type { SupplyInput, SupplyResult } from "./types.js";

/**
 * Supply ranking as specified in the design doc.
 *
 * Explicit inventory: score 80-100
 *   referenceStock = max(10, sampleCount >= 5 ? P95 : sampleMax)
 *   quantityScore = ln(1 + min(normalizedQty, referenceStock)) / ln(1 + referenceStock)
 *   score = 80 + 20 * quantityScore
 *
 * Inferred (text/button): score 20-79
 *   hasStockText = kind === TEXT_IN_STOCK ? 40 : 20 : 0
 *   freshness = 20 * 2^(-ageHours / 12)
 *   linkStability = 15 * (successfulChecks30d + 1) / (totalChecks30d + 2)
 *   productBreadth = 4 * min(1, ln(1 + siblingListings) / ln(21))
 *   score = hasStockText + freshness + linkStability + productBreadth
 *
 * Confidence for inferred:
 *   evidenceCap = explicit 1.00 / text 0.69 / button 0.49
 *   consistencyFactor = 0.7 + 0.3 * min(consecutiveSameChecks / 3, 1)
 *   ageFactor = 2^(-ageHours / 24)
 *   confidence = 100 * evidenceCap * consistencyFactor * ageFactor
 */

function ln(x: number): number {
  return Math.log(x);
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function scoreExplicit(input: {
  quantity: number;
  referenceStock: number;
  ageHours: number;
  consistentChecks: number;
  successfulChecks30d: number;
  totalChecks30d: number;
  siblingListings: number;
}): SupplyResult {
  const refStock = Math.max(10, input.referenceStock);
  const normalizedQty = Math.min(input.quantity, refStock);
  const quantityScore =
    ln(1 + normalizedQty) / ln(1 + refStock);
  const score = clamp(80 + 20 * quantityScore, 80, 100);

  // Confidence for explicit: evidence cap = 1.00
  const evidenceCap = 1.0;
  const consistencyFactor =
    0.7 + 0.3 * Math.min(input.consistentChecks / 3, 1);
  const ageFactor = Math.pow(2, -input.ageHours / 24);
  const confidence = Math.round(
    100 * evidenceCap * consistencyFactor * ageFactor,
  );

  return {
    score: Math.round(score * 100) / 100,
    confidence,
  };
}

function scoreInferred(input: {
  kind: "TEXT_IN_STOCK" | "BUTTON_AVAILABLE";
  ageHours: number;
  consistentChecks: number;
  successfulChecks30d: number;
  totalChecks30d: number;
  siblingListings: number;
}): SupplyResult {
  const hasStockText = input.kind === "TEXT_IN_STOCK" ? 40 : 20;
  const freshness = 20 * Math.pow(2, -input.ageHours / 12);
  const linkStability =
    15 *
    ((input.successfulChecks30d + 1) /
      (input.totalChecks30d + 2));
  const breadthScore =
    4 *
    Math.min(1, ln(1 + input.siblingListings) / ln(21));
  const score = clamp(
    hasStockText + freshness + linkStability + breadthScore,
    20,
    79,
  );

  // Confidence for inferred
  const evidenceCap =
    input.kind === "TEXT_IN_STOCK" ? 0.69 : 0.49;
  const consistencyFactor =
    0.7 + 0.3 * Math.min(input.consistentChecks / 3, 1);
  const ageFactor = Math.pow(2, -input.ageHours / 24);
  const confidence = Math.round(
    100 * evidenceCap * consistencyFactor * ageFactor,
  );

  return {
    score: Math.round(score * 100) / 100,
    confidence,
  };
}

export function scoreSupply(input: SupplyInput): SupplyResult {
  if (input.kind === "EXPLICIT") {
    return scoreExplicit(input);
  }
  return scoreInferred(input);
}
