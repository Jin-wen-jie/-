import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("workspace", () => {
  it("declares every runtime package", () => {
    expect(existsSync("pnpm-workspace.yaml")).toBe(true);
    const workspace = readFileSync("pnpm-workspace.yaml", "utf8");
    expect(workspace).toContain("apps/*");
    expect(workspace).toContain("packages/*");
  });
});
