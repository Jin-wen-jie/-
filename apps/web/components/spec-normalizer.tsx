"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import type {
  AccessMode,
  ComparisonKeyInput,
  Delivery,
  Ownership,
} from "@compare/domain";
import { formatSpecLabel } from "../lib/specs";

interface CandidateBrief {
  id: string;
  productUrl: string;
  title: string | null;
  price: string | null;
  merchantName: string | null;
  focus: string | null;
  evidenceNote: string | null;
  availability: string | null;
  sold: number | null;
  inventory: number | null;
}

interface SpecOption extends ComparisonKeyInput {
  id: string;
  comparisonKey: string;
}

interface SpecFormFields {
  provider: string;
  productLine: string;
  plan: string;
  delivery: string;
  accessMode: string;
  ownership: string;
  region: string;
  qualification: string;
  validity: string;
  commitment: string;
  quota: string;
}

const emptyForm: SpecFormFields = {
  provider: "",
  productLine: "",
  plan: "",
  delivery: "",
  accessMode: "",
  ownership: "",
  region: "",
  qualification: "",
  validity: "",
  commitment: "",
  quota: "",
};

const deliveryOptions = [
  "ACCOUNT",
  "TOPUP",
  "API_QUOTA",
  "INVITE_SEAT",
] as const satisfies readonly Delivery[];
const accessModeOptions = [
  "EXCLUSIVE",
  "SHARED",
] as const satisfies readonly AccessMode[];
const ownershipOptions = [
  "TRANSFERRED",
  "RETAINED",
  "NOT_APPLICABLE",
] as const satisfies readonly Ownership[];
const enumOptions: Partial<
  Record<keyof SpecFormFields, readonly string[]>
> = {
  delivery: deliveryOptions,
  accessMode: accessModeOptions,
  ownership: ownershipOptions,
};

