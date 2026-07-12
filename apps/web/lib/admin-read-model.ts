export interface RankingViewInput {
  id: string;
  provider: string;
  productLine: string;
  plan: string;
  delivery: string;
  merchantName: string;
  merchantUrl: string | null;
  originalUrl: string;
  sourceUrl: string | null;
  originalPrice: string | null;
  currency: string | null;
  convertedPriceCny: string | null;
  bundleQty: number;
  minBundleCount: number;
  stockEvidence: unknown;
  lastVerifiedAt: Date;
}

export interface RankingView {
  id: string;
  spec: string;
  merchant: string;
  price: string;
  totalCny: string;
  unitCny: string;
  supplyEvidence: string;
  confidence: number | null;
  lastVerified: string;
  productUrl: string;
  sourceUrl: string | null;
  merchantUrl: string | null;
}

export function toRankingView(input: RankingViewInput): RankingView {
  const total = input.convertedPriceCny === null
    ? null
    : Number(input.convertedPriceCny);
  const unitCount = Math.max(1, input.bundleQty * input.minBundleCount);
  const evidence = isRecord(input.stockEvidence) ? input.stockEvidence : {};
  const availability = stringValue(evidence.availability);
  const stockQuantity = numberValue(evidence.stockQuantity);
  const confidenceValue = numberValue(evidence.confidence);
  const evidenceParts = [availability];
  if (stockQuantity !== null) evidenceParts.push(`库存 ${stockQuantity}`);

  return {
    id: input.id,
    spec: [input.provider, input.productLine, input.plan, input.delivery].join(
      " | ",
    ),
    merchant: input.merchantName,
    price:
      input.originalPrice && input.currency
        ? `${input.currency} ${input.originalPrice}`
        : "—",
    totalCny:
      total !== null && Number.isFinite(total) ? `¥${total.toFixed(2)}` : "—",
    unitCny:
      total !== null && Number.isFinite(total)
        ? `¥${(total / unitCount).toFixed(2)}/份`
        : "—",
    supplyEvidence: evidenceParts.filter(Boolean).join(" · ") || "无库存证据",
    confidence:
      confidenceValue === null
        ? null
        : Math.round(
            confidenceValue <= 1 ? confidenceValue * 100 : confidenceValue,
          ),
    lastVerified: input.lastVerifiedAt.toISOString(),
    productUrl: input.originalUrl,
    sourceUrl: input.sourceUrl,
    merchantUrl: input.merchantUrl,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function numberValue(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
