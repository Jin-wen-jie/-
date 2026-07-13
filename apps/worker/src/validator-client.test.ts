import { afterEach, describe, expect, it, vi } from "vitest";
import {
  validateUrl,
  ValidatorClientError,
  ValidatorInfrastructureError,
  type ValidatorResponse,
} from "./validator-client.js";

const validResponse = {
  originalUrl: "https://shop.example/item/1",
  finalUrl: "https://shop.example/item/1",
  redirectChain: [],
  httpStatus: 200,
  elapsedMs: 25,
  extraction: {
    title: "GPT K12",
    price: "10.00",
    currency: "CNY",
    availability: "IN_STOCK",
    stockText: "in stock",
    stockQuantity: 5,
    buyAction: true,
    pageFingerprint: "page-hash",
    platformLinks: [],
    confidence: { title: 1, price: 1, availability: 1 },
  },
} satisfies ValidatorResponse;

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("validator client", () => {
  it("accepts only a structurally valid validator response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse(validResponse, 200)),
    );

    await expect(validateUrl(
      "https://shop.example/item/1",
      "http://validator.internal",
      "shared-token",
    )).resolves.toEqual(validResponse);
  });

  it("rejects a valid response body returned with a non-200 success status", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse(validResponse, 201)),
    );

    await expect(validateUrl(
      "https://shop.example/item/1",
      "http://validator.internal",
      "shared-token",
    )).rejects.toMatchObject({
      code: "VALIDATOR_INVALID_RESPONSE",
      message: "VALIDATOR_INVALID_RESPONSE",
    });
  });

  it.each([
    ["INVALID_URL", 400],
    ["BAD_PROTOCOL", 400],
    ["CREDENTIALS_IN_URL", 400],
    ["BAD_PORT", 400],
    ["DNS_FAILURE", 400],
    ["PRIVATE_ADDRESS", 400],
    ["TIMEOUT", 504],
    ["TOTAL_TIMEOUT", 504],
    ["FETCH_ERROR", 502],
    ["NOT_HTML", 502],
    ["TOO_MANY_REDIRECTS", 502],
    ["TOO_LARGE", 413],
  ])("maps known URL error %s to an entity error", async (code, status) => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({
        error: code,
        message: "untrusted validator detail https://secret.example/item?token=x",
      }, status)),
    );

    const error = await validateUrl(
      "https://shop.example/item/1?private=x",
      "http://validator.internal",
      "shared-token",
    ).catch((failure: unknown) => failure);

    expect(error).toBeInstanceOf(ValidatorClientError);
    expect(error).toMatchObject({ code, message: code });
  });

  it.each([401, 403])(
    "treats validator authentication status %s as infrastructure failure",
    async (status) => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(jsonResponse({ error: "UNAUTHORIZED" }, status)),
      );

      await expect(validateUrl(
        "https://shop.example/item/1",
        "http://validator.internal",
        "shared-token",
      )).rejects.toMatchObject({
        name: "ValidatorInfrastructureError",
        code: "VALIDATOR_AUTH_FAILED",
        message: "VALIDATOR_AUTH_FAILED",
      });
    },
  );

  it("redacts connection failure details behind a stable error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(
        new Error("connect failed shared-token https://shop.example/private"),
      ),
    );

    const error = await validateUrl(
      "https://shop.example/item/1",
      "http://127.0.0.1:3001",
      "shared-token",
    ).catch((failure: unknown) => failure);

    expect(error).toBeInstanceOf(ValidatorInfrastructureError);
    expect(error).toMatchObject({
      code: "VALIDATOR_UNAVAILABLE",
      message: "VALIDATOR_UNAVAILABLE",
    });
    expect(String(error)).not.toMatch(/shared-token|shop\.example|private/);
  });

  it("uses a client timeout longer than the validator's internal timeout", async () => {
    const timeout = vi.spyOn(AbortSignal, "timeout").mockReturnValue(
      new AbortController().signal,
    );
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(
        Object.assign(new Error("timed out for private URL"), {
          name: "TimeoutError",
        }),
      ),
    );

    await expect(validateUrl(
      "https://shop.example/item/1",
      "http://validator.internal",
      "shared-token",
    )).rejects.toMatchObject({
      code: "VALIDATOR_CLIENT_TIMEOUT",
      message: "VALIDATOR_CLIENT_TIMEOUT",
    });
    expect(timeout).toHaveBeenCalledWith(20_000);
  });

  it.each([
    ["non-JSON", new Response("gateway failure", { status: 502 })],
    ["unknown error code", jsonResponse({
      error: "SOMETHING_NEW",
      message: "validator detail",
    }, 502)],
    ["invalid 200 response", jsonResponse({ ok: true }, 200)],
  ])("rejects %s as a stable protocol failure", async (_name, response) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));

    const error = await validateUrl(
      "https://shop.example/item/1",
      "http://validator.internal",
      "shared-token",
    ).catch((failure: unknown) => failure);

    expect(error).toBeInstanceOf(ValidatorInfrastructureError);
    expect(error).toMatchObject({
      code: "VALIDATOR_INVALID_RESPONSE",
      message: "VALIDATOR_INVALID_RESPONSE",
    });
    expect(String(error)).not.toMatch(/gateway failure|SOMETHING_NEW|validator detail/);
  });

  it.each([
    [
      "more than 50 platform links",
      Array.from(
        { length: 51 },
        (_, index) => `https://pay.ldxp.cn/item/${index}`,
      ),
    ],
    [
      "a platform link longer than 2048 characters",
      [`https://pay.ldxp.cn/item/${"x".repeat(2_048)}`],
    ],
  ])("rejects a 200 response with %s", async (_name, platformLinks) => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({
        ...validResponse,
        extraction: { ...validResponse.extraction, platformLinks },
      }, 200)),
    );

    await expect(validateUrl(
      "https://shop.example/item/1",
      "http://validator.internal",
      "shared-token",
    )).rejects.toMatchObject({
      code: "VALIDATOR_INVALID_RESPONSE",
    });
  });
});

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}
