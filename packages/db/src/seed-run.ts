#!/usr/bin/env tsx
import { createDb } from "./client";
import { seedWatchSources } from "./seed-watch-sources";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const db = createDb(databaseUrl);

try {
  await seedWatchSources(db);
  console.log("Watch sources seeded successfully");
} catch (error) {
  console.error("Failed to seed watch sources:", error);
  process.exit(1);
} finally {
  process.exit(0);
}
