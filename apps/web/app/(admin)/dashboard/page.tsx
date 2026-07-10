"use client";

import { useState } from "react";
import { DataTable } from "../../../components/data-table";
import { ExternalLink } from "../../../components/external-link";
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

// Demo data
const demoRankings: RankingRow[] = [
  {
    id: "1",
    spec: "OpenAI | ChatGPT | Plus | 账号 | 独享 | TRANSFERRED",
    merchant: "AIShop",
    price: "$19.99 × 1",
    totalCny: "¥145.00",
    unitCny: "¥145.00",
    supplyScore: "92.5",
    supplyEvidence: "明确库存 50",
    confidence: 95,
    lastVerified: "2 小时前",
    productUrl: "https://shop.example/gpt-plus",
    sourceUrl: "https://x.com/shop/status/123",
    merchantUrl: "https://shop.example",
  },
  {
    id: "2",
    spec: "OpenAI | ChatGPT | Plus | 账号 | 独享 | TRANSFERRED",
    merchant: "GPTMarket",
    price: "$18.50 × 1",
    totalCny: "¥134.00",
    unitCny: "¥134.00",
    supplyScore: "72.3",
    supplyEvidence: "页面有货",
    confidence: 61,
    lastVerified: "1 小时前",
    productUrl: "https://market.example/plus",
    sourceUrl: "https://t.me/shop/42",
    merchantUrl: "https://market.example",
  },
];

const priceColumns: Column<RankingRow>[] = [
  {
    key: "unitCny",
    header: "有效单位价",
    render: (r) => (
      <span className="font-mono font-bold text-green-700">{r.unitCny}</span>
    ),
  },
  { key: "spec", header: "规格", render: (r) => r.spec },
  { key: "merchant", header: "商家", render: (r) => r.merchant },
  {
    key: "price",
    header: "原价",
    render: (r) => <span className="font-mono">{r.price}</span>,
  },
  {
    key: "totalCny",
    header: "最低总支出",
    render: (r) => <span className="font-mono">{r.totalCny}</span>,
  },
  {
    key: "product",
    header: "商品页",
    render: (r) => (
      <ExternalLink href={r.productUrl}>商品页</ExternalLink>
    ),
  },
  {
    key: "source",
    header: "来源",
    render: (r) =>
      r.sourceUrl ? (
        <ExternalLink href={r.sourceUrl}>发现帖</ExternalLink>
      ) : null,
  },
  {
    key: "lastVerified",
    header: "最后验证",
    render: (r) => r.lastVerified,
  },
];

const supplyColumns: Column<RankingRow>[] = [
  {
    key: "supplyScore",
    header: "货源分",
    render: (r) => (
      <span className="font-mono font-bold text-blue-700">{r.supplyScore}</span>
    ),
  },
  {
    key: "supplyEvidence",
    header: "货源证据",
    render: (r) => (
      <span>
        {r.supplyEvidence}
        {r.confidence < 80 && (
          <span className="ml-1 text-xs text-orange-500">
            估算 {r.confidence}%
          </span>
        )}
      </span>
    ),
  },
  { key: "spec", header: "规格", render: (r) => r.spec },
  { key: "merchant", header: "商家", render: (r) => r.merchant },
  {
    key: "product",
    header: "商品页",
    render: (r) => (
      <ExternalLink href={r.productUrl}>商品页</ExternalLink>
    ),
  },
  {
    key: "source",
    header: "来源",
    render: (r) =>
      r.sourceUrl ? (
        <ExternalLink href={r.sourceUrl}>发现帖</ExternalLink>
      ) : null,
  },
  {
    key: "merchantLink",
    header: "店铺",
    render: (r) =>
      r.merchantUrl ? (
        <ExternalLink href={r.merchantUrl}>店铺主页</ExternalLink>
      ) : null,
  },
  {
    key: "lastVerified",
    header: "最后验证",
    render: (r) => r.lastVerified,
  },
];

export default function DashboardPage() {
  const [tab, setTab] = useState<"price" | "supply">("price");

  return (
    <div>
      <h2 className="mb-4 text-lg font-bold">商品比价总览</h2>

      <div className="mb-4 flex gap-2 border-b">
        <button
          onClick={() => setTab("price")}
          className={`px-4 py-2 text-sm font-medium ${
            tab === "price"
              ? "border-b-2 border-blue-600 text-blue-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          价格榜
        </button>
        <button
          onClick={() => setTab("supply")}
          className={`px-4 py-2 text-sm font-medium ${
            tab === "supply"
              ? "border-b-2 border-blue-600 text-blue-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          货源榜
        </button>
      </div>

      {tab === "price" ? (
        <DataTable
          columns={priceColumns}
          rows={demoRankings}
          getRowKey={(r) => r.id}
        />
      ) : (
        <DataTable
          columns={supplyColumns}
          rows={demoRankings}
          getRowKey={(r) => r.id}
        />
      )}
    </div>
  );
}
