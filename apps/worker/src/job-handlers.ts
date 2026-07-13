import { transitionListing, type CheckFailureKind } from "./lifecycle.js";
import { QUEUES } from "./queue.js";
import {
  ValidatorClientError,
  type ValidatorResponse,
} from "./validator-client.js";

export interface CandidateForValidation {
  id: string;
  productUrl: string;
  claimedAt: Date;
}

export interface ListingForRevalidation {
  id: string;
  originalUrl: string;
  status: "ACTIVE" | "OUT_OF_STOCK" | "INVALID" | "RECHECK" | "NEEDS_REVIEW";
  consecutiveFailures: number;
  lastSuccessAt: Date | null;
}

export interface ListingValidationResult {
  status: ListingForRevalidation["status"];
  consecutiveFailures: number;
  observation: ValidatorResponse | null;
  failureKind: CheckFailureKind | null;
  failure: unknown;
}

export interface CandidateValidationSaveResult {
  saved: boolean;
  discoveredIds: string[];
}

export interface WorkerRepository {
  listCandidateIdsForValidation: (limit?: number) => Promise<string[]>;
  claimCandidateForValidation: (
    id: string,
  ) => Promise<CandidateForValidation | null>;
  saveCandidateValidation: (
    id: string,
    result: ValidatorResponse,
    claimedAt: Date,
  ) => Promise<CandidateValidationSaveResult>;
  saveCandidateFailure: (
    id: string,
    error: unknown,
    claimedAt: Date,
  ) => Promise<boolean>;
  listListingIdsForRevalidation: (limit?: number) => Promise<string[]>;
  getListingForRevalidation: (
    id: string,
  ) => Promise<ListingForRevalidation | null>;
  saveListingRevalidation: (
    id: string,
    result: ListingValidationResult,
  ) => Promise<void>;
}

type EntityQueue =
  | typeof QUEUES.VALIDATE_CANDIDATE
  | typeof QUEUES.REVALIDATE_LISTING;

interface JobHandlerDependencies {
  repository: WorkerRepository;
  validate: (url: string) => Promise<ValidatorResponse>;
  enqueue: (queue: EntityQueue, id: string) => Promise<unknown>;
  now?: () => Date;
}

export class PersistedEntityFailure extends Error {
  readonly code = "PERSISTED_ENTITY_FAILURE";

  constructor() {
    super("CANDIDATE_VALIDATION_FAILED");
    this.name = "PersistedEntityFailure";
  }
}

export function createJobHandlers(dependencies: JobHandlerDependencies) {
  const now = dependencies.now ?? (() => new Date());

  return {
    async validateCandidate(input: { candidateId: string }) {
      const candidate = await dependencies.repository.claimCandidateForValidation(
        input.candidateId,
      );
      if (!candidate) return { status: "missing" as const };

      let result: ValidatorResponse;
      try {
        result = await dependencies.validate(candidate.productUrl);
      } catch (error) {
        if (!(error instanceof ValidatorClientError)) throw error;
        const saved = await dependencies.repository.saveCandidateFailure(
          candidate.id,
          error,
          candidate.claimedAt,
        );
        if (saved === false) return { status: "missing" as const };
        throw new PersistedEntityFailure();
      }

      const saved = await dependencies.repository.saveCandidateValidation(
        candidate.id,
        result,
        candidate.claimedAt,
      );
      if (!saved.saved) return { status: "missing" as const };
      if (saved.discoveredIds.length > 0) {
        await Promise.all(
          saved.discoveredIds.map((id) =>
            dependencies.enqueue(QUEUES.VALIDATE_CANDIDATE, id),
          ),
        );
      }
      return { status: "validated" as const };
    },

    async sweepCandidates() {
      const ids = await dependencies.repository.listCandidateIdsForValidation();
      await Promise.all(
        ids.map((id) =>
          dependencies.enqueue(QUEUES.VALIDATE_CANDIDATE, id),
        ),
      );
      return { queued: ids.length };
    },

    async revalidateListing(input: { listingId: string }) {
      const listing = await dependencies.repository.getListingForRevalidation(
        input.listingId,
      );
      if (!listing) {
        return { outcome: "succeeded" as const, status: "missing" as const };
      }

      let result: ListingValidationResult;
      let outcome: "succeeded" | "failed" = "succeeded";
      try {
        const observation = await dependencies.validate(listing.originalUrl);
        result = {
          status: observation.extraction.availability === "OUT_OF_STOCK"
            ? "OUT_OF_STOCK"
            : "ACTIVE",
          consecutiveFailures: 0,
          observation,
          failureKind: null,
          failure: null,
        };
      } catch (error) {
        if (!(error instanceof ValidatorClientError)) throw error;
        outcome = "failed";
        const failureKind = classifyFailure(error);
        const lastSuccessAgeHours = listing.lastSuccessAt
          ? (now().getTime() - listing.lastSuccessAt.getTime()) / 3_600_000
          : 25;
        const transition = transitionListing(
          {
            status: listing.status,
            consecutiveFailures: listing.consecutiveFailures,
            lastSuccessAgeHours,
          },
          { kind: failureKind },
        );
        result = {
          status: transition.status,
          consecutiveFailures: transition.consecutiveFailures,
          observation: null,
          failureKind,
          failure: error,
        };
      }
      await dependencies.repository.saveListingRevalidation(listing.id, result);
      return { outcome, status: result.status };
    },

    async sweepListings() {
      const ids = await dependencies.repository.listListingIdsForRevalidation();
      await Promise.all(
        ids.map((id) =>
          dependencies.enqueue(QUEUES.REVALIDATE_LISTING, id),
        ),
      );
      return { queued: ids.length };
    },
  };
}

function classifyFailure(error: unknown): CheckFailureKind {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  if (message.includes("404") || message.includes("not found")) return "HTTP_404";
  if (message.includes("410")) return "HTTP_410";
  if (message.includes("login") || message.includes("sign in")) return "LOGIN_WALL";
  if (message.includes("captcha") || message.includes("verify")) return "CAPTCHA";
  if (message.includes("401") || message.includes("unauthorized")) return "HTTP_401";
  if (message.includes("403") || message.includes("forbidden")) return "HTTP_403";
  if (message.includes("dns") || message.includes("resolve")) return "DNS_FAILURE";
  if (message.includes("tls") || message.includes("certificate")) return "TLS_ERROR";
  if (message.includes("5") && message.includes("http")) return "HTTP_5XX";
  return "TIMEOUT";
}
