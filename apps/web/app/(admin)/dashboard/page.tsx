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

// 模拟从 X/TG 公开内容中发现的第三方 AI 商品线索
const demoRankings: RankingRow[] = [
  { id: "1", spec: "AI 聚合 | 工具目录 | 收录 3000+ | 免费", merchant: "Futurepedia (X发现)", price: "免费", totalCny: "¥0", unitCny: "¥0", supplyScore: "90.0", supplyEvidence: "页面有货 | 持续更新", confidence: 85, lastVerified: "刚刚", productUrl: "https://www.futurepedia.io/", sourceUrl: "https://x.com/futurepedia_io", merchantUrl: "https://www.futurepedia.io" },
  { id: "2", spec: "AI 聚合 | 开源合集 | GitHub | 免费", merchant: "Awesome GenAI (X发现)", price: "免费", totalCny: "¥0", unitCny: "¥0", supplyScore: "88.0", supplyEvidence: "页面有货 | 社区维护", confidence: 82, lastVerified: "刚刚", productUrl: "https://github.com/steven2358/awesome-generative-ai", sourceUrl: "https://x.com/steven2358", merchantUrl: "https://github.com/steven2358" },
  { id: "3", spec: "AI 聚合 | 搜索引擎 | 收录 10000+ | 免费", merchant: "TAAIFT (X发现)", price: "免费", totalCny: "¥0", unitCny: "¥0", supplyScore: "85.0", supplyEvidence: "页面有货 | 日更新", confidence: 80, lastVerified: "1 小时前", productUrl: "https://theresanaiforthat.com/", sourceUrl: "https://x.com/theresanaifor", merchantUrl: "https://theresanaiforthat.com" },
  { id: "4", spec: "AI 聚合 | 评测导航 | 收录 5000+ | 免费", merchant: "FutureTools (TG发现)", price: "免费", totalCny: "¥0", unitCny: "¥0", supplyScore: "82.0", supplyEvidence: "页面有货 | 评测驱动", confidence: 78, lastVerified: "1 小时前", productUrl: "https://www.futuretools.io/", sourceUrl: "https://t.me/futuretools", merchantUrl: "https://www.futuretools.io" },
  { id: "5", spec: "AI 聚合 | 每日新品 | 产品社区 | 免费", merchant: "ProductHunt AI (TG发现)", price: "免费", totalCny: "¥0", unitCny: "¥0", supplyScore: "80.0", supplyEvidence: "页面有货 | 社区投票", confidence: 75, lastVerified: "2 小时前", productUrl: "https://www.producthunt.com/topics/artificial-intelligence", sourceUrl: "https://t.me/producthunt", merchantUrl: "https://www.producthunt.com" },
  { id: "6", spec: "ChatGPT | Plus 共享 | 社交平台转售 | $15/月", merchant: "未知卖家 (X发现)", price: "$15.00/月 (第三方转售)", totalCny: "¥108.75", unitCny: "¥108.75/月", supplyScore: "45.0", supplyEvidence: "页面有货文字 | 来源帖宣称", confidence: 35, lastVerified: "3 小时前", productUrl: "https://openai.com/chatgpt/pricing/", sourceUrl: "https://x.com/search?q=chatgpt+plus+account+sell" },
  { id: "7", spec: "Claude | Pro 共享 | TG频道 | $12/月", merchant: "TG共享频道 (TG发现)", price: "$12.00/月 (第三方共享)", totalCny: "¥87.00", unitCny: "¥87.00/月", supplyScore: "40.0", supplyEvidence: "来源帖宣称有货", confidence: 28, lastVerified: "4 小时前", productUrl: "https://www.anthropic.com/pricing", sourceUrl: "https://t.me/s/ai_accounts_share" },
  { id: "8", spec: "AI 聚合 | 工具目录+比价 | 收录 8000+ | 免费", merchant: "Toolify (手工补链)", price: "免费", totalCny: "¥0", unitCny: "¥0", supplyScore: "78.0", supplyEvidence: "页面有货 | 含比价功能", confidence: 72, lastVerified: "5 小时前", productUrl: "https://www.toolify.ai/", merchantUrl: "https://www.toolify.ai" },
  { id: "9", spec: "AI SaaS | 产品列表 | 收录 2000+ | 免费", merchant: "SaaS AI Tools (手工补链)", price: "免费", totalCny: "¥0", unitCny: "¥0", supplyScore: "72.0", supplyEvidence: "页面有货 | 分赛道整理", confidence: 68, lastVerified: "6 小时前", productUrl: "https://saasaitools.com/", merchantUrl: "https://saasaitools.com" },
  { id: "10", spec: "DeepSeek | 代充 | TG频道 | ¥0.001/1K tokens", merchant: "TG代充商家 (TG发现)", price: "¥0.001/1K tokens (第三方)", totalCny: "¥0.001", unitCny: "¥0.001/1K", supplyScore: "35.0", supplyEvidence: "来源帖宣称 | 待验证", confidence: 22, lastVerified: "8 小时前", productUrl: "https://deepseek.ai/pricing", sourceUrl: "https://t.me/s/deepseek_topup" },
];

