import { and, eq, inArray } from "drizzle-orm";
import { createHash, randomUUID } from "node:crypto";
import type { Db } from "./client.js";
import { discoveryCandidates } from "./schema.js";

export interface CandidateSeed {
  productUrl: string;
  sourceType: "manual" | "x" | "telegram";
  status?: "DISCOVERED" | "REVIEW_REQUIRED";
  extractionResult?: Record<string, unknown>;
}

export interface PublicResearchChannel {
  channelUrl: string;
  merchantName: string;
  platform: string;
  status:
    | "VERIFIED_PRODUCT"
    | "VERIFIED_SHOP"
    | "VERIFIED_SITE"
    | "AGGREGATOR"
    | "RECHECK";
}

const LDXP_RESEARCH_CHANNELS = [
  ["1D0LD6BR", "小猫GPT源头分销码：dxeoq4i7", "VERIFIED_PRODUCT"],
  ["1DM0L7CR", "源头GPT", "VERIFIED_PRODUCT"],
  ["1I2Y9GEC", "靠谱 AI", "VERIFIED_PRODUCT"],
  ["22DHYNNV", "哈哈的ai杂货铺", "VERIFIED_PRODUCT"],
  ["2E2KPQD1", "AI杂货", "VERIFIED_PRODUCT"],
  ["2IWYC9QQ", "IMAGE-2", "VERIFIED_PRODUCT"],
  ["2POVTUTK", "王哥源头", "VERIFIED_PRODUCT"],
  ["2VWX76A4", "牟利ai", "VERIFIED_PRODUCT"],
  ["2WMCCNSQ", "AI搬运工", "VERIFIED_PRODUCT"],
  ["4UOATQTU", "Hug AI", "VERIFIED_PRODUCT"],
  ["5OFQXIM1", "冷热lab", "VERIFIED_PRODUCT"],
  ["5R8T9H0Q", "黑白小狗AI旗舰店", "VERIFIED_PRODUCT"],
  ["602", "602", "VERIFIED_PRODUCT"],
  ["61KF391I", "源头的ai", "VERIFIED_PRODUCT"],
  ["66666SMS", "SMS-AIShop", "VERIFIED_PRODUCT"],
  ["6GCAQ8JQ", "胡小阳的AI店铺（招代理）", "VERIFIED_PRODUCT"],
  ["6H72NFWO", "ALL IN AI", "VERIFIED_PRODUCT"],
  ["6RSH0LA6", "东北23333--承接理工科毕设", "VERIFIED_PRODUCT"],
  ["6TKPIT5E", "7878", "VERIFIED_PRODUCT"],
  ["6YEJH8PE", "gpt成品", "VERIFIED_PRODUCT"],
  ["7LFUCYI0", "FranklyBuilds的AI小店", "VERIFIED_PRODUCT"],
  ["7TCL10MR", "卖点AI", "VERIFIED_PRODUCT"],
  ["8998TM6I", "AI-小站", "VERIFIED_PRODUCT"],
  ["911", "金幺の小店", "VERIFIED_PRODUCT"],
  ["AEUQ8PP3", "ai教父", "VERIFIED_PRODUCT"],
  ["aica", "【AI源头直供】AICA", "VERIFIED_PRODUCT"],
  ["aishop1", "稳问AI --AI 大玩家（AI真源头，招代理）", "VERIFIED_PRODUCT"],
  ["aishop86", "AI小店", "VERIFIED_PRODUCT"],
  ["AWXK3UJY", "彩虹马的AI店", "VERIFIED_PRODUCT"],
  ["ayjq", "暗影禁区小店", "VERIFIED_PRODUCT"],
  ["B8JKQFDK", "录提", "VERIFIED_PRODUCT"],
  ["cao", "CAO", "VERIFIED_PRODUCT"],
  ["chatgpt_ai", "AI小铺（源头直供，招代理）", "VERIFIED_PRODUCT"],
  ["DF6CKF46", "SHEN", "VERIFIED_PRODUCT"],
  ["doroai", "Doro AI", "VERIFIED_PRODUCT"],
  ["echo_dream", "AI小铺", "VERIFIED_PRODUCT"],
  ["EXZMM8SQ", "team最后的余晖", "VERIFIED_PRODUCT"],
  ["FAJMDFWV", "AI深研社", "VERIFIED_PRODUCT"],
  ["gogo", "AI gogo渠道（招代理）", "VERIFIED_PRODUCT"],
  ["gpt_plus", "aihome", "VERIFIED_PRODUCT"],
  ["gptpromax", "GPT小站", "VERIFIED_PRODUCT"],
  ["grok", "AI万能工具箱", "VERIFIED_PRODUCT"],
  ["GT7KX1TN", "光之国AI", "VERIFIED_PRODUCT"],
  ["GU3XQH61", "NiuGe AI 加钟站", "VERIFIED_PRODUCT"],
  ["IY16OXB7", "GPT-源头供货-招代理", "VERIFIED_PRODUCT"],
  ["J6F0Z1MF", "恶小梦", "VERIFIED_PRODUCT"],
  ["jisuai", "极速Ai", "VERIFIED_PRODUCT"],
  ["JL7007", "沈万三的Ai聚宝盆", "VERIFIED_PRODUCT"],
  ["keiko", "KeikoAI小店", "VERIFIED_PRODUCT"],
  ["KFNRCFGC", "海神-GPT-大玩家（招代理）", "VERIFIED_PRODUCT"],
  ["lanyy", "懒羊羊", "VERIFIED_PRODUCT"],
  ["LD52LLPD", "YYYYD", "VERIFIED_PRODUCT"],
  ["luoerl", "与世隔绝的AI小店", "VERIFIED_PRODUCT"],
  ["M18V0XVF", "陆柒科技", "VERIFIED_PRODUCT"],
  ["mengze", "梦泽", "VERIFIED_PRODUCT"],
  ["ming", "ming的AI商店", "VERIFIED_PRODUCT"],
  ["mirage", "幻境MirageAI", "VERIFIED_PRODUCT"],
  ["N90HTB7K", "JieAiTop", "VERIFIED_PRODUCT"],
  ["NFCG5CVM", "奥特曼", "VERIFIED_PRODUCT"],
  ["NWIPLK8X", "李页的小店", "VERIFIED_PRODUCT"],
  ["OUJ1HPBV", "chiyu", "VERIFIED_PRODUCT"],
  ["P98T49H8", "稳中求胜", "VERIFIED_PRODUCT"],
  ["PAXOVOVJ", "奥特曼严选", "VERIFIED_PRODUCT"],
  ["pdxai", "派大星Ai", "VERIFIED_PRODUCT"],
  ["qihangai", "启航AI", "VERIFIED_PRODUCT"],
  ["qingwaAA", "青蛙AI·低价源头", "VERIFIED_PRODUCT"],
  ["RCCFTO9M", "雪豹AI", "VERIFIED_PRODUCT"],
  ["RVOYB7QF", "北极星AI", "VERIFIED_PRODUCT"],
  ["S5UL3UHI", "ai能量小铺", "VERIFIED_PRODUCT"],
  ["S8EK3HL5", "鱼ai", "VERIFIED_PRODUCT"],
  ["SJ1BEJAC", "商家8719", "VERIFIED_PRODUCT"],
  ["SubAIP", "AI源头批发旗舰店", "VERIFIED_PRODUCT"],
  ["TD6GILQR", "ChatGptPlus 陌路专营店 分销码molu", "VERIFIED_PRODUCT"],
  ["ton", "ton", "VERIFIED_PRODUCT"],
  ["Tora", "Tora-雪诺AI源头分销小铺", "VERIFIED_PRODUCT"],
  ["V2M14U73", "初草的AI学习商品小铺", "VERIFIED_PRODUCT"],
  ["WPXSCE1B", "Ai小铺", "VERIFIED_PRODUCT"],
  ["wuku", "老马AI（源头直供，招代理）", "VERIFIED_PRODUCT"],
  ["xiamai", "gpt_plus_批发", "VERIFIED_PRODUCT"],
  ["xiaochaiai", "小柴AI", "VERIFIED_PRODUCT"],
  ["xiaoman", "小满 AI 小铺", "VERIFIED_PRODUCT"],
  ["xiaopiao", "小票的ai小铺", "VERIFIED_PRODUCT"],
  ["Y6DANPTJ", "魔人布欧", "VERIFIED_PRODUCT"],
  ["YA3NLPX6", "AI小店", "VERIFIED_PRODUCT"],
  ["yes", "如鱼得水(玩转ai)", "VERIFIED_PRODUCT"],
  ["YGOV1U2Q", "虚拟产品批发", "VERIFIED_PRODUCT"],
  ["yimengai", "一梦AI", "VERIFIED_PRODUCT"],
  ["YUJI", "YUJI", "VERIFIED_PRODUCT"],
  ["Z65QS0QG", "幽羊 AI", "VERIFIED_PRODUCT"],
  ["Z6I0VZ0Q", "AI 云智聪聪", "VERIFIED_PRODUCT"],
] as const;

