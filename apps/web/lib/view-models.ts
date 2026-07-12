export type ListingStatus =
  | "ACTIVE"
  | "OUT_OF_STOCK"
  | "INVALID"
  | "RECHECK"
  | "NEEDS_REVIEW";

export interface ListingSummary {
  status: ListingStatus;
  approved: boolean;
  lastVerifiedAt: Date | null;
}

export function eligibleForRanking(listing: ListingSummary): boolean {
  if (!listing.approved) return false;
  if (listing.status !== "ACTIVE") return false;
  if (!listing.lastVerifiedAt) return false;

  const now = Date.now();
  const verified = listing.lastVerifiedAt.getTime();
  const hoursSinceVerified = (now - verified) / (1000 * 60 * 60);
  return hoursSinceVerified <= 24;
}

export interface ConnectorStatus {
  status:
    | "ACTIVE"
    | "AUTH_DISABLED"
    | "NOT_CONFIGURED"
    | "RATE_LIMITED"
    | "ERROR";
  platform: string;
  lastRunAt: Date | null;
  cursor: string | null;
  errorCategory: string | null;
}

export function connectorLabel(
  status: ConnectorStatus["status"],
): string {
  switch (status) {
    case "ACTIVE":
      return "运行中";
    case "AUTH_DISABLED":
      return "鉴权失败，连接器已停用";
    case "NOT_CONFIGURED":
      return "未配置";
    case "RATE_LIMITED":
      return "触发频率限制";
    case "ERROR":
      return "运行错误";
  }
}

export interface AdminPageContext {
  forcePasswordChange: boolean;
}

export function canAccessAdminPage(
  ctx: AdminPageContext,
  pathname: string,
): boolean {
  const isSettingsPage =
    pathname === "/settings" || pathname.startsWith("/settings/");
  if (ctx.forcePasswordChange && !isSettingsPage) {
    return false;
  }
  return true;
}
