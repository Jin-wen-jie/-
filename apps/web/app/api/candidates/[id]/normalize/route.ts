import { NextResponse } from "next/server";
import { z } from "zod";
import { normalizeCandidate } from "../../../../../lib/candidate-repository";
import { assertAdminMutation } from "../../../../../lib/server-auth";

const normalizeSchema = z.object({
  specId: z.string().min(1, "规格 ID 不能为空"),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authorization = await assertAdminMutation(request);
  if (!authorization.ok) {
    return NextResponse.json(
      { error: authorization.error },
      { status: authorization.status },
    );
  }

  const { id } = await params;
  const body = normalizeSchema.safeParse(
    await request.json().catch(() => ({})),
  );
  if (!body.success) {
    return NextResponse.json(
      { error: "规格 ID 无效" },
      { status: 400 },
    );
  }

  const result = await normalizeCandidate(id, body.data.specId);
  if (!result.ok) {
    const status =
      result.reason === "NOT_FOUND"
        ? 404
        : result.reason === "INVALID_STATUS"
          ? 409
          : 400;
    const error =
      result.reason === "NOT_FOUND"
        ? "候选记录不存在"
        : result.reason === "INVALID_STATUS"
          ? "当前状态不允许修改规格"
          : "规格不存在";
    return NextResponse.json({ error }, { status });
  }

  return NextResponse.json(result);
}