const priceColumns: Column<RankingRow>[] = [
  { key: "unitCny", header: "有效单位价", render: (r) => <span className="font-mono font-bold text-green-700 text-base">{r.unitCny}</span> },
  { key: "spec", header: "规格", render: (r) => <span className="text-gray-800 text-xs leading-relaxed">{r.spec}</span> },
  { key: "merchant", header: "商家/来源", render: (r) => <span className="font-semibold text-gray-900 text-xs">{r.merchant}</span> },
  { key: "price", header: "原价", render: (r) => <span className="font-mono text-gray-700 text-xs">{r.price}</span> },
  { key: "totalCny", header: "最低总支出", render: (r) => <span className="font-mono text-gray-900 font-semibold text-xs">{r.totalCny}</span> },
  { key: "product", header: "商品页", render: (r) => <ExternalLink href={r.productUrl}>打开</ExternalLink> },
  { key: "source", header: "发现帖", render: (r) => r.sourceUrl ? <ExternalLink href={r.sourceUrl}>来源</ExternalLink> : <span className="text-gray-500 text-xs">手工录入</span> },
  { key: "verified", header: "验证", render: (r) => <span className="text-gray-600 text-xs">{r.lastVerified}</span> },
];

const supplyColumns: Column<RankingRow>[] = [
  { key: "supplyScore", header: "货源分", render: (r) => <span className="font-mono font-bold text-blue-700 text-base">{r.supplyScore}</span> },
  { key: "evidence", header: "货源证据", render: (r) => <span className="text-gray-800 text-xs">{r.supplyEvidence}{r.confidence < 80 && <span className="ml-1 rounded bg-orange-100 px-1 py-0.5 text-xs font-semibold text-orange-700">估算 {r.confidence}%</span>}</span> },
  { key: "spec", header: "规格", render: (r) => <span className="text-gray-800 text-xs leading-relaxed">{r.spec}</span> },
  { key: "merchant", header: "商家/来源", render: (r) => <span className="font-semibold text-gray-900 text-xs">{r.merchant}</span> },
  { key: "product", header: "商品页", render: (r) => <ExternalLink href={r.productUrl}>打开</ExternalLink> },
  { key: "source", header: "发现帖", render: (r) => r.sourceUrl ? <ExternalLink href={r.sourceUrl}>来源</ExternalLink> : <span className="text-gray-500 text-xs">手工录入</span> },
  { key: "merchantLink", header: "店铺", render: (r) => r.merchantUrl ? <ExternalLink href={r.merchantUrl}>主页</ExternalLink> : <span className="text-gray-400 text-xs">未确认</span> },
  { key: "verified", header: "验证", render: (r) => <span className="text-gray-600 text-xs">{r.lastVerified}</span> },
];

export default function DashboardPage() {
  const [tab, setTab] = useState<"price" | "supply">("price");
  return (
    <div>
      <h2 className="mb-1 text-xl font-bold text-gray-900">AI 商品比价总览</h2>
      <p className="mb-4 text-xs text-gray-500">以下数据来自 X/TG 公开内容发现和手工补链，代表第三方来源线索，不代表官方直营。</p>
      <div className="mb-4 flex gap-2 border-b">
        <button onClick={() => setTab("price")} className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${tab === "price" ? "border-blue-600 text-blue-700" : "border-transparent text-gray-600 hover:text-gray-900"}`}>价格榜</button>
        <button onClick={() => setTab("supply")} className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${tab === "supply" ? "border-blue-600 text-blue-700" : "border-transparent text-gray-600 hover:text-gray-900"}`}>货源榜</button>
      </div>
      <DataTable columns={tab === "price" ? priceColumns : supplyColumns} rows={demoRankings} getRowKey={(r) => r.id} />
    </div>
  );
}
