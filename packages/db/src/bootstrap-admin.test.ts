import { describe, expect, it, vi } from "vitest";
import {
  bootstrapAdmin,
  hashPassword,
  verifyPassword,
} from "./bootstrap-admin.js";

describe("bootstrapAdmin", () => {
  it("hashes changed passwords with Argon2id", async () => {
    const passwordHash = await hashPassword("new-password-123");

    expect(passwordHash).toMatch(/^\$argon2id\$/);
    await expect(
      verifyPassword(passwordHash, "new-password-123"),
    ).resolves.toBe(true);
    await expect(verifyPassword(passwordHash, "wrong-password")).resolves.toBe(
      false,
    );
  });

  it("creates id 1 only when the table is empty", async () => {
    const repo = {
      find: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue(undefined),
    };
    await bootstrapAdmin(repo, {
      username: "owner",
      password: "one-time-password",
    });
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 1,
        username: "owner",
        forcePasswordChange: true,
      }),
    );
  });

  it("never overwrites an existing password", async () => {
    const repo = {
      find: vi.fn().mockResolvedValue({ id: 1 }),
      create: vi.fn(),
    };
    await bootstrapAdmin(repo, {
      username: "owner",
      password: "replacement",
    });
    expect(repo.create).not.toHaveBeenCalled();
  });
});
