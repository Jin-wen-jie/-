import { QUEUES } from "./queue.js";

interface RuntimeJob {
  data: Record<string, unknown>;
}

export interface RuntimeBoss {
  work: (
    name: string,
    handler: (jobs: RuntimeJob[]) => Promise<unknown>,
  ) => Promise<unknown>;
}

export interface RuntimeHandlers {
  validateCandidate: (input: { candidateId: string }) => Promise<unknown>;
  sweepCandidates: () => Promise<unknown>;
  revalidateListing: (input: { listingId: string }) => Promise<unknown>;
  sweepListings: () => Promise<unknown>;
}

export async function registerWorkers(
  boss: RuntimeBoss,
  handlers: RuntimeHandlers,
): Promise<void> {
  await boss.work(QUEUES.VALIDATE_CANDIDATE, async (jobs) => {
    return Promise.all(
      jobs.map((job) => {
        const candidateId = stringProperty(job.data, "candidateId");
        return candidateId
          ? handlers.validateCandidate({ candidateId })
          : handlers.sweepCandidates();
      }),
    );
  });

  await boss.work(QUEUES.REVALIDATE_LISTING, async (jobs) => {
    return Promise.all(
      jobs.map((job) => {
        const listingId = stringProperty(job.data, "listingId");
        return listingId
          ? handlers.revalidateListing({ listingId })
          : handlers.sweepListings();
      }),
    );
  });

  await boss.work(QUEUES.DISCOVER_SOURCE, async () => [
    { status: "deferred", reason: "CONNECTORS_NOT_CONFIGURED" },
  ]);
  await boss.work(QUEUES.REFRESH_FX, async () => [
    { status: "deferred", reason: "FX_REFRESH_NOT_IMPLEMENTED" },
  ]);
}

function stringProperty(
  data: Record<string, unknown>,
  key: string,
): string | null {
  const value = data[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}