export const PUBLIC_RESEARCH_CHANNELS: PublicResearchChannel[] = [
  ...LDXP_RESEARCH_CHANNELS.map(([token, merchantName, status]) => ({
    channelUrl: `https://pay.ldxp.cn/shop/${token}`,
    merchantName,
    platform: "LDXP",
    status,
  })),
  { channelUrl: "https://aisou.pro/", merchantName: "Aisou智充", platform: "独立站", status: "VERIFIED_SITE" },
  { channelUrl: "https://shop.auto-subscribe.com/", merchantName: "Auto Subscribe", platform: "独立站", status: "VERIFIED_SITE" },
  { channelUrl: "https://pay.qxvx.cn/", merchantName: "QXVX Pay", platform: "发卡平台", status: "RECHECK" },
  { channelUrl: "https://aifk.opensora.de/", merchantName: "AUTO FK", platform: "独立站", status: "VERIFIED_PRODUCT" },
  { channelUrl: "https://caowo.store/", merchantName: "GPT专卖-cw", platform: "独立站", status: "RECHECK" },
  { channelUrl: "https://makerich.club/", merchantName: "AI创富俱乐部", platform: "独立站", status: "RECHECK" },
  { channelUrl: "https://store.codesky.qzz.io/", merchantName: "花生店铺", platform: "独立站", status: "VERIFIED_PRODUCT" },
  { channelUrl: "https://shop.gptmf.com/", merchantName: "GPT魔法商店", platform: "独立站", status: "RECHECK" },
  { channelUrl: "https://catfk.com/", merchantName: "云猫寄售", platform: "发卡平台", status: "VERIFIED_PRODUCT" },
  { channelUrl: "https://faka.aiceo.dev/", merchantName: "team", platform: "独立站", status: "VERIFIED_PRODUCT" },
  { channelUrl: "https://shop.aitonse.com/", merchantName: "Auto Subscribe / aitonse", platform: "独立站", status: "VERIFIED_PRODUCT" },
  { channelUrl: "https://burstpro-ai.online/", merchantName: "Auto Subscribe / BurstPro AI", platform: "独立站", status: "VERIFIED_PRODUCT" },
  { channelUrl: "https://zhanghao66.com/", merchantName: "全网最低批发ai账号店铺", platform: "独立站", status: "VERIFIED_PRODUCT" },
  { channelUrl: "https://catfk.com/shop/hththt", merchantName: "HT", platform: "CatFK", status: "VERIFIED_PRODUCT" },
  { channelUrl: "https://catfk.com/shop/XL6KQGQZ", merchantName: "Xx-gpt-gemini", platform: "CatFK", status: "VERIFIED_PRODUCT" },
  { channelUrl: "https://shop.sunnydolls.dpdns.org/", merchantName: "weiloo", platform: "独立站", status: "VERIFIED_PRODUCT" },
  { channelUrl: "https://cool.cheggnow.com/", merchantName: "晴天小店", platform: "独立站", status: "VERIFIED_PRODUCT" },
  { channelUrl: "https://woaimaihao.com/", merchantName: "我爱买号", platform: "独立站", status: "VERIFIED_PRODUCT" },
  { channelUrl: "https://ai666.dnxb.cc/", merchantName: "T佬的gmail批发渠道", platform: "独立站", status: "RECHECK" },
  { channelUrl: "https://fk.gptkt.pro/", merchantName: "吱吱鼠卡网", platform: "独立站", status: "VERIFIED_SITE" },
  { channelUrl: "https://priceai.cc/products/chatgpt-team-business", merchantName: "PriceAI", platform: "聚合源", status: "AGGREGATOR" },
];

/**
 * 已知 K12 / Bug Team 店铺链接。
 * 这些店铺来自公开的 AI 账号发卡平台，主要销售 K12 教育资格和 Bug Team 套餐。
 */
const BASE_CANDIDATES: CandidateSeed[] = [
  // ── ldxp.cn 发卡平台店铺 ──
  { productUrl: "https://pay.ldxp.cn/shop/JL7007", sourceType: "manual" },
  { productUrl: "https://pay.ldxp.cn/shop/caishen", sourceType: "manual" },
  { productUrl: "https://pay.ldxp.cn/shop/mengze", sourceType: "manual" },
  { productUrl: "https://pay.ldxp.cn/shop/6YEJH8PE", sourceType: "manual" },
  { productUrl: "https://pay.ldxp.cn/shop/XHA54E0U", sourceType: "manual" },
  { productUrl: "https://pay.ldxp.cn/shop/JBJJWNA5", sourceType: "manual" },
  // ── codesky.qzz.io 发卡平台 ──
  // 花生店铺，出售 GPT-K12 子号、Outlook、Gmail 等数字商品
  { productUrl: "https://store.codesky.qzz.io/item/8", sourceType: "manual" },
  // ── gptmf.com 发卡平台 ──
  // GPT魔法商店，出售 ChatGPT Team 账号
  { productUrl: "https://shop.gptmf.com/buy/26", sourceType: "manual" },
];

