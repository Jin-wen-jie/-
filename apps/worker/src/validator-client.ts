export interface ValidatorResponse {
  originalUrl: string;
  finalUrl: string;
  redirectChain: string[];
  httpStatus: number;
  elapsedMs: number;
  extraction: {
    title: string | null;
    price: string | null;
    currency: string | null;
    availability: string;
    stockText: string | null;
    stockQuantity: number | null;
    buyAction: boolean;
    pageFingerprint: string;
    /** 同平台发现的其它店铺链接 */
    platformLinks: string[];
    confidence: {
      title: number;
      price: number;
      availability: number;
    };
  };
}

export interface ValidatorError {
  error: string;
  message: string;
}

export class ValidatorClientError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "ValidatorClientError";
  }
}

export async function validateUrl(
  url: string,
  baseUrl: string,
  token: string,
): Promise<ValidatorResponse> {
  const response = await fetch(`${baseUrl}/validate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ url }),
    signal: AbortSignal.timeout(15_000),
  });

  const body = (await response.json()) as ValidatorResponse | ValidatorError;

  if (!response.ok) {
    const err = body as ValidatorError;
    throw new ValidatorClientError(err.message, err.error);
  }

  return body as ValidatorResponse;
}
