import { assertPublicUrl } from "./safe-url.js";

const MAX_REDIRECTS = 5;
const CONNECT_TIMEOUT_MS = 5_000;
const TOTAL_TIMEOUT_MS = 15_000;
const MAX_HTML_BYTES = 2 * 1024 * 1024; // 2 MB

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

export async function fetchPage(urlStr: string): Promise<FetchResult> {
  const start = performance.now();
  await assertPublicUrl(urlStr);

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
      response = await fetch(currentUrl, {
        redirect: "manual",
        signal: controller.signal,
        headers: {
          "Accept":
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Encoding": "gzip, deflate",
          "User-Agent":
            "AI-Price-Intel/1.0 (public research bot; +https://github.com/example)",
        },
      });
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

    // Handle redirects
    if (
      response.status >= 300 &&
      response.status < 400 &&
      response.headers.has("location")
    ) {
      const location = response.headers.get("location")!;
      const nextUrl = new URL(location, currentUrl).toString();
      redirectChain.push(currentUrl);

      // Validate the redirect target
      await assertPublicUrl(nextUrl);
      currentUrl = nextUrl;
      continue;
    }

    // Not a redirect — process the response
    const contentType = response.headers.get("content-type") ?? null;

    // Reject non-HTML content types
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

    // Read body with size limit
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
  }

  throw new FetchError(
    `Too many redirects (${MAX_REDIRECTS})`,
    "TOO_MANY_REDIRECTS",
  );
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
