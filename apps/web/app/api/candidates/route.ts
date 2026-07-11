import { NextResponse } from "next/server";
import { z } from "zod";

const createSchema = z.object({ productUrl: z.string().url() });

const demoCandidates: Array<{
  id: string; productUrl: string; sourceType: "manual" | "x" | "telegram";
  status: string; title: string | null; price: string | null;
  merchantName: string | null; sourceUrl: string | null; merchantUrl: string | null; createdAt: string;
}> = [
  // ── 梦泽小店 (已验证) ──
  { id: "c-1", productUrl: "https://pay.ldxp.cn/shop/mengze", sourceType: "x", status: "APPROVED", title: "ChatGPT Plus 共享 30天", price: "¥15/月", merchantName: "梦泽小店", sourceUrl: "https://x.com/search?q=pay.ldxp.cn/shop/mengze", merchantUrl: "https://pay.ldxp.cn/shop/mengze", createdAt: "2026-07-11T10:00:00Z" },
  { id: "c-2", productUrl: "https://pay.ldxp.cn/shop/mengze", sourceType: "x", status: "APPROVED", title: "Claude Pro 独享月付", price: "¥25/月", merchantName: "梦泽小店", sourceUrl: "https://x.com/search?q=pay.ldxp.cn/shop/mengze", merchantUrl: "https://pay.ldxp.cn/shop/mengze", createdAt: "2026-07-11T09:30:00Z" },
  { id: "c-3", productUrl: "https://pay.ldxp.cn/shop/mengze", sourceType: "telegram", status: "APPROVED", title: "Gemini Advanced 年度代购", price: "¥180/年", merchantName: "梦泽小店", sourceUrl: "https://t.me/ai_goods/45", merchantUrl: "https://pay.ldxp.cn/shop/mengze", createdAt: "2026-07-11T09:00:00Z" },

  // ── 星辰AI数码 (X发现，待审核) ──
  { id: "c-4", productUrl: "https://pay.ldxp.cn/shop/mengze", sourceType: "x", status: "REVIEW_REQUIRED", title: "ChatGPT Plus 独享号 批发价", price: "¥35/月", merchantName: "星辰AI数码", sourceUrl: "https://x.com/xingchen_ai/status/1912000001", merchantUrl: null, createdAt: "2026-07-11T08:30:00Z" },
  { id: "c-5", productUrl: "https://pay.ldxp.cn/shop/mengze", sourceType: "x", status: "REVIEW_REQUIRED", title: "OpenAI API $50 额度包", price: "$50", merchantName: "星辰AI数码", sourceUrl: "https://x.com/xingchen_ai/status/1912000002", merchantUrl: null, createdAt: "2026-07-11T08:00:00Z" },

  // ── TG克劳德车 (Telegram发现，待审核) ──
  { id: "c-6", productUrl: "https://pay.ldxp.cn/shop/mengze", sourceType: "telegram", status: "REVIEW_REQUIRED", title: "Claude Pro 三人共享车位", price: "¥12/月/人", merchantName: "TG克劳德车", sourceUrl: "https://t.me/claude_car/88", merchantUrl: null, createdAt: "2026-07-11T07:30:00Z" },
  { id: "c-7", productUrl: "https://pay.ldxp.cn/shop/mengze", sourceType: "telegram", status: "DISCOVERED", title: "Claude Team 5席位套餐", price: "¥150/月", merchantName: "TG克劳德车", sourceUrl: "https://t.me/claude_car/89", merchantUrl: null, createdAt: "2026-07-11T07:00:00Z" },

  // ── API老王 (X发现，待核实) ──
  { id: "c-8", productUrl: "https://pay.ldxp.cn/shop/mengze", sourceType: "x", status: "DISCOVERED", title: "DeepSeek API 代充值", price: "¥0.0008/1K tokens", merchantName: "API老王", sourceUrl: "https://x.com/api_laowang/status/1913000001", merchantUrl: null, createdAt: "2026-07-11T06:00:00Z" },

  // ── 手工补链 ──
  { id: "c-9", productUrl: "https://pay.ldxp.cn/shop/mengze", sourceType: "manual", status: "REVIEW_REQUIRED", title: "Perplexity Pro 1年代购 折扣价", price: "¥130/年", merchantName: "AI海淘小铺", sourceUrl: null, merchantUrl: null, createdAt: "2026-07-10T22:00:00Z" },
  { id: "c-10", productUrl: "https://pay.ldxp.cn/shop/mengze", sourceType: "manual", status: "VALIDATING", title: null, price: null, merchantName: "教育号专卖店", sourceUrl: null, merchantUrl: null, createdAt: "2026-07-10T21:00:00Z" },
  { id: "c-11", productUrl: "https://pay.ldxp.cn/shop/mengze", sourceType: "manual", status: "REJECTED", title: "Grok 月付 — 已驳回：价格异常偏高", price: "¥30/月", merchantName: "Grok代购", sourceUrl: null, merchantUrl: null, createdAt: "2026-07-10T20:00:00Z" },
  { id: "c-12", productUrl: "https://pay.ldxp.cn/shop/mengze", sourceType: "x", status: "RETRY_WAIT", title: "Mistral API 额度 — 链接失效重试中", price: "待验证", merchantName: "待核实", sourceUrl: "https://x.com/ai_deals/status/1914000001", merchantUrl: null, createdAt: "2026-07-10T19:00:00Z" },
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
