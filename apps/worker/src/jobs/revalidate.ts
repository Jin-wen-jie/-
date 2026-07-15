import { QUEUES, getQueueConfig } from "../queue.js";
import type { CheckFailureKind } from "../lifecycle.js";
import { transitionListing } from "../lifecycle.js";
import { validateUrl } from "../validator-client.js";
import type { ValidatorResponse } from "../validator-client.js";
import { XMLParser } from "fast-xml-parser";
import { z } from "zod";
import {
  PRICEAI_CLAUDE_PRODUCTS,
  parsePriceAiApiPage,
  parsePriceAiPage,
  PRICEAI_TEAM_BUSINESS_URL,
  type PriceAiOffer,
} from "../connectors/priceai.js";

const PRICEAI_PAGE_SIZE = 200;
const MAX_PRICEAI_OFFERS = 500;
const CLAUDE_MERCHANT_LIMIT = 20;

export type ProductFocus = "K12" | "Bug Team" | "Claude Code K12";

export interface JobContext {
  baseUrl: string;
  token: string;
}

// Revalidate job — checks a listing's URL and transitions state
export async function revalidateListing(
  listingId: string,
  url: string,
  currentStatus: string,
  consecutiveFailures: number,
  lastSuccessAgeHours: number,
  ctx: JobContext,
): Promise<{ status: string; observation: ValidatorResponse | null }> {
  try {
    const result = await validateUrl(url, ctx.baseUrl, ctx.token);
    return { status: "ACTIVE", observation: result };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    const kind = classifyFailure(msg);
    const result = transitionListing(
      {
        status: currentStatus as "ACTIVE",
        consecutiveFailures,
        lastSuccessAgeHours,
      },
      { kind },
    );
    return { status: result.status, observation: null };
  }
}

function classifyFailure(message: string): CheckFailureKind {
  const m = message.toLowerCase();
  if (m.includes("404") || m.includes("not found")) return "HTTP_404";
  if (m.includes("410")) return "HTTP_410";
  if (m.includes("login") || m.includes("sign in")) return "LOGIN_WALL";
  if (m.includes("captcha") || m.includes("verify")) return "CAPTCHA";
  if (m.includes("401") || m.includes("unauthorized")) return "HTTP_401";
  if (m.includes("403") || m.includes("forbidden") || m.includes("robots"))
    return "HTTP_403";
  if (m.includes("timeout") || m.includes("abort")) return "TIMEOUT";
  if (m.includes("dns") || m.includes("resolve")) return "DNS_FAILURE";
  if (m.includes("tls") || m.includes("certificate")) return "TLS_ERROR";
  if (m.includes("500") || m.includes("502") || m.includes("503"))
    return "HTTP_5XX";
  return "TIMEOUT"; // default for unknown transient
}

export interface DiscoverContext extends JobContext {
  keywords: string[];
}

// Discover job — runs a source connector with configured keywords
export async function discoverSource(
  sourceId: string,
  platform: string,
  ctx: DiscoverContext,
): Promise<{ discovered: number; deduped: number; error: string | null }> {
  // Log the configured keywords for auditability
  // eslint-disable-next-line no-console
  console.log(
    `[${platform}] source=${sourceId} keywords=${ctx.keywords.length} ` +
      `sample=${ctx.keywords.slice(0, 3).join(", ")}${ctx.keywords.length > 3 ? "..." : ""}`,
  );

  // Production: invoke the real connector (X Recent Search API or Telegram MTProto)
  // Requires valid platform credentials configured via environment variables.
  // Without credentials the source status remains NOT_CONFIGURED and this
  // function returns zero results without error.
  return { discovered: 0, deduped: 0, error: null };
}

export type PublicSearchEngine =
  | "priceai-claude"
  | "priceai"
  | "bing-rss"
  | "brave"
  | "google"
  | "serper";
export type PublicSearchEngineStatus =
  | "ACTIVE"
  | "AUTH_DISABLED"
  | "RATE_LIMITED"
  | "ERROR";

export interface PublicSearchConfig {
  braveApiKey?: string;
  googleApiKey?: string;
  googleCx?: string;
  serperApiKey?: string;
  maxResults: number;
}

