import { eq } from "drizzle-orm";
import { createHash, randomUUID } from "node:crypto";
import type { Db } from "./client";
import { discoveryCandidates } from "./schema";

export interface CandidateSeed {
  productUrl: string;
  sourceType: "manual" | "x" | "telegram";
}

/**
 * 已知 K12 / Bug Team 店铺链接。
 * 这些店铺来自公开的 AI 账号发卡平台，主要销售 K12 教育资格和 Bug Team 套餐。
 */
export const INITIAL_CANDIDATES: CandidateSeed[] = [
  // ── ldxp.cn 发卡平台店铺 ──
  { productUrl: "https://pay.ldxp.cn/shop/JL7007", sourceType: "manual" },
  { productUrl: "https://pay.ldxp.cn/shop/caishen", sourceType: "manual" },
  { productUrl: "https://pay.ldxp.cn/shop/mengze", sourceType: "manual" },
  { productUrl: "https://pay.ldxp.cn/shop/6YEJH8PE", sourceType: "manual" },
  { productUrl: "https://pay.ldxp.cn/shop/XHA54E0U", sourceType: "manual" },
  { productUrl: "https://pay.ldxp.cn/shop/JBJJWNA5", sourceType: "manual" },
];

/**
 * 已知的发卡平台域名。
 * 这些平台托管了多个 K12/BugTeam 店铺，连接器发现时优先关注这些域名。
 */
export const KNOWN_PLATFORMS: string[] = [
  "ldxp.cn",
  "ldxp.cn/shop",     // 发卡平台子路径模式
];

/**
 * URL 规范化：移除 fragment，保留 query 参数。
 */
function canonicalizeUrl(productUrl: string): string {
  const url = new URL(productUrl);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("UNSUPPORTED_URL_PROTOCOL");
  }
  url.hash = "";
  return url.toString();
}

function fingerprintUrl(canonicalUrl: string): string {
  return createHash("sha256").update(canonicalUrl).digest("hex");
}

/**
 * 将初始候选链接写入数据库。
 * 如果 URL 指纹已存在则跳过（幂等）。
 */
export async function seedCandidates(db: Db): Promise<void> {
  for (const candidate of INITIAL_CANDIDATES) {
    const canonicalUrl = canonicalizeUrl(candidate.productUrl);
    const urlFingerprint = fingerprintUrl(canonicalUrl);

    const [existing] = await db
      .select({ id: discoveryCandidates.id })
      .from(discoveryCandidates)
      .where(eq(discoveryCandidates.urlFingerprint, urlFingerprint))
      .limit(1);

    if (existing) continue;

    await db.insert(discoveryCandidates).values({
      id: randomUUID(),
      productUrl: canonicalUrl,
      canonicalUrl,
      urlFingerprint,
      sourceType: candidate.sourceType,
      status: "DISCOVERED",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  console.log(
    `Seeded ${INITIAL_CANDIDATES.length} candidate URLs (deduplicated by fingerprint)`,
  );
}
