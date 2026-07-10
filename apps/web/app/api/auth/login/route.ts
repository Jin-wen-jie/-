import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createHash, randomBytes } from "node:crypto";

const SESSION_COOKIE = "__Host-admin_session";

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

const DEMO_USERNAME = process.env.ADMIN_INITIAL_USERNAME ?? "owner";
const DEMO_PASSWORD =
  process.env.ADMIN_INITIAL_PASSWORD ?? "CHANGE-ME-AT-FIRST-LOGIN";

function generateSessionToken(): string {
  return randomBytes(32).toString("hex");
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function POST(request: Request) {
  const body = loginSchema.safeParse(await request.json().catch(() => ({})));
  if (!body.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { username, password } = body.data;

  if (username !== DEMO_USERNAME || password !== DEMO_PASSWORD) {
    return NextResponse.json({ error: "用户名或密码错误" }, { status: 401 });
  }

  const token = generateSessionToken();
  hashToken(token);

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 24,
  });

  const forcePasswordChange =
    password === "CHANGE-ME-AT-FIRST-LOGIN" ||
    DEMO_PASSWORD === "CHANGE-ME-AT-FIRST-LOGIN";

  return NextResponse.json({ ok: true, forcePasswordChange });
}
