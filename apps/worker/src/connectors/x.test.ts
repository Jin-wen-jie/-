import { describe, expect, it } from "vitest";

// ── X connector types ──

export interface XSearchRow {
  sourceUrl: string;
  productUrl: string;
  cursor: string;
}

export interface XSearchResponse {
  data?: Array<{
    id: string;
    text: string;
    entities?: {
      urls?: Array<{ expanded_url: string }>;
    };
  }>;
  meta?: {
    newest_id?: string;
  };
}

// ── Implementation ──

export function parseXSearch(response: XSearchResponse): XSearchRow[] {
  const rows: XSearchRow[] = [];
  const cursor = response.meta?.newest_id ?? "";

  for (const tweet of response.data ?? []) {
    const urls = tweet.entities?.urls ?? [];
    for (const url of urls) {
      const expanded = url.expanded_url;
      if (!expanded) continue;
      // Only include URLs that look like product links
      if (
        expanded.includes("http") &&
        !expanded.includes("twitter.com") &&
        !expanded.includes("x.com")
      ) {
        rows.push({
          sourceUrl: `https://x.com/i/web/status/${tweet.id}`,
          productUrl: expanded,
          cursor,
        });
      }
    }
  }

  return rows;
}

export type XErrorKind = "AUTH_DISABLED" | "RATE_LIMIT" | "SERVER_ERROR" | "UNKNOWN";

export function classifyXError(status: number): XErrorKind {
  if (status === 401 || status === 403) return "AUTH_DISABLED";
  if (status === 429) return "RATE_LIMIT";
  if (status >= 500) return "SERVER_ERROR";
  return "UNKNOWN";
}

describe("X connector", () => {
  it("keeps expanded product links and the source post", () => {
    const rows = parseXSearch({
      data: [
        {
          id: "42",
          text: "GPT stock",
          entities: {
            urls: [{ expanded_url: "https://shop.example/p/1" }],
          },
        },
      ],
      meta: { newest_id: "42" },
    });
    expect(rows[0]).toMatchObject({
      sourceUrl: "https://x.com/i/web/status/42",
      productUrl: "https://shop.example/p/1",
      cursor: "42",
    });
  });

  it("disables auth failures instead of returning empty results", () => {
    expect(classifyXError(403)).toBe("AUTH_DISABLED");
  });
});
