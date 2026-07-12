import { describe, expect, it } from "vitest";
import {
  canNormalizeCandidateStatus,
  fingerprintCandidateUrl,
  toCandidateView,
} from "./candidate-service.js";

describe("candidate service", () => {
  it("maps public K12 evidence without inventing a price", () => {
    const createdAt = new Date("2026-07-11T13:58:03.000Z");

    expect(
      toCandidateView({
        id: "research-k12-codesky",
        productUrl: "https://store.codesky.qzz.io/item/8",
        sourceType: "manual",
        status: "REVIEW_REQUIRED",
        extractionResult: {
          sold: 173,
          focus: "K12",
          inventory: 0,
          pageTitle: "GPT-K12子号(家宽ip注册,稳定性尚可)",
          sourceUrl: "https://store.codesky.qzz.io/item/8",
          observedAt: "2026-07-11T00:00:00+08:00",
          availability: "OUT_OF_STOCK",
          merchantName: "花生店铺",
        },
        eventSourceUrl: null,
        createdAt,
      }),
    ).toMatchObject({
      title: "GPT-K12子号(家宽ip注册,稳定性尚可)",
      merchantName: "花生店铺",
      merchantUrl: "https://store.codesky.qzz.io/",
      focus: "K12",
      availability: "OUT_OF_STOCK",
      sold: 173,
      inventory: 0,
      price: null,
      createdAt: createdAt.toISOString(),
    });
  });

  it("does not infer Bug Team from an ordinary Team listing", () => {
    const view = toCandidateView({
      id: "research-gptmf-team",
      productUrl: "https://shop.gptmf.com/buy/26",
      sourceType: "manual",
      status: "DISCOVERED",
      extractionResult: {
        pageTitle: "ChatGPT Team账号-企业号",
        note: "普通Team商品，不等同于Bug Team",
        merchantName: "GPT魔法商店",
      },
      eventSourceUrl: null,
      createdAt: new Date("2026-07-11T13:58:03.000Z"),
    });

    expect(view.focus).toBeNull();
    expect(view.evidenceNote).toBe("普通Team商品，不等同于Bug Team");
  });

  it("deduplicates URL fragments while preserving product query parameters", () => {
    expect(
      fingerprintCandidateUrl("https://example.com/item/8#details"),
    ).toBe(fingerprintCandidateUrl("https://example.com/item/8"));
    expect(fingerprintCandidateUrl("https://example.com/item?id=8")).not.toBe(
      fingerprintCandidateUrl("https://example.com/item?id=9"),
    );
  });

  it.each([
    ["DISCOVERED", true],
    ["REVIEW_REQUIRED", true],
    ["VALIDATING", false],
    ["RETRY_WAIT", false],
    ["APPROVED", false],
    ["REJECTED", false],
  ])("allows normalization for %s: %s", (status, expected) => {
    expect(canNormalizeCandidateStatus(status)).toBe(expected);
  });
});
