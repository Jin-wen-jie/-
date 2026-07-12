import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import {
  authenticateAdmin,
  authorizeAdminSession,
  type AdminAuthRepository,
} from "./auth-service.js";

const now = new Date("2026-07-11T12:00:00.000Z");

function createRepository(
  overrides: Partial<AdminAuthRepository> = {},
): AdminAuthRepository {
  return {
    findAccount: vi.fn().mockResolvedValue({
      username: "owner",
      passwordHash: "stored-hash",
      failedAttempts: 4,
      lockedUntil: null,
      sessionVersion: 7,
      forcePasswordChange: true,
    }),
    updateFailedAttempts: vi.fn().mockResolvedValue(undefined),
    resetFailedAttempts: vi.fn().mockResolvedValue(undefined),
    createSession: vi.fn().mockResolvedValue(undefined),
    findSession: vi.fn().mockResolvedValue(null),
    replacePasswordAndRevokeSessions: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("admin authentication service", () => {
  it("locks the singleton account after its fifth failed login", async () => {
    const repo = createRepository();

    await expect(
      authenticateAdmin(
        repo,
        { username: "owner", password: "wrong" },
        { now, verifyPassword: async () => false },
      ),
    ).resolves.toEqual({ ok: false, reason: "INVALID_CREDENTIALS" });

    expect(repo.updateFailedAttempts).toHaveBeenCalledWith(
      5,
      new Date("2026-07-11T12:15:00.000Z"),
    );
  });

  it("creates hashed session and CSRF tokens after a valid login", async () => {
    const repo = createRepository();

    const result = await authenticateAdmin(
      repo,
      { username: "owner", password: "correct" },
      {
        now,
        tokenFactory: () => "session-token",
        csrfTokenFactory: () => "csrf-token",
        verifyPassword: async () => true,
      },
    );

    expect(result).toMatchObject({
      ok: true,
      token: "session-token",
      csrfToken: "csrf-token",
      forcePasswordChange: true,
    });
    expect(repo.createSession).toHaveBeenCalledWith(
      expect.objectContaining({
        tokenHash: createHash("sha256").update("session-token").digest("hex"),
        csrfTokenHash: createHash("sha256").update("csrf-token").digest("hex"),
        expiresAt: new Date("2026-07-12T12:00:00.000Z"),
        sessionVersion: 7,
      }),
    );
  });

  it("rejects a revoked or expired session", async () => {
    const repo = createRepository({
      findSession: vi
        .fn()
        .mockResolvedValueOnce({
          expiresAt: new Date("2026-07-12T12:00:00.000Z"),
          revokedAt: new Date("2026-07-11T11:00:00.000Z"),
          csrfTokenHash: "csrf-hash",
          sessionVersion: 7,
          forcePasswordChange: false,
        })
        .mockResolvedValueOnce({
          expiresAt: new Date("2026-07-11T11:00:00.000Z"),
          revokedAt: null,
          csrfTokenHash: "csrf-hash",
          sessionVersion: 7,
          forcePasswordChange: false,
        }),
    });

    await expect(authorizeAdminSession(repo, "session-token", now)).resolves.toBeNull();
    await expect(authorizeAdminSession(repo, "session-token", now)).resolves.toBeNull();
  });
});
