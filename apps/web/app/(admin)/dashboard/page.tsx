"use client";

import { useState } from "react";
import { DataTable } from "../../../components/data-table";
import { ExternalLink } from "../../../components/external-link";
import { StatusBadge } from "../../../components/status-badge";
import type { Column } from "../../../components/data-table";

interface RankingRow {
  id: string;
  spec: string;
  merchant: string;
  price: string;
  totalCny: string;
  unitCny: string;
  supplyScore: string;
  supplyEvidence: string;
  confidence: number;
  lastVerified: string;
  productUrl: string;
  sourceUrl?: string;
  merchantUrl?: string;
}

const demoRankings: RankingRow[] = [
  {
    id: "1", spec: "OpenAI | ChatGPT | Plus | 账号 | 独享 | TRANSFERRED",
    merchant: "AIShop", price: "$19.99 × 1", totalCny: "¥145.00", unitCny: "¥145.00",
    supplyScore: "92.5", supplyEvidence: "明确库存 50", confidence: 95,
    lastVerified: "2 小时前",
    productUrl: "https://example.com/gpt-plus",
    sourceUrl: "https://x.com/aishop/status/123",
    merchantUrl: "https://example.com/aisop",
  },
  {
    id: "2", spec: "OpenAI | ChatGPT | Plus | 账号 | 独享 | TRANSFERRED",
    merchant: "GPTMarket", price: "$18.50 × 1", totalCny: "¥134.00", unitCny: "¥134.00",
    supplyScore: "72.3", supplyEvidence: "页面有货", confidence: 61,
    lastVerified: "1 小时前",
    productUrl: "https://example.com/gpt-plus-2",
    sourceUrl: "https://t.me/gptmarket/42",
    merchantUrl: "https://example.com/gptmarket",
  },
  {
    id: "3", spec: "OpenAI | ChatGPT | Plus | 账号 | 共享 | RETAINED",
    merchant: "ShareAI", price: "$9.99 × 1", totalCny: "¥72.50", unitCny: "¥72.50",
    supplyScore: "85.0", supplyEvidence: "明确库存 120", confidence: 98,
    lastVerified: "30 分钟前",
    productUrl: "https://example.com/share-plus",
    sourceUrl: "https://x.com/shareai/status/456",
    merchantUrl: "https://example.com/shareai",
  },
  {
    id: "4", spec: "Anthropic | Claude | Pro | 账号 | 独享 | TRANSFERRED",
    merchant: "ClaudeMarket", price: "$20.00 × 1", totalCny: "¥145.00", unitCny: "¥145.00",
    supplyScore: "78.1", supplyEvidence: "页面有货", confidence: 55,
    lastVerified: "3 小时前",
    productUrl: "https://example.com/claude-pro",
    sourceUrl: "https://t.me/claudemarket/88",
    merchantUrl: "https://example.com/claudemarket",
  },
  {
    id: "5", spec: "Anthropic | Claude | Pro | 账号 | 共享 | RETAINED",
    merchant: "AIStore", price: "$12.00 × 1", totalCny: "¥87.00", unitCny: "¥87.00",
    supplyScore: "66.4", supplyEvidence: "购买按钮可用", confidence: 42,
    lastVerified: "5 小时前",
    productUrl: "https://example.com/aistore-claude",
    sourceUrl: "https://x.com/aistore/status/789",
  },
  {
    id: "6", spec: "Google | Gemini | Advanced | 账号 | 独享 | TRANSFERRED",
    merchant: "GeminiDeals", price: "$21.99 × 1", totalCny: "¥159.50", unitCny: "¥159.50",
    supplyScore: "88.2", supplyEvidence: "明确库存 80", confidence: 91,
    lastVerified: "1 小时前",
    productUrl: "https://example.com/gemini-adv",
    sourceUrl: "https://t.me/geminideals/15",
    merchantUrl: "https://example.com/geminideals",
  },
  {
    id: "7", spec: "OpenAI | ChatGPT | Team | 席位 | 独享 | TRANSFERRED",
    merchant: "TeamAI", price: "$25.00 × 1", totalCny: "¥181.25", unitCny: "¥181.25",
    supplyScore: "54.7", supplyEvidence: "购买按钮可用", confidence: 38,
    lastVerified: "8 小时前",
    productUrl: "https://example.com/team-ai",
    sourceUrl: "https://x.com/teamai/status/999",
  },
  {
    id: "8", spec: "OpenAI | API | 额度 | API_QUOTA | NOT_APPLICABLE",
    merchant: "APIHub", price: "$5.00/1M tokens", totalCny: "¥36.25", unitCny: "¥36.25",
    supplyScore: "95.0", supplyEvidence: "明确库存 unlimited", confidence: 99,
    lastVerified: "10 分钟前",
    productUrl: "https://example.com/apihub",
    merchantUrl: "https://example.com/apihub",
  },
];

