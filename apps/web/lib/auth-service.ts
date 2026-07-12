import {
  generateCsrfToken,
  generateSessionToken,
  hashToken,
} from "./auth";

const SESSION_TTL_MS = 24 * 60 * 60 * 1000;
const LOCK_DURATION_MS = 15 * 60 * 1000;
const MAX_FAILED_ATTEMPTS = 5;

export interface AdminAccountRecord {
  username: string;
  passwordHash: string;
  failedAttempts: number;
  lockedUntil: Date | null;
  sessionVersion: number;
  forcePasswordChange: boolean;
}

export interface AdminSessionRecord {
  expiresAt: Date;
  revokedAt: Date | null;
  csrfTokenHash: string | null;
  sessionVersion: number;
  forcePasswordChange: boolean;
}

export interface AdminAuthRepository {
  findAccount: () => Promise<AdminAccountRecord | null>;
  updateFailedAttempts: (
    failedAttempts: number,
    lockedUntil: Date | null,
  ) => Promise<void>;
  resetFailedAttempts: () => Promise<void>;
  createSession: (session: {
    tokenHash: string;
    csrfTokenHash: string;
    expiresAt: Date;
    sessionVersion: number;
  }) => Promise<void>;
  findSession: (tokenHash: string) => Promise<AdminSessionRecord | null>;
  replacePasswordAndRevokeSessions: (input: {
    passwordHash: string;
    changedAt: Date;
  }) => Promise<void>;
}

export type AuthenticationResult =
  | { ok: false; reason: "INVALID_CREDENTIALS" | "LOCKED" }
  | {
      ok: true;
      token: string;
      csrfToken: string;
      expiresAt: Date;
      forcePasswordChange: boolean;
    };

interface AuthenticationDependencies {
  now?: Date;
  tokenFactory?: () => string;
  csrfTokenFactory?: () => string;
  verifyPassword: (passwordHash: string, password: string) => Promise<boolean>;
}

export async function authenticateAdmin(
  repository: AdminAuthRepository,
  input: { username: string; password: string },
  dependencies: AuthenticationDependencies,
): Promise<AuthenticationResult> {
  const now = dependencies.now ?? new Date();
  const account = await repository.findAccount();

  if (!account || account.username !== input.username) {
    return { ok: false, reason: "INVALID_CREDENTIALS" };
  }

  if (account.lockedUntil && account.lockedUntil > now) {
    return { ok: false, reason: "LOCKED" };
  }

  const passwordMatches = await dependencies.verifyPassword(
    account.passwordHash,
    input.password,
  );
  if (!passwordMatches) {
    const failedAttempts = account.failedAttempts + 1;
    const lockedUntil =
      failedAttempts >= MAX_FAILED_ATTEMPTS
        ? new Date(now.getTime() + LOCK_DURATION_MS)
        : null;
    await repository.updateFailedAttempts(failedAttempts, lockedUntil);
    return { ok: false, reason: "INVALID_CREDENTIALS" };
  }

  const token = (dependencies.tokenFactory ?? generateSessionToken)();
  const csrfToken = (dependencies.csrfTokenFactory ?? generateCsrfToken)();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);

  await repository.resetFailedAttempts();
  await repository.createSession({
    tokenHash: hashToken(token),
    csrfTokenHash: hashToken(csrfToken),
    expiresAt,
    sessionVersion: account.sessionVersion,
  });

  return {
    ok: true,
    token,
    csrfToken,
    expiresAt,
    forcePasswordChange: account.forcePasswordChange,
  };
}

export type ChangePasswordResult =
  | { ok: true }
  | {
      ok: false;
      reason: "INVALID_CURRENT_PASSWORD" | "NEW_PASSWORD_UNCHANGED";
    };

interface ChangePasswordDependencies {
  now?: Date;
  verifyPassword: (passwordHash: string, password: string) => Promise<boolean>;
  hashPassword: (password: string) => Promise<string>;
}

export async function changeAdminPassword(
  repository: AdminAuthRepository,
  input: { currentPassword: string; newPassword: string },
  dependencies: ChangePasswordDependencies,
): Promise<ChangePasswordResult> {
  if (input.currentPassword === input.newPassword) {
    return { ok: false, reason: "NEW_PASSWORD_UNCHANGED" };
  }

  const account = await repository.findAccount();
  if (
    !account ||
    !(await dependencies.verifyPassword(
      account.passwordHash,
      input.currentPassword,
    ))
  ) {
    return { ok: false, reason: "INVALID_CURRENT_PASSWORD" };
  }

  const passwordHash = await dependencies.hashPassword(input.newPassword);
  await repository.replacePasswordAndRevokeSessions({
    passwordHash,
    changedAt: dependencies.now ?? new Date(),
  });
  return { ok: true };
}

export async function authorizeAdminSession(
  repository: AdminAuthRepository,
  token: string,
  now: Date = new Date(),
): Promise<AdminSessionRecord | null> {
  const session = await repository.findSession(hashToken(token));
  if (!session || session.revokedAt || session.expiresAt <= now) {
    return null;
  }
  return session;
}