const PRICEAI_PUBLIC_RESEARCH_CANDIDATES = JSON.parse(String.raw`[
  {"productUrl":"https://pay.ldxp.cn/item/sa3mf0","sourceType":"manual","status":"REVIEW_REQUIRED","extractionResult":{"pageTitle":"bug team，250刀，cpa格式，需要其他格式自己转换","price":15.82,"merchantName":"Ai小铺","sourceUrl":"https://priceai.cc/products/chatgpt-team-business","focus":"Bug Team","availability":"IN_STOCK","note":"PriceAI public listing tagged Bug Team (team_bug, proxy_supported); no fraud conclusion recorded.","observedAt":"2026-07-12T07:04:31.604+00:00","inventory":192}},
  {"productUrl":"https://pay.ldxp.cn/item/3kznsw","sourceType":"manual","status":"REVIEW_REQUIRED","extractionResult":{"pageTitle":"gpt Team bug 子号 最低200刀（无质保，拿着卡密去兑换地址下载JSON文件）","price":1.02,"merchantName":"AI 云智聪聪","sourceUrl":"https://priceai.cc/products/chatgpt-team-business","focus":"Bug Team","availability":"IN_STOCK","note":"PriceAI public listing tagged Bug Team (delivery_recharge, team_bug, proxy_supported); no fraud conclusion recorded.","observedAt":"2026-07-12T06:28:52.097+00:00","inventory":0}},
  {"productUrl":"https://shop.aitonse.com/products/team01","sourceType":"manual","status":"REVIEW_REQUIRED","extractionResult":{"pageTitle":"team 成品bug号 200刀（无质保） / 规格4","price":1.6,"merchantName":"Auto Subscribe / shop.aitonse.com","sourceUrl":"https://priceai.cc/products/chatgpt-team-business","focus":"Bug Team","availability":"UNAVAILABLE","note":"PriceAI public listing tagged Bug Team (delivery_account, team_bug); no fraud conclusion recorded.","observedAt":"2026-06-17T13:05:29.071+00:00","inventory":0}},
  {"productUrl":"https://pay.ldxp.cn/item/2dwdah","sourceType":"manual","status":"REVIEW_REQUIRED","extractionResult":{"pageTitle":"gpt Team bug 子号 最低200刀（无质保，拿着卡密去兑换地址下载JSON文件）","price":2.97,"merchantName":"ALL IN AI","sourceUrl":"https://priceai.cc/products/chatgpt-team-business","focus":"Bug Team","availability":"IN_STOCK","note":"PriceAI public listing tagged Bug Team (delivery_recharge, team_bug, proxy_supported); no fraud conclusion recorded.","observedAt":"2026-07-12T06:23:39.928+00:00","inventory":0}},
  {"productUrl":"https://catfk.com/item/aa5xrq","sourceType":"manual","status":"REVIEW_REQUIRED","extractionResult":{"pageTitle":"bugteam sub格式 json文件（质保下单半小时内首登）（量大预定）","price":5.6,"merchantName":"Xx-gpt-gemini","sourceUrl":"https://priceai.cc/products/chatgpt-team-business","focus":"Bug Team","availability":"IN_STOCK","note":"PriceAI public listing tagged Bug Team (delivery_account, team_bug, proxy_supported); no fraud conclusion recorded.","observedAt":"2026-07-12T06:39:09.602+00:00","inventory":0}},
  {"productUrl":"https://faka.aiceo.dev/products/tr_bug","sourceType":"manual","status":"REVIEW_REQUIRED","extractionResult":{"pageTitle":"【rt】bug team","price":7,"merchantName":"team","sourceUrl":"https://priceai.cc/products/chatgpt-team-business","focus":"Bug Team","availability":"UNAVAILABLE","note":"PriceAI public listing tagged Bug Team (team_bug); no fraud conclusion recorded.","observedAt":"2026-07-12T06:50:04.723+00:00","inventory":0}},
  {"productUrl":"https://pay.ldxp.cn/item/j8mnr1","sourceType":"manual","status":"REVIEW_REQUIRED","extractionResult":{"pageTitle":"bugteam sub用 401自行可写脚本自动救 不是死了 账号都会测活发出 无售后","price":7.21,"merchantName":"鱼ai","sourceUrl":"https://priceai.cc/products/chatgpt-team-business","focus":"Bug Team","availability":"IN_STOCK","note":"PriceAI public listing tagged Bug Team (delivery_account, team_bug); no fraud conclusion recorded.","observedAt":"2026-07-12T06:53:33.835+00:00","inventory":0}},
  {"productUrl":"https://pay.ldxp.cn/item/wlkl0h","sourceType":"manual","status":"REVIEW_REQUIRED","extractionResult":{"pageTitle":"bug team 240刀【发货JSON,一个小时内有问题给补,不会用的别拍】","price":7.21,"merchantName":"牟利ai","sourceUrl":"https://priceai.cc/products/chatgpt-team-business","focus":"Bug Team","availability":"IN_STOCK","note":"PriceAI public listing tagged Bug Team (team_bug); no fraud conclusion recorded.","observedAt":"2026-07-12T06:37:48.166+00:00","inventory":0}},
  {"productUrl":"https://pay.ldxp.cn/item/m3snce","sourceType":"manual","status":"REVIEW_REQUIRED","extractionResult":{"pageTitle":"BUG Team 凭证，质保首登","price":7.93,"merchantName":"FranklyBuilds的AI小店","sourceUrl":"https://priceai.cc/products/chatgpt-team-business","focus":"Bug Team","availability":"IN_STOCK","note":"PriceAI public listing tagged Bug Team (delivery_account, team_bug); no fraud conclusion recorded.","observedAt":"2026-07-12T06:59:15.624+00:00","inventory":0}},
  {"productUrl":"https://pay.ldxp.cn/item/ruzck3","sourceType":"manual","status":"REVIEW_REQUIRED","extractionResult":{"pageTitle":"BUG Team 凭证，质保首登","price":8,"merchantName":"PLUS直营店","sourceUrl":"https://priceai.cc/products/chatgpt-team-business","focus":"Bug Team","availability":"IN_STOCK","note":"PriceAI public listing tagged Bug Team (delivery_account, team_bug); no fraud conclusion recorded.","observedAt":"2026-07-12T06:30:02.702+00:00","inventory":0}},
  {"productUrl":"https://pay.ldxp.cn/item/kgtebx","sourceType":"manual","status":"REVIEW_REQUIRED","extractionResult":{"pageTitle":"Bug Team 150-200刀+月限 JSON文件 RT号","price":8.24,"merchantName":"ChatGptPlus 陌路专营店 分销码molu","sourceUrl":"https://priceai.cc/products/chatgpt-team-business","focus":"Bug Team","availability":"IN_STOCK","note":"PriceAI public listing tagged Bug Team (team_bug, proxy_supported); no fraud conclusion recorded.","observedAt":"2026-07-12T06:47:55.549+00:00","inventory":0}},
  {"productUrl":"https://pay.ldxp.cn/item/8hxnpk","sourceType":"manual","status":"REVIEW_REQUIRED","extractionResult":{"pageTitle":"【聪明渠道】bugteam","price":8.5,"merchantName":"AI深研社","sourceUrl":"https://priceai.cc/products/chatgpt-team-business","focus":"Bug Team","availability":"IN_STOCK","note":"PriceAI public listing tagged Bug Team (team_bug); no fraud conclusion recorded.","observedAt":"2026-07-12T06:23:05.79+00:00","inventory":0}},
  {"productUrl":"https://pay.ldxp.cn/item/9vtj7d","sourceType":"manual","status":"REVIEW_REQUIRED","extractionResult":{"pageTitle":"Bug Team 150-200刀+月限 JSON文件 RT号","price":9.27,"merchantName":"AI小店","sourceUrl":"https://priceai.cc/products/chatgpt-team-business","focus":"Bug Team","availability":"IN_STOCK","note":"PriceAI public listing tagged Bug Team (team_bug, proxy_supported); no fraud conclusion recorded.","observedAt":"2026-07-12T06:26:06.205+00:00","inventory":0}},
  {"productUrl":"https://pay.ldxp.cn/item/zk70i6","sourceType":"manual","status":"REVIEW_REQUIRED","extractionResult":{"pageTitle":"bugteam sub用 401自行可写脚本自动救 不是死了 账号都会测活发出 无售后","price":12.6,"merchantName":"lowfish的AI小铺","sourceUrl":"https://priceai.cc/products/chatgpt-team-business","focus":"Bug Team","availability":"IN_STOCK","note":"PriceAI public listing tagged Bug Team (delivery_account, team_bug); no fraud conclusion recorded.","observedAt":"2026-07-12T07:08:01.664+00:00","inventory":0}},
  {"productUrl":"https://pay.ldxp.cn/item/iqldxg","sourceType":"manual","status":"REVIEW_REQUIRED","extractionResult":{"pageTitle":"tz-bugteam sub用 无售后顶级跑量 sub401自己救活 是subbug","price":13,"merchantName":"奥特曼严选","sourceUrl":"https://priceai.cc/products/chatgpt-team-business","focus":"Bug Team","availability":"IN_STOCK","note":"PriceAI public listing tagged Bug Team (team_bug); no fraud conclusion recorded.","observedAt":"2026-07-12T06:35:57.57+00:00","inventory":0}},
  {"productUrl":"https://pay.ldxp.cn/item/nf4n9z","sourceType":"manual","status":"REVIEW_REQUIRED","extractionResult":{"pageTitle":"【codex-反代】bugteam成品（只能反代，买错不退）","price":13.91,"merchantName":"小票的ai小铺","sourceUrl":"https://priceai.cc/products/chatgpt-team-business","focus":"Bug Team","availability":"IN_STOCK","note":"PriceAI public listing tagged Bug Team (delivery_account, team_bug); no fraud conclusion recorded.","observedAt":"2026-07-12T06:51:00.867+00:00","inventory":0}},
  {"productUrl":"https://pay.ldxp.cn/item/7rursq","sourceType":"manual","status":"REVIEW_REQUIRED","extractionResult":{"pageTitle":"bugteam sub用 401自行可写脚本自动救 不是死了 账号都会测活发出 无售后","price":14.21,"merchantName":"如鱼得水(玩转ai)","sourceUrl":"https://priceai.cc/products/chatgpt-team-business","focus":"Bug Team","availability":"IN_STOCK","note":"PriceAI public listing tagged Bug Team (delivery_account, team_bug); no fraud conclusion recorded.","observedAt":"2026-07-12T06:45:33.461+00:00","inventory":0}},
  {"productUrl":"https://pay.ldxp.cn/item/t6ix25","sourceType":"manual","status":"REVIEW_REQUIRED","extractionResult":{"pageTitle":"bug team【只有sub2能跑，其余的反代软件用不了】","price":14.32,"merchantName":"7878","sourceUrl":"https://priceai.cc/products/chatgpt-team-business","focus":"Bug Team","availability":"IN_STOCK","note":"PriceAI public listing tagged Bug Team (team_bug, proxy_supported); no fraud conclusion recorded.","observedAt":"2026-07-12T06:48:41.363+00:00","inventory":0}},
  {"productUrl":"https://pay.ldxp.cn/item/djew8i","sourceType":"manual","status":"REVIEW_REQUIRED","extractionResult":{"pageTitle":"bug team","price":14.32,"merchantName":"懒羊羊","sourceUrl":"https://priceai.cc/products/chatgpt-team-business","focus":"Bug Team","availability":"IN_STOCK","note":"PriceAI public listing tagged Bug Team (team_bug); no fraud conclusion recorded.","observedAt":"2026-07-12T06:43:10.38+00:00","inventory":0}},
  {"productUrl":"https://pay.ldxp.cn/item/okbdzz","sourceType":"manual","status":"REVIEW_REQUIRED","extractionResult":{"pageTitle":"bug team，250刀，cpa格式，需要其他格式自己转换","price":15.45,"merchantName":"梦泽","sourceUrl":"https://priceai.cc/products/chatgpt-team-business","focus":"Bug Team","availability":"IN_STOCK","note":"PriceAI public listing tagged Bug Team (team_bug, proxy_supported); no fraud conclusion recorded.","observedAt":"2026-07-12T06:46:36.785+00:00","inventory":0}},
  {"productUrl":"https://pay.ldxp.cn/item/i0b7g0","sourceType":"manual","status":"REVIEW_REQUIRED","extractionResult":{"pageTitle":"bug team","price":15.45,"merchantName":"东北23333--承接理工科毕设","sourceUrl":"https://priceai.cc/products/chatgpt-team-business","focus":"Bug Team","availability":"IN_STOCK","note":"PriceAI public listing tagged Bug Team (team_bug); no fraud conclusion recorded.","observedAt":"2026-07-12T06:33:22.72+00:00","inventory":0}},
  {"productUrl":"https://pay.ldxp.cn/item/rrs1jc","sourceType":"manual","status":"REVIEW_REQUIRED","extractionResult":{"pageTitle":"tz-bugteam sub用 无售后顶级跑量 sub401自己救活 是subbug","price":15.45,"merchantName":"青蛙AI·低价源头","sourceUrl":"https://priceai.cc/products/chatgpt-team-business","focus":"Bug Team","availability":"IN_STOCK","note":"PriceAI public listing tagged Bug Team (team_bug); no fraud conclusion recorded.","observedAt":"2026-07-12T06:28:03.172+00:00","inventory":0}},
  {"productUrl":"https://pay.ldxp.cn/item/felaa3","sourceType":"manual","status":"REVIEW_REQUIRED","extractionResult":{"pageTitle":"bugteam sub用 401自行可写脚本自动救 不是死了 账号都会测活发出 无售后","price":15.45,"merchantName":"明云小铺","sourceUrl":"https://priceai.cc/products/chatgpt-team-business","focus":"Bug Team","availability":"IN_STOCK","note":"PriceAI public listing tagged Bug Team (delivery_account, team_bug); no fraud conclusion recorded.","observedAt":"2026-07-12T06:25:27.418+00:00","inventory":0}},
  {"productUrl":"https://pay.ldxp.cn/item/8lvsyt","sourceType":"manual","status":"REVIEW_REQUIRED","extractionResult":{"pageTitle":"tz-bugteam sub用 无售后顶级跑量 sub401自己救活 是subbug","price":15.7,"merchantName":"小猫GPT源头分销码：dxeoq4i7","sourceUrl":"https://priceai.cc/products/chatgpt-team-business","focus":"Bug Team","availability":"IN_STOCK","note":"PriceAI public listing tagged Bug Team (team_bug); no fraud conclusion recorded.","observedAt":"2026-07-12T06:33:56.382+00:00","inventory":0}},
  {"productUrl":"https://pay.ldxp.cn/item/b4fp94","sourceType":"manual","status":"REVIEW_REQUIRED","extractionResult":{"pageTitle":"bugteam sub用 401自行可写脚本自动救 不是死了 账号都会测活发出 无售后","price":16.07,"merchantName":"极速Ai","sourceUrl":"https://priceai.cc/products/chatgpt-team-business","focus":"Bug Team","availability":"IN_STOCK","note":"PriceAI public listing tagged Bug Team (delivery_account, team_bug); no fraud conclusion recorded.","observedAt":"2026-07-12T06:17:37.875+00:00","inventory":0}},
  {"productUrl":"https://pay.ldxp.cn/item/z67ry0","sourceType":"manual","status":"REVIEW_REQUIRED","extractionResult":{"pageTitle":"k12 json 格式 gmail，兑换会进行测活，导入401 售后，后续其余不进行任何售后","price":1.13,"merchantName":"FranklyBuilds的AI小店","sourceUrl":"https://priceai.cc/products/chatgpt-team-business","focus":"K12","availability":"IN_STOCK","note":"PriceAI public listing tagged K12 (team_k12, proxy_supported); no fraud conclusion recorded.","observedAt":"2026-07-12T06:59:15.624+00:00","inventory":30}},
  {"productUrl":"https://pay.ldxp.cn/item/9ut7wz","sourceType":"manual","status":"REVIEW_REQUIRED","extractionResult":{"pageTitle":"k12子号 反代 保首登（CPA+sub2api格式发货）--子号--不支持网页登录","price":1.85,"merchantName":"牟利ai","sourceUrl":"https://priceai.cc/products/chatgpt-team-business","focus":"K12","availability":"IN_STOCK","note":"PriceAI public listing tagged K12 (delivery_account, team_k12, proxy_supported); no fraud conclusion recorded.","observedAt":"2026-07-12T06:37:48.166+00:00","inventory":182}},
  {"productUrl":"https://pay.ldxp.cn/item/tygrdi","sourceType":"manual","status":"REVIEW_REQUIRED","extractionResult":{"pageTitle":"GPT Team K12 成品 JSON 反代 发cpa 质保首登","price":1.9,"merchantName":"如鱼得水(玩转ai)","sourceUrl":"https://priceai.cc/products/chatgpt-team-business","focus":"K12","availability":"IN_STOCK","note":"PriceAI public listing tagged K12 (delivery_account, team_k12, proxy_supported); no fraud conclusion recorded.","observedAt":"2026-07-12T06:45:33.461+00:00","inventory":56}},
  {"productUrl":"https://pay.ldxp.cn/item/79kzm5","sourceType":"manual","status":"REVIEW_REQUIRED","extractionResult":{"pageTitle":"k12子号 反代 保首登（CPA+sub2api格式发货）--子号--不支持网页登录","price":2,"merchantName":"奥特曼严选","sourceUrl":"https://priceai.cc/products/chatgpt-team-business","focus":"K12","availability":"IN_STOCK","note":"PriceAI public listing tagged K12 (delivery_account, team_k12, proxy_supported); no fraud conclusion recorded.","observedAt":"2026-07-12T06:35:57.57+00:00","inventory":182}},
  {"productUrl":"https://pay.ldxp.cn/item/zn7ziu","sourceType":"manual","status":"REVIEW_REQUIRED","extractionResult":{"pageTitle":"微软邮箱 GPT Team K12 成品 JSON 反代 发cpa 质保首登 7.12号中午新货","price":2.06,"merchantName":"源头GPT","sourceUrl":"https://priceai.cc/products/chatgpt-team-business","focus":"K12","availability":"IN_STOCK","note":"PriceAI public listing tagged K12 (delivery_account, team_k12, proxy_supported); no fraud conclusion recorded.","observedAt":"2026-07-12T07:07:41.037+00:00","inventory":105}},
  {"productUrl":"https://pay.ldxp.cn/item/hfwbv2","sourceType":"manual","status":"REVIEW_REQUIRED","extractionResult":{"pageTitle":"k12 team 成品 限反代 保首登（无RT|CPA）11","price":2.06,"merchantName":"CAO","sourceUrl":"https://priceai.cc/products/chatgpt-team-business","focus":"K12","availability":"IN_STOCK","note":"PriceAI public listing tagged K12 (delivery_account, team_k12, proxy_supported); no fraud conclusion recorded.","observedAt":"2026-07-12T07:03:03.941+00:00","inventory":108}},
  {"productUrl":"https://pay.ldxp.cn/item/ugws9l","sourceType":"manual","status":"REVIEW_REQUIRED","extractionResult":{"pageTitle":"GPT Team K12 成品 JSON 反代 发cpa 质保首登","price":2.06,"merchantName":"ming的AI商店","sourceUrl":"https://priceai.cc/products/chatgpt-team-business","focus":"K12","availability":"IN_STOCK","note":"PriceAI public listing tagged K12 (delivery_account, team_k12, proxy_supported); no fraud conclusion recorded.","observedAt":"2026-07-12T06:49:26.401+00:00","inventory":31}},
  {"productUrl":"https://pay.ldxp.cn/item/gt4xbd","sourceType":"manual","status":"REVIEW_REQUIRED","extractionResult":{"pageTitle":"k12子号 反代 保首登（CPA+sub2api格式发货）--子号--不支持网页登录","price":2.06,"merchantName":"GPT-源头供货-招代理","sourceUrl":"https://priceai.cc/products/chatgpt-team-business","focus":"K12","availability":"IN_STOCK","note":"PriceAI public listing tagged K12 (delivery_account, team_k12, proxy_supported); no fraud conclusion recorded.","observedAt":"2026-07-12T06:34:52.066+00:00","inventory":185}},
  {"productUrl":"https://pay.ldxp.cn/item/wzvc62","sourceType":"manual","status":"REVIEW_REQUIRED","extractionResult":{"pageTitle":"微软邮箱 GPT Team K12 成品 JSON 反代 发cpa 质保首登 7.12号中午新货","price":2.11,"merchantName":"Ai小铺","sourceUrl":"https://priceai.cc/products/chatgpt-team-business","focus":"K12","availability":"IN_STOCK","note":"PriceAI public listing tagged K12 (delivery_account, team_k12, proxy_supported); no fraud conclusion recorded.","observedAt":"2026-07-12T07:04:31.604+00:00","inventory":108}},
  {"productUrl":"https://pay.ldxp.cn/item/rm7soh","sourceType":"manual","status":"REVIEW_REQUIRED","extractionResult":{"pageTitle":"k12子号 反代 保首登（CPA+sub2api格式发货）--子号--不支持网页登录","price":2.22,"merchantName":"一梦AI","sourceUrl":"https://priceai.cc/products/chatgpt-team-business","focus":"K12","availability":"IN_STOCK","note":"PriceAI public listing tagged K12 (delivery_account, team_k12, proxy_supported); no fraud conclusion recorded.","observedAt":"2026-07-12T06:42:23.616+00:00","inventory":167}},
  {"productUrl":"https://pay.ldxp.cn/item/4mvjf1","sourceType":"manual","status":"REVIEW_REQUIRED","extractionResult":{"pageTitle":"微软邮箱 GPT Team K12 成品 JSON 反代 发cpa 质保首登 7.12号中午新货","price":2.25,"merchantName":"黑白小狗AI旗舰店","sourceUrl":"https://priceai.cc/products/chatgpt-team-business","focus":"K12","availability":"IN_STOCK","note":"PriceAI public listing tagged K12 (delivery_account, team_k12, proxy_supported); no fraud conclusion recorded.","observedAt":"2026-07-12T06:55:40.297+00:00","inventory":175}},
  {"productUrl":"https://pay.ldxp.cn/item/bztyln","sourceType":"manual","status":"REVIEW_REQUIRED","extractionResult":{"pageTitle":"微软邮箱 GPT Team K12 成品 JSON 反代 发cpa 质保首登 7.12号中午新货","price":2.27,"merchantName":"梦泽","sourceUrl":"https://priceai.cc/products/chatgpt-team-business","focus":"K12","availability":"IN_STOCK","note":"PriceAI public listing tagged K12 (delivery_account, team_k12, proxy_supported); no fraud conclusion recorded.","observedAt":"2026-07-12T06:46:36.785+00:00","inventory":235}},
  {"productUrl":"https://pay.ldxp.cn/item/raj9c4","sourceType":"manual","status":"REVIEW_REQUIRED","extractionResult":{"pageTitle":"微软邮箱 GPT Team K12 成品 JSON 反代 发cpa 质保首登 7.12号中午新货","price":2.37,"merchantName":"chiyu","sourceUrl":"https://priceai.cc/products/chatgpt-team-business","focus":"K12","availability":"IN_STOCK","note":"PriceAI public listing tagged K12 (delivery_account, team_k12, proxy_supported); no fraud conclusion recorded.","observedAt":"2026-07-12T06:21:41.049+00:00","inventory":293}},
  {"productUrl":"https://pay.ldxp.cn/item/ai255p","sourceType":"manual","status":"REVIEW_REQUIRED","extractionResult":{"pageTitle":"微软邮箱 GPT Team K12 成品 JSON 反代 发cpa 质保首登 7.12号中午新货","price":2.5,"merchantName":"陆柒科技","sourceUrl":"https://priceai.cc/products/chatgpt-team-business","focus":"K12","availability":"IN_STOCK","note":"PriceAI public listing tagged K12 (delivery_account, team_k12, proxy_supported); no fraud conclusion recorded.","observedAt":"2026-07-12T06:30:04.717+00:00","inventory":308}},
  {"productUrl":"https://pay.ldxp.cn/item/5bav0k","sourceType":"manual","status":"REVIEW_REQUIRED","extractionResult":{"pageTitle":"k12 team成品","price":2.56,"merchantName":"7878","sourceUrl":"https://priceai.cc/products/chatgpt-team-business","focus":"K12","availability":"IN_STOCK","note":"PriceAI public listing tagged K12 (delivery_account, team_k12); no fraud conclusion recorded.","observedAt":"2026-07-12T06:48:41.363+00:00","inventory":28}},
  {"productUrl":"https://pay.ldxp.cn/item/ohroa6","sourceType":"manual","status":"REVIEW_REQUIRED","extractionResult":{"pageTitle":"k12 成品号 只可反代 质保首登 额度在100刀左右 不会用勿拍 拍了不退","price":2.58,"merchantName":"Hug AI","sourceUrl":"https://priceai.cc/products/chatgpt-team-business","focus":"K12","availability":"IN_STOCK","note":"PriceAI public listing tagged K12 (delivery_account, team_k12, proxy_supported); no fraud conclusion recorded.","observedAt":"2026-07-12T06:19:58.819+00:00","inventory":378}},
  {"productUrl":"https://pay.ldxp.cn/item/pzj0gp","sourceType":"manual","status":"REVIEW_REQUIRED","extractionResult":{"pageTitle":"谷歌GPT K12 成品1个｜Sub2API/CPA JSON可选｜首登质保｜可刷AT","price":2.78,"merchantName":"AI小铺","sourceUrl":"https://priceai.cc/products/chatgpt-team-business","focus":"K12","availability":"IN_STOCK","note":"PriceAI public listing tagged K12 (delivery_account, team_k12, proxy_supported); no fraud conclusion recorded.","observedAt":"2026-07-12T06:27:06.974+00:00","inventory":163}},
  {"productUrl":"https://pay.ldxp.cn/item/yggdut","sourceType":"manual","status":"REVIEW_REQUIRED","extractionResult":{"pageTitle":"k12 team成品","price":2.88,"merchantName":"金幺の小店","sourceUrl":"https://priceai.cc/products/chatgpt-team-business","focus":"K12","availability":"IN_STOCK","note":"PriceAI public listing tagged K12 (delivery_account, team_k12); no fraud conclusion recorded.","observedAt":"2026-07-12T07:06:37.914+00:00","inventory":18}},
  {"productUrl":"https://pay.ldxp.cn/item/k14r5c","sourceType":"manual","status":"REVIEW_REQUIRED","extractionResult":{"pageTitle":"GPT Team K12 成品 JSON 反代 发cpa/cdk 质保首登","price":2.88,"merchantName":"NiuGe AI 加钟站","sourceUrl":"https://priceai.cc/products/chatgpt-team-business","focus":"K12","availability":"IN_STOCK","note":"PriceAI public listing tagged K12 (delivery_recharge, delivery_account, team_k12, proxy_supported); no fraud conclusion recorded.","observedAt":"2026-07-12T06:55:10.392+00:00","inventory":216}},
  {"productUrl":"https://pay.ldxp.cn/item/s4xe80","sourceType":"manual","status":"REVIEW_REQUIRED","extractionResult":{"pageTitle":"GPT Team K12 成品 JSON 反代 发cpa 质保首登 7.12号中午新货","price":2.9,"merchantName":"小猫GPT源头分销码：dxeoq4i7","sourceUrl":"https://priceai.cc/products/chatgpt-team-business","focus":"K12","availability":"IN_STOCK","note":"PriceAI public listing tagged K12 (delivery_account, team_k12, proxy_supported); no fraud conclusion recorded.","observedAt":"2026-07-12T06:33:56.382+00:00","inventory":302}},
  {"productUrl":"https://pay.ldxp.cn/item/6get4g","sourceType":"manual","status":"REVIEW_REQUIRED","extractionResult":{"pageTitle":"《精品》基本存活超过1天！ 谷歌GPTK12 team K12 成品/可刷AT","price":2.9,"merchantName":"卖点AI","sourceUrl":"https://priceai.cc/products/chatgpt-team-business","focus":"K12","availability":"IN_STOCK","note":"PriceAI public listing tagged K12 (delivery_account, team_k12, duration_trial); no fraud conclusion recorded.","observedAt":"2026-07-12T06:25:51.348+00:00","inventory":49}},
  {"productUrl":"https://pay.ldxp.cn/item/cgvr1j","sourceType":"manual","status":"REVIEW_REQUIRED","extractionResult":{"pageTitle":"k12 team成品","price":3.08,"merchantName":"懒羊羊","sourceUrl":"https://priceai.cc/products/chatgpt-team-business","focus":"K12","availability":"IN_STOCK","note":"PriceAI public listing tagged K12 (delivery_account, team_k12); no fraud conclusion recorded.","observedAt":"2026-07-12T06:43:10.38+00:00","inventory":30}},
  {"productUrl":"https://pay.ldxp.cn/item/te23fd","sourceType":"manual","status":"REVIEW_REQUIRED","extractionResult":{"pageTitle":"GPT Team K12 成品 JSON 反代 发cpa/cdk 质保首登","price":3.08,"merchantName":"雪豹AI","sourceUrl":"https://priceai.cc/products/chatgpt-team-business","focus":"K12","availability":"IN_STOCK","note":"PriceAI public listing tagged K12 (delivery_recharge, delivery_account, team_k12, proxy_supported); no fraud conclusion recorded.","observedAt":"2026-07-12T06:24:53.05+00:00","inventory":222}},
  {"productUrl":"https://pay.ldxp.cn/item/1dx0u8","sourceType":"manual","status":"REVIEW_REQUIRED","extractionResult":{"pageTitle":"微软邮箱 GPT Team K12 成品 JSON 反代 发cpa 质保首登 7.12号中午新货","price":3.09,"merchantName":"哈哈的ai杂货铺","sourceUrl":"https://priceai.cc/products/chatgpt-team-business","focus":"K12","availability":"IN_STOCK","note":"PriceAI public listing tagged K12 (delivery_account, team_k12, proxy_supported); no fraud conclusion recorded.","observedAt":"2026-07-12T06:57:34.633+00:00","inventory":135}},
  {"productUrl":"https://pay.ldxp.cn/item/qs99fb","sourceType":"manual","status":"REVIEW_REQUIRED","extractionResult":{"pageTitle":"k12 子号，反代无售后","price":3.09,"merchantName":"ai教父","sourceUrl":"https://priceai.cc/products/chatgpt-team-business","focus":"K12","availability":"IN_STOCK","note":"PriceAI public listing tagged K12 (team_k12); no fraud conclusion recorded.","observedAt":"2026-07-12T06:40:27.094+00:00","inventory":35}}
]`) as CandidateSeed[];

