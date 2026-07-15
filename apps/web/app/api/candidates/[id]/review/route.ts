import { NextResponse } from "next/server";
import { z } from "zod";
import { reviewCandidate } from "../../../../../lib/candidate-repository";
import { assertAdminMutation } from "../../../../../lib/server-auth";

const reviewSchema = z.object({
  action: z.enum(["approve", "reject"]),
  reason: z.string().optional(),
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
  const body = reviewSchema.safeParse(
    await request.json().catch(() => ({})),
  );
  if (!body.success) {
    return NextResponse.json(
      { error: "Invalid review action" },
      { status: 400 },
    );
  }

  const { action, reason } = body.data;
  const result = await reviewCandidate(id, action, reason);
  if (!result.ok) {
    return NextResponse.json({ error: "候选记录不存在" }, { status: 404 });
  }
  return NextResponse.json(result);
}
