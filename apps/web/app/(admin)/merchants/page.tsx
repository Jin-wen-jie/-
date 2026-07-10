"use client";

import { DataTable } from "../../../components/data-table";
import { ExternalLink } from "../../../components/external-link";
import { StatusBadge } from "../../../components/status-badge";
import type { Column } from "../../../components/data-table";

interface Merchant {
  id: string;
  name: string;
  homepageUrl: string | null;
  platform: string;
  activeListings: number;
  lastVerifiedAt: string | null;
  status: string;
}

const demoMerchants: Merchant[] = [
  {
    id: "m-1",
    name: "AIShop",
    homepageUrl: "https://shop.example",
    platform: "X",
    activeListings: 3,
    lastVerifiedAt: "2026-07-10T10:00:00Z",
    status: "ACTIVE",
  },
  {
    id: "m-2",
    name: "GPTMarket",
    homepageUrl: "https://market.example",
    platform: "Telegram",
    activeListings: 5,
    lastVerifiedAt: "2026-07-10T11:00:00Z",
    status: "ACTIVE",
  },
  {
    id: "m-3",
    name: "ClaudeDeals",
    homepageUrl: null,
    platform: "manual",
    activeListings: 1,
    lastVerifiedAt: null,
    status: "REVIEW_REQUIRED",
  },
];

const cols: Column<Merchant>[] = [
  { key: "name", header: "商家", render: (r) => <span className="font-medium">{r.name}</span> },
  {
    key: "homepage",
    header: "店铺主页",
    render: (r) =>
      r.homepageUrl ? (
        <ExternalLink href={r.homepageUrl}>店铺主页</ExternalLink>
      ) : (
        <span className="text-gray-400">未确认</span>
      ),
  },
  { key: "platform", header: "来源平台", render: (r) => r.platform },
  {
    key: "listings",
    header: "有效商品数",
    render: (r) => <span className="font-mono">{r.activeListings}</span>,
  },
  {
    key: "verified",
    header: "最后验证",
    render: (r) => r.lastVerifiedAt ?? "-",
  },
  {
    key: "status",
    header: "状态",
    render: (r) => <StatusBadge status={r.status} />,
  },
];

export default function MerchantsPage() {
  return (
    <div>
      <h2 className="mb-4 text-lg font-bold">商家档案</h2>
      <DataTable columns={cols} rows={demoMerchants} getRowKey={(r) => r.id} />
    </div>
  );
}