const PRICEAI_PUBLIC_RESEARCH_EXTRA_CANDIDATES = JSON.parse(String.raw`[
  {"productUrl":"https://pay.ldxp.cn/item/ccxcfn","sourceType":"manual","status":"REVIEW_REQUIRED","extractionResult":{"pageTitle":"GPT Team K12 成品 JSON 反代 发cpa 质保首登","price":3.09,"merchantName":"东北23333--承接理工科毕设","sourceUrl":"https://priceai.cc/products/chatgpt-team-business","focus":"K12","availability":"IN_STOCK","note":"PriceAI public listing tagged K12 (delivery_account, team_k12, proxy_supported); no fraud conclusion recorded.","observedAt":"2026-07-12T06:33:22.72+00:00","inventory":93}},
  {"productUrl":"https://pay.ldxp.cn/item/hlqaww","sourceType":"manual","status":"REVIEW_REQUIRED","extractionResult":{"pageTitle":"微软邮箱 GPT Team K12 成品 JSON 反代 发cpa 质保首登 7.12号中午新货","price":3.09,"merchantName":"青蛙AI·低价源头","sourceUrl":"https://priceai.cc/products/chatgpt-team-business","focus":"K12","availability":"IN_STOCK","note":"PriceAI public listing tagged K12 (delivery_account, team_k12, proxy_supported); no fraud conclusion recorded.","observedAt":"2026-07-12T06:28:03.172+00:00","inventory":325}},
  {"productUrl":"https://pay.ldxp.cn/item/bxb8bl","sourceType":"manual","status":"REVIEW_REQUIRED","extractionResult":{"pageTitle":"谷歌 GPT K12 成品1个｜Sub2API/CPA JSON可选｜首登质保｜可刷AT","price":3.2,"merchantName":"IMAGE-2","sourceUrl":"https://priceai.cc/products/chatgpt-team-business","focus":"K12","availability":"IN_STOCK","note":"PriceAI public listing tagged K12 (delivery_account, team_k12, proxy_supported); no fraud conclusion recorded.","observedAt":"2026-07-12T06:57:59.659+00:00","inventory":217}},
  {"productUrl":"https://pay.ldxp.cn/item/m7cry4","sourceType":"manual","status":"REVIEW_REQUIRED","extractionResult":{"pageTitle":"GPT Team K12 成品 JSON 反代 发cpa 质保首登","price":3.3,"merchantName":"小柴AI","sourceUrl":"https://priceai.cc/products/chatgpt-team-business","focus":"K12","availability":"IN_STOCK","note":"PriceAI public listing tagged K12 (delivery_account, team_k12, proxy_supported); no fraud conclusion recorded.","observedAt":"2026-07-12T06:49:33.695+00:00","inventory":31}},
  {"productUrl":"https://pay.ldxp.cn/item/dz41ga","sourceType":"manual","status":"REVIEW_REQUIRED","extractionResult":{"pageTitle":"谷歌GPT K12 成品1个｜Sub2API/CPA JSON可选｜首登质保｜可刷AT","price":3.36,"merchantName":"team最后的余晖","sourceUrl":"https://priceai.cc/products/chatgpt-team-business","focus":"K12","availability":"IN_STOCK","note":"PriceAI public listing tagged K12 (delivery_account, team_k12, proxy_supported); no fraud conclusion recorded.","observedAt":"2026-07-12T06:52:47.536+00:00","inventory":350}},
  {"productUrl":"https://pay.ldxp.cn/item/8didxf","sourceType":"manual","status":"REVIEW_REQUIRED","extractionResult":{"pageTitle":"k12 成品号 只可反代 质保首登 额度在100刀左右 不会用勿拍 拍了不退","price":3.5,"merchantName":"源头的ai","sourceUrl":"https://priceai.cc/products/chatgpt-team-business","focus":"K12","availability":"IN_STOCK","note":"PriceAI public listing tagged K12 (delivery_account, team_k12, proxy_supported); no fraud conclusion recorded.","observedAt":"2026-07-12T07:09:41.137+00:00","inventory":365}},
  {"productUrl":"https://pay.ldxp.cn/item/oh4f9g","sourceType":"manual","status":"REVIEW_REQUIRED","extractionResult":{"pageTitle":"GPT Team K12 成品 JSON 反代 发cpa/cdk 质保首登","price":3.8,"merchantName":"北极星AI","sourceUrl":"https://priceai.cc/products/chatgpt-team-business","focus":"K12","availability":"IN_STOCK","note":"PriceAI public listing tagged K12 (delivery_recharge, delivery_account, team_k12, proxy_supported); no fraud conclusion recorded.","observedAt":"2026-07-12T07:09:28.141+00:00","inventory":214}},
  {"productUrl":"https://pay.ldxp.cn/item/xgim2c","sourceType":"manual","status":"REVIEW_REQUIRED","extractionResult":{"pageTitle":"GPT Team K12 成品 JSON 反代 发cpa/cdk 质保首登","price":3.91,"merchantName":"ALL IN AI","sourceUrl":"https://priceai.cc/products/chatgpt-team-business","focus":"K12","availability":"IN_STOCK","note":"PriceAI public listing tagged K12 (delivery_recharge, delivery_account, team_k12, proxy_supported); no fraud conclusion recorded.","observedAt":"2026-07-12T06:23:39.928+00:00","inventory":222}},
  {"productUrl":"https://pay.ldxp.cn/item/p2ul10","sourceType":"manual","status":"REVIEW_REQUIRED","extractionResult":{"pageTitle":"k12 team成品","price":4,"merchantName":"光之国AI","sourceUrl":"https://priceai.cc/products/chatgpt-team-business","focus":"K12","availability":"IN_STOCK","note":"PriceAI public listing tagged K12 (delivery_account, team_k12); no fraud conclusion recorded.","observedAt":"2026-07-12T07:02:21.91+00:00","inventory":20}}
]`) as CandidateSeed[];

