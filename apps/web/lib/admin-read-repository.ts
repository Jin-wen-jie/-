import { randomUUID } from "node:crypto";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import {
  discoveryCandidates,
  discoveryEvents,
  alertEvents,
  candidateObservations,
  listings,
  merchants,
  productSpecs,
  watchSources,
} from "@compare/db";
import {
  toApprovedCandidateRankingView,
  type RankingView,
} from "./admin-read-model";
import { getDatabase, withDatabaseRetry } from "./database";

export async function listRankingViews(limit = 200): Promise<RankingView[]> {
  const db = getDatabase();
  const boundedLimit = Number.isFinite(limit)
    ? Math.min(500, Math.max(1, Math.floor(limit)))
    : 200;
  const rows = await withDatabaseRetry(() => db
    .select({
      id: discoveryCandidates.id,
      productUrl: discoveryCandidates.productUrl,
      extractionResult: discoveryCandidates.extractionResult,
      eventSourceUrl: discoveryEvents.sourceUrl,
      createdAt: discoveryCandidates.createdAt,
    })
    .from(discoveryCandidates)
    .leftJoin(
      discoveryEvents,
      eq(discoveryCandidates.discoveryEventId, discoveryEvents.id),
    )
    .where(eq(discoveryCandidates.status, "APPROVED"))
    .orderBy(desc(discoveryCandidates.updatedAt))
    .limit(boundedLimit));

  return rows
    .map(toApprovedCandidateRankingView)
    .sort((left, right) => {
      const stockOrder = Number(right.availability === "IN_STOCK") -
        Number(left.availability === "IN_STOCK");
      if (stockOrder !== 0) return stockOrder;
      const confidenceOrder = (right.confidence ?? 0) - (left.confidence ?? 0);
      if (confidenceOrder !== 0) return confidenceOrder;
      return moneyValue(left.unitCny) - moneyValue(right.unitCny);
    });
}

const ldxpGoodsSchema = z.object({
  code: z.literal(1),
  data: z.object({
    goods_key: z.string().min(1),
    status: z.number(),
    name: z.string().min(1),
    price: z.number().nonnegative(),
    user: z.object({
      nickname: z.string().min(1),
      token: z.string().min(1),
      link: z.string().url(),
    }),
  }),
});

const ldxpChannelsSchema = z.object({
  code: z.literal(1),
  data: z.array(z.object({ id: z.number().int().positive() })),
});

const ldxpPriceSchema = z.object({
  code: z.literal(1),
  data: z.object({
    original_amount: z.number().nonnegative(),
    total_amount: z.number().nonnegative(),
    fee: z.number().nonnegative(),
  }),
});

const ldxpOrderProbeSchema = z.object({
  code: z.number(),
  msg: z.string(),
  data: z.unknown().nullable().optional(),
});

export const ldxpListingSnapshotSchema = z.object({
  price: z.number().nonnegative(),
  totalPrice: z.number().nonnegative(),
  mandatoryFee: z.number().nonnegative(),
  pageTitle: z.string().min(1),
  merchantName: z.string().min(1),
  merchantUrl: z.string().url(),
  availability: z.enum(["IN_STOCK", "OUT_OF_STOCK", "UNKNOWN"]),
});

export type LdxpListingSnapshot = z.infer<typeof ldxpListingSnapshotSchema>;

