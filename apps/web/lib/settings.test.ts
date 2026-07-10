import { describe, expect, it } from "vitest";

export function connectorLabel(status: string): string {
  switch (status) {
    case "AUTH_DISABLED":
      return "鉴权失败，连接器已停用";
    case "NOT_CONFIGURED":
      return "未配置";
    case "RATE_LIMITED":
      return "触发频率限制";
    case "ACTIVE":
      return "运行中";
    case "ERROR":
      return "运行错误";
    default:
      return status;
  }
}

export function canAccessAdminPage(
  ctx: { forcePasswordChange: boolean },
  pathname: string,
): boolean {
  if (ctx.forcePasswordChange && !pathname.startsWith("/settings")) {
    return false;
  }
  return true;
}

describe("settings views", () => {
  it("does not present auth failure as no data", () => {
    expect(connectorLabel("AUTH_DISABLED")).toBe(
      "鉴权失败，连接器已停用",
    );
  });

  it("forces password change before other pages", () => {
    expect(
      canAccessAdminPage(
        { forcePasswordChange: true },
        "/dashboard",
      ),
    ).toBe(false);
    expect(
      canAccessAdminPage(
        { forcePasswordChange: true },
        "/settings",
      ),
    ).toBe(true);
  });
});
