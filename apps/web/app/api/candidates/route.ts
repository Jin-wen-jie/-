import { NextResponse } from "next/server";
import { z } from "zod";

const createSchema = z.object({
  productUrl: z.string().url(),
});

// In-memory store for demo
const demoCandidates: Array<{
  id: string;
  productUrl: string;
  sourceType: "manual" | "x" | "telegram";
  status: string;
  title: string | null;
  price: string | null;
  merchantName: string | null;
  sourceUrl: string | null;
  merchantUrl: string | null;
  createdAt: string;
}> = [
  {
    id: "demo-1",
    productUrl: "https://shop.example/gpt-plus",
    sourceType: "x",
    status: "REVIEW_REQUIRED",
    title: "GPT Plus 30 days",
    price: "$19.99",
    merchantName: "AIShop",
    sourceUrl: "https://x.com/shop/status/123",
    merchantUrl: "https://shop.example",
    createdAt: new Date().toISOString(),
  },
  {
    id: "demo-2",
    productUrl: "https://market.example/plus",
    sourceType: "telegram",
    status: "DISCOVERED",
    title: null,
    price: null,
    merchantName: null,
    sourceUrl: "https://t.me/shop/42",
    merchantUrl: null,
    createdAt: new Date().toISOString(),
  },
  {
    id: "demo-3",
    productUrl: "https://manual.example/product",
    sourceType: "manual",
    status: "APPROVED",
    title: "Claude Pro Monthly",
    price: "$20.00",
    merchantName: "ClaudeMarket",
    sourceUrl: null,
    merchantUrl: "https://manual.example",
    createdAt: new Date().toISOString(),
  },
];

export async function GET() {
  return NextResponse.json(demoCandidates);
}

export async function POST(request: Request) {
  const body = createSchema.safeParse(
    await request.json().catch(() => ({})),
  );
  if (!body.success) {
    return NextResponse.json(
      { error: "Invalid URL" },
      { status: 400 },
    );
  }

  const candidate = {
    id: `manual-${Date.now()}`,
    productUrl: body.data.productUrl,
    sourceType: "manual" as const,
    status: "DISCOVERED",
    title: null,
    price: null,
    merchantName: null,
    sourceUrl: null,
    merchantUrl: null,
    createdAt: new Date().toISOString(),
  };

  demoCandidates.push(candidate);
  return NextResponse.json(candidate, { status: 201 });
}
