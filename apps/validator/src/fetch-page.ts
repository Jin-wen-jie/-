import type { LookupFunction } from "node:net";
import { Agent, fetch as undiciFetch } from "undici";
import {
  assertPublicUrl,
  type PublicAddress,
  type PublicUrlResolution,
} from "./safe-url.js";

const MAX_REDIRECTS = 5;
const CONNECT_TIMEOUT_MS = 5_000;
const TOTAL_TIMEOUT_MS = 15_000;
const MAX_HTML_BYTES = 2 * 1024 * 1024; // 2 MB
const responseDispatchers = new WeakMap<Response, Agent>();

export interface FetchResult {
  originalUrl: string;
  finalUrl: string;
  redirectChain: string[];
  httpStatus: number;
  contentType: string | null;
  body: string;
  elapsedMs: number;
}

export class FetchError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "FetchError";
  }
}

export function createPinnedLookup(addresses: PublicAddress[]): LookupFunction {
  return ((
    _hostname: string,
    options: { all?: boolean; family?: number } | number,
    callback: (
      error: NodeJS.ErrnoException | null,
      address?: string | PublicAddress[],
      family?: number,
    ) => void,
  ) => {
    const requestedFamily =
      typeof options === "number" ? options : options.family ?? 0;
    const matches = requestedFamily === 4 || requestedFamily === 6
      ? addresses.filter((address) => address.family === requestedFamily)
      : addresses;
    const [match] = matches;
    if (!match) {
      const error = new Error("No validated address for requested family") as
        NodeJS.ErrnoException;
      error.code = "ENOTFOUND";
      callback(error);
      return;
    }
    if (typeof options !== "number" && options.all) {
      callback(null, matches);
      return;
    }
    callback(null, match.address, match.family);
  }) as LookupFunction;
}

interface FetchPageDependencies {
  resolveUrl?: (url: string) => Promise<PublicUrlResolution>;
  request?: (
    url: string,
    addresses: PublicAddress[],
    signal: AbortSignal,
  ) => Promise<Response>;
}

export async function fetchPage(
  urlStr: string,
  dependencies: FetchPageDependencies = {},
): Promise<FetchResult> {
  const start = performance.now();
  const resolveUrl = dependencies.resolveUrl ?? assertPublicUrl;
  const request = dependencies.request ?? requestPinnedPage;

  const redirectChain: string[] = [];
  let currentUrl = urlStr;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const controller = new AbortController();
    const connectTimer = setTimeout(
      () => controller.abort(),
      CONNECT_TIMEOUT_MS,
    );

    let response: Response;
    try {
      const resolution = await resolveUrl(currentUrl);
      response = await request(
        currentUrl,
        resolution.addresses,
        controller.signal,
      );
    } catch (err: unknown) {
      clearTimeout(connectTimer);
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("abort") || msg.includes("AbortError")) {
        throw new FetchError("Connection timeout", "TIMEOUT");
      }
      throw new FetchError(`Fetch failed: ${msg}`, "FETCH_ERROR");
    }
    clearTimeout(connectTimer);

    const elapsed = performance.now() - start;
    if (elapsed > TOTAL_TIMEOUT_MS) {
      throw new FetchError("Total timeout exceeded", "TOTAL_TIMEOUT");
    }

    try {
      if (
        response.status >= 300 &&
        response.status < 400 &&
        response.headers.has("location")
      ) {
        const location = response.headers.get("location")!;
        const nextUrl = new URL(location, currentUrl).toString();
        redirectChain.push(currentUrl);
        currentUrl = nextUrl;
        continue;
      }

      const contentType = response.headers.get("content-type") ?? null;
      if (
        contentType &&
        !contentType.includes("text/html") &&
        !contentType.includes("application/xhtml")
      ) {
        throw new FetchError(
          `Not an HTML page: ${contentType}`,
          "NOT_HTML",
        );
      }

      const body = await readLimited(response, MAX_HTML_BYTES);

      return {
        originalUrl: urlStr,
        finalUrl: currentUrl,
        redirectChain,
        httpStatus: response.status,
        contentType,
        body,
        elapsedMs: Math.round(elapsed),
      };
    } finally {
      await releasePinnedResponse(response);
    }
  }

  throw new FetchError(
    `Too many redirects (${MAX_REDIRECTS})`,
    "TOO_MANY_REDIRECTS",
  );
}

async function requestPinnedPage(
  url: string,
  addresses: PublicAddress[],
  signal: AbortSignal,
): Promise<Response> {
  const dispatcher = new Agent({
    connect: { lookup: createPinnedLookup(addresses) },
  });
  try {
    const response = await undiciFetch(url, {
      dispatcher,
      redirect: "manual",
      signal,
      headers: {
        "Accept":
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Encoding": "gzip, deflate",
        "User-Agent": "AI-Price-Intel/1.0 public research validator",
      },
    });
    const compatibleResponse = response as unknown as Response;
    responseDispatchers.set(compatibleResponse, dispatcher);
    return compatibleResponse;
  } catch (error) {
    await dispatcher.close();
    throw error;
  }
}

async function releasePinnedResponse(response: Response): Promise<void> {
  const dispatcher = responseDispatchers.get(response);
  if (!dispatcher) return;
  responseDispatchers.delete(response);
  if (!response.bodyUsed) {
    await response.body?.cancel().catch(() => undefined);
  }
  await dispatcher.close();
}

async function readLimited(
  response: Response,
  maxBytes: number,
): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) {
    return "";
  }

  const chunks: Uint8Array[] = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      total += value.length;
      if (total > maxBytes) {
        reader.cancel();
        throw new FetchError(
          `Response exceeds ${maxBytes} bytes`,
          "TOO_LARGE",
        );
      }
      chunks.push(value);
    }
  }

  // Decode the response
  const decoder = new TextDecoder();
  return chunks.map((c) => decoder.decode(c, { stream: true })).join("") +
    decoder.decode();
}
