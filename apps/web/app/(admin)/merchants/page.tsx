"use client";

import { DataTable } from "../../../components/data-table";
import { ExternalLink } from "../../../components/external-link";
import { StatusBadge } from "../../../components/status-badge";
import type { Column } from "../../../components/data-table";

interface Merchant {
  id: string; name: string; homepageUrl: string | null;
  platform: string; activeListings: number;
  lastVerifiedAt: string | null; status: string;
}

const demoMerchants: Merchant[] = [
  { id: "m-1", name: "OpenAI",           homepageUrl: "https://openai.com",              platform: "官方",     activeListings: 4, lastVerifiedAt: "2026-07-11 10:00", status: "ACTIVE" },
  { id: "m-2", name: "Anthropic",        homepageUrl: "https://www.anthropic.com",       platform: "官方",     activeListings: 3, lastVerifiedAt: "2026-07-11 09:30", status: "ACTIVE" },
  { id: "m-3", name: "Google AI",        homepageUrl: "https://ai.google.dev",           platform: "官方",     activeListings: 2, lastVerifiedAt: "2026-07-11 09:00", status: "ACTIVE" },
  { id: "m-4", name: "Perplexity",        homepageUrl: "https://www.perplexity.ai",       platform: "官方",     activeListings: 1, lastVerifiedAt: "2026-07-11 08:30", status: "ACTIVE" },
  { id: "m-5", name: "DeepSeek",          homepageUrl: "https://deepseek.ai",             platform: "官方",     activeListings: 2, lastVerifiedAt: "2026-07-11 08:00", status: "ACTIVE" },
  { id: "m-6", name: "xAI (Grok)",       homepageUrl: "https://x.ai",                    platform: "官方",     activeListings: 1, lastVerifiedAt: "2026-07-11 07:30", status: "ACTIVE" },
  { id: "m-7", name: "Mistral AI",        homepageUrl: "https://mistral.ai",              platform: "官方",     activeListings: 2, lastVerifiedAt: "2026-07-11 07:00", status: "ACTIVE" },
  { id: "m-8", name: "Cohere",            homepageUrl: "https://cohere.com",              platform: "官方",     activeListings: 1, lastVerifiedAt: "2026-07-11 06:30", status: "ACTIVE" },
  { id: "m-9", name: "Replicate",         homepageUrl: "https://replicate.com",           platform: "官方",     activeListings: 1, lastVerifiedAt: "2026-07-11 06:00", status: "ACTIVE" },
  { id: "m-10", name: "HuggingFace",      homepageUrl: "https://huggingface.co",          platform: "官方",     activeListings: 1, lastVerifiedAt: "2026-07-10 22:00", status: "ACTIVE" },
];

const cols: Column<Merchant>[] = [
  { key: "name", header: "商家", render: (r) => <span className="font-semibold text-gray-900">{r.name}</span> },
  { key: "homepage", header: "官网主页", render: (r) => r.homepageUrl ? <ExternalLink href={r.homepageUrl}>打开官网</ExternalLink> : <span className="text-gray-500">未确认</span> },
  { key: "platform", header: "来源", render: (r) => <span className="text-gray-700">{r.platform}</span> },
  { key: "listings", header: "有效商品数", render: (r) => <span className="font-mono font-semibold text-gray-900">{r.activeListings}</span> },
  { key: "verified", header: "最后验证", render: (r) => r.lastVerifiedAt ? <span className="text-gray-600 text-xs">{r.lastVerifiedAt}</span> : <span className="text-gray-400">—</span> },
  { key: "status", header: "状态", render: (r) => <StatusBadge status={r.status} /> },
];

export default function MerchantsPage() {
  return (
    <div>
      <h2 className="mb-4 text-xl font-bold text-gray-900">商家档案</h2>
      <DataTable columns={cols} rows={demoMerchants} getRowKey={(r) => r.id} />
    </div>
  );
}
