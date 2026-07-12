import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { revokeAdminSession } from "../../../../lib/auth-repository";
import { assertAdminMutation, CSRF_COOKIE, SESSION_COOKIE } from "../../../../lib/server-auth";
import { hashToken } from "../../../../lib/auth";

export async function POST(request: Request) {
  const authorization = await assertAdminMutation(request);
  if (!authorization.ok) return NextResponse.json({ error: "Unauthorized" }, { status: authorization.status });
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) await revokeAdminSession(hashToken(token));
  cookieStore.delete(SESSION_COOKIE);
  cookieStore.delete(CSRF_COOKIE);
  return NextResponse.json({ ok: true });
}
