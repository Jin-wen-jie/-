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
  canApprove: boolean;
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
    canApprove: Boolean(input.comparisonKey && input.specId),
    createdAt: input.createdAt.toISOString(),
  };
}