export async function fetchLdxpListingSnapshot(
  productUrl: string,
  request: typeof fetch = fetch,
): Promise<LdxpListingSnapshot> {
  const parsedUrl = new URL(productUrl);
  const match = parsedUrl.pathname.match(/^\/item\/([A-Za-z0-9]+)\/?$/);
  if (parsedUrl.origin !== "https://pay.ldxp.cn" || !match?.[1]) {
    throw new Error("UNSUPPORTED_LDXP_PRODUCT_URL");
  }

  const goodsKey = match[1];
  const goods = ldxpGoodsSchema.parse(
    await postLdxp(request, "/shopApi/Shop/goodsInfo", {
      goods_key: goodsKey,
      trade_no: null,
    }),
  ).data;
  if (goods.goods_key !== goodsKey) throw new Error("LDXP_PRODUCT_MISMATCH");

  const channels = ldxpChannelsSchema.parse(
    await postLdxp(request, "/shopApi/Shop/getUserChannel", {
      token: goods.user.token,
    }),
  ).data;
  const channelId = channels[0]?.id ?? 0;
  const checkout = ldxpPriceSchema.parse(
    await postLdxp(request, "/shopApi/Shop/getGoodsPrice", {
      goods_key: goodsKey,
      quantity: 1,
      coupon_code: "",
      channel_id: channelId,
    }),
  ).data;
  const availability = await probeLdxpAvailability(
    request,
    goodsKey,
    goods.status,
    checkout.total_amount,
  );

  return {
    price: goods.price,
    totalPrice: checkout.total_amount,
    mandatoryFee:
      Math.max(
        0,
        Math.round(
          (checkout.total_amount - checkout.original_amount) * 100,
        ) / 100,
      ),
    pageTitle: goods.name,
    merchantName: goods.user.nickname,
    merchantUrl: goods.user.link,
    availability,
  };
}

async function probeLdxpAvailability(
  request: typeof fetch,
  goodsKey: string,
  goodsStatus: number,
  totalAmount: number,
): Promise<LdxpListingSnapshot["availability"]> {
  if (goodsStatus !== 1) return "OUT_OF_STOCK";
  if (totalAmount === 0) return "UNKNOWN";

  const probe = ldxpOrderProbeSchema.parse(
    await postLdxp(request, "/shopApi/Pay/order", {
      goods_key: goodsKey,
      quantity: 1,
      coupon_code: "",
      channel_id: 0,
      contact: "inventory-probe",
      extend: {},
    }),
  );
  if (probe.code !== 0) throw new Error("LDXP_ORDER_PROBE_UNEXPECTED_SUCCESS");
  return isOutOfStockMessage(probe.msg) ? "OUT_OF_STOCK" : "IN_STOCK";
}

function isOutOfStockMessage(message: string): boolean {
  return /库存不足|库存不够|无库存|缺货|售罄|已售完/.test(message);
}

export async function refreshApprovedCandidatePrices(): Promise<{
  attempted: number;
  updated: number;
  failures: string[];
}> {
  const db = getDatabase();
  const candidates = await withDatabaseRetry(() => db
    .select({
      id: discoveryCandidates.id,
      productUrl: discoveryCandidates.productUrl,
      extractionResult: discoveryCandidates.extractionResult,
    })
    .from(discoveryCandidates)
    .where(eq(discoveryCandidates.status, "APPROVED"))
    .orderBy(desc(discoveryCandidates.updatedAt))
    .limit(50));

  const results = await Promise.allSettled(
    candidates.map(async (candidate) => {
      const snapshot = await fetchLdxpListingSnapshot(candidate.productUrl);
      return updateCandidateSnapshot(candidate.id, snapshot);
    }),
  );

  return {
    attempted: candidates.length,
    updated: results.filter(
      (result) => result.status === "fulfilled" && result.value,
    ).length,
    failures: [
      ...new Set(
        results.flatMap((result) =>
          result.status === "rejected"
            ? [failureCategory(result.reason)]
            : result.value
              ? []
              : ["NOT_UPDATED"]
        ),
      ),
    ],
  };
}

export async function updateCandidateSnapshot(
  id: string,
  snapshotInput: LdxpListingSnapshot,
): Promise<boolean> {
  return (await updateCandidateSnapshots([{
    id,
    snapshot: ldxpListingSnapshotSchema.parse(snapshotInput),
  }])) > 0;
}

