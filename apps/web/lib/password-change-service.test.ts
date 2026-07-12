import { describe, expect, it, vi } from "vitest";
import {
  changeAdminPassword,
  type AdminAuthRepository,
} from "./auth-service.js";

const changedAt = new Date("2026-07-12T00:00:00.000Z");

function createRepository(): AdminAuthRepository {
  return {
    findAccount: vi.fn().mockResolvedValue({
      username: "owner",
      passwordHash: "stored-hash",
      failedAttempts: 0,
      lockedUntil: null,
      sessionVersion: 4,
      forcePasswordChange: true,
    }),
    updateFailedAttempts: vi.fn().mockResolvedValue(undefined),
    resetFailedAttempts: vi.fn().mockResolvedValue(undefined),
    createSession: vi.fn().mockResolvedValue(undefined),
    findSession: vi.fn().mockResolvedValue(null),
    replacePasswordAndRevokeSessions: vi.fn().mockResolvedValue(undefined),
  };
}

describe("admin password change service", () => {
  it("does not clear the forced-change flag when the new password is unchanged", async () => {
    const repository = createRepository();

    await expect(
      changeAdminPassword(
        repository,
        { currentPassword: "same-password", newPassword: "same-password" },
        {
          now: changedAt,
          verifyPassword: async () => true,
          hashPassword: async () => "unused-hash",
        },
      ),
    ).resolves.toEqual({ ok: false, reason: "NEW_PASSWORD_UNCHANGED" });

    expect(repository.replacePasswordAndRevokeSessions).not.toHaveBeenCalled();
  });

  it("rejects an incorrect current password without changing account state", async () => {
    const repository = createRepository();

    await expect(
      changeAdminPassword(
        repository,
        { currentPassword: "wrong", newPassword: "new-password-123" },
        {
          now: changedAt,
          verifyPassword: async () => false,
          hashPassword: async () => "new-hash",
        },
      ),
    ).resolves.toEqual({ ok: false, reason: "INVALID_CURRENT_PASSWORD" });

    expect(repository.replacePasswordAndRevokeSessions).not.toHaveBeenCalled();
  });

  it("hashes the new password and revokes every existing session", async () => {
    const repository = createRepository();
    const hashPassword = vi.fn().mockResolvedValue("argon2id-new-hash");

    await expect(
      changeAdminPassword(
        repository,
        { currentPassword: "old-password", newPassword: "new-password-123" },
        {
          now: changedAt,
          verifyPassword: async () => true,
          hashPassword,
        },
      ),
    ).resolves.toEqual({ ok: true });

    expect(hashPassword).toHaveBeenCalledWith("new-password-123");
    expect(repository.replacePasswordAndRevokeSessions).toHaveBeenCalledWith({
      passwordHash: "argon2id-new-hash",
      changedAt,
    });
  });
});
