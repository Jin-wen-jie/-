import { describe, expect, it } from "vitest";

// ── TG connector types ──

export interface TelegramMessage {
  channel: string;
  id: number;
  text: string;
}

export interface TelegramParsedRow {
  sourceUrl: string;
  productUrl: string;
  cursor: string;
}

export interface TelegramError {
  errorMessage: string;
}

export type TelegramErrorKind =
  | "RATE_LIMIT"
  | "AUTH_DISABLED"
  | "NOT_CONFIGURED"
  | "UNKNOWN";

export interface TelegramErrorResult {
  kind: TelegramErrorKind;
  retryAfterSeconds?: number;
}

// ── Implementation ──

export function parseTelegramMessage(
  msg: TelegramMessage,
): TelegramParsedRow | null {
  const urlMatch = msg.text.match(/https?:\/\/[^\s]+/);
  if (!urlMatch) return null;
  const productUrl = urlMatch[0]!;

  return {
    sourceUrl: `https://t.me/${msg.channel}/${msg.id}`,
    productUrl,
    cursor: String(msg.id),
  };
}

export function classifyTelegramError(
  error: TelegramError,
): TelegramErrorResult {
  const msg = error.errorMessage ?? "";

  if (!msg) {
    return { kind: "NOT_CONFIGURED" };
  }

  if (msg.includes("FLOOD_WAIT_")) {
    const seconds = Number.parseInt(msg.split("FLOOD_WAIT_")[1] ?? "0", 10);
    return { kind: "RATE_LIMIT", retryAfterSeconds: seconds || 30 };
  }

  if (msg.includes("AUTH_KEY")) {
    return { kind: "AUTH_DISABLED" };
  }

  if (msg.includes("SESSION")) {
    return { kind: "NOT_CONFIGURED" };
  }

  return { kind: "UNKNOWN" };
}

describe("Telegram connector", () => {
  it("builds public source and product URLs", () => {
    expect(
      parseTelegramMessage({
        channel: "public_shop",
        id: 12,
        text: "GPT https://shop.example/p/1",
      }),
    ).toMatchObject({
      sourceUrl: "https://t.me/public_shop/12",
      productUrl: "https://shop.example/p/1",
    });
  });

  it("honors the exact flood wait", () => {
    expect(
      classifyTelegramError({ errorMessage: "FLOOD_WAIT_37" }),
    ).toMatchObject({ kind: "RATE_LIMIT", retryAfterSeconds: 37 });
  });
});