export async function updateCandidateSnapshots(
  inputs: Array<{ id: string; snapshot: LdxpListingSnapshot }>,
): Promise<number> {
  const snapshots = [
    ...new Map(inputs.map(({ id, snapshot }) => [
      id,
      { id, snapshot: ldxpListingSnapshotSchema.parse(snapshot) },
    ])).values(),
  ];
  if (snapshots.length === 0) return 0;

  const db = getDatabase();
  return withDatabaseRetry(() => db.transaction(async (tx) => {
    const ids = [...new Set(snapshots.map(({ id }) => id))];
    const candidates = await tx
      .select({
        id: discoveryCandidates.id,
        extractionResult: discoveryCandidates.extractionResult,
      })
      .from(discoveryCandidates)
      .where(
        and(
          inArray(discoveryCandidates.id, ids),
          inArray(discoveryCandidates.status, [
            "DISCOVERED",
            "REVIEW_REQUIRED",
            "APPROVED",
          ]),
        ),
      );
    const extractionById = new Map(
      candidates.map((candidate) => [candidate.id, candidate.extractionResult]),
    );
    const observedAt = new Date();
    let updated = 0;

    for (const { id, snapshot } of snapshots) {
      if (!extractionById.has(id)) continue;
      const extractionResult = extractionById.get(id);
      const existing = isRecord(extractionResult) ? extractionResult : {};
      const change = candidateSnapshotChange(existing, snapshot);
      await tx.insert(candidateObservations).values({
        id: randomUUID(),
        candidateId: id,
        price: String(snapshot.price),
        totalPrice: String(snapshot.totalPrice),
        currency: "CNY",
        availability: snapshot.availability,
        sourceEngine: "direct",
        anomalous: change.anomalous,
        observedAt,
      });
      const alert = candidateSnapshotAlert(
        id,
        snapshot.pageTitle,
        change,
        observedAt,
      );
      if (alert) {
        await tx.insert(alertEvents).values(alert).onConflictDoNothing({
          target: alertEvents.dedupeKey,
        });
      }
      if (change.anomalous) {
        updated++;
        continue;
      }
      const [row] = await tx
        .update(discoveryCandidates)
        .set({
          extractionResult: {
            ...existing,
            ...snapshot,
            observedAt: observedAt.toISOString(),
          },
          updatedAt: observedAt,
        })
        .where(
          and(
            eq(discoveryCandidates.id, id),
            inArray(discoveryCandidates.status, [
              "DISCOVERED",
              "REVIEW_REQUIRED",
              "APPROVED",
            ]),
          ),
        )
        .returning({ id: discoveryCandidates.id });
      if (row) updated++;
    }

    return updated;
  }));
}

function candidateSnapshotChange(
  existing: Record<string, unknown>,
  snapshot: LdxpListingSnapshot,
) {
  const previousPrice = positiveNumber(existing.totalPrice) ??
    positiveNumber(existing.price);
  const currentPrice = snapshot.totalPrice || snapshot.price;
  const ratio = previousPrice === null || currentPrice <= 0
    ? 0
    : Math.abs(currentPrice - previousPrice) / previousPrice;
  return {
    previousPrice,
    currentPrice,
    anomalous: ratio > 0.5,
    priceDropped:
      previousPrice !== null &&
      currentPrice < previousPrice &&
      (previousPrice - currentPrice) / previousPrice >= 0.1 &&
      ratio <= 0.5,
    restocked:
      existing.availability === "OUT_OF_STOCK" &&
      snapshot.availability === "IN_STOCK",
  };
}

function candidateSnapshotAlert(
  candidateId: string,
  title: string,
  change: ReturnType<typeof candidateSnapshotChange>,
  observedAt: Date,
): typeof alertEvents.$inferInsert | null {
  if (change.anomalous) {
    return {
      id: randomUUID(),
      candidateId,
      kind: "PRICE_ANOMALY",
      severity: "warning",
      title: `价格异常：${title}`,
      detail: {
        previousPrice: change.previousPrice,
        currentPrice: change.currentPrice,
      },
      dedupeKey: `${candidateId}:PRICE_ANOMALY:${change.currentPrice}`,
      createdAt: observedAt,
    };
  }
  if (change.priceDropped) {
    return {
      id: randomUUID(),
      candidateId,
      kind: "PRICE_DROP",
      severity: "info",
      title: `价格下降：${title}`,
      detail: {
        previousPrice: change.previousPrice,
        currentPrice: change.currentPrice,
      },
      dedupeKey: `${candidateId}:PRICE_DROP:${change.currentPrice}`,
      createdAt: observedAt,
    };
  }
  if (change.restocked) {
    return {
      id: randomUUID(),
      candidateId,
      kind: "RESTOCKED",
      severity: "info",
      title: `恢复库存：${title}`,
      detail: { availability: "IN_STOCK" },
      dedupeKey: `${candidateId}:RESTOCKED:${observedAt.toISOString()}`,
      createdAt: observedAt,
    };
  }
  return null;
}