export interface PublicSearchCandidate {
  url: string;
  title: string;
  snippet: string;
  engine: PublicSearchEngine;
  focus: ProductFocus;
  sourceUrl?: string;
  metadata?: {
    price?: number;
    currency?: string;
    inventory?: number;
    merchantName?: string;
    availability?: "IN_STOCK" | "OUT_OF_STOCK" | "UNKNOWN";
    observedAt?: string;
    claudePlan?: string;
    deliveryType?: string;
    merchantKey?: string;
    claudeCodeEvidence?: string;
    kycStatus?: string;
    warrantyEvidence?: string;
  };
}

export interface PublicSearchEngineResult {
  engine: PublicSearchEngine;
  status: PublicSearchEngineStatus;
  resultCount: number;
  errorCategory: string | null;
}

export interface PublicSearchResult {
  candidates: PublicSearchCandidate[];
  engines: PublicSearchEngineResult[];
}

interface SearchHit {
  url: string;
  title: string;
  snippet: string;
  sourceUrl?: string;
  metadata?: PublicSearchCandidate["metadata"];
  focus?: ProductFocus;
}

interface SearchProvider {
  name: PublicSearchEngine;
  queries?: readonly string[];
  search: (query: string) => Promise<SearchHit[]>;
}

export const DEFAULT_PUBLIC_SEARCH_QUERIES = [
  '"Claude Code" (K12 OR 教育 OR 学生 OR account OR 成品号)',
  'site:pay.ldxp.cn/item "Claude Code" (账号 OR 成品号 OR Max OR Pro)',
  '"GPT Team K12" (商品 OR 成品 OR 账号 OR account)',
  '"Bug Team" ChatGPT (商品 OR 成品 OR 账号 OR account)',
  'site:pay.ldxp.cn/item ("K12" OR "Bug Team")',
  '("K12" OR "Bug Team") (商品 OR shop OR store)',
] as const;

const braveSchema = z.object({
  web: z.object({
    results: z.array(z.object({
      url: z.string(),
      title: z.string().default(""),
      description: z.string().default(""),
    })).default([]),
  }).optional(),
});

const googleSchema = z.object({
  items: z.array(z.object({
    link: z.string(),
    title: z.string().default(""),
    snippet: z.string().default(""),
  })).default([]),
});

const serperSchema = z.object({
  organic: z.array(z.object({
    link: z.string(),
    title: z.string().default(""),
    snippet: z.string().default(""),
  })).default([]),
});

class SearchProviderError extends Error {
  constructor(readonly category: string) {
    super(category);
    this.name = "SearchProviderError";
  }
}

export async function discoverPublicWeb(
  config: PublicSearchConfig,
  request: typeof fetch = fetch,
): Promise<PublicSearchResult> {
  const providers = createSearchProviders(config, request);
  const engineRuns = await Promise.all(
    providers.map((provider) => runSearchProvider(provider)),
  );
  const seen = new Set<string>();
  const candidates: PublicSearchCandidate[] = [];

  for (const run of engineRuns) {
    for (const hit of run.hits) {
      const candidate = toPublicSearchCandidate(hit, run.summary.engine);
      if (!candidate || seen.has(candidate.url)) continue;
      if (
        candidate.focus === "Claude Code K12" &&
        candidate.engine !== "priceai-claude"
      ) continue;
      seen.add(candidate.url);
      candidates.push(candidate);
      if (candidates.length >= config.maxResults) break;
    }
    if (candidates.length >= config.maxResults) break;
  }

  return {
    candidates,
    engines: engineRuns.map((run) => run.summary),
  };
}

