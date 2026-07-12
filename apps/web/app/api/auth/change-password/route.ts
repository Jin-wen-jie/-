import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { hashPassword, verifyPassword } from "@compare/db";
import { getAdminAuthRepository } from "../../../../lib/auth-repository";
import { changeAdminPassword } from "../../../../lib/auth-service";
import {
  assertAdminMutation,
  CSRF_COOKIE,
  SESSION_COOKIE,
} from "../../../../lib/server-auth";

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(256),
  newPassword: z.string().min(12).max(256),
});

export async function POST(request: Request) {
  const authorization = await assertAdminMutation(request, {
    allowPasswordChangeRequired: true,
  });
  if (!authorization.ok) {
    return NextResponse.json(
      { error: authorization.error },
      { status: authorization.status },
    );
  }

  const body = changePasswordSchema.safeParse(
    await request.json().catch(() => ({})),
  );
  if (!body.success) {
    return NextResponse.json(
      { error: "新密码至少需要 12 个字符" },
      { status: 400 },
    );
  }

  const repository = await getAdminAuthRepository();
  const result = await changeAdminPassword(repository, body.data, {
    hashPassword,
    verifyPassword,
  });
  if (!result.ok) {
    const error =
      result.reason === "NEW_PASSWORD_UNCHANGED"
        ? "新密码不能与当前密码相同"
        : "当前密码错误";
    return NextResponse.json({ error }, { status: 400 });
  }

  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  cookieStore.delete(CSRF_COOKIE);
  return NextResponse.json({ ok: true, reauthenticationRequired: true });
}
