"use client";

import { useState } from "react";
import { DataTable } from "../../../components/data-table";
import { ExternalLink } from "../../../components/external-link";
import type { Column } from "../../../components/data-table";

interface RankingRow {
  id: string; spec: string; merchant: string; price: string; totalCny: string;
  unitCny: string; supplyScore: string; supplyEvidence: string; confidence: number;
  lastVerified: string; productUrl: string; sourceUrl?: string; merchantUrl?: string;
}

const demoRankings: RankingRow[] = [
  { id: "1", spec: "OpenAI | ChatGPT | Plus | 账号 | 独享 | 月付", merchant: "OpenAI", price: "$20.00/月", totalCny: "¥145.00", unitCny: "¥145.00/月", supplyScore: "95.0", supplyEvidence: "官方直营", confidence: 100, lastVerified: "刚刚", productUrl: "https://openai.com/chatgpt/pricing/", merchantUrl: "https://openai.com" },
  { id: "2", spec: "Anthropic | Claude | Pro | 账号 | 独享 | 月付", merchant: "Anthropic", price: "$20.00/月", totalCny: "¥145.00", unitCny: "¥145.00/月", supplyScore: "95.0", supplyEvidence: "官方直营", confidence: 100, lastVerified: "刚刚", productUrl: "https://www.anthropic.com/pricing", merchantUrl: "https://www.anthropic.com" },
  { id: "3", spec: "Google | Gemini | Advanced | 账号 | 独享 | 月付", merchant: "Google AI", price: "$19.99/月", totalCny: "¥145.00", unitCny: "¥145.00/月", supplyScore: "95.0", supplyEvidence: "官方直营", confidence: 100, lastVerified: "刚刚", productUrl: "https://ai.google.dev/pricing", merchantUrl: "https://ai.google.dev" },
  { id: "4", spec: "Perplexity | Perplexity | Pro | 账号 | 独享 | 年付", merchant: "Perplexity", price: "$200.00/年", totalCny: "¥1450.00", unitCny: "¥120.83/月", supplyScore: "95.0", supplyEvidence: "官方直营", confidence: 100, lastVerified: "刚刚", productUrl: "https://perplexity.ai/pro", merchantUrl: "https://www.perplexity.ai" },
  { id: "5", spec: "DeepSeek | DeepSeek | 通用 | API_QUOTA | 按量", merchant: "DeepSeek", price: "¥0.001/1K tokens", totalCny: "¥0.001", unitCny: "¥0.001/1K", supplyScore: "90.0", supplyEvidence: "官方直营", confidence: 100, lastVerified: "刚刚", productUrl: "https://deepseek.ai/pricing", merchantUrl: "https://deepseek.ai" },
  { id: "6", spec: "xAI | Grok | Premium | 账号 | 独享 | 月付", merchant: "xAI", price: "$16.00/月", totalCny: "¥116.00", unitCny: "¥116.00/月", supplyScore: "88.0", supplyEvidence: "官方直营", confidence: 95, lastVerified: "1 小时前", productUrl: "https://x.ai/grok", merchantUrl: "https://x.ai" },
  { id: "7", spec: "Mistral | Mistral | API | API_QUOTA | 按量", merchant: "Mistral AI", price: "€0.002/1K tokens", totalCny: "¥0.016", unitCny: "¥0.016/1K", supplyScore: "88.0", supplyEvidence: "官方直营", confidence: 95, lastVerified: "1 小时前", productUrl: "https://mistral.ai/pricing/", merchantUrl: "https://mistral.ai" },
  { id: "8", spec: "OpenAI | API | Credits | API_QUOTA | 按量", merchant: "OpenAI Platform", price: "按量计费", totalCny: "按量", unitCny: "按量", supplyScore: "95.0", supplyEvidence: "官方直营", confidence: 100, lastVerified: "刚刚", productUrl: "https://openai.com/api/pricing/", merchantUrl: "https://platform.openai.com" },
  { id: "9", spec: "Cohere | Cohere | API | API_QUOTA | 按量", merchant: "Cohere", price: "免费层+付费", totalCny: "按量", unitCny: "按量", supplyScore: "85.0", supplyEvidence: "官方直营", confidence: 90, lastVerified: "2 小时前", productUrl: "https://cohere.com/pricing", merchantUrl: "https://cohere.com" },
  { id: "10", spec: "Replicate | Replicate | 按需 | API_QUOTA | 按 GPU 时间", merchant: "Replicate", price: "$0.0001/秒起", totalCny: "¥0.0007", unitCny: "¥0.0007/秒", supplyScore: "85.0", supplyEvidence: "官方直营", confidence: 90, lastVerified: "3 小时前", productUrl: "https://replicate.com/pricing", merchantUrl: "https://replicate.com" },
];