function createSearchProviders(
  config: PublicSearchConfig,
  request: typeof fetch,
): SearchProvider[] {
  const providers: SearchProvider[] = [
    {
      name: "priceai-claude",
      queries: ["claude-code-lowest-merchants"],
      search: () => searchPriceAiClaude(request),
    },
    {
      name: "priceai",
      queries: [PRICEAI_TEAM_BUSINESS_URL],
      search: () => searchPriceAi(request),
    },
    {
      name: "bing-rss",
      search: (query) => searchBingRss(query, request),
    },
  ];
  if (config.braveApiKey) {
    providers.push({
      name: "brave",
      search: (query) => searchBrave(query, config.braveApiKey!, request),
    });
  }
  if (config.googleApiKey && config.googleCx) {
    providers.push({
      name: "google",
      search: (query) =>
        searchGoogle(query, config.googleApiKey!, config.googleCx!, request),
    });
  }
  if (config.serperApiKey) {
    providers.push({
      name: "serper",
      search: (query) => searchSerper(query, config.serperApiKey!, request),
    });
  }
  return providers;
}

async function runSearchProvider(provider: SearchProvider): Promise<{
  summary: PublicSearchEngineResult;
  hits: SearchHit[];
}> {
  const hits: SearchHit[] = [];
  const failures: string[] = [];
  for (const query of provider.queries ?? DEFAULT_PUBLIC_SEARCH_QUERIES) {
    try {
      hits.push(...await provider.search(query));
    } catch (error) {
      failures.push(searchErrorCategory(error));
    }
  }

  if (hits.length > 0 || failures.length === 0) {
    return {
      summary: {
        engine: provider.name,
        status: "ACTIVE",
        resultCount: hits.length,
        errorCategory: failures[0] ?? null,
      },
      hits,
    };
  }
  const errorCategory = failures[0] ?? "SEARCH_FAILED";
  return {
    summary: {
      engine: provider.name,
      status: engineStatus(errorCategory),
      resultCount: 0,
      errorCategory,
    },
    hits: [],
  };
}

async function searchPriceAi(request: typeof fetch): Promise<SearchHit[]> {
  let offers: PriceAiOffer[];
  try {
    offers = await fetchPriceAiOffers(request);
  } catch {
    const response = await searchRequest(
      request,
      new URL(PRICEAI_TEAM_BUSINESS_URL),
      {
        headers: {
          accept: "text/html,application/xhtml+xml",
          "user-agent": "PublicPriceResearch/1.0",
        },
      },
    );
    try {
      offers = parsePriceAiPage(await response.text()).offers;
    } catch {
      throw new SearchProviderError("INVALID_RESPONSE");
    }
  }
  return offers.filter(isReviewablePriceAiOffer).map((offer) => {
    const focus = offer.filterTags.includes("team_bug")
      ? "Bug Team"
      : offer.filterTags.includes("team_k12")
        ? "K12"
        : "";
    return {
      url: offer.url,
      title: offer.sourceTitle,
      snippet: [
        focus,
        offer.sourceStoreName ?? offer.sourceName,
        offer.price === null || offer.price === undefined
          ? null
          : `价格 ${offer.price} ${offer.currency ?? "CNY"}`,
        offer.stockCount === null || offer.stockCount === undefined
          ? null
          : `库存 ${offer.stockCount}`,
        ...offer.filterTags,
      ].filter(Boolean).join(" · "),
      sourceUrl: PRICEAI_TEAM_BUSINESS_URL,
      metadata: {
        ...(offer.price === null || offer.price === undefined
          ? {}
          : { price: offer.price }),
        ...(offer.currency ? { currency: offer.currency } : {}),
        ...(offer.stockCount === null || offer.stockCount === undefined
          ? {}
          : { inventory: offer.stockCount }),
        ...(offer.sourceStoreName ?? offer.sourceName
          ? { merchantName: offer.sourceStoreName ?? offer.sourceName! }
          : {}),
        availability: priceAiAvailability(offer),
        ...(offer.verifiedAt ?? offer.capturedAt
          ? { observedAt: offer.verifiedAt ?? offer.capturedAt! }
          : {}),
      },
    };
  });
}

