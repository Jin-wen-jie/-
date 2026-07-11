import { NextResponse } from "next/server";
import { z } from "zod";

const createSchema = z.object({ productUrl: z.string().url() });

const demoCandidates: Array<{
  id: string; productUrl: string; sourceType: "manual" | "x" | "telegram";
  status: string; title: string | null; price: string | null;
  merchantName: string | null; sourceUrl: string | null; merchantUrl: string | null; createdAt: string;
}> = [
  { id: "c-1", productUrl: "https://openai.com/chatgpt/pricing/", sourceType: "x", status: "REVIEW_REQUIRED", title: "ChatGPT Plus 月费订阅", price: "$20.00/月", merchantName: "OpenAI", sourceUrl: "https://x.com/OpenAI/status/1812345678901234567", merchantUrl: "https://openai.com", createdAt: "2026-07-11T10:00:00Z" },
  { id: "c-2", productUrl: "https://www.anthropic.com/pricing", sourceType: "telegram", status: "REVIEW_REQUIRED", title: "Claude Pro 月费计划", price: "$20.00/月", merchantName: "Anthropic", sourceUrl: "https://t.me/anthropic_claude/42", merchantUrl: "https://www.anthropic.com", createdAt: "2026-07-11T09:30:00Z" },
  { id: "c-3", productUrl: "https://ai.google.dev/pricing", sourceType: "x", status: "DISCOVERED", title: "Gemini Advanced 订阅", price: "$19.99/月", merchantName: "Google AI", sourceUrl: "https://x.com/GoogleAI/status/1823456789012345678", merchantUrl: "https://ai.google.dev", createdAt: "2026-07-11T09:00:00Z" },
  { id: "c-4", productUrl: "https://perplexity.ai/pro", sourceType: "telegram", status: "APPROVED", title: "Perplexity Pro 年度订阅", price: "$200.00/年", merchantName: "Perplexity", sourceUrl: "https://t.me/perplexity_ai/88", merchantUrl: "https://www.perplexity.ai", createdAt: "2026-07-11T08:30:00Z" },
  { id: "c-5", productUrl: "https://deepseek.ai/pricing", sourceType: "x", status: "VALIDATING", title: null, price: null, merchantName: "DeepSeek", sourceUrl: "https://x.com/deepseek_ai/status/1834567890123456789", merchantUrl: null, createdAt: "2026-07-11T08:00:00Z" },
  { id: "c-6", productUrl: "https://x.ai/grok", sourceType: "telegram", status: "REJECTED", title: "Grok Premium 月费", price: "$16.00/月", merchantName: "xAI", sourceUrl: "https://t.me/grok_community/23", merchantUrl: null, createdAt: "2026-07-11T07:00:00Z" },
  { id: "c-7", productUrl: "https://openai.com/api/pricing/", sourceType: "x", status: "APPROVED", title: "OpenAI API 额度充值", price: "按量计费", merchantName: "OpenAI API", sourceUrl: "https://x.com/OpenAIDevs/status/1845678901234567890", merchantUrl: "https://platform.openai.com", createdAt: "2026-07-11T06:30:00Z" },
  { id: "c-8", productUrl: "https://platform.openai.com/docs/guides/rate-limits", sourceType: "telegram", status: "REVIEW_REQUIRED", title: "GPT-4 API 访问权限", price: "Tier 定价", merchantName: "OpenAI Platform", sourceUrl: "https://t.me/openai_dev/101", merchantUrl: "https://platform.openai.com", createdAt: "2026-07-11T06:00:00Z" },
  { id: "c-9", productUrl: "https://mistral.ai/pricing/", sourceType: "x", status: "DISCOVERED", title: "Mistral API 按量付费", price: "€0.002/1K tokens", merchantName: "Mistral AI", sourceUrl: "https://x.com/MistralAI/status/1856789012345678901", merchantUrl: null, createdAt: "2026-07-11T05:00:00Z" },
  { id: "c-10", productUrl: "https://cohere.com/pricing", sourceType: "telegram", status: "VALIDATING", title: null, price: null, merchantName: null, sourceUrl: "https://t.me/cohere_dev/56", merchantUrl: null, createdAt: "2026-07-11T04:00:00Z" },
  { id: "c-11", productUrl: "https://replicate.com/pricing", sourceType: "manual", status: "REVIEW_REQUIRED", title: "Replicate AI 模型托管", price: "按 GPU 时间", merchantName: "Replicate", sourceUrl: null, merchantUrl: null, createdAt: "2026-07-10T22:00:00Z" },
  { id: "c-12", productUrl: "https://huggingface.co/pricing", sourceType: "x", status: "RETRY_WAIT", title: "HuggingFace Pro 订阅", price: "$9.00/月", merchantName: "HuggingFace", sourceUrl: "https://x.com/huggingface/status/1867890123456789012", merchantUrl: "https://huggingface.co", createdAt: "2026-07-10T20:00:00Z" },
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
