import { describe, expect, it } from "vitest";
import { parsePriceAiApiPage, parsePriceAiPage } from "./priceai.js";

function pageWithInitialData(data: unknown): string {
  const payload = `2d:{"initialData":${JSON.stringify(data)}}`;
  return `<html><body><script>self.__next_f.push(${JSON.stringify([1, payload])})</script></body></html>`;
}

describe("PriceAI connector", () => {
  it("parses structured offer data from the public API", () => {
    expect(parsePriceAiApiPage({
      total: 2,
      limited: false,
      offers: [
        {
          url: "https://pay.ldxp.cn/item/visible",
          sourceTitle: "K12 Team account",
          price: 1.2,
          filterTags: ["team_k12"],
          hidden: false,
        },
        {
          url: "https://pay.ldxp.cn/item/hidden",
          sourceTitle: "Hidden K12 Team account",
          filterTags: ["team_k12"],
          hidden: true,
        },
      ],
    })).toEqual({
      total: 2,
      limited: false,
      offers: [expect.objectContaining({
        url: "https://pay.ldxp.cn/item/visible",
        price: 1.2,
      })],
    });
  });

  it("parses structured offer data from Next.js RSC chunks", () => {
    const html = pageWithInitialData({
      total: 471,
      limited: true,
      offers: [
        {
          url: "https://pay.ldxp.cn/item/k12-one",
          sourceTitle: "K12 Team 成品",
          sourceStoreName: "公开商铺",
          price: 0.88,
          currency: "CNY",
          status: "in_stock",
          stockCount: 12,
          filterTags: ["team_k12", "proxy_supported"],
          verifiedAt: "2026-07-15T09:00:00.000Z",
          hidden: false,
        },
        {
          url: "https://pay.ldxp.cn/item/hidden",
          sourceTitle: "隐藏报价",
          filterTags: ["team_k12"],
          hidden: true,
        },
      ],
    });

    expect(parsePriceAiPage(html)).toEqual({
      total: 471,
      limited: true,
      offers: [expect.objectContaining({
        url: "https://pay.ldxp.cn/item/k12-one",
        price: 0.88,
        stockCount: 12,
      })],
    });
  });

  it("rejects pages without structured initial data", () => {
    expect(() => parsePriceAiPage("<html><body>empty</body></html>"))
      .toThrow("PRICEAI_INITIAL_DATA_MISSING");
  });
});
