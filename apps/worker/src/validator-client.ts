import { z } from "zod";

const knownEntityErrorCodes = new Set([
  "INVALID_URL",
  "BAD_PROTOCOL",
  "CREDENTIALS_IN_URL",
  "BAD_PORT",
  "DNS_FAILURE",
  "PRIVATE_ADDRESS",
  "TIMEOUT",
  "TOTAL_TIMEOUT",
  "FETCH_ERROR",
  "NOT_HTML",
  "TOO_MANY_REDIRECTS",
  "TOO_LARGE",
]);

const validatorResponseSchema = z.object({
  originalUrl: z.string().url(),
  finalUrl: z.string().url(),
  redirectChain: z.array(z.string().url()),
  httpStatus: z.number().int().min(100).max(599),
  elapsedMs: z.number().int().nonnegative(),
  extraction: z.object({
    title: z.string().nullable(),
    price: z.string().nullable(),
    currency: z.string().nullable(),
    availability: z.enum([
      "IN_STOCK",
      "OUT_OF_STOCK",
      "PREORDER",
      "UNKNOWN",
    ]),
    stockText: z.string().nullable(),
    stockQuantity: z.number().int().nonnegative().nullable(),
    buyAction: z.boolean(),
    pageFingerprint: z.string(),
    platformLinks: z.array(z.string().max(2_048).url()).max(50),
    confidence: z.object({
      title: z.number().min(0).max(1),
      price: z.number().min(0).max(1),
      availability: z.number().min(0).max(1),
    }).strict(),
  }).strict(),
}).strict();

const validatorErrorSchema = z.object({
  error: z.string(),
  message: z.string(),
}).strict();

export type ValidatorResponse = z.infer<typeof validatorResponseSchema>;

export class ValidatorClientError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "ValidatorClientError";
  }
}

export type ValidatorInfrastructureErrorCode =
  | "VALIDATOR_AUTH_FAILED"
  | "VALIDATOR_UNAVAILABLE"
  | "VALIDATOR_CLIENT_TIMEOUT"
  | "VALIDATOR_INVALID_RESPONSE";

export class ValidatorInfrastructureError extends Error {
  constructor(public readonly code: ValidatorInfrastructureErrorCode) {
    super(code);
    this.name = "ValidatorInfrastructureError";
  }
}

export async function validateUrl(
  url: string,
  baseUrl: string,
  token: string,
): Promise<ValidatorResponse> {
  let response: Response;
  try {
    response = await fetch(`${baseUrl}/validate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ url }),
      signal: AbortSignal.timeout(20_000),
    });
  } catch (error) {
    const name = error instanceof Error ? error.name : "";
    const code = name === "TimeoutError" || name === "AbortError"
      ? "VALIDATOR_CLIENT_TIMEOUT"
      : "VALIDATOR_UNAVAILABLE";
    throw new ValidatorInfrastructureError(code);
  }

  if (response.status === 401 || response.status === 403) {
    throw new ValidatorInfrastructureError("VALIDATOR_AUTH_FAILED");
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new ValidatorInfrastructureError("VALIDATOR_INVALID_RESPONSE");
  }

  if (response.status !== 200) {
    const parsed = validatorErrorSchema.safeParse(body);
    if (!parsed.success || !knownEntityErrorCodes.has(parsed.data.error)) {
      throw new ValidatorInfrastructureError("VALIDATOR_INVALID_RESPONSE");
    }
    throw new ValidatorClientError(parsed.data.error, parsed.data.error);
  }

  const parsed = validatorResponseSchema.safeParse(body);
  if (!parsed.success) {
    throw new ValidatorInfrastructureError("VALIDATOR_INVALID_RESPONSE");
  }
  return parsed.data;
}
