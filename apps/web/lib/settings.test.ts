import { describe, expect, it } from "vitest";
import { connectorLabel } from "./view-models.js";

describe("settings views", () => {
  it("does not present auth failure as no data", () => {
    expect(connectorLabel("AUTH_DISABLED")).toBe(
      "鉴权失败，连接器已停用",
    );
  });
});
