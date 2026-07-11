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

const demoMerchants: Merchant[] = [
  { id: "m-1", name: "梦泽小店",       homepageUrl: "https://pay.ldxp.cn/shop/mengze", platform: "X + TG 发现", activeListings: 3, note: "全系 AI 账号代购 · 已验证店铺",              lastVerifiedAt: "2026-07-11 10:00", status: "ACTIVE" },
  { id: "m-2", name: "星辰AI数码",     homepageUrl: null,                            platform: "X 发现",      activeListings: 2, note: "ChatGPT 独享号批发 / API 额度包 · 店铺待确认",   lastVerifiedAt: null,               status: "NEEDS_REVIEW" },
  { id: "m-3", name: "TG克劳德车",     homepageUrl: null,                            platform: "Telegram 发现", activeListings: 2, note: "Claude 共享车位 / Team 套餐 · 仅有 TG 频道",   lastVerifiedAt: null,               status: "NEEDS_REVIEW" },
  { id: "m-4", name: "API老王",        homepageUrl: null,                            platform: "X 发现",      activeListings: 1, note: "DeepSeek API 代充值 · 价格低于官价需核实",       lastVerifiedAt: null,               status: "NEEDS_REVIEW" },
  { id: "m-5", name: "AI海淘小铺",     homepageUrl: null,                            platform: "手工补链",    activeListings: 1, note: "Perplexity Pro 折扣代购 · 待验证",               lastVerifiedAt: null,               status: "NEEDS_REVIEW" },
  { id: "m-6", name: "教育号专卖店",   homepageUrl: null,                            platform: "手工补链",    activeListings: 1, note: "ChatGPT Edu 资格号 · 验证中",                    lastVerifiedAt: null,               status: "VALIDATING" },
  { id: "m-7", name: "Grok代购",       homepageUrl: null,                            platform: "手工补链",    activeListings: 1, note: "Grok 月付 · 已驳回：价格异常偏高",                lastVerifiedAt: null,               status: "REJECTED" },
];

const cols: Column<Merchant>[] = [
  { key: "name", header: "商家", render: (r) => <span className="font-semibold text-gray-900">{r.name}</span> },
  { key: "note", header: "备注", render: (r) => <span className="text-gray-700 text-xs">{r.note}</span> },
  { key: "homepage", header: "店铺", render: (r) => r.homepageUrl ? <ExternalLink href={r.homepageUrl}>打开店铺</ExternalLink> : <span className="text-orange-600 text-xs font-medium">待确认</span> },
  { key: "platform", header: "来源", render: (r) => <span className="text-gray-700 text-xs">{r.platform}</span> },
  { key: "listings", header: "商品数", render: (r) => <span className="font-mono font-semibold text-gray-900">{r.activeListings}</span> },
  { key: "verified", header: "验证", render: (r) => r.lastVerifiedAt ? <span className="text-gray-600 text-xs">{r.lastVerifiedAt}</span> : <span className="text-orange-500 text-xs">待验证</span> },
  { key: "status", header: "状态", render: (r) => <StatusBadge status={r.status} /> },
];

export default function MerchantsPage() {
  return (
    <div>
      <h2 className="mb-1 text-xl font-bold text-gray-900">商家档案</h2>
      <p className="mb-4 text-xs text-gray-500">7 个商家 · 仅梦泽小店已确认店铺主页。其余来自 X/TG 公开内容线索，需人工审核后确认。</p>
      <DataTable columns={cols} rows={demoMerchants} getRowKey={(r) => r.id} />
    </div>
  );
}
