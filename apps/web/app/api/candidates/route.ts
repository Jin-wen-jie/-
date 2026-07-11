import { NextResponse } from "next/server";
import { z } from "zod";

const createSchema = z.object({ productUrl: z.string().url() });

const demoCandidates: Array<{
  id: string; productUrl: string; sourceType: "manual" | "x" | "telegram";
  status: string; title: string | null; price: string | null;
  merchantName: string | null; sourceUrl: string | null; merchantUrl: string | null; createdAt: string;
}> = [
  { id: "c-1", productUrl: "https://example.com/gpt-plus", sourceType: "x", status: "REVIEW_REQUIRED", title: "GPT Plus 30 Days", price: "$19.99", merchantName: "AIShop", sourceUrl: "https://x.com/aishop/status/123", merchantUrl: "https://example.com/aisop", createdAt: "2026-07-11T10:00:00Z" },
  { id: "c-2", productUrl: "https://example.com/gpt-plus-2", sourceType: "telegram", status: "REVIEW_REQUIRED", title: "ChatGPT Plus 共享", price: "$9.99", merchantName: "ShareAI", sourceUrl: "https://t.me/shareai/99", merchantUrl: "https://example.com/shareai", createdAt: "2026-07-11T09:30:00Z" },
  { id: "c-3", productUrl: "https://example.com/claude-pro", sourceType: "x", status: "DISCOVERED", title: "Claude Pro Monthly", price: "$20.00", merchantName: "ClaudeMarket", sourceUrl: "https://x.com/claudemarket/456", merchantUrl: "https://example.com/claudemarket", createdAt: "2026-07-11T09:00:00Z" },
  { id: "c-4", productUrl: "https://example.com/gemini-adv", sourceType: "telegram", status: "APPROVED", title: "Gemini Advanced 1Y", price: "$21.99", merchantName: "GeminiDeals", sourceUrl: "https://t.me/geminideals/15", merchantUrl: "https://example.com/geminideals", createdAt: "2026-07-11T08:30:00Z" },
  { id: "c-5", productUrl: "https://example.com/aistore-claude", sourceType: "x", status: "VALIDATING", title: null, price: null, merchantName: "AIStore", sourceUrl: "https://x.com/aistore/789", merchantUrl: null, createdAt: "2026-07-11T08:00:00Z" },
  { id: "c-6", productUrl: "https://example.com/team-ai", sourceType: "telegram", status: "REJECTED", title: "ChatGPT Team Seat", price: "$25.00", merchantName: "TeamAI", sourceUrl: "https://t.me/teamai/50", merchantUrl: null, createdAt: "2026-07-11T07:00:00Z" },
  { id: "c-7", productUrl: "https://example.com/apihub", sourceType: "x", status: "APPROVED", title: "OpenAI API Credits", price: "$5.00/1M", merchantName: "APIHub", sourceUrl: "https://x.com/apihub/321", merchantUrl: "https://example.com/apihub", createdAt: "2026-07-11T06:30:00Z" },
  { id: "c-8", productUrl: "https://example.com/plus-shared", sourceType: "telegram", status: "REVIEW_REQUIRED", title: "GPT Plus Shared 30d", price: "$8.50", merchantName: "ProSeller", sourceUrl: "https://t.me/proseller/77", merchantUrl: "https://example.com/proseller", createdAt: "2026-07-11T06:00:00Z" },
  { id: "c-9", productUrl: "https://example.com/perplexity-pro", sourceType: "x", status: "DISCOVERED", title: "Perplexity Pro 1Y", price: "$199.00", merchantName: null, sourceUrl: "https://x.com/deals/555", merchantUrl: null, createdAt: "2026-07-11T05:00:00Z" },
  { id: "c-10", productUrl: "https://example.com/grok-premium", sourceType: "telegram", status: "VALIDATING", title: null, price: null, merchantName: null, sourceUrl: "https://t.me/grokdeals/12", merchantUrl: null, createdAt: "2026-07-11T04:00:00Z" },
  { id: "c-11", productUrl: "https://example.com/claude-team", sourceType: "manual", status: "REVIEW_REQUIRED", title: "Claude Team Plan", price: "$30.00", merchantName: "AIKing", sourceUrl: null, merchantUrl: null, createdAt: "2026-07-10T22:00:00Z" },
  { id: "c-12", productUrl: "https://example.com/gpt-pro-bulk", sourceType: "x", status: "RETRY_WAIT", title: "GPT Pro Bulk 10pcs", price: "$150.00", merchantName: "BulkAI", sourceUrl: "https://x.com/bulkai/111", merchantUrl: "https://example.com/bulkai", createdAt: "2026-07-10T20:00:00Z" },
];

export async function GET() {
  return NextResponse.json(demoCandidates);
}

export async function POST(request: Request) {
  const body = createSchema.safeParse(await request.json().catch(() => ({})));
  if (!body.success) {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }
  const candidate = {
    id: `manual-${Date.now()}`,
    productUrl: body.data.productUrl,
    sourceType: "manual" as const,
    status: "DISCOVERED",
    title: null, price: null, merchantName: null,
    sourceUrl: null, merchantUrl: null,
    createdAt: new Date().toISOString(),
  };
  demoCandidates.push(candidate);
  return NextResponse.json(candidate, { status: 201 });
}
