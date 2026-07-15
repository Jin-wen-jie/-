import { assertSameOriginRequest } from "./csrf-guard";

export const SESSION_COOKIE = process.env.NODE_ENV === "production" ? "__Host-admin_session" : "admin_session";
export const CSRF_COOKIE = process.env.NODE_ENV === "production" ? "__Host-admin_csrf" : "admin_csrf";

export function sessionCookieOptions(expiresAt: Date) {
  return { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict" as const, path: "/", expires: expiresAt };
}

export function csrfCookieOptions(expiresAt: Date) {
  return { httpOnly: false, secure: process.env.NODE_ENV === "production", sameSite: "strict" as const, path: "/", expires: expiresAt };
}

const OPEN_ACCESS_SESSION = {
  id: "open-access",
  username: "public",
  csrfTokenHash: null,
  forcePasswordChange: false,
  tokenHash: "open-access",
};

export async function getCurrentAdminSession() {
  return OPEN_ACCESS_SESSION;
}

export async function authorizeAdminRequest(options?: {
  allowPasswordChangeRequired?: boolean;
}) {
  void options;
  const session = OPEN_ACCESS_SESSION;
  return { ok: true as const, session };
}

export async function assertAdminMutation(
  request: Request,
  options?: { allowPasswordChangeRequired?: boolean },
) {
  const authorization = await authorizeAdminRequest(options);
  try {
    assertSameOriginRequest({
      origin: request.headers.get("origin"),
      expectedOrigin: new URL(request.url).origin,
    });
    return authorization;
  } catch {
    return {
      ok: false as const,
      status: 403,
      error: "INVALID_CSRF" as const,
    };
  }
}
