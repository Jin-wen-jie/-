"use client";

import { DataTable } from "../../../components/data-table";
import type { Column } from "../../../components/data-table";

interface ProductSpec {
  id: string; provider: string; productLine: string; plan: string;
  delivery: string; accessMode: string; ownership: string;
  region: string; validity: string; commitment: string; comparisonKey: string;
}

const demoSpecs: ProductSpec[] = [
  { id: "s-1", provider: "OpenAI", productLine: "ChatGPT", plan: "Plus", delivery: "ACCOUNT", accessMode: "EXCLUSIVE", ownership: "TRANSFERRED", region: "GLOBAL", validity: "30d", commitment: "30d", comparisonKey: "OpenAI|ChatGPT|Plus|ACCOUNT|EXCLUSIVE|..." },
  { id: "s-2", provider: "OpenAI", productLine: "ChatGPT", plan: "Plus", delivery: "ACCOUNT", accessMode: "SHARED", ownership: "RETAINED", region: "GLOBAL", validity: "30d", commitment: "30d", comparisonKey: "OpenAI|ChatGPT|Plus|ACCOUNT|SHARED|..." },
  { id: "s-3", provider: "Anthropic", productLine: "Claude", plan: "Pro", delivery: "ACCOUNT", accessMode: "EXCLUSIVE", ownership: "TRANSFERRED", region: "GLOBAL", validity: "30d", commitment: "30d", comparisonKey: "Anthropic|Claude|Pro|ACCOUNT|EXCLUSIVE|..." },
  { id: "s-4", provider: "Google", productLine: "Gemini", plan: "Advanced", delivery: "ACCOUNT", accessMode: "EXCLUSIVE", ownership: "TRANSFERRED", region: "GLOBAL", validity: "365d", commitment: "365d", comparisonKey: "Google|Gemini|Advanced|ACCOUNT|EXCLUSIVE|..." },
  { id: "s-5", provider: "OpenAI", productLine: "ChatGPT", plan: "Team", delivery: "INVITE_SEAT", accessMode: "EXCLUSIVE", ownership: "TRANSFERRED", region: "GLOBAL", validity: "30d", commitment: "30d", comparisonKey: "OpenAI|ChatGPT|Team|INVITE_SEAT|EXCLUSIVE|..." },
  { id: "s-6", provider: "OpenAI", productLine: "API", plan: "Credits", delivery: "API_QUOTA", accessMode: "EXCLUSIVE", ownership: "NOT_APPLICABLE", region: "GLOBAL", validity: "90d", commitment: "NOT_APPLICABLE", comparisonKey: "OpenAI|API|Credits|API_QUOTA|EXCLUSIVE|..." },
  { id: "s-7", provider: "Perplexity", productLine: "Perplexity", plan: "Pro", delivery: "ACCOUNT", accessMode: "EXCLUSIVE", ownership: "TRANSFERRED", region: "GLOBAL", validity: "365d", commitment: "365d", comparisonKey: "Perplexity|Perplexity|Pro|ACCOUNT|EXCLUSIVE|..." },
  { id: "s-8", provider: "xAI", productLine: "Grok", plan: "Premium", delivery: "ACCOUNT", accessMode: "SHARED", ownership: "RETAINED", region: "GLOBAL", validity: "30d", commitment: "30d", comparisonKey: "xAI|Grok|Premium|ACCOUNT|SHARED|..." },
];

const cols: Column<ProductSpec>[] = [
  { key: "provider", header: "产品商", render: (r) => <span className="font-semibold text-gray-900">{r.provider}</span> },
  { key: "productLine", header: "产品线", render: (r) => <span className="text-gray-800">{r.productLine}</span> },
  { key: "plan", header: "套餐", render: (r) => <span className="text-gray-800">{r.plan}</span> },
  { key: "delivery", header: "交付方式", render: (r) => <span className="text-gray-700">{r.delivery}</span> },
  { key: "accessMode", header: "共享", render: (r) => <span className={r.accessMode === "SHARED" ? "text-orange-700 font-medium" : "text-green-700 font-medium"}>{r.accessMode === "SHARED" ? "共享" : "独享"}</span> },
  { key: "validity", header: "有效期", render: (r) => <span className="text-gray-700">{r.validity}</span> },
  { key: "key", header: "比较键", render: (r) => <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-700">{r.comparisonKey}</code> },
];

export default function SpecsPage() {
  return (
    <div>
      <h2 className="mb-4 text-xl font-bold text-gray-900">商品规格管理</h2>
      <DataTable columns={cols} rows={demoSpecs} getRowKey={(r) => r.id} />
    </div>
  );
}
