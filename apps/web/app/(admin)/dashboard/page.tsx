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
  // ── 梦泽小店 (已验证 ✅) ──
  { id: "1", spec: "ChatGPT | Plus | 共享 | 30天", merchant: "梦泽小店", price: "¥15/月", totalCny: "¥15.00", unitCny: "¥15.00/月", supplyScore: "65.0", supplyEvidence: "页面有货 | 明码标价", confidence: 70, lastVerified: "刚刚", productUrl: "https://pay.ldxp.cn/shop/mengze", sourceUrl: "https://x.com/search?q=pay.ldxp.cn/shop/mengze", merchantUrl: "https://pay.ldxp.cn/shop/mengze" },
  { id: "2", spec: "Claude | Pro | 独享 | 月付", merchant: "梦泽小店", price: "¥25/月", totalCny: "¥25.00", unitCny: "¥25.00/月", supplyScore: "62.0", supplyEvidence: "页面有货 | 明码标价", confidence: 68, lastVerified: "刚刚", productUrl: "https://pay.ldxp.cn/shop/mengze", sourceUrl: "https://t.me/ai_goods/45", merchantUrl: "https://pay.ldxp.cn/shop/mengze" },
  { id: "3", spec: "Gemini | Advanced | 独享 | 年付", merchant: "梦泽小店", price: "¥180/年", totalCny: "¥180.00", unitCny: "¥15.00/月", supplyScore: "60.0", supplyEvidence: "页面有货 | 明码标价", confidence: 65, lastVerified: "1 小时前", productUrl: "https://pay.ldxp.cn/shop/mengze", sourceUrl: "https://t.me/ai_goods/46", merchantUrl: "https://pay.ldxp.cn/shop/mengze" },

  // ── 星辰AI数码 (X发现，待审核 ⚠️) ──
  { id: "4", spec: "ChatGPT | Plus | 独享 | 月付", merchant: "星辰AI数码", price: "¥35/月", totalCny: "¥35.00", unitCny: "¥35.00/月", supplyScore: "35.0", supplyEvidence: "来源帖宣称 | 店铺未确认", confidence: 25, lastVerified: "2 小时前", productUrl: "https://pay.ldxp.cn/shop/mengze", sourceUrl: "https://x.com/xingchen_ai/status/1912000001" },
  { id: "5", spec: "OpenAI | API | 额度 | $50包", merchant: "星辰AI数码", price: "$50/包", totalCny: "¥362.50", unitCny: "¥362.50/包", supplyScore: "30.0", supplyEvidence: "来源帖宣称 | 店铺未确认", confidence: 20, lastVerified: "3 小时前", productUrl: "https://pay.ldxp.cn/shop/mengze", sourceUrl: "https://x.com/xingchen_ai/status/1912000002" },

  // ── TG克劳德车 (Telegram发现) ──
  { id: "6", spec: "Claude | Pro | 共享 | 3人车 | 月付", merchant: "TG克劳德车", price: "¥12/月/人", totalCny: "¥12.00", unitCny: "¥12.00/月", supplyScore: "28.0", supplyEvidence: "TG频道宣称 | 无店铺页", confidence: 18, lastVerified: "4 小时前", productUrl: "https://pay.ldxp.cn/shop/mengze", sourceUrl: "https://t.me/claude_car/88" },

  // ── API老王 (X发现) ──
  { id: "7", spec: "DeepSeek | 代充 | 额度 | 按量", merchant: "API老王", price: "¥0.0008/1K tokens", totalCny: "¥0.0008", unitCny: "¥0.0008/1K", supplyScore: "22.0", supplyEvidence: "X帖宣称 | 店铺未确认", confidence: 15, lastVerified: "5 小时前", productUrl: "https://pay.ldxp.cn/shop/mengze", sourceUrl: "https://x.com/api_laowang/status/1913000001" },

  // ── AI海淘小铺 (手工补链) ──
  { id: "8", spec: "Perplexity | Pro | 独享 | 年付", merchant: "AI海淘小铺", price: "¥130/年", totalCny: "¥130.00", unitCny: "¥10.83/月", supplyScore: "25.0", supplyEvidence: "手工补链 | 待验证", confidence: 12, lastVerified: "6 小时前", productUrl: "https://pay.ldxp.cn/shop/mengze" },

  // ── 教育号专卖店 (手工补链，验证中) ──
  { id: "9", spec: "ChatGPT | Edu | 教育资格 | 年付", merchant: "教育号专卖店", price: "待验证", totalCny: "待验证", unitCny: "待验证", supplyScore: "20.0", supplyEvidence: "手工补链 | 验证中", confidence: 8, lastVerified: "8 小时前", productUrl: "https://pay.ldxp.cn/shop/mengze" },
];

