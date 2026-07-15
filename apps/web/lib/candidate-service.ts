import { createHash } from "node:crypto";
import { z } from "zod";

const extractionSchema = z
  .object({
    pageTitle: z.string().min(1).optional(),
    price: z.union([z.string(), z.number()]).optional(),
    merchantName: z.string().min(1).optional(),
    merchantUrl: z.string().url().optional(),
    sourceUrl: z.string().url().optional(),
    focus: z.string().min(1).optional(),
    availability: z.string().min(1).optional(),
    note: z.string().min(1).optional(),
    observedAt: z.string().min(1).optional(),
    sold: z.number().nonnegative().optional(),
    inventory: z.number().nonnegative().optional(),
    claudePlan: z.string().min(1).optional(),
    deliveryType: z.string().min(1).optional(),
    claudeCodeEvidence: z.string().min(1).optional(),
    kycStatus: z.string().min(1).optional(),
    warrantyEvidence: z.string().min(1).optional(),
  })
  .passthrough();

export interface CandidateViewInput {
  id: string;
  productUrl: string;
  sourceType: "manual" | "x" | "telegram";
  status: string;
  extractionResult: unknown;
  eventSourceUrl: string | null;
  comparisonKey?: string | null;
  specId?: string | null;
  createdAt: Date;
  observationCount?: number;
  anomalyCount?: number;
  previousPrice?: string | null;
}

export interface CandidateView {
  id: string;
  productUrl: string;
  sourceType: "manual" | "x" | "telegram";
  status: string;
  title: string | null;
  price: string | null;
  merchantName: string | null;
  sourceUrl: string | null;
  merchantUrl: string | null;
  focus: string | null;
  availability: string | null;
  evidenceNote: string | null;
  observedAt: string | null;
  sold: number | null;
  inventory: number | null;
  claudePlan: string | null;
  deliveryType: string | null;
  claudeCodeEvidence: string | null;
  kycStatus: string | null;
  warrantyEvidence: string | null;
  canApprove: boolean;
  confidence: number;
  observationCount: number;
  priceTrendPercent: number | null;
  createdAt: string;
}

export function canonicalizeCandidateUrl(productUrl: string): string {
  const url = new URL(productUrl);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("UNSUPPORTED_URL_PROTOCOL");
  }
  url.hash = "";
  return url.toString();
}

export function fingerprintCandidateUrl(productUrl: string): string {
  return createHash("sha256")
    .update(canonicalizeCandidateUrl(productUrl))
    .digest("hex");
}

export function canNormalizeCandidateStatus(status: string): boolean {
  return status === "DISCOVERED" || status === "REVIEW_REQUIRED";
}

export function toCandidateView(input: CandidateViewInput): CandidateView {
  const extraction = extractionSchema.safeParse(input.extractionResult);
  const data = extraction.success ? extraction.data : {};
  const currentPrice = numericValue(data.price);
  const previousPrice = numericValue(input.previousPrice);
  const observationCount = Math.max(0, input.observationCount ?? 0);
  const anomalyCount = Math.max(0, input.anomalyCount ?? 0);

  return {
    id: input.id,
    productUrl: input.productUrl,
    sourceType: input.sourceType,
    status: input.status,
    title: data.pageTitle ?? null,
    price: data.price === undefined ? null : String(data.price),
    merchantName: data.merchantName ?? null,
    sourceUrl: data.sourceUrl ?? input.eventSourceUrl,
    merchantUrl: data.merchantUrl ?? null,
    focus: data.focus ?? null,
    availability: data.availability ?? null,
    evidenceNote: data.note ?? null,
    observedAt: data.observedAt ?? null,
    sold: data.sold ?? null,
    inventory: data.inventory ?? null,
    claudePlan: data.claudePlan ?? null,
    deliveryType: data.deliveryType ?? null,
    claudeCodeEvidence: data.claudeCodeEvidence ?? null,
    kycStatus: data.kycStatus ?? null,
    warrantyEvidence: data.warrantyEvidence ?? null,
    canApprove: Boolean(input.comparisonKey && input.specId),
    confidence: candidateConfidence({
      availability: data.availability,
      merchantUrl: data.merchantUrl,
      sourceUrl: data.sourceUrl ?? input.eventSourceUrl,
      observedAt: data.observedAt,
      observationCount,
      anomalyCount,
    }),
    observationCount,
    priceTrendPercent:
      currentPrice !== null && previousPrice !== null && previousPrice > 0
        ? Math.round(((currentPrice - previousPrice) / previousPrice) * 1_000) /
          10
        : null,
    createdAt: input.createdAt.toISOString(),
  };
}

function candidateConfidence(input: {
  availability?: string;
  merchantUrl?: string;
  sourceUrl: string | null;
  observedAt?: string;
  observationCount: number;
  anomalyCount: number;
}): number {
  let score = 45;
  if (input.availability === "IN_STOCK") score += 20;
  if (input.merchantUrl) score += 10;
  if (input.sourceUrl) score += 5;
  if (input.observedAt) {
    const ageMs = Date.now() - new Date(input.observedAt).getTime();
    if (Number.isFinite(ageMs) && ageMs <= 15 * 60 * 1_000) score += 10;
    else if (Number.isFinite(ageMs) && ageMs <= 24 * 60 * 60 * 1_000) {
      score += 5;
    }
  }
  score += Math.min(10, input.observationCount * 2);
  score -= Math.min(30, input.anomalyCount * 15);
  return Math.max(0, Math.min(100, score));
}

function numericValue(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string" || value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
