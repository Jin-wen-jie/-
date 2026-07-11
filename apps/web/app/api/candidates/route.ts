import { NextResponse } from "next/server";
import { z } from "zod";

const createSchema = z.object({ productUrl: z.string().url() });

// 演示数据模拟从公开来源发现的第三方 AI 商品线索
// 每个候选都对应一个可公开访问的第三方页面（非官方直营）
const demoCandidates: Array<{
  id: string; productUrl: string; sourceType: "manual" | "x" | "telegram";
  status: string; title: string | null; price: string | null;
  merchantName: string | null; sourceUrl: string | null; merchantUrl: string | null; createdAt: string;
}> = [
  // ── 从 X (Twitter) 公开帖子发现的第三方卖家 ──
  { id: "c-x1", productUrl: "https://www.futurepedia.io/", sourceType: "x", status: "REVIEW_REQUIRED", title: "AI 工具聚合目录 - 收录 3000+ AI 产品", price: "免费/付费混合", merchantName: "Futurepedia", sourceUrl: "https://x.com/futurepedia_io/status/1812000000000000001", merchantUrl: "https://www.futurepedia.io", createdAt: "2026-07-11T10:00:00Z" },
  { id: "c-x2", productUrl: "https://github.com/steven2358/awesome-generative-ai", sourceType: "x", status: "APPROVED", title: "Awesome Generative AI - 开源 AI 产品合集", price: "免费", merchantName: "GitHub 社区", sourceUrl: "https://x.com/steven2358/status/1823000000000000002", merchantUrl: "https://github.com/steven2358", createdAt: "2026-07-11T09:00:00Z" },
  { id: "c-x3", productUrl: "https://theresanaiforthat.com/", sourceType: "x", status: "DISCOVERED", title: "There's An AI For That - AI 工具搜索引擎", price: "免费", merchantName: "TAAIFT", sourceUrl: "https://x.com/theresanaifor/status/1834000000000000003", merchantUrl: "https://theresanaiforthat.com", createdAt: "2026-07-11T08:00:00Z" },
  { id: "c-x4", productUrl: "https://openai.com/chatgpt/pricing/", sourceType: "x", status: "REVIEW_REQUIRED", title: "X 帖提及: ChatGPT Plus 账号转售 $15/月", price: "$15.00/月 (第三方)", merchantName: "未知卖家 (X)", sourceUrl: "https://x.com/search?q=chatgpt%20plus%20account%20sell&src=typed_query", merchantUrl: null, createdAt: "2026-07-11T07:00:00Z" },

  // ── 从 Telegram 公共频道发现的第三方卖家 ──
  { id: "c-t1", productUrl: "https://www.futuretools.io/", sourceType: "telegram", status: "REVIEW_REQUIRED", title: "FutureTools - AI 工具导航与评测", price: "免费", merchantName: "FutureTools", sourceUrl: "https://t.me/futuretools", merchantUrl: "https://www.futuretools.io", createdAt: "2026-07-11T08:30:00Z" },
  { id: "c-t2", productUrl: "https://www.anthropic.com/pricing", sourceType: "telegram", status: "REVIEW_REQUIRED", title: "TG 频道分享: Claude Pro 共享车位 $12/月", price: "$12.00/月 (第三方)", merchantName: "TG 共享频道", sourceUrl: "https://t.me/s/ai_accounts_share", merchantUrl: null, createdAt: "2026-07-11T07:30:00Z" },
  { id: "c-t3", productUrl: "https://www.producthunt.com/topics/artificial-intelligence", sourceType: "telegram", status: "DISCOVERED", title: "ProductHunt AI 专区 - 每日新 AI 产品", price: "免费", merchantName: "ProductHunt", sourceUrl: "https://t.me/producthunt", merchantUrl: "https://www.producthunt.com", createdAt: "2026-07-11T06:30:00Z" },
  { id: "c-t4", productUrl: "https://deepseek.ai/pricing", sourceType: "telegram", status: "VALIDATING", title: null, price: null, merchantName: "TG 代充商家", sourceUrl: "https://t.me/s/deepseek_topup", merchantUrl: null, createdAt: "2026-07-11T05:30:00Z" },

  // ── 手工补链的第三方来源 ──
  { id: "c-m1", productUrl: "https://www.toolify.ai/", sourceType: "manual", status: "APPROVED", title: "Toolify - AI 工具目录与比价", price: "免费", merchantName: "Toolify", sourceUrl: null, merchantUrl: "https://www.toolify.ai", createdAt: "2026-07-10T22:00:00Z" },
  { id: "c-m2", productUrl: "https://saasaitools.com/", sourceType: "manual", status: "REVIEW_REQUIRED", title: "SaaS AI Tools - AI SaaS 产品列表", price: "免费", merchantName: "SaaS AI Tools", sourceUrl: null, merchantUrl: "https://saasaitools.com", createdAt: "2026-07-10T21:00:00Z" },
  { id: "c-m3", productUrl: "https://x.ai/grok", sourceType: "manual", status: "REJECTED", title: "Grok 订阅 - 无法确认第三方转售", price: "$16.00/月", merchantName: "待核实", sourceUrl: null, merchantUrl: null, createdAt: "2026-07-10T20:00:00Z" },
  { id: "c-m4", productUrl: "https://mistral.ai/pricing/", sourceType: "manual", status: "RETRY_WAIT", title: "Mistral API 额度 - 第三方代充疑似链接失效", price: "待验证", merchantName: "待核实", sourceUrl: null, merchantUrl: null, createdAt: "2026-07-10T19:00:00Z" },
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