const priceColumns: Column<RankingRow>[] = [
  { key: "unitCny", header: "有效单位价", render: (r) => <span className="font-mono font-bold text-green-700 text-sm">{r.unitCny}</span> },
  { key: "spec", header: "规格", render: (r) => <span className="text-gray-800 text-xs">{r.spec}</span> },
  { key: "merchant", header: "商家", render: (r) => <span className="font-semibold text-gray-900 text-xs">{r.merchant}</span> },
  { key: "price", header: "原价", render: (r) => <span className="font-mono text-gray-700 text-xs">{r.price}</span> },
  { key: "totalCny", header: "总支出", render: (r) => <span className="font-mono text-gray-900 font-semibold text-xs">{r.totalCny}</span> },
  { key: "product", header: "商品页", render: (r) => <ExternalLink href={r.productUrl}>打开</ExternalLink> },
  { key: "source", header: "发现帖", render: (r) => r.sourceUrl ? <ExternalLink href={r.sourceUrl}>来源</ExternalLink> : <span className="text-gray-500 text-xs">手工</span> },
  { key: "verified", header: "验证", render: (r) => <span className="text-gray-600 text-xs">{r.lastVerified}</span> },
];

const supplyColumns: Column<RankingRow>[] = [
  { key: "supplyScore", header: "货源分", render: (r) => <span className="font-mono font-bold text-blue-700 text-sm">{r.supplyScore}</span> },
  { key: "evidence", header: "货源证据", render: (r) => <span className="text-gray-800 text-xs">{r.supplyEvidence}{r.confidence < 70 && <span className="ml-1 rounded bg-orange-100 px-1 py-0.5 text-xs font-semibold text-orange-700">置信度 {r.confidence}%</span>}</span> },
  { key: "spec", header: "规格", render: (r) => <span className="text-gray-800 text-xs">{r.spec}</span> },
  { key: "merchant", header: "商家", render: (r) => <span className="font-semibold text-gray-900 text-xs">{r.merchant}</span> },
  { key: "product", header: "商品页", render: (r) => <ExternalLink href={r.productUrl}>打开</ExternalLink> },
  { key: "source", header: "发现帖", render: (r) => r.sourceUrl ? <ExternalLink href={r.sourceUrl}>来源</ExternalLink> : <span className="text-gray-500 text-xs">手工</span> },
  { key: "merchantLink", header: "店铺", render: (r) => r.merchantUrl ? <ExternalLink href={r.merchantUrl}>店铺</ExternalLink> : <span className="text-orange-600 text-xs font-medium">待确认</span> },
  { key: "verified", header: "验证", render: (r) => <span className="text-gray-600 text-xs">{r.lastVerified}</span> },
];

export default function DashboardPage() {
  const [tab, setTab] = useState<"price" | "supply">("price");
  return (
    <div>
      <h2 className="mb-1 text-xl font-bold text-gray-900">AI 商品比价总览</h2>
      <p className="mb-4 text-xs text-gray-500">6 个商家 · 9 条商品 · 来源：X/TG公开内容 + 手工补链。仅梦泽小店已确认店铺，其余待核实。</p>
      <div className="mb-4 flex gap-2 border-b">
        <button onClick={() => setTab("price")} className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${tab === "price" ? "border-blue-600 text-blue-700" : "border-transparent text-gray-600 hover:text-gray-900"}`}>价格榜</button>
        <button onClick={() => setTab("supply")} className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${tab === "supply" ? "border-blue-600 text-blue-700" : "border-transparent text-gray-600 hover:text-gray-900"}`}>货源榜</button>
      </div>
      <DataTable columns={tab === "price" ? priceColumns : supplyColumns} rows={demoRankings} getRowKey={(r) => r.id} />
    </div>
  );
}
