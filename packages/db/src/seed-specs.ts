import { randomUUID } from "node:crypto";
import { buildComparisonKey } from "@compare/domain";
import type { ComparisonKeyInput } from "@compare/domain";
import type { Db } from "./client";
import { productSpecs } from "./schema";

export type SpecSeed = ComparisonKeyInput;
export { buildComparisonKey };

/**
 * 将规格字段拼接为唯一的比较键。
 * 格式：productSpecs 全部 11 个字段用 : 分隔。
 */
/**
 * 初始 K12 / Bug Team 商品规格。
 * 覆盖常见商品类型：共享/独享、普通/K12 资格、月付/年付。
 */
export const INITIAL_SPECS: SpecSeed[] = [
  // ── ChatGPT Team 共享版（最常见入门款） ──
  {
    provider: "OpenAI",
    productLine: "ChatGPT",
    plan: "Team",
    delivery: "ACCOUNT",
    accessMode: "SHARED",
    ownership: "RETAINED",
    region: "global",
    qualification: "none",
    validity: "1year",
    commitment: "monthly",
    quota: "unlimited",
  },
  // ── ChatGPT Team 独享版 ──
  {
    provider: "OpenAI",
    productLine: "ChatGPT",
    plan: "Team",
    delivery: "ACCOUNT",
    accessMode: "EXCLUSIVE",
    ownership: "TRANSFERRED",
    region: "global",
    qualification: "none",
    validity: "1year",
    commitment: "monthly",
    quota: "unlimited",
  },
  // ── ChatGPT Enterprise 独享年付 ──
  {
    provider: "OpenAI",
    productLine: "ChatGPT",
    plan: "Enterprise",
    delivery: "ACCOUNT",
    accessMode: "EXCLUSIVE",
    ownership: "TRANSFERRED",
    region: "global",
    qualification: "none",
    validity: "1year",
    commitment: "annual",
    quota: "unlimited",
  },
  // ── ChatGPT Team K12 教育资格 共享版 ──
  {
    provider: "OpenAI",
    productLine: "ChatGPT",
    plan: "Team",
    delivery: "ACCOUNT",
    accessMode: "SHARED",
    ownership: "RETAINED",
    region: "global",
    qualification: "K12",
    validity: "1year",
    commitment: "monthly",
    quota: "unlimited",
  },
  // ── ChatGPT Team K12 教育资格 独享版 ──
  {
    provider: "OpenAI",
    productLine: "ChatGPT",
    plan: "Team",
    delivery: "ACCOUNT",
    accessMode: "EXCLUSIVE",
    ownership: "TRANSFERRED",
    region: "global",
    qualification: "K12",
    validity: "1year",
    commitment: "monthly",
    quota: "unlimited",
  },
];

/**
 * 将初始规格写入数据库。
 * 如果 comparisonKey 已存在则跳过（幂等）。
 */
export async function seedSpecs(db: Db): Promise<void> {
  for (const spec of INITIAL_SPECS) {
    const comparisonKey = buildComparisonKey(spec);

    await db
      .insert(productSpecs)
      .values({
        id: randomUUID(),
        ...spec,
        comparisonKey,
        createdAt: new Date(),
      })
      .onConflictDoNothing({ target: productSpecs.comparisonKey });
  }

  // eslint-disable-next-line no-console
  console.log(
    `Seeded ${INITIAL_SPECS.length} product specs (deduplicated by comparisonKey)`,
  );
}
