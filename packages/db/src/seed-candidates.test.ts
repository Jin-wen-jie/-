import { describe, expect, it, vi } from "vitest";
import type { Db } from "./client.js";
import {
  type CandidateSeed,
  INITIAL_CANDIDATES,
  PUBLIC_RESEARCH_CHANNELS,
  pruneRetiredSeedCandidates,
  seedCandidates,
} from "./seed-candidates.js";

describe("seedCandidates", () => {
  it("keeps public PriceAI research in review with its source evidence", () => {
    const researchCandidates = INITIAL_CANDIDATES.filter(
      (candidate) => candidate.extractionResult?.sourceUrl ===
        "https://priceai.cc/products/chatgpt-team-business",
    );

    expect(researchCandidates.length).toBeGreaterThan(0);
    expect(researchCandidates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          status: "REVIEW_REQUIRED",
          extractionResult: expect.objectContaining({
            focus: "K12",
            note: expect.stringContaining("no fraud conclusion recorded"),
          }),
        }),
        expect.objectContaining({
          status: "REVIEW_REQUIRED",
          extractionResult: expect.objectContaining({
            focus: "Bug Team",
            note: expect.stringContaining("no fraud conclusion recorded"),
          }),
        }),
      ]),
    );
    expect(
      researchCandidates.every(
        (candidate) =>
          candidate.status === "REVIEW_REQUIRED" &&
          candidate.extractionResult !== undefined,
      ),
    ).toBe(true);
  });

  it("keeps unique in-stock candidates and excludes K12 above CNY 1.20", () => {
    const merchantNames = new Set(
      INITIAL_CANDIDATES.map((candidate) =>
        String(candidate.extractionResult?.merchantName),
      ),
    );
    const productUrls = INITIAL_CANDIDATES.map(
      (candidate) => candidate.productUrl,
    );

    expect(INITIAL_CANDIDATES.length).toBeGreaterThan(0);
    expect(merchantNames.size).toBeGreaterThan(0);
    expect(new Set(productUrls).size).toBe(productUrls.length);
    expect(
      INITIAL_CANDIDATES.every(
        (candidate) =>
          candidate.status === "REVIEW_REQUIRED" &&
          candidate.extractionResult?.availability === "IN_STOCK" &&
          Number(candidate.extractionResult?.price) > 0,
      ),
    ).toBe(true);
    expect(
      INITIAL_CANDIDATES.filter(
        (candidate) => candidate.extractionResult?.focus === "K12",
      ).every((candidate) => {
        const extraction = candidate.extractionResult ?? {};
        const effectivePrice = Number(
          extraction.totalPrice ?? extraction.price,
        );
        return Number.isFinite(effectivePrice) && effectivePrice <= 1.2;
      }),
    ).toBe(true);
  });

  it("keeps the discovered public channel catalog unique and auditable", () => {
    const channelUrls = PUBLIC_RESEARCH_CHANNELS.map(
      (channel) => channel.channelUrl,
    );

    expect(PUBLIC_RESEARCH_CHANNELS.length).toBeGreaterThanOrEqual(100);
    expect(new Set(channelUrls).size).toBe(channelUrls.length);
    expect(
      PUBLIC_RESEARCH_CHANNELS.filter(
        (channel) => channel.status === "VERIFIED_PRODUCT",
      ).length,
    ).toBeGreaterThanOrEqual(100);
    expect(
      PUBLIC_RESEARCH_CHANNELS.some((channel) => channel.status === "RECHECK"),
    ).toBe(true);
  });

  it("prunes only known retired seed candidates before reseeding", async () => {
    const where = vi.fn().mockResolvedValue(undefined);
    const remove = vi.fn(() => ({ where }));
    const db = { delete: remove } as unknown as Db;

    await pruneRetiredSeedCandidates(db);

    expect(remove).toHaveBeenCalled();
    expect(where).toHaveBeenCalled();
  });

  it("persists review evidence once for duplicate canonical input URLs", async () => {
    const inserted: Record<string, unknown>[] = [];
    const db = {
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue([]),
          })),
        })),
      })),
      insert: vi.fn(() => ({
        values: vi.fn((value: Record<string, unknown>) => {
          inserted.push(value);
          return Promise.resolve();
        }),
      })),
    } as unknown as Db;
    const extractionResult = {
      sourceUrl: "https://priceai.cc/products/chatgpt-team-business",
      focus: "K12",
      note: "Public research only; no fraud conclusion recorded.",
    };
    const candidates: CandidateSeed[] = [
      {
        productUrl: "https://pay.ldxp.cn/item/example#first",
        sourceType: "manual",
        status: "REVIEW_REQUIRED",
        extractionResult,
      },
      {
        productUrl: "https://pay.ldxp.cn/item/example#second",
        sourceType: "manual",
        status: "REVIEW_REQUIRED",
        extractionResult,
      },
    ];
    await seedCandidates(db, candidates);

    expect(inserted).toHaveLength(1);
    expect(inserted[0]).toMatchObject({
      productUrl: "https://pay.ldxp.cn/item/example",
      canonicalUrl: "https://pay.ldxp.cn/item/example",
      sourceType: "manual",
      status: "REVIEW_REQUIRED",
      extractionResult,
    });
  });
});
