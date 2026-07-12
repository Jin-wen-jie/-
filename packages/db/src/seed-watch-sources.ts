import { eq } from "drizzle-orm";
import type { Db } from "./client";
import { watchSources } from "./schema";

/**
 * K12 教育资格相关的搜索关键词。
 * 覆盖常见的 K12、教育优惠和教育团队商品表述。
 */
const K12_KEYWORDS: string[] = [
  "K12 account",
  "K12 ChatGPT",
  "K12 education",
  "K12 账号",
  "K12 套餐",
  "GitHub Education",
  "GitHub 教育",
  "Azure for Students",
  "Azure 学生",
  "学生优惠",
  "student license",
  "education plan",
  "教育账号",
  "教育资格",
  "edu account",
  "Copilot Education",
  "GitHub Copilot 教育",
];

/**
 * Bug Team 相关的搜索关键词。
 * 覆盖 Bug Team 和教育团队类商品的主要表述。
 */
const BUGTEAM_KEYWORDS: string[] = [
  "Bug Team",
  "Bugteam",
  "bug team",
  "bugteam ChatGPT",
  "教育团队",
  "education team",
  "Team 教育版",
  "team education",
  "团队教育优惠",
  "edu team",
  "Bug Team 账号",
  "Bugteam 套餐",
];

/**
 * 同时用于 X 和 Telegram 的排除词。
 * 排除明显不相关的普通个人订阅和 API 类商品。
 */
const EXCLUDE_KEYWORDS: string[] = [
  "API",
  "api key",
  "API key",
  "reseller",
  "批发",
  "代理",
];

export interface WatchSourceSeed {
  id: string;
  platform: "x" | "telegram";
  keywords: string[];
  excludeKeywords: string[];
  publicChannels?: string[];
}

/**
 * 初始监听源配置。
 * X 使用关键词搜索公开帖子；Telegram 使用关键词搜索公共消息和种子频道。
 */
export const INITIAL_WATCH_SOURCES: WatchSourceSeed[] = [
  {
    id: "src-x-k12-bugteam",
    platform: "x",
    keywords: [...K12_KEYWORDS, ...BUGTEAM_KEYWORDS],
    excludeKeywords: EXCLUDE_KEYWORDS,
  },
  {
    id: "src-tg-k12-bugteam",
    platform: "telegram",
    keywords: [...K12_KEYWORDS, ...BUGTEAM_KEYWORDS],
    excludeKeywords: EXCLUDE_KEYWORDS,
    publicChannels: [],
  },
];

/**
 * 将初始监听源写入数据库。
 * 如果对应 ID 的记录已存在则跳过（幂等）。
 */
export async function seedWatchSources(db: Db): Promise<void> {
  for (const source of INITIAL_WATCH_SOURCES) {
    const [existing] = await db
      .select({ id: watchSources.id })
      .from(watchSources)
      .where(eq(watchSources.id, source.id))
      .limit(1);

    if (existing) continue;

    await db.insert(watchSources).values({
      id: source.id,
      platform: source.platform,
      keywords: source.keywords,
      excludeKeywords: source.excludeKeywords,
      publicChannels: source.publicChannels ?? [],
      status: "NOT_CONFIGURED",
      cursor: null,
      lastRunAt: null,
      lastRunResult: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
}
