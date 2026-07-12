"use client";

import { useState } from "react";

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

export function ManualUrlForm() {
  const [url, setUrl] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!url) return;
    setAdding(true);
    setError("");
    try {
      const res = await fetch("/api/candidates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": readCsrfToken(),
        },
        body: JSON.stringify({ productUrl: url }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "添加失败");
      setUrl("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "添加失败");
    } finally {
      setAdding(false);
    }
  }

  return (
    <form onSubmit={handleAdd} className="flex min-w-0 gap-2 sm:max-w-lg">
      <input
        type="url"
        className="min-w-0 flex-1 rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none sm:max-w-sm"
        placeholder="输入商品 URL 手工补链"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
      />
      <button
        type="submit"
        disabled={adding || !url}
        className="rounded bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-40"
      >
        {adding ? "添加中…" : "添加"}
      </button>
      {error && (
        <span className="self-center text-xs font-medium text-red-600">
          {error}
        </span>
      )}
    </form>
  );
}