const PRICEAI_PUBLIC_RESEARCH_2026_07_14_CANDIDATES = JSON.parse(String.raw`[
  {"productUrl":"https://pay.ldxp.cn/item/1sw3h5","sourceType":"manual","status":"REVIEW_REQUIRED","extractionResult":{"pageTitle":"微软邮箱 GPT Team K12 成品 JSON 反代 发cpa 质保首登 7.14--2.01新货已过滤","price":0.85,"merchantName":"ton","sourceUrl":"https://priceai.cc/products/chatgpt-team-business","focus":"K12","availability":"IN_STOCK","note":"PriceAI public listing tagged K12; direct product URL returned HTTP 200; no fraud conclusion recorded.","observedAt":"2026-07-14T19:35:00+08:00"}},
  {"productUrl":"https://pay.ldxp.cn/item/362lyn","sourceType":"manual","status":"REVIEW_REQUIRED","extractionResult":{"pageTitle":"微软邮箱 GPT Team K12 成品 JSON 反代 发cpa 质保首登 7.14号新货","price":0.88,"merchantName":"IMAGE-2","sourceUrl":"https://priceai.cc/products/chatgpt-team-business","focus":"K12","availability":"IN_STOCK","note":"PriceAI public listing tagged K12; direct product URL returned HTTP 200; no fraud conclusion recorded.","observedAt":"2026-07-14T19:47:00+08:00"}},
  {"productUrl":"https://pay.ldxp.cn/item/3wbd6o","sourceType":"manual","status":"REVIEW_REQUIRED","extractionResult":{"pageTitle":"微软邮箱 GPT Team K12 成品 JSON 反代 发cpa 质保首登 7.14号新货","price":0.91,"merchantName":"FranklyBuilds的AI小店","sourceUrl":"https://priceai.cc/products/chatgpt-team-business","focus":"K12","availability":"IN_STOCK","note":"PriceAI public listing tagged K12; direct product URL returned HTTP 200; no fraud conclusion recorded.","observedAt":"2026-07-14T20:12:00+08:00"}},
  {"productUrl":"https://pay.ldxp.cn/item/4ly23y","sourceType":"manual","status":"REVIEW_REQUIRED","extractionResult":{"pageTitle":"微软邮箱 GPT Team K12 成品 JSON 反代 发cpa 质保首登 7.14--2.01新货已过滤","price":0.77,"merchantName":"FranklyBuilds的AI小店","sourceUrl":"https://priceai.cc/products/chatgpt-team-business","focus":"K12","availability":"IN_STOCK","note":"PriceAI public listing tagged K12; direct product URL returned HTTP 200; no fraud conclusion recorded.","observedAt":"2026-07-14T20:12:00+08:00"}},
  {"productUrl":"https://pay.ldxp.cn/item/4mknv1","sourceType":"manual","status":"REVIEW_REQUIRED","extractionResult":{"pageTitle":"1个 微软邮箱 GPT Team K12 成品 JSON 反代 发cpa 质保首登 7.14--10.16新货 已过滤","price":0.77,"merchantName":"FranklyBuilds的AI小店","sourceUrl":"https://priceai.cc/products/chatgpt-team-business","focus":"K12","availability":"IN_STOCK","note":"PriceAI public listing tagged K12; direct product URL returned HTTP 200; no fraud conclusion recorded.","observedAt":"2026-07-14T20:12:00+08:00"}},
  {"productUrl":"https://pay.ldxp.cn/item/4zz053","sourceType":"manual","status":"REVIEW_REQUIRED","extractionResult":{"pageTitle":"1个 微软邮箱 GPT Team K12 成品 JSON 反代 发cpa 质保首登 7.14--10.16新货 已过滤","price":0.78,"merchantName":"幻境MirageAI","sourceUrl":"https://priceai.cc/products/chatgpt-team-business","focus":"K12","availability":"IN_STOCK","note":"PriceAI public listing tagged K12; direct product URL returned HTTP 200; no fraud conclusion recorded.","observedAt":"2026-07-14T19:58:00+08:00"}},
  {"productUrl":"https://pay.ldxp.cn/item/75o1in","sourceType":"manual","status":"REVIEW_REQUIRED","extractionResult":{"pageTitle":"微软邮箱 GPT Team K12 成品 JSON 反代 发cpa 质保首登 7.14号新货","price":0.82,"merchantName":"AI小铺","sourceUrl":"https://priceai.cc/products/chatgpt-team-business","focus":"K12","availability":"IN_STOCK","note":"PriceAI public listing tagged K12; direct product URL returned HTTP 200; no fraud conclusion recorded.","observedAt":"2026-07-14T20:04:00+08:00"}},
  {"productUrl":"https://pay.ldxp.cn/item/9488cf","sourceType":"manual","status":"REVIEW_REQUIRED","extractionResult":{"pageTitle":"1个号 微软邮箱 GPT Team K12 成品 JSON 反代 发cpa 质保首登 7.11号凌晨新货","price":0.82,"merchantName":"牟利ai","sourceUrl":"https://priceai.cc/products/chatgpt-team-business","focus":"K12","availability":"IN_STOCK","note":"PriceAI public listing tagged K12; direct product URL returned HTTP 200; no fraud conclusion recorded.","observedAt":"2026-07-14T19:28:00+08:00"}},
  {"productUrl":"https://pay.ldxp.cn/item/a2xil0","sourceType":"manual","status":"REVIEW_REQUIRED","extractionResult":{"pageTitle":"1个 微软邮箱 GPT Team K12 成品 JSON 反代 发cpa 质保首登 7.14--10.16新货 已过滤","price":0.98,"merchantName":"一梦AI","sourceUrl":"https://priceai.cc/products/chatgpt-team-business","focus":"K12","availability":"IN_STOCK","note":"PriceAI public listing tagged K12; direct product URL returned HTTP 200; no fraud conclusion recorded.","observedAt":"2026-07-14T20:01:00+08:00"}},
  {"productUrl":"https://pay.ldxp.cn/item/ai6xt4","sourceType":"manual","status":"REVIEW_REQUIRED","extractionResult":{"pageTitle":"微软邮箱 GPT Team K12 成品 JSON 反代 发cpa 质保首登 7.14--2.01新货已过滤","price":0.81,"merchantName":"FranklyBuilds的AI小店","sourceUrl":"https://priceai.cc/products/chatgpt-team-business","focus":"K12","availability":"IN_STOCK","note":"PriceAI public listing tagged K12; direct product URL returned HTTP 200; no fraud conclusion recorded.","observedAt":"2026-07-14T19:16:00+08:00"}},
  {"productUrl":"https://pay.ldxp.cn/item/ea91bt","sourceType":"manual","status":"REVIEW_REQUIRED","extractionResult":{"pageTitle":"k12 json 格式 gmail，兑换会进行测活，导入401 售后，后续其余不进行任何售后","price":0.8,"merchantName":"奥特曼严选","sourceUrl":"https://priceai.cc/products/chatgpt-team-business","focus":"K12","availability":"IN_STOCK","note":"PriceAI public listing tagged K12; direct product URL returned HTTP 200; no fraud conclusion recorded.","observedAt":"2026-07-14T19:25:00+08:00"}},
  {"productUrl":"https://pay.ldxp.cn/item/f1vz1u","sourceType":"manual","status":"REVIEW_REQUIRED","extractionResult":{"pageTitle":"微软邮箱 GPT Team K12 成品 JSON 反代 发cpa 质保首登 7.14--18.01新货已过滤","price":0.77,"merchantName":"奥特曼","sourceUrl":"https://priceai.cc/products/chatgpt-team-business","focus":"K12","availability":"IN_STOCK","note":"PriceAI public listing tagged K12; direct product URL returned HTTP 200; no fraud conclusion recorded.","observedAt":"2026-07-14T20:17:00+08:00"}},
  {"productUrl":"https://pay.ldxp.cn/item/gva1zv","sourceType":"manual","status":"REVIEW_REQUIRED","extractionResult":{"pageTitle":"微软邮箱 GPT Team K12 成品 JSON 反代 发cpa 质保首登 7.14号新货","price":0.93,"merchantName":"牟利ai","sourceUrl":"https://priceai.cc/products/chatgpt-team-business","focus":"K12","availability":"IN_STOCK","note":"PriceAI public listing tagged K12; direct product URL returned HTTP 200; no fraud conclusion recorded.","observedAt":"2026-07-14T19:28:00+08:00"}},
  {"productUrl":"https://pay.ldxp.cn/item/j96l5l","sourceType":"manual","status":"REVIEW_REQUIRED","extractionResult":{"pageTitle":"微软邮箱 GPT Team K12 成品 JSON 反代 发cpa 质保首登 7.14--2.01新货已过滤","price":0.98,"merchantName":"奥特曼严选","sourceUrl":"https://priceai.cc/products/chatgpt-team-business","focus":"K12","availability":"IN_STOCK","note":"PriceAI public listing tagged K12; direct product URL returned HTTP 200; no fraud conclusion recorded.","observedAt":"2026-07-14T19:25:00+08:00"}},
  {"productUrl":"https://pay.ldxp.cn/item/l8kige","sourceType":"manual","status":"REVIEW_REQUIRED","extractionResult":{"pageTitle":"微软邮箱 GPT Team K12 成品 JSON 反代 发cpa 质保首登 7.14--2.01新货已过滤","price":0.87,"merchantName":"明云小铺","sourceUrl":"https://priceai.cc/products/chatgpt-team-business","focus":"K12","availability":"IN_STOCK","note":"PriceAI public listing tagged K12; direct product URL returned HTTP 200; no fraud conclusion recorded.","observedAt":"2026-07-14T20:13:00+08:00"}},
  {"productUrl":"https://pay.ldxp.cn/item/m8zn31","sourceType":"manual","status":"REVIEW_REQUIRED","extractionResult":{"pageTitle":"k12 json 格式 gmail，兑换会进行测活，导入401 售后，后续其余不进行任何售后","price":0.8,"merchantName":"牟利ai","sourceUrl":"https://priceai.cc/products/chatgpt-team-business","focus":"K12","availability":"IN_STOCK","note":"PriceAI public listing tagged K12; direct product URL returned HTTP 200; no fraud conclusion recorded.","observedAt":"2026-07-14T19:28:00+08:00"}},
  {"productUrl":"https://pay.ldxp.cn/item/qehc61","sourceType":"manual","status":"REVIEW_REQUIRED","extractionResult":{"pageTitle":"微软邮箱 GPT Team K12 成品 JSON 反代 发cpa 质保首登 7.14号新货","price":0.82,"merchantName":"源头GPT","sourceUrl":"https://priceai.cc/products/chatgpt-team-business","focus":"K12","availability":"IN_STOCK","note":"PriceAI public listing tagged K12; direct product URL returned HTTP 200; no fraud conclusion recorded.","observedAt":"2026-07-14T20:18:00+08:00"}},
  {"productUrl":"https://pay.ldxp.cn/item/qxyi3x","sourceType":"manual","status":"REVIEW_REQUIRED","extractionResult":{"pageTitle":"微软邮箱 GPT Team K12 成品 JSON 反代 发cpa 质保首登 7.14--2.01新货已过滤","price":0.87,"merchantName":"一梦AI","sourceUrl":"https://priceai.cc/products/chatgpt-team-business","focus":"K12","availability":"IN_STOCK","note":"PriceAI public listing tagged K12; direct product URL returned HTTP 200; no fraud conclusion recorded.","observedAt":"2026-07-14T20:01:00+08:00"}},
  {"productUrl":"https://pay.ldxp.cn/item/rbxuo6","sourceType":"manual","status":"REVIEW_REQUIRED","extractionResult":{"pageTitle":"微软邮箱 GPT Team K12 成品 JSON 反代 发cpa 质保首登 7.14--2.01新货已过滤","price":0.77,"merchantName":"如鱼得水(玩转ai)","sourceUrl":"https://priceai.cc/products/chatgpt-team-business","focus":"K12","availability":"IN_STOCK","note":"PriceAI public listing tagged K12; direct product URL returned HTTP 200; no fraud conclusion recorded.","observedAt":"2026-07-14T19:51:00+08:00"}},
  {"productUrl":"https://pay.ldxp.cn/item/shi6wg","sourceType":"manual","status":"REVIEW_REQUIRED","extractionResult":{"pageTitle":"k12子号 反代 保首登（CPA+sub2api格式发货）--子号--不支持网页登录","price":0.95,"merchantName":"幻境MirageAI","sourceUrl":"https://priceai.cc/products/chatgpt-team-business","focus":"K12","availability":"IN_STOCK","note":"PriceAI public listing tagged K12; direct product URL returned HTTP 200; no fraud conclusion recorded.","observedAt":"2026-07-14T19:58:00+08:00"}},
  {"productUrl":"https://pay.ldxp.cn/item/tm9l0r","sourceType":"manual","status":"REVIEW_REQUIRED","extractionResult":{"pageTitle":"微软邮箱 GPT Team K12 成品 JSON 反代 发cpa 质保首登 7.14--2.01新货已过滤","price":0.77,"merchantName":"牟利ai","sourceUrl":"https://priceai.cc/products/chatgpt-team-business","focus":"K12","availability":"IN_STOCK","note":"PriceAI public listing tagged K12; direct product URL returned HTTP 200; no fraud conclusion recorded.","observedAt":"2026-07-14T19:28:00+08:00"}},
  {"productUrl":"https://pay.ldxp.cn/item/v32y8i","sourceType":"manual","status":"REVIEW_REQUIRED","extractionResult":{"pageTitle":"微软邮箱 GPT Team K12 成品 JSON 反代 发cpa 质保首登 7.14--2.01新货已过滤","price":0.77,"merchantName":"Ai小铺","sourceUrl":"https://priceai.cc/products/chatgpt-team-business","focus":"K12","availability":"IN_STOCK","note":"PriceAI public listing tagged K12; direct product URL returned HTTP 200; no fraud conclusion recorded.","observedAt":"2026-07-14T20:18:00+08:00"}},
  {"productUrl":"https://pay.ldxp.cn/item/vai4r8","sourceType":"manual","status":"REVIEW_REQUIRED","extractionResult":{"pageTitle":"k12 team 成品 限反代_保首登（无RT｜CPA）5","price":0.96,"merchantName":"CAO","sourceUrl":"https://priceai.cc/products/chatgpt-team-business","focus":"K12","availability":"IN_STOCK","note":"PriceAI public listing tagged K12; direct product URL returned HTTP 200; no fraud conclusion recorded.","observedAt":"2026-07-14T19:52:00+08:00"}},
  {"productUrl":"https://pay.ldxp.cn/item/w712n7","sourceType":"manual","status":"REVIEW_REQUIRED","extractionResult":{"pageTitle":"1个 微软邮箱 GPT Team K12 成品 JSON 反代 发cpa 质保首登 7.14--10.16新货 已过滤","price":0.85,"merchantName":"奥特曼严选","sourceUrl":"https://priceai.cc/products/chatgpt-team-business","focus":"K12","availability":"IN_STOCK","note":"PriceAI public listing tagged K12; direct product URL returned HTTP 200; no fraud conclusion recorded.","observedAt":"2026-07-14T19:25:00+08:00"}}
]`) as CandidateSeed[];