export default function SpecNormalizer({
  candidate,
  onClose,
  onNormalized,
}: {
  candidate: CandidateBrief;
  onClose: () => void;
  onNormalized: () => void;
}) {
  const [specs, setSpecs] = useState<SpecOption[]>([]);
  const [loadingSpecs, setLoadingSpecs] = useState(true);
  const [selectedSpecId, setSelectedSpecId] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [form, setForm] = useState<SpecFormFields>(emptyForm);
  const [creating, setCreating] = useState(false);
  const [normalizing, setNormalizing] = useState(false);
  const [error, setError] = useState("");

  // Fetch existing specs on mount
  useEffect(() => {
    let cancelled = false;
    setLoadingSpecs(true);
    fetch("/api/specs")
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) {
          if (Array.isArray(data)) {
            setSpecs(data as SpecOption[]);
          } else {
            setError("加载规格列表失败");
          }
          setLoadingSpecs(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError("加载规格列表失败");
          setLoadingSpecs(false);
        }
      });
    return () => { cancelled = true; };
  }, []);

  function readCsrfToken(): string {
    for (const name of ["__Host-admin_csrf", "admin_csrf"]) {
      const prefix = `${name}=`;
      const cookie = document.cookie
        .split("; ")
        .find((entry) => entry.startsWith(prefix));
      if (cookie) return decodeURIComponent(cookie.slice(prefix.length));
    }
    return "";
  }

  async function handleCreateSpec() {
    setCreating(true);
    setError("");
    try {
      const res = await fetch("/api/specs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": readCsrfToken(),
        },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "创建规格失败");
      }
      // Add the new spec to the list and select it
      setSpecs((prev) => [...prev, data as SpecOption]);
      setSelectedSpecId(data.id);
      setShowCreateForm(false);
      setForm(emptyForm);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "创建规格失败");
    } finally {
      setCreating(false);
    }
  }

  async function handleNormalize() {
    if (!selectedSpecId) {
      setError("请先选择或创建一个规格");
      return;
    }
    setNormalizing(true);
    setError("");
    try {
      const res = await fetch(`/api/candidates/${candidate.id}/normalize`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": readCsrfToken(),
        },
        body: JSON.stringify({ specId: selectedSpecId }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "规格归一化失败");
      }
      onNormalized();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "规格归一化失败");
    } finally {
      setNormalizing(false);
    }
  }

  function updateField(field: keyof SpecFormFields, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 pt-10"
      onClick={onClose}
    >
      <div
        className="mb-10 w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900">规格归一化</h3>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>

        {/* Candidate info */}
        <div className="mb-5 rounded border bg-gray-50 p-3 text-sm text-gray-800">
          <div className="mb-1 font-semibold">
            {candidate.title ?? "（标题待抽取）"}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
            {candidate.price && <span>价格：{candidate.price}</span>}
            {candidate.merchantName && <span>商家：{candidate.merchantName}</span>}
            {candidate.focus && <span>关注：{candidate.focus}</span>}
            {candidate.availability && <span>库存：{candidate.availability}</span>}
            {(candidate.sold !== null || candidate.inventory !== null) && (
              <span>
                已售 {candidate.sold ?? "—"} · 库存 {candidate.inventory ?? "—"}
              </span>
            )}
            {candidate.evidenceNote && <span>备注：{candidate.evidenceNote}</span>}
          </div>
        </div>

        {/* Spec selector */}
        <div className="mb-4">
          <label className="mb-1 block text-sm font-semibold text-gray-700">
            选择已有规格
          </label>
          {loadingSpecs ? (
            <p className="text-sm text-gray-400">加载中…</p>
          ) : (
            <select
              value={selectedSpecId}
              onChange={(e) => {
                setSelectedSpecId(e.target.value);
                setShowCreateForm(false);
              }}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
            >
              <option value="">— 请选择规格 —</option>
              {specs.map((spec) => (
                <option key={spec.id} value={spec.id}>
                  {formatSpecLabel(spec)}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Toggle create form */}
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="mb-3 text-sm font-semibold text-blue-600 hover:text-blue-800"
        >
          {showCreateForm ? "收起创建表单" : "没有匹配的规格？创建新规格"}
        </button>

        {/* Create spec form */}
        {showCreateForm && (
          <div className="mb-4 rounded border border-blue-200 bg-blue-50 p-4">
            <h4 className="mb-3 text-sm font-bold text-gray-800">创建新规格</h4>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
              {(
                [
                  ["provider", "产品商"],
                  ["productLine", "产品线"],
                  ["plan", "套餐"],
                  ["delivery", "交付方式"],
                  ["accessMode", "访问模式"],
                  ["ownership", "所有权"],
                  ["region", "地区"],
                  ["qualification", "资格要求"],
                  ["validity", "有效期"],
                  ["commitment", "计费周期"],
                  ["quota", "配额"],
                ] as [keyof SpecFormFields, string][]
              ).map(([field, label]) => {
                const options = enumOptions[field];
                return (
                  <div key={field}>
                    <label className="mb-0.5 block text-xs font-medium text-gray-600">
                      {label}
                    </label>
                    {options ? (
                      <select
                        value={form[field]}
                        onChange={(e) => updateField(field, e.target.value)}
                        className="w-full rounded border border-gray-300 px-2.5 py-1.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
                      >
                        <option value="">请选择{label}</option>
                        {options.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={form[field]}
                        onChange={(e) => updateField(field, e.target.value)}
                        className="w-full rounded border border-gray-300 px-2.5 py-1.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
                        placeholder={label}
                      />
                    )}
                  </div>
                );
              })}
            </div>
            <button
              onClick={handleCreateSpec}
              disabled={creating}
              className="mt-3 rounded bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-40"
            >
              {creating ? "创建中…" : "创建规格"}
            </button>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-4 border-l-4 border-red-500 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 border-t pt-4">
          <button
            onClick={onClose}
            className="rounded border border-gray-300 bg-white px-4 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            取消
          </button>
          <button
            onClick={handleNormalize}
            disabled={normalizing || !selectedSpecId}
            className="rounded bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            {normalizing ? "归一化中…" : "确认归一化"}
          </button>
        </div>
      </div>
    </div>
  );
}
