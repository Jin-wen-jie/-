"use client";

import { DataTable } from "../../../components/data-table";
import { ExternalLink } from "../../../components/external-link";
import { StatusBadge } from "../../../components/status-badge";
import type { Column } from "../../../components/data-table";

interface Merchant {
  id: string; name: string; homepageUrl: string | null;
  platform: string; activeListings: number; note: string;
  lastVerifiedAt: string | null; status: string;
}

// 从公开来源发现的第三方商家/聚合站（非官方直营）
const demoMerchants: Merchant[] = [
  { id: "m-1", name: "Futurepedia",     homepageUrl: "https://www.futurepedia.io",       platform: "X 发现",      activeListings: 3000, note: "AI 工具聚合目录",                         lastVerifiedAt: "2026-07-11 10:00", status: "ACTIVE" },
  { id: "m-2", name: "FutureTools",      homepageUrl: "https://www.futuretools.io",       platform: "Telegram 发现", activeListings: 5000, note: "AI 工具评测导航",                        lastVerifiedAt: "2026-07-11 09:30", status: "ACTIVE" },
  { id: "m-3", name: "TAAIFT",           homepageUrl: "https://theresanaiforthat.com",    platform: "X 发现",      activeListings: 10000, note: "AI 工具搜索引擎",                      lastVerifiedAt: "2026-07-11 09:00", status: "ACTIVE" },
  { id: "m-4", name: "ProductHunt AI",   homepageUrl: "https://www.producthunt.com",      platform: "Telegram 发现", activeListings: 2000, note: "AI 新品社区 / 每日投票",                 lastVerifiedAt: "2026-07-11 08:30", status: "ACTIVE" },
  { id: "m-5", name: "Toolify",          homepageUrl: "https://www.toolify.ai",           platform: "手工补链",    activeListings: 8000,  note: "AI 工具目录 + 比价功能",               lastVerifiedAt: "2026-07-11 08:00", status: "ACTIVE" },
  { id: "m-6", name: "SaaS AI Tools",    homepageUrl: "https://saasaitools.com",          platform: "手工补链",    activeListings: 2000,  note: "AI SaaS 产品列表 / 分赛道整理",         lastVerifiedAt: "2026-07-11 07:30", status: "ACTIVE" },
  { id: "m-7", name: "Awesome GenAI",    homepageUrl: "https://github.com/steven2358",    platform: "X 发现",      activeListings: 500,   note: "开源 AI 产品合集 (GitHub)",             lastVerifiedAt: "2026-07-11 07:00", status: "ACTIVE" },
  { id: "m-8", name: "未知 X 卖家",       homepageUrl: null,                                platform: "X 发现",      activeListings: 1,     note: "ChatGPT Plus 转售 — 待核实身份",        lastVerifiedAt: null,               status: "NEEDS_REVIEW" },
  { id: "m-9", name: "TG 共享频道",       homepageUrl: null,                                platform: "Telegram 发现", activeListings: 1,   note: "Claude Pro 共享车位 — 待核实",          lastVerifiedAt: null,               status: "NEEDS_REVIEW" },
  { id: "m-10", name: "TG 代充商家",      homepageUrl: null,                                platform: "Telegram 发现", activeListings: 1,   note: "DeepSeek 代充 — 待核实身份",            lastVerifiedAt: null,               status: "NEEDS_REVIEW" },
];

const cols: Column<Merchant>[] = [
  { key: "name", header: "商家", render: (r) => <span className="font-semibold text-gray-900">{r.name}</span> },
  { key: "note", header: "备注", render: (r) => <span className="text-gray-700 text-xs">{r.note}</span> },
  { key: "homepage", header: "主页", render: (r) => r.homepageUrl ? <ExternalLink href={r.homepageUrl}>打开</ExternalLink> : <span className="text-orange-600 text-xs font-medium">未确认</span> },
  { key: "platform", header: "来源", render: (r) => <span className="text-gray-700 text-xs">{r.platform}</span> },
  { key: "listings", header: "商品数", render: (r) => <span className="font-mono font-semibold text-gray-900">{r.activeListings}</span> },
  { key: "verified", header: "验证", render: (r) => r.lastVerifiedAt ? <span className="text-gray-600 text-xs">{r.lastVerifiedAt}</span> : <span className="text-orange-500 text-xs">待验证</span> },
  { key: "status", header: "状态", render: (r) => <StatusBadge status={r.status} /> },
];

export default function MerchantsPage() {
  return (
    <div>
      <h2 className="mb-1 text-xl font-bold text-gray-900">商家档案</h2>
      <p className="mb-4 text-xs text-gray-500">从公开来源发现的第三方商家。NEEDS_REVIEW 表示身份待核实，需人工审核后确认。</p>
      <DataTable columns={cols} rows={demoMerchants} getRowKey={(r) => r.id} />
    </div>
  );
}
