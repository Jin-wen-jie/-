import { and, eq, gte } from "drizzle-orm";
import {
  discoveryCandidates,
  discoveryEvents,
  listings,
  merchants,
  productSpecs,
  watchSources,
} from "@compare/db";
import { toRankingView, type RankingView } from "./admin-read-model";
import { getDatabase } from "./database";

export async function listRankingViews(): Promise<RankingView[]> {
  const db = getDatabase();
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1_000);
  const rows = await db
    .select({
      id: listings.id,
      provider: productSpecs.provider,
      productLine: productSpecs.productLine,
      plan: productSpecs.plan,
      delivery: productSpecs.delivery,
      merchantName: merchants.name,
      merchantUrl: merchants.homepageUrl,
      originalUrl: listings.originalUrl,
      sourceUrl: discoveryEvents.sourceUrl,
      originalPrice: listings.originalPrice,
      currency: listings.currency,
      convertedPriceCny: listings.convertedPriceCny,
      bundleQty: listings.bundleQty,
      minBundleCount: listings.minBundleCount,
      stockEvidence: listings.stockEvidence,
      lastVerifiedAt: listings.lastVerifiedAt,
    })
    .from(listings)
    .innerJoin(merchants, eq(listings.merchantId, merchants.id))
    .innerJoin(productSpecs, eq(listings.specId, productSpecs.id))
    .innerJoin(
      discoveryCandidates,
      eq(listings.candidateId, discoveryCandidates.id),
    )
    .leftJoin(
      discoveryEvents,
      eq(discoveryCandidates.discoveryEventId, discoveryEvents.id),
    )
    .where(
      and(
        eq(listings.approved, true),
        eq(listings.status, "ACTIVE"),
        gte(listings.lastVerifiedAt, cutoff),
      ),
    );

  return rows
    .filter(
      (row): row is typeof row & { lastVerifiedAt: Date } =>
        row.lastVerifiedAt !== null,
    )
    .map(toRankingView)
    .sort((left, right) => moneyValue(left.unitCny) - moneyValue(right.unitCny));
}

export async function getDashboardCounts() {
  const db = getDatabase();
  const [candidates, merchantCount, listingCount] = await Promise.all([
    db.$count(discoveryCandidates),
    db.$count(merchants),
    db.$count(listings),
  ]);
  return {
    candidates,
    merchants: merchantCount,
    listings: listingCount,
  };
}

export async function listMerchantViews() {
  const db = getDatabase();
  const [merchantRows, listingRows] = await Promise.all([
    db.select().from(merchants),
    db
      .select({ merchantId: listings.merchantId, status: listings.status })
      .from(listings),
  ]);
  return merchantRows.map((merchant) => ({
    id: merchant.id,
    name: merchant.name,
    homepageUrl: merchant.homepageUrl,
    platform: merchant.platform ?? "—",
    activeListings: listingRows.filter(
      (listing) =>
        listing.merchantId === merchant.id && listing.status === "ACTIVE",
    ).length,
    lastVerifiedAt: merchant.lastVerifiedAt?.toISOString() ?? null,
    status: merchant.status,
  }));
}

export async function listSpecViews() {
  const db = getDatabase();
  return db
    .select({
      id: productSpecs.id,
      provider: productSpecs.provider,
      productLine: productSpecs.productLine,
      plan: productSpecs.plan,
      delivery: productSpecs.delivery,
      accessMode: productSpecs.accessMode,
      ownership: productSpecs.ownership,
      region: productSpecs.region,
      validity: productSpecs.validity,
      commitment: productSpecs.commitment,
      comparisonKey: productSpecs.comparisonKey,
    })
    .from(productSpecs);
}

export async function listSourceViews() {
  const db = getDatabase();
  const rows = await db.select().from(watchSources);
  return rows.map((source) => {
    const result = isRecord(source.lastRunResult) ? source.lastRunResult : {};
    return {
      id: source.id,
      platform: source.platform,
      status: source.status,
      cursor: source.cursor,
      lastRunAt: source.lastRunAt?.toISOString() ?? null,
      discovered: numberValue(result.discoveredCount) ?? 0,
      errorCategory: stringValue(result.errorCategory),
    };
  });
}

function moneyValue(value: string): number {
  const parsed = Number(value.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : Number.POSITIVE_INFINITY;
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