const priceColumns: Column<RankingRow>[] = [
  { key: "unitCny", header: "有效单位价", render: (r) => <span className="font-mono font-bold text-green-700 text-base">{r.unitCny}</span> },
  { key: "spec", header: "规格", render: (r) => <span className="text-gray-800">{r.spec}</span> },
  { key: "merchant", header: "商家", render: (r) => <span className="font-semibold text-gray-900">{r.merchant}</span> },
  { key: "price", header: "原价", render: (r) => <span className="font-mono text-gray-700">{r.price}</span> },
  { key: "totalCny", header: "最低总支出", render: (r) => <span className="font-mono text-gray-900 font-semibold">{r.totalCny}</span> },
  { key: "product", header: "商品页", render: (r) => <ExternalLink href={r.productUrl}>商品页</ExternalLink> },
  { key: "source", header: "来源", render: (r) => r.sourceUrl ? <ExternalLink href={r.sourceUrl}>发现帖</ExternalLink> : <span className="text-gray-500">手工录入</span> },
  { key: "verified", header: "验证", render: (r) => <span className="text-gray-600 text-xs">{r.lastVerified}</span> },
];

const supplyColumns: Column<RankingRow>[] = [
  { key: "supplyScore", header: "货源分", render: (r) => <span className="font-mono font-bold text-blue-700 text-base">{r.supplyScore}</span> },
  { key: "evidence", header: "货源证据", render: (r) => <span className="text-gray-800">{r.supplyEvidence}{r.confidence < 80 && <span className="ml-1.5 rounded bg-orange-100 px-1.5 py-0.5 text-xs font-medium text-orange-700">估算 {r.confidence}%</span>}</span> },
  { key: "spec", header: "规格", render: (r) => <span className="text-gray-800">{r.spec}</span> },
  { key: "merchant", header: "商家", render: (r) => <span className="font-semibold text-gray-900">{r.merchant}</span> },
  { key: "product", header: "商品页", render: (r) => <ExternalLink href={r.productUrl}>商品页</ExternalLink> },
  { key: "source", header: "来源", render: (r) => r.sourceUrl ? <ExternalLink href={r.sourceUrl}>发现帖</ExternalLink> : <span className="text-gray-500">手工录入</span> },
  { key: "merchantLink", header: "店铺", render: (r) => r.merchantUrl ? <ExternalLink href={r.merchantUrl}>店铺主页</ExternalLink> : <span className="text-gray-400">—</span> },
  { key: "verified", header: "验证", render: (r) => <span className="text-gray-600 text-xs">{r.lastVerified}</span> },
];

export default function DashboardPage() {
  const [tab, setTab] = useState<"price" | "supply">("price");

  return (
    <div>
      <h2 className="mb-4 text-xl font-bold text-gray-900">商品比价总览</h2>
      <div className="mb-4 flex gap-2 border-b">
        <button onClick={() => setTab("price")} className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${tab === "price" ? "border-blue-600 text-blue-700" : "border-transparent text-gray-600 hover:text-gray-900"}`}>价格榜</button>
        <button onClick={() => setTab("supply")} className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${tab === "supply" ? "border-blue-600 text-blue-700" : "border-transparent text-gray-600 hover:text-gray-900"}`}>货源榜</button>
      </div>
      <DataTable columns={tab === "price" ? priceColumns : supplyColumns} rows={demoRankings} getRowKey={(r) => r.id} />
    </div>
  );
}
