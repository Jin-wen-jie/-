"use client";

import { DataTable } from "../../../components/data-table";
import type { Column } from "../../../components/data-table";

interface ProductSpec {
  id: string;
  provider: string;
  productLine: string;
  plan: string;
  delivery: string;
  accessMode: string;
  comparisonKey: string;
}

const demoSpecs: ProductSpec[] = [
  {
    id: "spec-1",
    provider: "OpenAI",
    productLine: "ChatGPT",
    plan: "Plus",
    delivery: "ACCOUNT",
    accessMode: "EXCLUSIVE",
    comparisonKey: "OpenAI|ChatGPT|Plus|ACCOUNT|EXCLUSIVE|...",
  },
  {
    id: "spec-2",
    provider: "Anthropic",
    productLine: "Claude",
    plan: "Pro",
    delivery: "ACCOUNT",
    accessMode: "SHARED",
    comparisonKey: "Anthropic|Claude|Pro|ACCOUNT|SHARED|...",
  },
];

const cols: Column<ProductSpec>[] = [
  { key: "provider", header: "产品商", render: (r) => r.provider },
  { key: "productLine", header: "产品线", render: (r) => r.productLine },
  { key: "plan", header: "套餐", render: (r) => r.plan },
  { key: "delivery", header: "交付方式", render: (r) => r.delivery },
  { key: "accessMode", header: "共享模式", render: (r) => r.accessMode },
  {
    key: "key",
    header: "比较键",
    render: (r) => (
      <code className="rounded bg-gray-100 px-1 text-xs">{r.comparisonKey}</code>
    ),
  },
];

export default function SpecsPage() {
  return (
    <div>
      <h2 className="mb-4 text-lg font-bold">商品规格管理</h2>
      <DataTable
        columns={cols}
        rows={demoSpecs}
        getRowKey={(r) => r.id}
      />
    </div>
  );
}