async function postLdxp(
  request: typeof fetch,
  path: string,
  body: Record<string, unknown>,
): Promise<unknown> {
  const response = await request(`https://www.ldxp.cn${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    redirect: "error",
    signal: AbortSignal.timeout(6_000),
  });
  if (!response.ok) throw new Error(`LDXP_HTTP_${response.status}`);
  return response.json();
}

export async function getDashboardCounts() {
  const db = getDatabase();
  const [counts] = await withDatabaseRetry(() => db
    .select({
      candidates: sql<number>`(select count(*)::int from ${discoveryCandidates})`,
      merchants: sql<number>`(select count(distinct ${discoveryCandidates.extractionResult} ->> 'merchantName')::int from ${discoveryCandidates} where ${discoveryCandidates.status} = 'APPROVED')`,
      listings: sql<number>`(select count(*)::int from ${discoveryCandidates} where ${discoveryCandidates.status} = 'APPROVED')`,
    })
    .from(sql`(select 1) as singleton`));
  return {
    candidates: Number(counts?.candidates ?? 0),
    merchants: Number(counts?.merchants ?? 0),
    listings: Number(counts?.listings ?? 0),
  };
}

export async function listMerchantViews() {
  const db = getDatabase();
  const rows = await withDatabaseRetry(() => db
    .select({
      id: merchants.id,
      name: merchants.name,
      homepageUrl: merchants.homepageUrl,
      platform: merchants.platform,
      activeListings: sql<number>`count(${listings.id}) filter (where ${listings.status} = ${"ACTIVE"})::int`,
      totalListings: sql<number>`count(${listings.id})::int`,
      totalFailures: sql<number>`coalesce(sum(${listings.consecutiveFailures}), 0)::int`,
      lastVerifiedAt: merchants.lastVerifiedAt,
      status: merchants.status,
    })
    .from(merchants)
    .leftJoin(listings, eq(listings.merchantId, merchants.id))
    .groupBy(merchants.id));
  return rows.map((merchant) => {
    const activeListings = Number(merchant.activeListings);
    const totalListings = Number(merchant.totalListings);
    const totalFailures = Number(merchant.totalFailures);
    const activeRatio = totalListings === 0 ? 0 : activeListings / totalListings;
    const freshness = merchant.lastVerifiedAt &&
        Date.now() - merchant.lastVerifiedAt.getTime() <= 24 * 60 * 60 * 1_000
      ? 10
      : 0;
    return {
      ...merchant,
      platform: merchant.platform ?? "—",
      activeListings,
      totalListings,
      reliabilityScore: Math.max(
        0,
        Math.min(
          100,
          Math.round(55 + activeRatio * 30 + freshness - totalFailures * 5),
        ),
      ),
      lastVerifiedAt: merchant.lastVerifiedAt?.toISOString() ?? null,
    };
  });
}

export async function listSpecViews() {
  const db = getDatabase();
  return withDatabaseRetry(() => db
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
    .from(productSpecs));
}

export async function listSourceViews() {
  const db = getDatabase();
  const rows = await withDatabaseRetry(() => db.select().from(watchSources));
  return rows.map((source) => {
    const result = isRecord(source.lastRunResult) ? source.lastRunResult : {};
    const engines = Array.isArray(result.engines)
      ? result.engines.filter(isRecord).map((engine) => ({
        name: stringValue(engine.engine) ?? "unknown",
        status: stringValue(engine.status) ?? "UNKNOWN",
        count: numberValue(engine.resultCount) ?? 0,
      }))
      : [];
    return {
      id: source.id,
      platform: source.platform,
      status: source.status,
      cursor: source.cursor,
      lastRunAt: source.lastRunAt?.toISOString() ?? null,
      discovered: numberValue(result.discoveredCount) ?? 0,
      errorCategory: stringValue(result.errorCategory),
      engineSummary: engines
        .map((engine) => `${engine.name} ${engine.status} ${engine.count}`)
        .join(" · "),
    };
  });
}

export async function getCollectionIntelligence() {
  const db = getDatabase();
  const [row] = await withDatabaseRetry(() => db
    .select({
      observations: sql<number>`(select count(*)::int from ${candidateObservations})`,
      anomalies: sql<number>`(select count(*)::int from ${candidateObservations} where ${candidateObservations.anomalous} = true)`,
      pending: sql<number>`(select count(*)::int from ${discoveryCandidates} where ${discoveryCandidates.status} in ('DISCOVERED', 'REVIEW_REQUIRED'))`,
      approved: sql<number>`(select count(*)::int from ${discoveryCandidates} where ${discoveryCandidates.status} = 'APPROVED')`,
      rejected: sql<number>`(select count(*)::int from ${discoveryCandidates} where ${discoveryCandidates.status} = 'REJECTED')`,
      alerts: sql<number>`(select count(*)::int from ${alertEvents} where ${alertEvents.acknowledged} = false)`,
    })
    .from(sql`(select 1) as singleton`));
  return {
    observations: Number(row?.observations ?? 0),
    anomalies: Number(row?.anomalies ?? 0),
    pending: Number(row?.pending ?? 0),
    approved: Number(row?.approved ?? 0),
    rejected: Number(row?.rejected ?? 0),
    alerts: Number(row?.alerts ?? 0),
  };
}

export async function listAlertViews(limit = 20) {
  const db = getDatabase();
  const boundedLimit = Math.min(100, Math.max(1, Math.floor(limit)));
  const rows = await withDatabaseRetry(() => db
    .select({
      id: alertEvents.id,
      kind: alertEvents.kind,
      severity: alertEvents.severity,
      title: alertEvents.title,
      detail: alertEvents.detail,
      acknowledged: alertEvents.acknowledged,
      createdAt: alertEvents.createdAt,
      productUrl: discoveryCandidates.productUrl,
    })
    .from(alertEvents)
    .innerJoin(
      discoveryCandidates,
      eq(alertEvents.candidateId, discoveryCandidates.id),
    )
    .orderBy(desc(alertEvents.createdAt))
    .limit(boundedLimit));
  return rows.map((row) => ({
    ...row,
    createdAt: row.createdAt.toISOString(),
    summary: alertDetailSummary(row.detail),
  }));
}

function alertDetailSummary(value: unknown): string {
  if (!isRecord(value)) return "—";
  const previous = positiveNumber(value.previousPrice);
  const current = positiveNumber(value.currentPrice);
  if (previous !== null && current !== null) {
    return `¥${previous.toFixed(2)} → ¥${current.toFixed(2)}`;
  }
  if (value.availability === "IN_STOCK") return "已恢复库存";
  return "—";
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

function positiveNumber(value: unknown): number | null {
  const parsed = typeof value === "number"
    ? value
    : typeof value === "string"
      ? Number(value)
      : Number.NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function moneyValue(value: string): number {
  const parsed = Number(value.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : Number.POSITIVE_INFINITY;
}

function failureCategory(error: unknown): string {
  if (error instanceof z.ZodError) return "INVALID_RESPONSE";
  if (error instanceof Error) {
    if (error.name === "TimeoutError") return "TIMEOUT";
    if (/^[A-Z0-9_]+$/.test(error.message)) return error.message;
  }
  return "REFRESH_FAILED";
}
