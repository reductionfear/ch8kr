/**
 * Proxy Parser Module
 * 
 * Parses various proxy formats and converts them to standard URL format.
 * Supports:
 * - host:port:username:password (auto-detects SOCKS5 vs HTTP by port)
 * - http://user:pass@host:port
 * - https://user:pass@host:port
 * - socks5://user:pass@host:port
 * - socks5h://user:pass@host:port
 */

/**
 * Parsed proxy details
 */
export interface ParsedProxy {
  url: string;           // Full proxy URL
  protocol: string;      // http, https, socks5, socks5h
  host: string;
  port: number;
  username?: string;
  password?: string;
  masked: string;        // URL with password masked for logging
}

/**
 * Default SOCKS5 ports for auto-detection
 */
const DEFAULT_SOCKS5_PORTS = new Set([1080, 1081, 9050]);

/**
 * Get SOCKS5 ports from environment variable or use defaults
 */
function getSocks5Ports(): Set<number> {
  const portsEnv = process.env.SOCKS5_PORTS;
  if (portsEnv) {
    const ports = portsEnv.split(',').map(p => parseInt(p.trim())).filter(p => !isNaN(p));
    return new Set(ports);
  }
  return DEFAULT_SOCKS5_PORTS;
}

/**
 * Parse proxy string into a standardized format
 * 
 * @param proxyString - Proxy in various formats
 * @returns ParsedProxy object or null if invalid
 */
export function parseProxy(proxyString: string): ParsedProxy | null {
  const trimmed = proxyString.trim();
  if (!trimmed) {
    return null;
  }

  // Try URL format first (http://, https://, socks5://, socks5h://)
  if (trimmed.includes('://')) {
    return parseUrlFormat(trimmed);
  }

  // Try host:port:username:password format
  return parseColonFormat(trimmed);
}

/**
 * Parse URL format proxy (e.g., http://user:pass@host:port)
 */
function parseUrlFormat(proxyString: string): ParsedProxy | null {
  try {
    const url = new URL(proxyString);
    const protocol = url.protocol.replace(':', '');
    
    // Validate protocol
    if (!['http', 'https', 'socks5', 'socks5h'].includes(protocol)) {
      console.error(`Invalid proxy protocol: ${protocol}`);
      return null;
    }

    const host = url.hostname;
    
    // Handle default ports if not specified
    let port: number;
    if (url.port) {
      port = parseInt(url.port);
    } else {
      // Default ports by protocol
      if (protocol === 'https') {
        port = 443;
      } else if (protocol === 'socks5' || protocol === 'socks5h') {
        port = 1080;
      } else {
        port = 80;
      }
    }

    if (!host || isNaN(port)) {
      console.error(`Invalid proxy URL: ${proxyString}`);
      return null;
    }

    const username = url.username ? decodeURIComponent(url.username) : undefined;
    const password = url.password ? decodeURIComponent(url.password) : undefined;

    // Build masked version for logging
    const masked = buildMaskedUrl(protocol, host, port, username);

    return {
      url: proxyString,
      protocol,
      host,
      port,
      username,
      password,
      masked,
    };
  } catch (error) {
    console.error(`Failed to parse proxy URL: ${proxyString}`, error);
    return null;
  }
}

/**
 * Parse colon-separated format (host:port:username:password)
 * Auto-detects SOCKS5 vs HTTP by port number
 * Parses from right to left to handle colons in passwords
 */
function parseColonFormat(proxyString: string): ParsedProxy | null {
  // Split into exactly 4 parts, but password can contain colons
  // Format: host:port:username:password
  // Parse right-to-left: find first 3 colons from the left, rest is password
  
  const firstColon = proxyString.indexOf(':');
  if (firstColon === -1) {
    console.error(`Invalid proxy format (expected host:port:user:pass): ${proxyString}`);
    return null;
  }
  
  const host = proxyString.substring(0, firstColon);
  const remainder = proxyString.substring(firstColon + 1);
  
  const secondColon = remainder.indexOf(':');
  if (secondColon === -1) {
    console.error(`Invalid proxy format (expected host:port:user:pass): ${proxyString}`);
    return null;
  }
  
  const portStr = remainder.substring(0, secondColon);
  const remainder2 = remainder.substring(secondColon + 1);
  
  const thirdColon = remainder2.indexOf(':');
  if (thirdColon === -1) {
    console.error(`Invalid proxy format (expected host:port:user:pass): ${proxyString}`);
    return null;
  }
  
  const username = remainder2.substring(0, thirdColon);
  const password = remainder2.substring(thirdColon + 1);
  
  const port = parseInt(portStr);

  if (!host || isNaN(port) || !username || !password) {
    console.error(`Invalid host, port, username, or password in proxy: ${proxyString}`);
    return null;
  }

  // Auto-detect protocol by port
  const socks5Ports = getSocks5Ports();
  const protocol = socks5Ports.has(port) ? 'socks5' : 'http';

  // URL-encode username and password
  const encodedUser = encodeURIComponent(username);
  const encodedPass = encodeURIComponent(password);

  // Build proxy URL
  const url = `${protocol}://${encodedUser}:${encodedPass}@${host}:${port}`;
  const masked = buildMaskedUrl(protocol, host, port, username);

  return {
    url,
    protocol,
    host,
    port,
    username,
    password,
    masked,
  };
}

/**
 * Build masked URL for logging (hides password)
 */
function buildMaskedUrl(
  protocol: string,
  host: string,
  port: number,
  username?: string
): string {
  if (username) {
    return `${protocol}://${username}:****@${host}:${port}`;
  }
  return `${protocol}://${host}:${port}`;
}

/**
 * Validate proxy format
 */
export function isValidProxy(proxyString: string): boolean {
  return parseProxy(proxyString) !== null;
}

/**
 * Parse multiple proxies from a comma-separated list
 */
export function parseProxyList(proxyList: string): ParsedProxy[] {
  if (!proxyList || !proxyList.trim()) {
    return [];
  }

  const proxies = proxyList.split(',').map(p => p.trim()).filter(p => p);
  const parsed: ParsedProxy[] = [];

  for (const proxyString of proxies) {
    const proxy = parseProxy(proxyString);
    if (proxy) {
      parsed.push(proxy);
    }
  }

  return parsed;
}