const LDXP_PUBLIC_SHOP_RESEARCH_2026_07_14 = {
  "pixelshop": {
    "merchantName": "Gemini源头供货商",
    "productKeys": [
      "5ok7zc",
      "ewa50j",
      "scdzcv",
      "ud2aq0",
      "y5emq9"
    ]
  },
  "JL7007": {
    "merchantName": "沈万三的Ai聚宝盆",
    "productKeys": [
      "197u8t",
      "22x3mk",
      "2yooy7",
      "2yvsb5",
      "6stp82",
      "9m7yfh",
      "eigv4t",
      "ezm4vd",
      "f054e2",
      "gvnm8e",
      "igeh3j",
      "jf4ggi",
      "jt2ylm",
      "k2i70d",
      "lontfy",
      "n3zao2",
      "nedzlo",
      "obpvpg",
      "oh5kj7",
      "q6exq2",
      "tuh06l",
      "ubs5n2",
      "vrutvq"
    ]
  },
  "caishen": {
    "merchantName": "财神",
    "productKeys": []
  },
  "mengze": {
    "merchantName": "梦泽",
    "productKeys": [
      "14g41x",
      "1fiiho",
      "1mzlxo",
      "1riv06",
      "1sw6vu",
      "1vzvwr",
      "1y7o2f",
      "21l3f1",
      "28212u",
      "2a2ui9",
      "2bkfwu",
      "2kfp8q",
      "2myy7d",
      "2sm6aj",
      "2tcq66",
      "2v6oyv",
      "33a1bj",
      "33v19j",
      "3x1pza",
      "491e5r",
      "4rc0xy",
      "4wvfdf",
      "4xnxc2",
      "526dk4",
      "541t64",
      "6kc7yc",
      "6rlytt",
      "7iimji",
      "7oz2n7",
      "7pbkz9",
      "86eez5",
      "8nf8fg",
      "8uj2g5",
      "8yvhj9",
      "9fygih",
      "acazvi",
      "anmc41",
      "bcku7l",
      "bhcu23",
      "biro0s",
      "bz0p5z",
      "c3meg8",
      "c3xq60",
      "cocoas",
      "d3q734",
      "d7pwys",
      "dd0tej",
      "dgz0vf",
      "dh5kb5",
      "dpweqd",
      "eajw9f",
      "em8b0g",
      "fcittr",
      "fddp0u",
      "fnfu6q",
      "g8pyr8",
      "gjzxsa",
      "i5wb0j",
      "iegmbs",
      "insdp9",
      "iuafyv",
      "iye5bg",
      "j93e5z",
      "jolq0i",
      "jxcd47",
      "k9fy3y",
      "khivob",
      "kr08mk",
      "kv0vl1",
      "kvu4i7",
      "la5g7b",
      "lweyfq",
      "m37dos",
      "mh0jdp",
      "mpvn53",
      "mx8clz",
      "nnfys8",
      "nq2vu9",
      "o3q6e7",
      "oxmt3s",
      "pusm6v",
      "pv1561",
      "q5oeo3",
      "qiov5m",
      "qp5wwh",
      "r0n132",
      "r6cz3k",
      "rism9k",
      "rpbszq",
      "srt1fc",
      "t19137",
      "te8vm1",
      "tgitas",
      "tnippn",
      "to19ih",
      "tqb7by",
      "u4x2l2",
      "ud2pcu",
      "ukppwo",
      "ul0n6w",
      "utfbry",
      "vuu5a7",
      "w78ln3",
      "wayhm4",
      "wh7i8k",
      "wi6rq5",
      "wtgbgo",
      "x7anvm",
      "xufsg1",
      "z6w7mc",
      "z952p2"
    ]
  },
  "6YEJH8PE": {
    "merchantName": "gpt成品",
    "productKeys": [
      "73sl2y",
      "gozoq4",
      "ll8xpa",
      "m35gkv",
      "sdrbg8",
      "tz7ptp",
      "vu6ssy"
    ]
  },
  "XHA54E0U": {
    "merchantName": "千川Ai",
    "productKeys": [
      "65u9kg",
      "c52zqq",
      "dtb5uo",
      "ev4v8k",
      "gn2gdc",
      "jl3415",
      "oe2kvf",
      "vsv2cm"
    ]
  },
  "JBJJWNA5": {
    "merchantName": "doghubx",
    "productKeys": []
  }
} as const;

