import { describe, expect, it } from "vitest";
import { mergeCandidateExtraction } from "./worker-repository.js";
import type { ValidatorResponse } from "./validator-client.js";

describe("worker repository mappings", () => {
  it("preserves manual investigation evidence when validation refreshes fields", () => {
    const validation = {
      extraction: {
        title: "K12 refreshed title",
        price: "12.00",
        currency: "CNY",
        availability: "OUT_OF_STOCK",
        stockText: "库存 0",
        stockQuantity: 0,
        buyAction: false,
        pageFingerprint: "new-page-hash",
        confidence: { title: 0.9, price: 0.8, availability: 1 },
      },
    } as ValidatorResponse;

    expect(
      mergeCandidateExtraction(
        {
          focus: "K12",
          note: "商铺公告明确写明 K12 已拉闸",
          sourceUrl: "https://shop.example/source",
          merchantName: "调查商铺",
        },
        validation,
        new Date("2026-07-12T00:00:00.000Z"),
      ),
    ).toMatchObject({
      focus: "K12",
      note: "商铺公告明确写明 K12 已拉闸",
      sourceUrl: "https://shop.example/source",
      merchantName: "调查商铺",
      pageTitle: "K12 refreshed title",
      price: "12.00",
      availability: "OUT_OF_STOCK",
      inventory: 0,
      observedAt: "2026-07-12T00:00:00.000Z",
    });
  });
});
