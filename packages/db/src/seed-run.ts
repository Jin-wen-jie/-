#!/usr/bin/env tsx
import { createDb } from "./client";
import { seedWatchSources } from "./seed-watch-sources";
import { seedCandidates } from "./seed-candidates";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const db = createDb(databaseUrl);

try {
  await seedWatchSources(db);
  console.log("✓ Watch sources seeded");

  await seedCandidates(db);
  console.log("✓ Initial candidates seeded");
} catch (error) {
  console.error("× Seed failed:", error);
  process.exit(1);
} finally {
  process.exit(0);
}
