import * as cheerio from "cheerio";
import { z } from "zod";

export const PRICEAI_TEAM_BUSINESS_URL =
  "https://priceai.cc/products/chatgpt-team-business";

export const PRICEAI_CLAUDE_PRODUCTS = [
  { slug: "claude-account", plan: "Account" },
  { slug: "claude-pro-month", plan: "Pro" },
  { slug: "claude-max-5x", plan: "Max 5x" },
  { slug: "claude-max-20x", plan: "Max 20x" },
  { slug: "claude-team-standard", plan: "Team Standard" },
  { slug: "claude-team-premium", plan: "Team Premium" },
] as const;

const MAX_PRICEAI_HTML_BYTES = 5 * 1024 * 1024;

const offerSchema = z.object({
  url: z.string().url(),
  sourceTitle: z.string().default(""),
  sourceStoreName: z.string().nullable().optional(),
  sourceName: z.string().nullable().optional(),
  price: z.number().nonnegative().nullable().optional(),
  currency: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
  effectiveStatus: z.string().nullable().optional(),
  stockCount: z.number().int().nonnegative().nullable().optional(),
  filterTags: z.array(z.string()).default([]),
  verifiedAt: z.string().nullable().optional(),
  capturedAt: z.string().nullable().optional(),
  hidden: z.boolean().default(false),
});

const initialDataSchema = z.object({
  total: z.number().int().nonnegative(),
  offers: z.array(offerSchema).max(500),
  limited: z.boolean().optional(),
});

export type PriceAiOffer = z.infer<typeof offerSchema>;

export interface PriceAiPageData {
  total: number;
  offers: PriceAiOffer[];
  limited: boolean;
}

export function parsePriceAiApiPage(value: unknown): PriceAiPageData {
  return normalizePageData(initialDataSchema.parse(value));
}

export function parsePriceAiPage(html: string): PriceAiPageData {
  if (Buffer.byteLength(html, "utf8") > MAX_PRICEAI_HTML_BYTES) {
    throw new Error("PRICEAI_RESPONSE_TOO_LARGE");
  }

  const $ = cheerio.load(html);
  const chunks: string[] = [];
  $("script").each((_, element) => {
    const source = $(element).html()?.trim() ?? "";
    const prefix = "self.__next_f.push(";
    if (!source.startsWith(prefix) || !source.endsWith(")")) return;
    try {
      const value = JSON.parse(source.slice(prefix.length, -1)) as unknown;
      if (
        Array.isArray(value) &&
        value[0] === 1 &&
        typeof value[1] === "string"
      ) {
        chunks.push(value[1]);
      }
    } catch {
      // Unrelated Next.js bootstrap scripts are ignored.
    }
  });

  const initialData = extractJsonObject(chunks.join(""), '"initialData":');
  return normalizePageData(initialDataSchema.parse(initialData));
}

function normalizePageData(
  parsed: z.infer<typeof initialDataSchema>,
): PriceAiPageData {
  return {
    total: parsed.total,
    offers: parsed.offers.filter((offer) => !offer.hidden),
    limited: parsed.limited ?? false,
  };
}

function extractJsonObject(input: string, marker: string): unknown {
  const markerIndex = input.indexOf(marker);
  if (markerIndex < 0) throw new Error("PRICEAI_INITIAL_DATA_MISSING");
  const start = input.indexOf("{", markerIndex + marker.length);
  if (start < 0) throw new Error("PRICEAI_INITIAL_DATA_INVALID");

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < input.length; index++) {
    const character = input[index]!;
    if (inString) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === '"') inString = false;
      continue;
    }
    if (character === '"') {
      inString = true;
      continue;
    }
    if (character === "{") depth++;
    if (character === "}" && --depth === 0) {
      return JSON.parse(input.slice(start, index + 1)) as unknown;
    }
  }
  throw new Error("PRICEAI_INITIAL_DATA_TRUNCATED");
}
