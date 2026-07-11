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
  { id: "m-1", name: "AIShop",     homepageUrl: "https://example.com/aisop",     platform: "X",        activeListings: 4,  lastVerifiedAt: "2026-07-11 10:00", status: "ACTIVE" },
  { id: "m-2", name: "GPTMarket",  homepageUrl: "https://example.com/gptmarket",  platform: "Telegram",  activeListings: 6,  lastVerifiedAt: "2026-07-11 09:30", status: "ACTIVE" },
  { id: "m-3", name: "ShareAI",    homepageUrl: "https://example.com/shareai",    platform: "X",        activeListings: 3,  lastVerifiedAt: "2026-07-11 08:15", status: "ACTIVE" },
  { id: "m-4", name: "ClaudeMarket", homepageUrl: "https://example.com/claudemarket", platform: "Telegram", activeListings: 2, lastVerifiedAt: "2026-07-11 07:45", status: "ACTIVE" },
  { id: "m-5", name: "AIStore",    homepageUrl: "https://example.com/aistore",    platform: "X",        activeListings: 5,  lastVerifiedAt: "2026-07-11 11:00", status: "ACTIVE" },
  { id: "m-6", name: "GeminiDeals", homepageUrl: "https://example.com/geminideals", platform: "Telegram", activeListings: 3, lastVerifiedAt: "2026-07-11 06:30", status: "ACTIVE" },
  { id: "m-7", name: "TeamAI",     homepageUrl: null,                              platform: "X",        activeListings: 1,  lastVerifiedAt: null,               status: "NEEDS_REVIEW" },
  { id: "m-8", name: "APIHub",     homepageUrl: "https://example.com/apihub",     platform: "manual",   activeListings: 8,  lastVerifiedAt: "2026-07-11 10:30", status: "ACTIVE" },
  { id: "m-9", name: "ProSeller",  homepageUrl: "https://example.com/proseller",  platform: "Telegram",  activeListings: 0,  lastVerifiedAt: "2026-07-10 20:00", status: "OUT_OF_STOCK" },
  { id: "m-10", name: "AIKing",    homepageUrl: null,                              platform: "manual",   activeListings: 2,  lastVerifiedAt: "2026-07-10 15:00", status: "REVIEW_REQUIRED" },
];

const cols: Column<Merchant>[] = [
  { key: "name", header: "商家", render: (r) => <span className="font-semibold text-gray-900">{r.name}</span> },
  { key: "homepage", header: "店铺主页", render: (r) => r.homepageUrl ? <ExternalLink href={r.homepageUrl}>店铺主页</ExternalLink> : <span className="text-gray-500">未确认</span> },
  { key: "platform", header: "来源平台", render: (r) => <span className="text-gray-700">{r.platform}</span> },
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