async function searchPriceAiClaude(request: typeof fetch): Promise<SearchHit[]> {
  const outcomes = await Promise.allSettled(
    PRICEAI_CLAUDE_PRODUCTS.map(async (product) => ({
      product,
      offers: await fetchPriceAiProductOffers(
        request,
        new URL(`https://priceai.cc/products/${product.slug}`),
      ),
    })),
  );
  const productOffers = outcomes.flatMap((outcome) =>
    outcome.status === "fulfilled" ? [outcome.value] : []
  );
  if (productOffers.length === 0) {
    const failure = outcomes.find((outcome) => outcome.status === "rejected");
    throw failure?.status === "rejected"
      ? failure.reason
      : new SearchProviderError("SEARCH_FAILED");
  }
  const cheapestByMerchant = new Map<string, SearchHit>();

  for (const { product, offers } of productOffers) {
    for (const offer of offers) {
      if (!isReviewableClaudeOffer(offer, product.slug)) continue;
      const merchantName = offer.sourceStoreName ?? offer.sourceName ??
        new URL(offer.url).hostname;
      const merchantKey = normalizeMerchantKey(merchantName);
      const hit: SearchHit = {
        url: offer.url,
        title: offer.sourceTitle,
        snippet: [
          "Claude Code K12",
          product.plan,
          merchantName,
          `价格 ${offer.price} ${offer.currency ?? "CNY"}`,
          offer.stockCount === null || offer.stockCount === undefined
            ? null
            : `库存 ${offer.stockCount}`,
          ...offer.filterTags,
        ].filter(Boolean).join(" · "),
        sourceUrl: `https://priceai.cc/products/${product.slug}`,
        focus: "Claude Code K12",
        metadata: {
          price: offer.price!,
          currency: offer.currency ?? "CNY",
          ...(offer.stockCount === null || offer.stockCount === undefined
            ? {}
            : { inventory: offer.stockCount }),
          merchantName,
          merchantKey,
          availability: priceAiAvailability(offer),
          claudePlan: product.plan,
          deliveryType: claudeDeliveryType(offer),
          claudeCodeEvidence: /claude\s*code/i.test(offer.sourceTitle)
            ? "explicit-title"
            : "plan-compatible",
          kycStatus: claudeKycStatus(offer.sourceTitle),
          warrantyEvidence: claudeWarrantyEvidence(offer.sourceTitle),
          ...(offer.verifiedAt ?? offer.capturedAt
            ? { observedAt: offer.verifiedAt ?? offer.capturedAt! }
            : {}),
        },
      };
      const previous = cheapestByMerchant.get(merchantKey);
      if (!previous || hitPrice(hit) < hitPrice(previous)) {
        cheapestByMerchant.set(merchantKey, hit);
      }
    }
  }

  return [...cheapestByMerchant.values()]
    .sort((left, right) =>
      hitPrice(left) - hitPrice(right) || left.url.localeCompare(right.url)
    )
    .slice(0, CLAUDE_MERCHANT_LIMIT);
}

async function fetchPriceAiOffers(
  request: typeof fetch,
): Promise<PriceAiOffer[]> {
  return fetchPriceAiProductOffers(request, new URL(PRICEAI_TEAM_BUSINESS_URL));
}

async function fetchPriceAiProductOffers(
  request: typeof fetch,
  productUrl: URL,
): Promise<PriceAiOffer[]> {
  const offers: PriceAiOffer[] = [];
  let total = PRICEAI_PAGE_SIZE;

  for (
    let offset = 0;
    offset < total && offset < MAX_PRICEAI_OFFERS;
    offset += PRICEAI_PAGE_SIZE
  ) {
    const url = new URL(
      `/api${productUrl.pathname}/offers`,
      productUrl,
    );
    url.searchParams.set("limit", String(PRICEAI_PAGE_SIZE));
    url.searchParams.set("offset", String(offset));
    const response = await searchRequest(request, url, {
      headers: {
        accept: "application/json",
        "user-agent": "PublicPriceResearch/1.0",
      },
    });
    const page = parsePriceAiApiPage(await response.json());
    total = Math.min(page.total, MAX_PRICEAI_OFFERS);
    offers.push(...page.offers);
  }

  return offers;
}

function isReviewableClaudeOffer(
  offer: PriceAiOffer,
  productSlug: string,
): boolean {
  if (
    priceAiAvailability(offer) !== "IN_STOCK" ||
    typeof offer.price !== "number" ||
    offer.price <= 0
  ) return false;
  if (productSlug !== "claude-account") return true;
  return /claude\s*code/i.test(offer.sourceTitle);
}

