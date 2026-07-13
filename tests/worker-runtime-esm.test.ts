import { spawnSync, type SpawnSyncReturns } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repoRoot = fileURLToPath(new URL("../", import.meta.url));

function commandOutput(result: SpawnSyncReturns<string>): string {
  return [
    `exit status: ${result.status ?? "none"}`,
    result.error?.stack,
    result.stdout,
    result.stderr,
  ]
    .filter(Boolean)
    .join("\n");
}

describe("worker production ESM", () => {
  it(
    "builds workspace dependencies and imports without starting the worker",
    () => {
      const build =
        process.platform === "win32"
          ? spawnSync(
              process.env.ComSpec ?? "cmd.exe",
              [
                "/d",
                "/s",
                "/c",
                "pnpm --filter @compare/worker... build",
              ],
              {
                cwd: repoRoot,
                encoding: "utf8",
                timeout: 120_000,
              },
            )
          : spawnSync(
              "pnpm",
              ["--filter", "@compare/worker...", "build"],
              {
                cwd: repoRoot,
                encoding: "utf8",
                timeout: 120_000,
              },
            );

      expect(build.error, commandOutput(build)).toBeUndefined();
      expect(build.status, commandOutput(build)).toBe(0);

      const runtimeEnv = { ...process.env };
      delete runtimeEnv.DATABASE_URL;
      const runtimeImport = spawnSync(
        process.execPath,
        [
          "--input-type=module",
          "--eval",
          "await import('./apps/worker/dist/index.js')",
        ],
        {
          cwd: repoRoot,
          encoding: "utf8",
          env: runtimeEnv,
          timeout: 30_000,
        },
      );

      expect(runtimeImport.error, commandOutput(runtimeImport)).toBeUndefined();
      expect(runtimeImport.status, commandOutput(runtimeImport)).toBe(0);
    },
    120_000,
  );
});
