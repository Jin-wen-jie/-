import { describe, expect, it, vi } from "vitest";
import { PublicUrlError } from "./safe-url.js";
import { assertPublicUrl } from "./safe-url.js";
import { extractProduct } from "./extract-product.js";
import { createPinnedLookup, fetchPage } from "./fetch-page.js";

describe("validator", () => {
  it("blocks private destinations", async () => {
    await expect(
      assertPublicUrl("http://example.test/product", async () => [
        "127.0.0.1",
      ]),
    ).rejects.toThrow(PublicUrlError);
  });

  it.each([
    "http://0.0.0.0/",
    "http://[::1]/",
    "http://[::]/",
    "http://[2001::1]/",
    "http://[2002:7f00:1::]/",
    "http://[64:ff9b::7f00:1]/",
  ])("blocks IPv4 and IPv6 special destination %s", async (url) => {
    await expect(assertPublicUrl(url)).rejects.toMatchObject({
      code: "PRIVATE_ADDRESS",
    });
  });

  it("rejects the entire DNS result when any IPv6 address is private", async () => {
    await expect(
      assertPublicUrl("https://shop.example/product", async () => [
        "2606:4700:4700::1111",
        "::1",
      ]),
    ).rejects.toMatchObject({ code: "PRIVATE_ADDRESS" });
  });

  it("returns every validated address for connection pinning", async () => {
    await expect(
      assertPublicUrl("https://shop.example/product", async () => [
        "93.184.216.34",
        "2606:4700:4700::1111",
      ]),
    ).resolves.toMatchObject({
      hostname: "shop.example",
      addresses: [
        { address: "93.184.216.34", family: 4 },
        { address: "2606:4700:4700::1111", family: 6 },
      ],
    });
  });

  it("pins the transport lookup to validated addresses", async () => {
    const lookup = createPinnedLookup([
      { address: "93.184.216.34", family: 4 },
    ]);

    await expect(
      new Promise<{ address: string; family: number }>((resolve, reject) => {
        lookup("attacker.example", { family: 0 }, (error, address, family) => {
          if (error) reject(error);
          else resolve({ address: address as string, family: family as number });
        });
      }),
    ).resolves.toEqual({ address: "93.184.216.34", family: 4 });
  });

  it("revalidates and pins every redirect hop", async () => {
    const resolveUrl = vi
      .fn()
      .mockResolvedValueOnce({
        hostname: "first.example",
        addresses: [{ address: "93.184.216.34", family: 4 }],
      })
      .mockResolvedValueOnce({
        hostname: "second.example",
        addresses: [{ address: "203.0.113.10", family: 4 }],
      });
    const request = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(null, {
          status: 302,
          headers: { location: "https://second.example/product" },
        }),
      )
      .mockResolvedValueOnce(
        new Response("<html><title>Product</title></html>", {
          status: 200,
          headers: { "content-type": "text/html" },
        }),
      );

    await expect(
      fetchPage("https://first.example/product", { resolveUrl, request }),
    ).resolves.toMatchObject({
      finalUrl: "https://second.example/product",
      redirectChain: ["https://first.example/product"],
    });
    expect(request).toHaveBeenNthCalledWith(
      1,
      "https://first.example/product",
      [{ address: "93.184.216.34", family: 4 }],
      expect.any(AbortSignal),
    );
    expect(request).toHaveBeenNthCalledWith(
      2,
      "https://second.example/product",
      [{ address: "203.0.113.10", family: 4 }],
      expect.any(AbortSignal),
    );
  });

  it("extracts a normal public product", () => {
    const html =
      '<script type="application/ld+json">{"@type":"Product","name":"K12 ChatGPT Education","offers":{"@type":"Offer","price":"19.99","priceCurrency":"USD","availability":"https://schema.org/InStock"}}</script>';
    expect(
      extractProduct(html, "https://shop.example/product"),
    ).toMatchObject({
      title: "K12 ChatGPT Education",
      price: "19.99",
      currency: "USD",
      availability: "IN_STOCK",
    });
  });

  it("normalizes a numeric JSON-LD price to the response string contract", () => {
    const html =
      '<script type="application/ld+json">{"@type":"Product","name":"K12","offers":{"@type":"Offer","price":19.99,"priceCurrency":"USD"}}</script>';

    expect(extractProduct(html, "https://shop.example/product").price).toBe(
      "19.99",
    );
  });

  it("discovers only valid platform URLs", () => {
    const html = `
      <a href="https://pay.ldxp.cn/shop/store-a">LDXP shop</a>
      <a href="https://pay.ldxp.cn/item/item-a">LDXP item</a>
      <a href="https://store.codesky.qzz.io/item/8">Codesky item</a>
      <a href="https://store.codesky.qzz.io/item/8#details">Duplicate item</a>
      <a href="https://shop.gptmf.com/buy/26">GPTMF product</a>
      <a href="ftp://pay.ldxp.cn/item/evil">Unsupported protocol</a>
      <a href="https://store.codesky.qzz.io/buy/1">Wrong Codesky path</a>
      <a href="https://shop.gptmf.com/item/1">Wrong GPTMF path</a>
      <a href="https://user:pass@pay.ldxp.cn/item/secret">URL credentials</a>
      <a href="https://pay.ldxp.cn:8443/item/port">Non-standard port</a>
      <a href="https://evilgptmf.com/buy/99">Lookalike GPTMF domain</a>
      <a href="https://notldxp.cn/shop/fake">Lookalike LDXP domain</a>
    `;

    expect(
      extractProduct(html, "https://catalog.example/products"),
    ).toMatchObject({
      platformLinks: [
        "https://pay.ldxp.cn/shop/store-a",
        "https://pay.ldxp.cn/item/item-a",
        "https://store.codesky.qzz.io/item/8",
        "https://shop.gptmf.com/buy/26",
      ],
    });
  });

  it("does not discover the current page through another fragment", () => {
    expect(
      extractProduct(
        '<a href="#other">Current item</a>',
        "https://pay.ldxp.cn/item/a#current",
      ),
    ).toMatchObject({ platformLinks: [] });
  });

  it("returns at most 50 platform links from a sub-megabyte page", () => {
    const html = Array.from(
      { length: 75 },
      (_, index) =>
        `<a href="https://pay.ldxp.cn/item/${index}">item ${index}</a>`,
    ).join("");
    expect(Buffer.byteLength(html)).toBeLessThan(1024 * 1024);

    const result = extractProduct(html, "https://catalog.example/products");

    expect(result.platformLinks).toHaveLength(50);
    expect(result.platformLinks[0]).toBe("https://pay.ldxp.cn/item/0");
    expect(result.platformLinks[49]).toBe("https://pay.ldxp.cn/item/49");
  });

  it("does not return platform links longer than 2048 characters", () => {
    const longUrl = `https://pay.ldxp.cn/item/${"x".repeat(2_048)}`;

    expect(
      extractProduct(
        `<a href="${longUrl}">oversized item</a>`,
        "https://catalog.example/products",
      ),
    ).toMatchObject({ platformLinks: [] });
  });
});
