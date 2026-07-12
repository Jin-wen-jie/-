import { eq } from "drizzle-orm";
import type { Db } from "./client";
import { watchSources } from "./schema";

/**
 * K12 教育资格相关的搜索关键词。
 * 覆盖主流 AI 平台的 K12/教育优惠表述，中英文及常见缩写变体。
 */
const K12_KEYWORDS: string[] = [
  // ── K12 通用 ──
  "K12", "K12 account", "K12 账号", "K12 套餐", "K12 教育",
  "k12 子号", "K12 订阅", "K12 优惠", "K12 ChatGPT",
  "K12 OpenAI", "K12 Claude", "K12 Copilot", "K12 Gemini",

  // ── GitHub Education ──
  "GitHub Education", "GitHub 教育", "GitHub 学生包", "GitHub Student",
  "GitHub 教育优惠", "GitHub education account", "GitHub edu",
  "GitHub Student Developer Pack", "GitHub 学生认证",
  "GitHub Copilot Education", "GitHub Copilot 教育",

  // ── Azure for Students ──
  "Azure for Students", "Azure 学生", "Azure Student",
  "Azure 教育", "Azure 学生认证", "Azure 100$",
  "Azure 教育优惠", "Azure Student account",

  // ── 学生/教育通用 ──
  "学生优惠", "学生认证", "学生账号", "学生许可",
  "student license", "education plan", "edu account",
  "教育账号", "教育资格", "教育优惠", "教育版",
  "教育邮箱", "edu邮箱", "academic", "academic account",
  "student discount", "学生折扣", ".edu邮箱",
  "学校邮箱", "大学生优惠", "教育订阅",

  // ── Copilot Education ──
  "Copilot Education", "Copilot 教育", "GitHub Copilot 教育",
  "Copilot 学生", "Copilot edu",

  // ── Google / Gemini 教育 ──
  "Gemini Education", "Gemini 教育", "Google Education",
  "Google Workspace for Education", "Google 教育版",

  // ── ChatGPT 教育 ──
  "ChatGPT Education", "ChatGPT 教育", "ChatGPT Edu",
  "OpenAI Education", "OpenAI edu", "OpenAI 教育",
  "ChatGPT 学生", "ChatGPT 学术",

  // ── Claude 教育 ──
  "Claude Education", "Claude 教育", "Claude Edu",
  "Anthropic Education",

  // ── 其他教育平台 ──
  "JetBrains Education", "JetBrains 教育", "JetBrains Student",
  "AWS Educate", "AWS 教育", "AWS Student",
  "Oracle Education", "Oracle 教育",
  "Canva Education", "Canva 教育",
  "Notion Education", "Notion 教育",
  "Figma Education", "Figma 教育",
  "Datacamp Education",

  // ── 国内教育表述 ──
  "教育优惠账号", "教育号", "教育子号",
  "教育资格账号", "学生认证账号",
  "edu 账号", "教育邮箱账号", "学术账号",
  "教育版账号", "学生包", "学生版",
];

/**
 * Bug Team 相关的搜索关键词。
 * 覆盖主流 AI 平台的 Bug Team/教育团队表述，中英文及常见变体。
 */
const BUGTEAM_KEYWORDS: string[] = [
  // ── Bug Team 核心 ──
  "Bug Team", "Bugteam", "bug team", "bugteam",
  "BugTeam", "Bug Team 账号", "Bug Team 套餐",
  "Bug Team ChatGPT", "Bugteam ChatGPT",
  "Bug Team OpenAI", "Bug Team Claude",
  "Bug Team 订阅", "Bug Team 优惠",

  // ── 教育团队 ──
  "教育团队", "education team", "edu team",
  "Team 教育版", "team education", "团队教育优惠",
  "教育团队账号", "教育Team", "教育Team账号",
  "edu team account", "education team account",

  // ── GitHub Team 教育 ──
  "GitHub Team 教育", "GitHub 教育团队",
  "GitHub Team Education",

  // ── OpenAI Team ──
  "OpenAI Team 教育", "OpenAI Team education",
  "ChatGPT Team 教育", "ChatGPT Team education",
  "ChatGPT Team 优惠", "GPT Team 教育版",

  // ── Claude Team ──
  "Claude Team 教育", "Claude Team education",
  "Anthropic Team 教育",

  // ── Google Team ──
  "Gemini Team 教育", "Google Team education",
  "Gemini Team education",

  // ── Bug Team 变体 ──
  "bt team", "bug team 账号", "bug team 优惠",
  "bug team 订阅", "team bug", "team account bug",
  "Bug 团队", "BUG 团", "bug团",
  "BugTeam 套餐", "bt 账号",
];

/**
 * 发卡平台相关的发现关键词。
 * 用于发现托管 K12/BugTeam 店铺的卡网/发卡平台。
 */
const PLATFORM_KEYWORDS: string[] = [
  "ldxp.cn",
  "发卡平台", "卡网", "自动发卡",
  "shop", "卡密平台",
  "数字商品",
];

/**
 * 同时用于 X 和 Telegram 的排除词。
 * 排除明显不相关的普通个人订阅和 API 类商品。
 */
const EXCLUDE_KEYWORDS: string[] = [
  "API", "api key", "API key",
  "reseller", "批发", "代理",
  "代购", "代充", "代刷",
  "刷单", "刷分", "刷量",
  "卡密", "独享 API",
  "API 代理", "reverse proxy",
  "中转", "转发 API",
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
    keywords: [...K12_KEYWORDS, ...BUGTEAM_KEYWORDS, ...PLATFORM_KEYWORDS],
    excludeKeywords: EXCLUDE_KEYWORDS,
  },
  {
    id: "src-tg-k12-bugteam",
    platform: "telegram",
    keywords: [...K12_KEYWORDS, ...BUGTEAM_KEYWORDS, ...PLATFORM_KEYWORDS],
    excludeKeywords: EXCLUDE_KEYWORDS,
    publicChannels: [
      "with_ai_homes",         // AI 卖家交流群，成员主页挂卡网链接
    ],
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