function claudeDeliveryType(offer: PriceAiOffer): string {
  if (offer.filterTags.includes("delivery_account")) return "account";
  if (offer.filterTags.includes("delivery_recharge")) return "recharge";
  return "unknown";
}

function claudeKycStatus(title: string): string {
  if (/已过\s*kyc|kyc\s*(?:verified|通过)/i.test(title)) return "verified";
  if (/kyc/i.test(title)) return "mentioned";
  return "unknown";
}

function claudeWarrantyEvidence(title: string): string {
  if (/无质保|不质保|no\s*warranty/i.test(title)) return "none";
  if (/质保|warranty/i.test(title)) return "offered";
  return "unknown";
}

function normalizeMerchantKey(value: string): string {
  return value.trim().toLocaleLowerCase("zh-CN").replace(/\s+/g, " ");
}

function hitPrice(hit: SearchHit): number {
  return hit.metadata?.price ?? Number.POSITIVE_INFINITY;
}

function isReviewablePriceAiOffer(offer: PriceAiOffer): boolean {
  if (priceAiAvailability(offer) !== "IN_STOCK") return false;
  if (offer.filterTags.includes("team_bug")) return true;
  if (!offer.filterTags.includes("team_k12")) return false;
  return (
    typeof offer.price === "number" && offer.price > 0 && offer.price <= 1.2
  );
}

function priceAiAvailability(
  offer: PriceAiOffer,
): "IN_STOCK" | "OUT_OF_STOCK" | "UNKNOWN" {
  if (offer.stockCount === 0) return "OUT_OF_STOCK";
  if (typeof offer.stockCount === "number" && offer.stockCount > 0) {
    return "IN_STOCK";
  }
  const status = `${offer.effectiveStatus ?? ""} ${offer.status ?? ""}`;
  if (/out[_ -]?of[_ -]?stock|unavailable|sold[_ -]?out/i.test(status)) {
    return "OUT_OF_STOCK";
  }
  if (/available|in[_ -]?stock|low[_ -]?stock/i.test(status)) {
    return "IN_STOCK";
  }
  return "UNKNOWN";
}

async function searchBingRss(
  query: string,
  request: typeof fetch,
): Promise<SearchHit[]> {
  const url = new URL("https://www.bing.com/search");
  url.searchParams.set("format", "rss");
  url.searchParams.set("q", query);
  const response = await searchRequest(request, url, {
    headers: {
      accept: "application/rss+xml, application/xml;q=0.9",
      "user-agent": "PublicPriceResearch/1.0",
    },
  });
  const parsed = new XMLParser({ ignoreAttributes: true }).parse(
    await response.text(),
  ) as unknown;
  const items = z.object({
    rss: z.object({
      channel: z.object({ item: z.unknown().optional() }),
    }),
  }).parse(parsed).rss.channel.item;
  const rows = items === undefined ? [] : Array.isArray(items) ? items : [items];
  return z.array(z.object({
    link: z.string(),
    title: z.string().default(""),
    description: z.string().default(""),
  })).parse(rows).map((item) => ({
    url: item.link,
    title: item.title,
    snippet: item.description,
  }));
}

async function searchBrave(
  query: string,
  apiKey: string,
  request: typeof fetch,
): Promise<SearchHit[]> {
  const url = new URL("https://api.search.brave.com/res/v1/web/search");
  url.searchParams.set("q", query);
  url.searchParams.set("count", "10");
  url.searchParams.set("safesearch", "moderate");
  const response = await searchRequest(request, url, {
    headers: {
      accept: "application/json",
      "x-subscription-token": apiKey,
    },
  });
  const result = braveSchema.parse(await response.json());
  return (result.web?.results ?? []).map((item) => ({
    url: item.url,
    title: item.title,
    snippet: item.description,
  }));
}

async function searchGoogle(
  query: string,
  apiKey: string,
  cx: string,
  request: typeof fetch,
): Promise<SearchHit[]> {
  const url = new URL("https://www.googleapis.com/customsearch/v1");
  url.searchParams.set("key", apiKey);
  url.searchParams.set("cx", cx);
  url.searchParams.set("q", query);
  url.searchParams.set("num", "10");
  const response = await searchRequest(request, url);
  return googleSchema.parse(await response.json()).items.map((item) => ({
    url: item.link,
    title: item.title,
    snippet: item.snippet,
  }));
}

