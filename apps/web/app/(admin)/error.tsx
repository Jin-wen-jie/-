"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";

export default function AdminError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-72 items-center justify-center">
      <div className="max-w-md border-l-4 border-amber-500 bg-white px-5 py-4 shadow-sm">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div>
            <h2 className="text-base font-bold text-gray-900">页面暂时无法加载</h2>
            <p className="mt-1 text-sm text-gray-600">
              数据服务可能正在恢复，请稍后重试。其他后台页面仍可正常使用。
            </p>
            <button
              type="button"
              onClick={reset}
              className="mt-4 inline-flex items-center gap-2 rounded bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              <RotateCcw className="h-4 w-4" />
              重新加载
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
