"use client";

import { useState } from "react";
import { DataTable } from "../../../components/data-table";
import { StatusBadge } from "../../../components/status-badge";
import type { Column } from "../../../components/data-table";

interface JobSource {
  id: string;
  platform: string;
  status: string;
  cursor: string | null;
  lastRunAt: string | null;
  discovered: number;
  errorCategory: string | null;
}

const demoSources: JobSource[] = [
  {
    id: "src-x",
    platform: "X (Twitter)",
    status: "NOT_CONFIGURED",
    cursor: null,
    lastRunAt: null,
    discovered: 0,
    errorCategory: "缺少 Bearer Token",
  },
  {
    id: "src-tg",
    platform: "Telegram",
    status: "NOT_CONFIGURED",
    cursor: null,
    lastRunAt: null,
    discovered: 0,
    errorCategory: "缺少 api_id/api_hash/session",
  },
];

const cols: Column<JobSource>[] = [
  { key: "platform", header: "平台", render: (r) => r.platform },
  { key: "status", header: "状态", render: (r) => <StatusBadge status={r.status} /> },
  {
    key: "cursor",
    header: "游标",
    render: (r) => r.cursor ?? <span className="text-gray-400">-</span>,
  },
  {
    key: "lastRun",
    header: "最近运行",
    render: (r) =>
      r.lastRunAt ? r.lastRunAt : <span className="text-gray-400">从未运行</span>,
  },
  {
    key: "discovered",
    header: "发现数",
    render: (r) => <span className="font-mono">{r.discovered}</span>,
  },
  {
    key: "error",
    header: "说明",
    render: (r) =>
      r.errorCategory ? (
        <span className="text-orange-600">{r.errorCategory}</span>
      ) : (
        "-"
      ),
  },
];

export default function JobsPage() {
  const [url, setUrl] = useState("");
  const [adding, setAdding] = useState(false);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!url) return;
    setAdding(true);
    try {
      await fetch("/api/candidates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productUrl: url }),
      });
      setUrl("");
    } finally {
      setAdding(false);
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold">采集任务</h2>
        <form onSubmit={handleAdd} className="flex gap-2">
          <input
            type="url"
            className="rounded border px-3 py-1 text-sm"
            placeholder="手工补充商品 URL"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <button
            type="submit"
            disabled={adding || !url}
            className="rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
          >
            添加
          </button>
        </form>
      </div>

      <h3 className="mb-2 text-sm font-medium text-gray-600">来源连接器</h3>
      <DataTable columns={cols} rows={demoSources} getRowKey={(r) => r.id} />

      <p className="mt-4 text-sm text-gray-500">
        连接器状态基于真实凭据配置。X 和 Telegram 需要分别在部署环境中提供有效的
        Bearer Token 或 api_id/api_hash/session。
        缺少凭据时连接器显示为"未配置"，不影响手工补链功能。
      </p>
    </div>
  );
}
