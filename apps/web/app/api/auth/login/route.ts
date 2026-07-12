import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyPassword } from "@compare/db";
import { getAdminAuthRepository } from "../../../../lib/auth-repository";
import { authenticateAdmin } from "../../../../lib/auth-service";
import { CSRF_COOKIE, SESSION_COOKIE, csrfCookieOptions, sessionCookieOptions } from "../../../../lib/server-auth";

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  const body = loginSchema.safeParse(await request.json().catch(() => ({})));
  if (!body.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const repository = await getAdminAuthRepository();
  const result = await authenticateAdmin(repository, body.data, { verifyPassword });
  if (!result.ok) {
    return NextResponse.json({ error: "用户名或密码错误" }, { status: 401 });
  }

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, result.token, sessionCookieOptions(result.expiresAt));
  cookieStore.set(CSRF_COOKIE, result.csrfToken, csrfCookieOptions(result.expiresAt));
  return NextResponse.json({ ok: true, forcePasswordChange: result.forcePasswordChange });
}
