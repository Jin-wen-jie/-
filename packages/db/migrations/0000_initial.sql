-- Initial schema for AI Price Intelligence

CREATE TYPE "candidate_status" AS ENUM (
  'DISCOVERED',
  'VALIDATING',
  'RETRY_WAIT',
  'REVIEW_REQUIRED',
  'APPROVED',
  'REJECTED'
);

CREATE TYPE "listing_status" AS ENUM (
  'ACTIVE',
  'OUT_OF_STOCK',
  'INVALID',
  'RECHECK',
  'NEEDS_REVIEW'
);

CREATE TYPE "source_type" AS ENUM (
  'x',
  'telegram',
  'manual'
);

CREATE TYPE "watch_source_status" AS ENUM (
  'ACTIVE',
  'AUTH_DISABLED',
  'NOT_CONFIGURED',
  'RATE_LIMITED',
  'ERROR'
);

CREATE TABLE "admin_accounts" (
  "id" smallint PRIMARY KEY,
  "username" varchar(255) NOT NULL UNIQUE,
  "password_hash" text NOT NULL,
  "failed_attempts" integer NOT NULL DEFAULT 0,
  "locked_until" timestamp with time zone,
  "session_version" integer NOT NULL DEFAULT 0,
  "force_password_change" boolean NOT NULL DEFAULT true,
  "bootstrap_password_consumed_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "admin_accounts_id_check" CHECK ("id" = 1)
);

CREATE TABLE "admin_sessions" (
  "id" text PRIMARY KEY,
  "token_hash" text NOT NULL UNIQUE,
  "csrf_token_hash" text,
  "expires_at" timestamp with time zone NOT NULL,
  "revoked_at" timestamp with time zone,
  "last_used_at" timestamp with time zone NOT NULL DEFAULT now(),
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE "watch_sources" (
  "id" text PRIMARY KEY,
  "platform" varchar(50) NOT NULL,
  "keywords" jsonb NOT NULL DEFAULT '[]',
  "exclude_keywords" jsonb NOT NULL DEFAULT '[]',
  "public_channels" jsonb NOT NULL DEFAULT '[]',
  "status" watch_source_status NOT NULL DEFAULT 'NOT_CONFIGURED',
  "cursor" text,
  "last_run_at" timestamp with time zone,
  "last_run_result" jsonb,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE "discovery_events" (
  "id" text PRIMARY KEY,
  "source_url" text NOT NULL,
  "platform" varchar(50) NOT NULL,
  "public_account" text,
  "channel_name" text,
  "message_id" text,
  "summary" text,
  "published_at" timestamp with time zone,
  "discovered_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE "discovery_candidates" (
  "id" text PRIMARY KEY,
  "product_url" text NOT NULL,
  "url_fingerprint" text NOT NULL,
  "source_type" source_type NOT NULL,
  "discovery_event_id" text,
  "canonical_url" text,
  "final_url" text,
  "status" candidate_status NOT NULL DEFAULT 'DISCOVERED',
  "extraction_result" jsonb,
  "comparison_key" text,
  "spec_id" text,
  "rejection_reason" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX "candidate_url_fp_idx" ON "discovery_candidates" ("url_fingerprint");

CREATE TABLE "merchants" (
  "id" text PRIMARY KEY,
  "name" text NOT NULL,
  "homepage_url" text,
  "platform" varchar(50),
  "status" candidate_status NOT NULL DEFAULT 'REVIEW_REQUIRED',
  "last_verified_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE "product_specs" (
  "id" text PRIMARY KEY,
  "provider" text NOT NULL,
  "product_line" text NOT NULL,
  "plan" text NOT NULL,
  "delivery" text NOT NULL,
  "access_mode" text NOT NULL,
  "ownership" text NOT NULL,
  "region" text NOT NULL,
  "qualification" text NOT NULL,
  "validity" text NOT NULL,
  "commitment" text NOT NULL,
  "quota" text NOT NULL,
  "comparison_key" text NOT NULL UNIQUE,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE "listings" (
  "id" text PRIMARY KEY,
  "merchant_id" text NOT NULL REFERENCES "merchants"("id"),
  "spec_id" text NOT NULL REFERENCES "product_specs"("id"),
  "candidate_id" text NOT NULL REFERENCES "discovery_candidates"("id"),
  "original_url" text NOT NULL,
  "final_url" text,
  "bundle_qty" integer NOT NULL DEFAULT 1,
  "min_bundle_count" integer NOT NULL DEFAULT 1,
  "unit_basis" text NOT NULL DEFAULT 'account',
  "original_price" numeric,
  "currency" varchar(10),
  "converted_price_cny" numeric,
  "stock_evidence" jsonb,
  "status" listing_status NOT NULL DEFAULT 'ACTIVE',
  "approved" boolean NOT NULL DEFAULT false,
  "last_verified_at" timestamp with time zone,
  "consecutive_failures" integer NOT NULL DEFAULT 0,
  "last_success_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE "listing_observations" (
  "id" text PRIMARY KEY,
  "listing_id" text NOT NULL REFERENCES "listings"("id"),
  "original_price" numeric,
  "mandatory_fees" numeric,
  "mandatory_taxes" numeric,
  "unconditional_discount" numeric,
  "currency" varchar(10),
  "fx_rate" numeric,
  "fx_source" text,
  "fx_observed_at" timestamp with time zone,
  "stock_claim" jsonb,
  "page_fingerprint" text,
  "observed_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE "link_checks" (
  "id" text PRIMARY KEY,
  "candidate_id" text,
  "listing_id" text,
  "original_url" text NOT NULL,
  "http_status" integer,
  "redirect_chain" jsonb,
  "final_url" text,
  "page_verdict" text,
  "elapsed_ms" integer,
  "failure_category" text,
  "failure_detail" text,
  "checked_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE "collection_runs" (
  "id" text PRIMARY KEY,
  "source_id" text NOT NULL REFERENCES "watch_sources"("id"),
  "started_at" timestamp with time zone NOT NULL,
  "finished_at" timestamp with time zone,
  "discovered_count" integer NOT NULL DEFAULT 0,
  "deduped_count" integer NOT NULL DEFAULT 0,
  "success_count" integer NOT NULL DEFAULT 0,
  "failure_count" integer NOT NULL DEFAULT 0,
  "error_category" text,
  "error_detail" text
);

CREATE TABLE "audit_events" (
  "id" text PRIMARY KEY,
  "action" text NOT NULL,
  "candidate_id" text,
  "listing_id" text,
  "spec_id" text,
  "detail" jsonb,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);