const priceColumns: Column<RankingRow>[] = [
  { key: "unitCny", header: "有效单位价", render: (r) => <span className="font-mono font-bold text-green-700 text-base">{r.unitCny}</span> },
  { key: "spec", header: "规格", render: (r) => <span className="text-gray-800 text-xs">{r.spec}</span> },
  { key: "merchant", header: "商家", render: (r) => <span className="font-semibold text-gray-900">{r.merchant}</span> },
  { key: "price", header: "原价", render: (r) => <span className="font-mono text-gray-700">{r.price}</span> },
  { key: "totalCny", header: "最低总支出", render: (r) => <span className="font-mono text-gray-900 font-semibold">{r.totalCny}</span> },
  { key: "product", header: "商品页", render: (r) => <ExternalLink href={r.productUrl}>打开商品页</ExternalLink> },
  { key: "verified", header: "验证", render: (r) => <span className="text-gray-600 text-xs">{r.lastVerified}</span> },
];

const supplyColumns: Column<RankingRow>[] = [
  { key: "supplyScore", header: "货源分", render: (r) => <span className="font-mono font-bold text-blue-700 text-base">{r.supplyScore}</span> },
  { key: "evidence", header: "货源证据", render: (r) => <span className="text-gray-800">{r.supplyEvidence}{r.confidence < 100 && <span className="ml-1.5 rounded bg-orange-100 px-1.5 py-0.5 text-xs font-medium text-orange-700">置信度 {r.confidence}%</span>}</span> },
  { key: "spec", header: "规格", render: (r) => <span className="text-gray-800 text-xs">{r.spec}</span> },
  { key: "merchant", header: "商家", render: (r) => <span className="font-semibold text-gray-900">{r.merchant}</span> },
  { key: "product", header: "商品页", render: (r) => <ExternalLink href={r.productUrl}>打开商品页</ExternalLink> },
  { key: "merchantLink", header: "店铺", render: (r) => r.merchantUrl ? <ExternalLink href={r.merchantUrl}>官网主页</ExternalLink> : <span className="text-gray-400">—</span> },
  { key: "verified", header: "验证", render: (r) => <span className="text-gray-600 text-xs">{r.lastVerified}</span> },
];

export default function DashboardPage() {
  const [tab, setTab] = useState<"price" | "supply">("price");
  return (
    <div>
      <h2 className="mb-4 text-xl font-bold text-gray-900">AI 商品比价总览</h2>
      <div className="mb-4 flex gap-2 border-b">
        <button onClick={() => setTab("price")} className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${tab === "price" ? "border-blue-600 text-blue-700" : "border-transparent text-gray-600 hover:text-gray-900"}`}>价格榜</button>
        <button onClick={() => setTab("supply")} className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${tab === "supply" ? "border-blue-600 text-blue-700" : "border-transparent text-gray-600 hover:text-gray-900"}`}>货源榜</button>
      </div>
      <DataTable columns={tab === "price" ? priceColumns : supplyColumns} rows={demoRankings} getRowKey={(r) => r.id} />
    </div>
  );
}