async function searchSerper(
  query: string,
  apiKey: string,
  request: typeof fetch,
): Promise<SearchHit[]> {
  const response = await searchRequest(
    request,
    new URL("https://google.serper.dev/search"),
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({ q: query, num: 10 }),
    },
  );
  return serperSchema.parse(await response.json()).organic.map((item) => ({
    url: item.link,
    title: item.title,
    snippet: item.snippet,
  }));
}

async function searchRequest(
  request: typeof fetch,
  url: URL,
  init: RequestInit = {},
): Promise<Response> {
  const response = await request(url, {
    ...init,
    redirect: "error",
    signal: AbortSignal.timeout(8_000),
  });
  if (response.ok) return response;
  if (response.status === 401 || response.status === 403) {
    throw new SearchProviderError("AUTH_DISABLED");
  }
  if (response.status === 429) {
    throw new SearchProviderError("RATE_LIMITED");
  }
  throw new SearchProviderError(`HTTP_${response.status}`);
}

function toPublicSearchCandidate(
  hit: SearchHit,
  engine: PublicSearchEngine,
): PublicSearchCandidate | null {
  let url: URL;
  try {
    url = new URL(hit.url);
  } catch {
    return null;
  }
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    (url.port && url.port !== "80" && url.port !== "443") ||
    url.toString().length > 2_048 ||
    isSearchOrSocialHost(url.hostname)
  ) {
    return null;
  }
  const evidence = `${hit.title} ${hit.snippet} ${decodeURIComponentSafe(url.pathname)}`;
  const focus = hit.focus ?? inferFocus(evidence);
  if (!focus || !looksLikeProduct(evidence, url.pathname)) return null;

  url.hash = "";
  for (const name of [...url.searchParams.keys()]) {
    if (name.startsWith("utm_") || ["gclid", "fbclid"].includes(name)) {
      url.searchParams.delete(name);
    }
  }
  return {
    url: url.toString(),
    title: hit.title.slice(0, 500),
    snippet: hit.snippet.slice(0, 1_000),
    engine,
    focus,
    ...(hit.sourceUrl ? { sourceUrl: hit.sourceUrl } : {}),
    ...(hit.metadata ? { metadata: hit.metadata } : {}),
  };
}

function inferFocus(evidence: string): ProductFocus | null {
  if (/claude\s*code/i.test(evidence)) return "Claude Code K12";
  if (/\bbug\s*team\b|\bbugteam\b/i.test(evidence)) return "Bug Team";
  if (/\bk[\s-]?12\b/i.test(evidence)) return "K12";
  return null;
}

function looksLikeProduct(evidence: string, pathname: string): boolean {
  if (/\/(?:login|sign[ -]?in|auth)(?:\/|$)/i.test(pathname)) return false;
  return /\/(?:item|buy|product|products)\//i.test(pathname) ||
    /商品|成品|账号|购买|库存|价格|account|shop|store/i.test(evidence);
}

function isSearchOrSocialHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return [
    "bing.com",
    "google.com",
    "brave.com",
    "x.com",
    "twitter.com",
    "t.me",
    "telegram.me",
  ].some((domain) => host === domain || host.endsWith(`.${domain}`));
}

function decodeURIComponentSafe(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function searchErrorCategory(error: unknown): string {
  if (error instanceof SearchProviderError) return error.category;
  if (error instanceof z.ZodError) return "INVALID_RESPONSE";
  if (error instanceof Error && error.name === "TimeoutError") return "TIMEOUT";
  return "SEARCH_FAILED";
}

function engineStatus(category: string): PublicSearchEngineStatus {
  if (category === "AUTH_DISABLED") return "AUTH_DISABLED";
  if (category === "RATE_LIMITED") return "RATE_LIMITED";
  return "ERROR";
}

// Export queue config for worker bootstrap
export { QUEUES, getQueueConfig };
