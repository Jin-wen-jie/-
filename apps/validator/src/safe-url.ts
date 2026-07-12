import * as dns from "node:dns/promises";
import * as ipaddr from "ipaddr.js";

const ALLOWED_PORTS = new Set([80, 443]);

export class PublicUrlError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "PublicUrlError";
  }
}

export interface PublicAddress {
  address: string;
  family: 4 | 6;
}

export interface PublicUrlResolution {
  hostname: string;
  addresses: PublicAddress[];
}

/**
 * Verify that a URL targets a public internet destination.
 * Resolves the hostname and checks every returned IP address
 * against a blocklist of private/special-use ranges.
 */
export async function assertPublicUrl(
  urlStr: string,
  resolveHost: (hostname: string) => Promise<string[]> = defaultResolve,
): Promise<PublicUrlResolution> {
  let parsed: URL;
  try {
    parsed = new URL(urlStr);
  } catch {
    throw new PublicUrlError("Invalid URL", "INVALID_URL");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new PublicUrlError(
      `Unsupported protocol: ${parsed.protocol}`,
      "BAD_PROTOCOL",
    );
  }

  if (parsed.username || parsed.password) {
    throw new PublicUrlError(
      "URL must not contain credentials",
      "CREDENTIALS_IN_URL",
    );
  }

  const port = parsed.port
    ? Number.parseInt(parsed.port, 10)
    : parsed.protocol === "https:"
      ? 443
      : 80;

  if (!ALLOWED_PORTS.has(port)) {
    throw new PublicUrlError(
      `Port ${port} is not allowed`,
      "BAD_PORT",
    );
  }

  // Check if it's an IP literal
  const hostname = parsed.hostname.startsWith("[")
    ? parsed.hostname.slice(1, -1)
    : parsed.hostname;
  if (ipaddr.isValid(hostname)) {
    const address = ipaddr.parse(hostname);
    checkIp(address);
    return {
      hostname,
      addresses: [
        { address: hostname, family: address.kind() === "ipv4" ? 4 : 6 },
      ],
    };
  }

  // Resolve DNS and check every address
  let addresses: string[];
  try {
    addresses = await resolveHost(hostname);
  } catch {
    throw new PublicUrlError(
      `DNS resolution failed for ${hostname}`,
      "DNS_FAILURE",
    );
  }

  if (addresses.length === 0) {
    throw new PublicUrlError(
      `DNS resolution returned no addresses for ${hostname}`,
      "DNS_FAILURE",
    );
  }

  const validated: PublicAddress[] = [];
  for (const addr of addresses) {
    let parsedAddress: ipaddr.IPv4 | ipaddr.IPv6;
    try {
      parsedAddress = ipaddr.parse(addr);
    } catch {
      throw new PublicUrlError(
        `DNS resolution returned an invalid address for ${hostname}`,
        "DNS_FAILURE",
      );
    }
    checkIp(parsedAddress);
    validated.push({
      address: addr,
      family: parsedAddress.kind() === "ipv4" ? 4 : 6,
    });
  }

  return { hostname, addresses: validated };
}

async function defaultResolve(hostname: string): Promise<string[]> {
  const records = await dns.lookup(hostname, { all: true, verbatim: true });
  return records.map((record) => record.address);
}

function checkIp(addr: ipaddr.IPv4 | ipaddr.IPv6): void {
  // IPv4-mapped IPv6
  if (
    addr.kind() === "ipv6" &&
    (addr as ipaddr.IPv6).isIPv4MappedAddress()
  ) {
    const ipv4 = (addr as ipaddr.IPv6).toIPv4Address();
    checkIpv4(ipv4);
    return;
  }

  if (addr.kind() === "ipv4") {
    checkIpv4(addr as ipaddr.IPv4);
    return;
  }

  // Pure IPv6 that isn't IPv4-mapped — check range
  const range = (addr as ipaddr.IPv6).range();
  if (range !== "unicast") {
    throw new PublicUrlError(
      `Private or special address: ${addr.toString()}`,
      "PRIVATE_ADDRESS",
    );
  }
}

function checkIpv4(addr: ipaddr.IPv4): void {
  const range = addr.range();
  if (range !== "unicast") {
    throw new PublicUrlError(
      `Private or special address: ${addr.toString()}`,
      "PRIVATE_ADDRESS",
    );
  }
}
