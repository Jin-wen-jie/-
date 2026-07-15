CREATE TABLE "alert_events" (
	"id" text PRIMARY KEY NOT NULL,
	"candidate_id" text NOT NULL,
	"kind" varchar(50) NOT NULL,
	"severity" varchar(20) NOT NULL,
	"title" text NOT NULL,
	"detail" jsonb,
	"dedupe_key" text NOT NULL,
	"acknowledged" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "candidate_observations" (
	"id" text PRIMARY KEY NOT NULL,
	"candidate_id" text NOT NULL,
	"price" numeric,
	"total_price" numeric,
	"currency" varchar(10),
	"inventory" integer,
	"availability" text,
	"source_engine" varchar(50),
	"anomalous" boolean DEFAULT false NOT NULL,
	"observed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "alert_events" ADD CONSTRAINT "alert_events_candidate_id_discovery_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."discovery_candidates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidate_observations" ADD CONSTRAINT "candidate_observations_candidate_id_discovery_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."discovery_candidates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "alert_events_dedupe_key_idx" ON "alert_events" USING btree ("dedupe_key");--> statement-breakpoint
CREATE INDEX "alert_events_created_at_idx" ON "alert_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "candidate_observations_candidate_time_idx" ON "candidate_observations" USING btree ("candidate_id","observed_at");