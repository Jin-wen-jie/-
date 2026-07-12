import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("workspace", () => {
  it("declares every runtime package", () => {
    expect(existsSync("pnpm-workspace.yaml")).toBe(true);
    const workspace = readFileSync("pnpm-workspace.yaml", "utf8");
    expect(workspace).toContain("apps/*");
    expect(workspace).toContain("packages/*");
  });

  it("excludes local secrets and generated files from Docker builds", () => {
    const dockerignore = existsSync(".dockerignore")
      ? readFileSync(".dockerignore", "utf8")
      : "";
    const ignoredPaths = dockerignore
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith("#"));

    expect(ignoredPaths).toEqual(
      expect.arrayContaining([
        ".git",
        ".worktrees",
        ".env",
        ".env.*",
        "node_modules",
        ".next",
        "dist",
        "coverage",
        "playwright-report",
        "test-results",
        "*.log",
      ]),
    );

    const environmentPatternIndex = ignoredPaths.indexOf(".env.*");
    const exampleAllowIndex = ignoredPaths.indexOf("!.env.example");

    expect(ignoredPaths).toContain("!.env.example");
    expect(exampleAllowIndex).toBeGreaterThan(environmentPatternIndex);
  });

  it("keeps service development scripts scoped to their own environment", () => {
    const expectedDevScripts = new Map([
      ["apps/worker/package.json", "tsx watch src/index.ts"],
      ["apps/validator/package.json", "tsx watch src/server.ts"],
    ]);

    for (const [packagePath, expectedDevScript] of expectedDevScripts) {
      const manifest = JSON.parse(readFileSync(packagePath, "utf8")) as {
        scripts?: { dev?: string };
      };

      expect(manifest.scripts?.dev).toBe(expectedDevScript);
      expect(manifest.scripts?.dev).not.toContain("--env-file=../../.env");
    }
  });
});
