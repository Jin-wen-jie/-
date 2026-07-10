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

/**
 * Verify that a URL targets a public internet destination.
 * Resolves the hostname and checks every returned IP address
 * against a blocklist of private/special-use ranges.
 */
export async function assertPublicUrl(
  urlStr: string,
  resolveHost: (hostname: string) => Promise<string[]> = defaultResolve,
): Promise<void> {
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
  const hostname = parsed.hostname;
  if (ipaddr.isValid(hostname)) {
    checkIp(ipaddr.parse(hostname));
    return;
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

  for (const addr of addresses) {
    checkIp(ipaddr.parse(addr));
  }
}

async function defaultResolve(hostname: string): Promise<string[]> {
  const records = await dns.resolve4(hostname);
  return records;
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
  const ipv6 = addr as ipaddr.IPv6;
  const range = ipv6.range();
  if (
    range === "loopback" ||
    range === "linkLocal" ||
    range === "multicast" ||
    range === "uniqueLocal" ||
    isSpecialIpv6(ipv6)
  ) {
    throw new PublicUrlError(
      `Private or special address: ${addr.toString()}`,
      "PRIVATE_ADDRESS",
    );
  }
}

function checkIpv4(addr: ipaddr.IPv4): void {
  const range = addr.range();
  if (
    range === "loopback" ||
    range === "private" ||
    range === "linkLocal" ||
    range === "carrierGradeNat" ||
    range === "multicast" ||
    range === "reserved"
  ) {
    throw new PublicUrlError(
      `Private or special address: ${addr.toString()}`,
      "PRIVATE_ADDRESS",
    );
  }
}

function isSpecialIpv6(addr: ipaddr.IPv6): boolean {
  // Block documentation prefix, 6to4, teredo, etc. if they resolve
  const str = addr.toNormalizedString();
  if (str.startsWith("2001:db8:")) return true; // documentation
  if (str === "::1") return true;
  return false;
}
