import { NextResponse } from "next/server";
import { z } from "zod";

const reviewSchema = z.object({
  action: z.enum(["approve", "reject"]),
  reason: z.string().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
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

  return NextResponse.json({
    id,
    status: action === "approve" ? "APPROVED" : "REJECTED",
    reason: reason ?? null,
    reviewedAt: new Date().toISOString(),
  });
}
