export function StatusBadge({
  status,
}: {
  status: string;
}) {
  const colors: Record<string, string> = {
    ACTIVE: "bg-green-100 text-green-800",
    OUT_OF_STOCK: "bg-yellow-100 text-yellow-800",
    INVALID: "bg-red-100 text-red-800",
    RECHECK: "bg-orange-100 text-orange-800",
    NEEDS_REVIEW: "bg-purple-100 text-purple-800",
    APPROVED: "bg-green-100 text-green-800",
    REJECTED: "bg-red-100 text-red-800",
    REVIEW_REQUIRED: "bg-blue-100 text-blue-800",
    DISCOVERED: "bg-gray-100 text-gray-800",
    VALIDATING: "bg-cyan-100 text-cyan-800",
    RETRY_WAIT: "bg-yellow-100 text-yellow-800",
    NOT_CONFIGURED: "bg-gray-100 text-gray-600",
    AUTH_DISABLED: "bg-red-100 text-red-800",
    RATE_LIMITED: "bg-orange-100 text-orange-800",
    ERROR: "bg-red-100 text-red-800",
  };

  const labels: Record<string, string> = {
    ACTIVE: "有效",
    OUT_OF_STOCK: "缺货",
    INVALID: "失效",
    RECHECK: "复检中",
    NEEDS_REVIEW: "待审核",
    APPROVED: "已通过",
    REJECTED: "已驳回",
    REVIEW_REQUIRED: "待审核",
    DISCOVERED: "已发现",
    VALIDATING: "验证中",
    RETRY_WAIT: "等待重试",
    NOT_CONFIGURED: "未配置",
    AUTH_DISABLED: "鉴权失败",
    RATE_LIMITED: "限流",
    ERROR: "错误",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${colors[status] ?? "bg-gray-100 text-gray-800"}`}
    >
      {labels[status] ?? status}
    </span>
  );
}
