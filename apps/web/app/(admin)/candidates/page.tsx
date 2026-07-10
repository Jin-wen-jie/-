"use client";

import { useEffect, useState } from "react";
import { DataTable } from "../../../components/data-table";
import { ExternalLink } from "../../../components/external-link";
import { StatusBadge } from "../../../components/status-badge";
import type { Column } from "../../../components/data-table";

interface Candidate {
  id: string;
  productUrl: string;
  sourceType: "manual" | "x" | "telegram";
  status: string;
  title: string | null;
  price: string | null;
  merchantName: string | null;
  sourceUrl: string | null;
  merchantUrl: string | null;
  createdAt: string;
}

export default function CandidatesPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [newUrl, setNewUrl] = useState("");
  const [adding, setAdding] = useState(false);

  async function fetchCandidates() {
    setLoading(true);
    try {
      const res = await fetch("/api/candidates");
      const data = (await res.json()) as Candidate[];
      setCandidates(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchCandidates();
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newUrl) return;
    setAdding(true);
    try {
      await fetch("/api/candidates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productUrl: newUrl }),
      });
      setNewUrl("");
      await fetchCandidates();
    } finally {
      setAdding(false);
    }
  }

  async function handleReview(id: string, action: "approve" | "reject") {
    await fetch(`/api/candidates/${id}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    await fetchCandidates();
  }

  const cols: Column<Candidate>[] = [
    {
      key: "title",
      header: "商品",
      render: (r) => (
        <div>
          <div className="font-medium">
            {r.title ?? <span className="italic text-gray-400">待抽取</span>}
          </div>
          {r.price && (
            <span className="font-mono text-xs text-gray-500">{r.price}</span>
          )}
        </div>
      ),
    },
    { key: "merchant", header: "商家", render: (r) => r.merchantName ?? "-" },
    { key: "sourceType", header: "来源", render: (r) => r.sourceType.toUpperCase() },
    {
      key: "status",
      header: "状态",
      render: (r) => <StatusBadge status={r.status} />,
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
      header: "发现帖",
      render: (r) =>
        r.sourceUrl ? (
          <ExternalLink href={r.sourceUrl}>来源帖</ExternalLink>
        ) : (
          "-"
        ),
    },
    {
      key: "merchantLink",
      header: "店铺",
      render: (r) =>
        r.merchantUrl ? (
          <ExternalLink href={r.merchantUrl}>店铺</ExternalLink>
        ) : (
          "-"
        ),
    },
    {
      key: "actions",
      header: "操作",
      render: (r) =>
        r.status === "REVIEW_REQUIRED" || r.status === "DISCOVERED" ? (
          <div className="flex gap-1">
            <button
              onClick={() => handleReview(r.id, "approve")}
              className="rounded bg-green-600 px-2 py-1 text-xs text-white hover:bg-green-700"
            >
              通过
            </button>
            <button
              onClick={() => handleReview(r.id, "reject")}
              className="rounded bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700"
            >
              驳回
            </button>
          </div>
        ) : null,
    },
  ];

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold">候选审核</h2>
        <form onSubmit={handleAdd} className="flex gap-2">
          <input
            type="url"
            className="rounded border px-3 py-1 text-sm"
            placeholder="输入商品 URL 手工补链"
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
          />
          <button
            type="submit"
            disabled={adding || !newUrl}
            className="rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
          >
            添加
          </button>
        </form>
      </div>

      {loading ? (
        <p className="text-gray-500">加载中…</p>
      ) : (
        <DataTable
          columns={cols}
          rows={candidates}
          getRowKey={(r) => r.id}
        />
      )}
    </div>
  );
}
