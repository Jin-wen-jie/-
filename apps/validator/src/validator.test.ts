import { describe, expect, it } from "vitest";
import { PublicUrlError } from "./safe-url.js";
import { assertPublicUrl } from "./safe-url.js";
import { extractProduct } from "./extract-product.js";

describe("validator", () => {
  it("blocks private destinations", async () => {
    await expect(
      assertPublicUrl("http://example.test/product", async () => [
        "127.0.0.1",
      ]),
    ).rejects.toThrow(PublicUrlError);
  });

  it("extracts a normal public product", () => {
    const html =
      '<script type="application/ld+json">{"@type":"Product","name":"GPT Plus 30 days","offers":{"@type":"Offer","price":"19.99","priceCurrency":"USD","availability":"https://schema.org/InStock"}}</script>';
    expect(
      extractProduct(html, "https://shop.example/product"),
    ).toMatchObject({
      title: "GPT Plus 30 days",
      price: "19.99",
      currency: "USD",
      availability: "IN_STOCK",
    });
  });
});
