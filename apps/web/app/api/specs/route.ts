import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { buildComparisonKey } from "@compare/domain";
import { productSpecs } from "@compare/db";
import { getDatabase } from "../../../lib/database";
import {
  assertAdminMutation,
} from "../../../lib/server-auth";
import { createSpecSchema } from "../../../lib/specs";

export async function GET() {
  const db = getDatabase();
  const specs = await db
    .select({
      id: productSpecs.id,
      provider: productSpecs.provider,
      productLine: productSpecs.productLine,
      plan: productSpecs.plan,
      delivery: productSpecs.delivery,
      accessMode: productSpecs.accessMode,
      ownership: productSpecs.ownership,
      region: productSpecs.region,
      qualification: productSpecs.qualification,
      validity: productSpecs.validity,
      commitment: productSpecs.commitment,
      quota: productSpecs.quota,
      comparisonKey: productSpecs.comparisonKey,
    })
    .from(productSpecs);

  return NextResponse.json(specs);
}

export async function POST(request: Request) {
  const authorization = await assertAdminMutation(request);
  if (!authorization.ok) {
    return NextResponse.json(
      { error: authorization.error },
      { status: authorization.status },
    );
  }

  const body = createSpecSchema.safeParse(
    await request.json().catch(() => ({})),
  );
  if (!body.success) {
    return NextResponse.json(
      { error: "规格字段不完整" },
      { status: 400 },
    );
  }

  const comparisonKey = buildComparisonKey(body.data);
  const db = getDatabase();
  const id = randomUUID();
  const [created] = await db
    .insert(productSpecs)
    .values({
      id,
      ...body.data,
      comparisonKey,
      createdAt: new Date(),
    })
    .onConflictDoNothing({ target: productSpecs.comparisonKey })
    .returning();

  if (!created) {
    return NextResponse.json(
      { error: "该规格组合已存在" },
      { status: 409 },
    );
  }

  return NextResponse.json(
    {
      id: created.id,
      ...body.data,
      comparisonKey,
    },
    { status: 201 },
  );
}
