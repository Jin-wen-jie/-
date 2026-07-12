import {
  boolean,
  check,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ── Enums ──

export const candidateStatusEnum = pgEnum("candidate_status", [
  "DISCOVERED",
  "VALIDATING",
  "RETRY_WAIT",
  "REVIEW_REQUIRED",
  "APPROVED",
  "REJECTED",
]);

export const listingStatusEnum = pgEnum("listing_status", [
  "ACTIVE",
  "OUT_OF_STOCK",
  "INVALID",
  "RECHECK",
  "NEEDS_REVIEW",
]);

export const sourceTypeEnum = pgEnum("source_type", [
  "x",
  "telegram",
  "manual",
]);

export const watchSourceStatusEnum = pgEnum("watch_source_status", [
  "ACTIVE",
  "AUTH_DISABLED",
  "NOT_CONFIGURED",
  "RATE_LIMITED",
  "ERROR",
]);

// ── Tables ──

export const adminAccounts = pgTable(
  "admin_accounts",
  {
    id: smallint("id").primaryKey(),
    username: varchar("username", { length: 255 }).notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    failedAttempts: integer("failed_attempts").notNull().default(0),
    lockedUntil: timestamp("locked_until", { withTimezone: true }),
    sessionVersion: integer("session_version").notNull().default(0),
    forcePasswordChange: boolean("force_password_change").notNull().default(true),
    bootstrapPasswordConsumedAt: timestamp("bootstrap_password_consumed_at", {
      withTimezone: true,
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check("admin_accounts_id_check", sql`${table.id} = 1`),
  ],
);

export const adminSessions = pgTable("admin_sessions", {
  id: text("id").primaryKey(),
  tokenHash: text("token_hash").notNull().unique(),
  csrfTokenHash: text("csrf_token_hash"),
  sessionVersion: integer("session_version").notNull().default(0),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const watchSources = pgTable("watch_sources", {
  id: text("id").primaryKey(),
  platform: varchar("platform", { length: 50 }).notNull(),
  keywords: jsonb("keywords").$type<string[]>().notNull().default([]),
  excludeKeywords: jsonb("exclude_keywords").$type<string[]>().notNull().default([]),
  publicChannels: jsonb("public_channels").$type<string[]>().notNull().default([]),
  status: watchSourceStatusEnum("status").notNull().default("NOT_CONFIGURED"),
  cursor: text("cursor"),
  lastRunAt: timestamp("last_run_at", { withTimezone: true }),
  lastRunResult: jsonb("last_run_result"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const discoveryEvents = pgTable("discovery_events", {
  id: text("id").primaryKey(),
  sourceUrl: text("source_url").notNull(),
  platform: varchar("platform", { length: 50 }).notNull(),
  publicAccount: text("public_account"),
  channelName: text("channel_name"),
  messageId: text("message_id"),
  summary: text("summary"),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  discoveredAt: timestamp("discovered_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const discoveryCandidates = pgTable(
  "discovery_candidates",
  {
    id: text("id").primaryKey(),
    productUrl: text("product_url").notNull(),
    urlFingerprint: text("url_fingerprint").notNull(),
    sourceType: sourceTypeEnum("source_type").notNull(),
    discoveryEventId: text("discovery_event_id"),
    canonicalUrl: text("canonical_url"),
    finalUrl: text("final_url"),
    status: candidateStatusEnum("status").notNull().default("DISCOVERED"),
    extractionResult: jsonb("extraction_result"),
    comparisonKey: text("comparison_key"),
    specId: text("spec_id"),
    rejectionReason: text("rejection_reason"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("candidate_url_fp_idx").on(table.urlFingerprint),
  ],
);

export const merchants = pgTable("merchants", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  homepageUrl: text("homepage_url"),
  platform: varchar("platform", { length: 50 }),
  status: candidateStatusEnum("status").notNull().default("REVIEW_REQUIRED"),
  lastVerifiedAt: timestamp("last_verified_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const productSpecs = pgTable("product_specs", {
  id: text("id").primaryKey(),
  provider: text("provider").notNull(),
  productLine: text("product_line").notNull(),
  plan: text("plan").notNull(),
  delivery: text("delivery").notNull(),
  accessMode: text("access_mode").notNull(),
  ownership: text("ownership").notNull(),
  region: text("region").notNull(),
  qualification: text("qualification").notNull(),
  validity: text("validity").notNull(),
  commitment: text("commitment").notNull(),
  quota: text("quota").notNull(),
  comparisonKey: text("comparison_key").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const listings = pgTable("listings", {
  id: text("id").primaryKey(),
  merchantId: text("merchant_id")
    .notNull()
    .references(() => merchants.id),
  specId: text("spec_id")
    .notNull()
    .references(() => productSpecs.id),
  candidateId: text("candidate_id")
    .notNull()
    .references(() => discoveryCandidates.id),
  originalUrl: text("original_url").notNull(),
  finalUrl: text("final_url"),
  bundleQty: integer("bundle_qty").notNull().default(1),
  minBundleCount: integer("min_bundle_count").notNull().default(1),
  unitBasis: text("unit_basis").notNull().default("account"),
  originalPrice: numeric("original_price"),
  currency: varchar("currency", { length: 10 }),
  convertedPriceCny: numeric("converted_price_cny"),
  stockEvidence: jsonb("stock_evidence"),
  status: listingStatusEnum("status").notNull().default("ACTIVE"),
  approved: boolean("approved").notNull().default(false),
  lastVerifiedAt: timestamp("last_verified_at", { withTimezone: true }),
  consecutiveFailures: integer("consecutive_failures").notNull().default(0),
  lastSuccessAt: timestamp("last_success_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const listingObservations = pgTable("listing_observations", {
  id: text("id").primaryKey(),
  listingId: text("listing_id")
    .notNull()
    .references(() => listings.id),
  originalPrice: numeric("original_price"),
  mandatoryFees: numeric("mandatory_fees"),
  mandatoryTaxes: numeric("mandatory_taxes"),
  unconditionalDiscount: numeric("unconditional_discount"),
  currency: varchar("currency", { length: 10 }),
  fxRate: numeric("fx_rate"),
  fxSource: text("fx_source"),
  fxObservedAt: timestamp("fx_observed_at", { withTimezone: true }),
  stockClaim: jsonb("stock_claim"),
  pageFingerprint: text("page_fingerprint"),
  observedAt: timestamp("observed_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const linkChecks = pgTable("link_checks", {
  id: text("id").primaryKey(),
  candidateId: text("candidate_id"),
  listingId: text("listing_id"),
  originalUrl: text("original_url").notNull(),
  httpStatus: integer("http_status"),
  redirectChain: jsonb("redirect_chain").$type<string[]>(),
  finalUrl: text("final_url"),
  pageVerdict: text("page_verdict"),
  elapsedMs: integer("elapsed_ms"),
  failureCategory: text("failure_category"),
  failureDetail: text("failure_detail"),
  checkedAt: timestamp("checked_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const collectionRuns = pgTable("collection_runs", {
  id: text("id").primaryKey(),
  sourceId: text("source_id")
    .notNull()
    .references(() => watchSources.id),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  discoveredCount: integer("discovered_count").notNull().default(0),
  dedupedCount: integer("deduped_count").notNull().default(0),
  successCount: integer("success_count").notNull().default(0),
  failureCount: integer("failure_count").notNull().default(0),
  errorCategory: text("error_category"),
  errorDetail: text("error_detail"),
});

export const auditEvents = pgTable("audit_events", {
  id: text("id").primaryKey(),
  action: text("action").notNull(),
  candidateId: text("candidate_id"),
  listingId: text("listing_id"),
  specId: text("spec_id"),
  detail: jsonb("detail"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
