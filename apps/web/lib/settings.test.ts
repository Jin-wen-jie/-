import { describe, expect, it } from "vitest";
import { canAccessAdminPage, connectorLabel } from "./view-models.js";

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
    expect(
      canAccessAdminPage(
        { forcePasswordChange: true },
        "/settings-evil",
      ),
    ).toBe(false);
  });
});