const LDXP_PUBLIC_SHOP_RESEARCH_2026_07_14_CANDIDATES: CandidateSeed[] =
  Object.entries(LDXP_PUBLIC_SHOP_RESEARCH_2026_07_14).flatMap(
    ([shopToken, shop]) =>
      shop.productKeys.map((productKey) => ({
        productUrl: `https://pay.ldxp.cn/item/${productKey}`,
        sourceType: "manual",
        status: "REVIEW_REQUIRED",
        extractionResult: {
          merchantName: shop.merchantName,
          sourceUrl: `https://pay.ldxp.cn/shop/${shopToken}`,
          availability: "IN_STOCK",
          note: "Public LDXP shop API listing; no fraud conclusion recorded.",
          observedAt: "2026-07-14T20:55:00+08:00",
        },
      })),
  );

const LIVE_VERIFIED_LOW_K12_CANDIDATES: CandidateSeed[] = [
  ["mf1r15", "CAO", "cao", "k12 team 成品 限反代 保首登（无RT|CPA）14", 0.88, 45],
  ["9hnik2", "幻境MirageAI", "mirage", "谷歌邮箱 GPT Team K12 成品 JSON 反代 发cpa 质保首登 7.15 精品新货", 1.2, 1795],
  ["ict1oj", "幽羊 AI", "Z65QS0QG", "微软邮箱 GPT Team K12 成品 JSON 反代 发cpa 质保首登 7.15 12点", 0.95, 45],
  ["j96l5l", "奥特曼严选", "PAXOVOVJ", "谷歌邮箱 GPT Team K12 成品 JSON 反代 发cpa 质保首登 7.15 精品新货", 1.2, 1709],
  ["tm9l0r", "牟利ai", "2VWX76A4", "谷歌邮箱 GPT Team K12 成品 JSON 反代 发cpa 质保首登 7.15 精品新货", 1.2, 1779],
  ["cnoal8", "小票的ai小铺", "xiaopiao", "【codex-反代】k12team子号成品（只能反代，买错不退）", 0.8, 296],
  ["xgi51k", "奥特曼", "NFCG5CVM", "谷歌GPT K12 极致稳定 | 成品1个｜Sub2API/CPA JSON可选｜首登质保｜可刷AT", 1.1, 223],
  ["6ce4c5", "雪豹AI", "RCCFTO9M", "微软邮箱 GPT Team K12 成品 JSON 反代 发cpa 质保首登 7.15 12点", 1.02, 45],
  ["1skqfn", "AI小铺", "echo_dream", "1个 微软邮箱 GPT Team K12 成品 JSON 反代 发cpa 质保首登 7.15 中午新货", 1.1, 823],
  ["clvd90", "FranklyBuilds的AI小店", "7LFUCYI0", "k12 成品号 只可反代 质保首登 额度在100刀左右 不会用勿拍 拍了不退", 1.04, 1435],
  ["m1v113", "陆柒科技", "M18V0XVF", "谷歌GPT K12 极致稳定 | 成品1个｜Sub2API/CPA JSON可选｜首登质保｜可刷AT", 1.2, 452],
  ["deuz36", "懒羊羊", "lanyy", "k12 team成品（福利品）", 0.9, 84],
  ["xap6jj", "鱼ai", "S8EK3HL5", "k12子号 反代 保首登（CPA+sub2api格式发货 别的自行转换格式）--子号--不支持网页登录", 0.9, 72],
  ["362lyn", "IMAGE-2", "2IWYC9QQ", "微软邮箱 GPT Team K12 成品 JSON 反代 发cpa 质保首登 7.15 12点", 0.94, 21],
  ["insdp9", "梦泽", "mengze", "微软邮箱 GPT Team K12 成品 JSON 反代 发cpa 质保首登 7.15 12点", 1.11, 119],
  ["84wgtf", "如鱼得水(玩转ai)", "yes", "微软邮箱 GPT Team K12 成品 JSON 反代 发cpa 质保首登 7.15 12点", 0.98, 48],
  ["1sw3h5", "ton", "ton", "谷歌邮箱 GPT Team K12 成品 JSON 反代 发cpa 质保首登 7.15 精品新货", 1.2, 1789],
  ["ohroa6", "Hug AI", "4UOATQTU", "k12 成品号 只可反代 质保首登 额度在100刀左右 不会用勿拍 拍了不退", 0.9, 1399],
  ["hsw8ix", "一梦AI", "yimengai", "谷歌GPT K12 成品1个｜Sub2API/CPA JSON可选｜首登质保｜可刷AT", 1, 304],
  ["w3purw", "东北23333--承接理工科毕设", "6RSH0LA6", "【codex-反代】k12team子号成品（只能反代，买错不退）", 1, 314],
  ["6get4g", "卖点AI", "7TCL10MR", "《精品》谷歌GPTK12/json成品/可刷AT/基本能用完周限100-150刀", 1.07, 124],
  ["617acl", "黑白小狗AI旗舰店", "5R8T9H0Q", "1个 微软邮箱 GPT Team K12 成品 JSON 反代 发cpa 质保首登 7.15 中午新货", 1.07, 16],
  ["4auox7", "AI搬运工", "2WMCCNSQ", "【codex-反代】k12team子号成品（只能反代，买错不退）", 1.06, 296],
  ["vnrrjt", "光之国AI", "GT7KX1TN", "1个 微软邮箱 GPT Team K12 成品 JSON 反代 发cpa 质保首登 7.15 中午新货", 1.1, 664],
  ["eepq3n", "chiyu", "OUJ1HPBV", "微软邮箱 GPT Team K12 成品 JSON 反代 发cpa 质保首登 7.15--9点新货已过滤", 1.1, 50],
  ["72po13", "王哥源头", "2POVTUTK", "《精品》谷歌GPTK12/json成品/可刷AT/基本能用完周限100-150刀", 1.11, 127],
  ["qehc61", "源头GPT", "1DM0L7CR", "微软邮箱 GPT Team K12 成品 JSON 反代 发cpa 质保首登 7.15 12点", 1.11, 45],
  ["31ws5p", "彩虹马的AI店", "AWXK3UJY", "k12 反代专用 CPA Sub2格式可选，质保首登 7.15新货", 1.2, 409],
].map(([productKey, merchantName, shopToken, pageTitle, price, inventory]) => ({
  productUrl: `https://pay.ldxp.cn/item/${productKey}`,
  sourceType: "manual",
  status: "REVIEW_REQUIRED",
  extractionResult: {
    pageTitle,
    price,
    merchantName,
    sourceUrl: `https://pay.ldxp.cn/shop/${shopToken}`,
    focus: "K12",
    availability: "IN_STOCK",
    inventory,
    note: "Live LDXP product and merchant API verified; no fraud conclusion recorded.",
    observedAt: "2026-07-15T09:45:00.000Z",
  },
}));

const ALL_RESEARCH_CANDIDATES: CandidateSeed[] = [
  ...BASE_CANDIDATES,
  ...PRICEAI_PUBLIC_RESEARCH_CANDIDATES,
  ...PRICEAI_PUBLIC_RESEARCH_EXTRA_CANDIDATES,
  ...PRICEAI_PUBLIC_RESEARCH_2026_07_14_CANDIDATES,
  ...LDXP_PUBLIC_SHOP_RESEARCH_2026_07_14_CANDIDATES,
  ...LIVE_VERIFIED_LOW_K12_CANDIDATES,
];

const LOW_PRICE_PRODUCT_URLS = new Set([
  ...LIVE_VERIFIED_LOW_K12_CANDIDATES.map((candidate) => candidate.productUrl),
  "https://pay.ldxp.cn/item/mpvn53",
  "https://pay.ldxp.cn/item/biro0s",
  "https://pay.ldxp.cn/item/xufsg1",
  "https://pay.ldxp.cn/item/4ly23y",
  "https://pay.ldxp.cn/item/4mknv1",
  "https://pay.ldxp.cn/item/ai6xt4",
  "https://pay.ldxp.cn/item/f1vz1u",
  "https://pay.ldxp.cn/item/tm9l0r",
  "https://pay.ldxp.cn/item/m8zn31",
  "https://pay.ldxp.cn/item/9488cf",
  "https://pay.ldxp.cn/item/ea91bt",
  "https://pay.ldxp.cn/item/w712n7",
  "https://pay.ldxp.cn/item/j96l5l",
  "https://pay.ldxp.cn/item/1sw3h5",
  "https://pay.ldxp.cn/item/4zz053",
  "https://pay.ldxp.cn/item/shi6wg",
  "https://pay.ldxp.cn/item/qxyi3x",
  "https://pay.ldxp.cn/item/a2xil0",
  "https://pay.ldxp.cn/item/rm7soh",
  "https://pay.ldxp.cn/item/3kznsw",
  "https://pay.ldxp.cn/item/rbxuo6",
  "https://pay.ldxp.cn/item/tygrdi",
  "https://pay.ldxp.cn/item/qehc61",
  "https://pay.ldxp.cn/item/zn7ziu",
  "https://pay.ldxp.cn/item/vai4r8",
  "https://pay.ldxp.cn/item/hfwbv2",
  "https://pay.ldxp.cn/item/ugws9l",
  "https://pay.ldxp.cn/item/gt4xbd",
  "https://pay.ldxp.cn/item/v32y8i",
  "https://pay.ldxp.cn/item/wzvc62",
  "https://pay.ldxp.cn/item/4mvjf1",
  "https://pay.ldxp.cn/item/raj9c4",
  "https://pay.ldxp.cn/item/ai255p",
  "https://pay.ldxp.cn/item/ohroa6",
  "https://pay.ldxp.cn/item/75o1in",
  "https://pay.ldxp.cn/item/pzj0gp",
]);

const LIVE_LOW_PRICE_EVIDENCE: Record<
  string,
  Record<string, unknown>
> = {
  "https://pay.ldxp.cn/item/mpvn53": {
    pageTitle: "grok普号（free账密）",
    price: 0.4,
    inventory: 992,
  },
  "https://pay.ldxp.cn/item/biro0s": {
    pageTitle: "【Grok 普号】【帐密+sso】直登成品｜域名邮箱】质保1天",
    price: 0.5,
    inventory: 543,
  },
  "https://pay.ldxp.cn/item/xufsg1": {
    pageTitle:
      "【Free号】 GPT/Codex 高质量|已绑手机|RT|微软邮箱|动态家宽注册|可邮箱接码",
    price: 0.7,
    inventory: 416,
  },
};

export const INITIAL_CANDIDATES: CandidateSeed[] = [
  ...new Map(
    ALL_RESEARCH_CANDIDATES
      .filter((candidate) => LOW_PRICE_PRODUCT_URLS.has(candidate.productUrl))
      .map((candidate) => ({
        ...candidate,
        extractionResult: {
          ...candidate.extractionResult,
          ...LIVE_LOW_PRICE_EVIDENCE[candidate.productUrl],
        },
      }))
      .filter((candidate) => !isK12AbovePriceLimit(candidate.extractionResult))
      .map((candidate) => [candidate.productUrl, candidate] as const),
  ).values(),
];

function isK12AbovePriceLimit(
  extraction: Record<string, unknown> | undefined,
): boolean {
  if (extraction?.focus !== "K12") return false;
  const totalPrice = positiveNumber(extraction.totalPrice);
  const price = positiveNumber(extraction.price);
  const effectivePrice = totalPrice ?? price;
  return effectivePrice !== null && effectivePrice > 1.2;
}

function positiveNumber(value: unknown): number | null {
  const parsed = typeof value === "number"
    ? value
    : typeof value === "string" && value.trim() !== ""
    ? Number(value)
    : Number.NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

/**
 * 已知的发卡平台域名。
 * 这些平台托管了多个 K12/BugTeam 店铺，连接器发现时优先关注这些域名。
 */
export const KNOWN_PLATFORMS: string[] = [
  "ldxp.cn",
  "ldxp.cn/shop",           // 发卡平台子路径模式
  "codesky.qzz.io",         // QZZ 建站发卡平台（多店模式）
  "gptmf.com",
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

export async function pruneRetiredSeedCandidates(db: Db): Promise<void> {
  const retainedFingerprints = new Set(
    INITIAL_CANDIDATES.map((candidate) =>
      fingerprintUrl(canonicalizeUrl(candidate.productUrl)),
    ),
  );
  const retiredFingerprints = [
    ...new Set(
      ALL_RESEARCH_CANDIDATES.map((candidate) =>
        fingerprintUrl(canonicalizeUrl(candidate.productUrl)),
      ).filter((fingerprint) => !retainedFingerprints.has(fingerprint)),
    ),
  ];

  for (let index = 0; index < retiredFingerprints.length; index += 100) {
    await db
      .delete(discoveryCandidates)
      .where(
        and(
          inArray(
            discoveryCandidates.urlFingerprint,
            retiredFingerprints.slice(index, index + 100),
          ),
          inArray(discoveryCandidates.status, [
            "DISCOVERED",
            "REVIEW_REQUIRED",
          ]),
        ),
      );
  }
}

/**
 * 将初始候选链接写入数据库。
 * 如果 URL 指纹已存在则跳过（幂等）。
 */
export async function seedCandidates(
  db: Db,
  candidates: readonly CandidateSeed[] = INITIAL_CANDIDATES,
): Promise<void> {
  const uniqueCandidates = new Map<
    string,
    { candidate: CandidateSeed; canonicalUrl: string }
  >();

  for (const candidate of candidates) {
    const canonicalUrl = canonicalizeUrl(candidate.productUrl);
    const urlFingerprint = fingerprintUrl(canonicalUrl);
    if (!uniqueCandidates.has(urlFingerprint)) {
      uniqueCandidates.set(urlFingerprint, { candidate, canonicalUrl });
    }
  }

  for (const [urlFingerprint, seed] of uniqueCandidates) {
    const { candidate, canonicalUrl } = seed;

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
      status: candidate.status ?? "DISCOVERED",
      extractionResult: candidate.extractionResult ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  // eslint-disable-next-line no-console
  console.log(
    `Seeded ${uniqueCandidates.size} candidate URLs (deduplicated by fingerprint)`,
  );
}
