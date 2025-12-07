/**
 * Proxy Manager Module
 * 
 * Manages proxy rotation with features:
 * - Load from environment variables (PROXY_LIST, PROXY_FILE, PROXY_FILES)
 * - Round-robin rotation
 * - Track failed proxies and remove after consecutive failures
 * - Request delay support
 */

import * as fs from 'fs';
import * as path from 'path';
import { parseProxy, parseProxyList, ParsedProxy } from './parser';

/**
 * Configuration for proxy manager
 */
export interface ProxyManagerConfig {
  maxConsecutiveFailures?: number;  // Default: 3
  requestDelayMs?: number;          // Default: 2000 (like Python bot)
}

/**
 * Proxy with failure tracking
 */
interface ProxyWithStats extends ParsedProxy {
  consecutiveFailures: number;
  lastUsed: number;
}

/**
 * Proxy Manager Class
 */
export class ProxyManager {
  private proxies: ProxyWithStats[] = [];
  private currentIndex: number = 0;
  private maxConsecutiveFailures: number;
  private requestDelayMs: number;
  private lastRequestTime: number = 0;

  constructor(config: ProxyManagerConfig = {}) {
    this.maxConsecutiveFailures = config.maxConsecutiveFailures || 3;
    
    // Parse and validate REQUEST_DELAY_MS
    const delayEnv = process.env.REQUEST_DELAY_MS;
    const parsedDelay = delayEnv ? parseInt(delayEnv) : 2000;
    this.requestDelayMs = config.requestDelayMs || 
      (!isNaN(parsedDelay) && parsedDelay > 0 ? parsedDelay : 2000);
  }

  /**
   * Initialize proxy manager from environment variables
   */
  async initialize(): Promise<void> {
    // Priority 1: PROXY_LIST (comma-separated)
    const proxyList = process.env.PROXY_LIST;
    if (proxyList) {
      const parsed = parseProxyList(proxyList);
      this.addProxies(parsed);
      console.log(`Loaded ${parsed.length} proxies from PROXY_LIST`);
      return;
    }

    // Priority 2: PROXY_FILES (multiple files, comma-separated)
    const proxyFiles = process.env.PROXY_FILES;
    if (proxyFiles) {
      const files = proxyFiles.split(',').map(f => f.trim());
      for (const file of files) {
        await this.loadProxiesFromFile(file);
      }
      return;
    }

    // Priority 3: PROXY_FILE (single file)
    const proxyFile = process.env.PROXY_FILE;
    if (proxyFile) {
      await this.loadProxiesFromFile(proxyFile);
      return;
    }

    console.log('No proxy configuration found. Running without proxies.');
  }

  /**
   * Load proxies from a file
   * File format: one proxy per line
   * Supported formats:
   *   - host:port:username:password
   *   - http://user:pass@host:port
   *   - socks5://user:pass@host:port
   * Lines starting with # are treated as comments
   */
  async loadProxiesFromFile(filePath: string): Promise<void> {
    try {
      const resolvedPath = path.resolve(filePath);
      const content = fs.readFileSync(resolvedPath, 'utf-8');
      const lines = content.split('\n');
      const parsed: ParsedProxy[] = [];

      for (const line of lines) {
        const trimmed = line.trim();
        
        // Skip empty lines and comments
        if (!trimmed || trimmed.startsWith('#')) {
          continue;
        }

        const proxy = parseProxy(trimmed);
        if (proxy) {
          parsed.push(proxy);
        }
      }

      this.addProxies(parsed);
      console.log(`Loaded ${parsed.length} proxies from ${filePath}`);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        console.error(`Proxy file not found: ${filePath}`);
      } else {
        console.error(`Error loading proxies from file ${filePath}:`, error.message);
      }
    }
  }

  /**
   * Add proxies to the manager
   */
  private addProxies(proxies: ParsedProxy[]): void {
    for (const proxy of proxies) {
      this.proxies.push({
        ...proxy,
        consecutiveFailures: 0,
        lastUsed: 0,
      });
    }
  }

  /**
   * Get the next proxy in round-robin fashion
   * Returns null if no proxies available
   */
  getNextProxy(): string | null {
    if (this.proxies.length === 0) {
      return null;
    }

    // Round-robin rotation
    const proxy = this.proxies[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.proxies.length;
    
    proxy.lastUsed = Date.now();
    
    return proxy.url;
  }

  /**
   * Mark proxy as successful (resets failure count)
   */
  markSuccess(proxyUrl: string): void {
    const proxy = this.findProxyByUrl(proxyUrl);
    if (proxy) {
      proxy.consecutiveFailures = 0;
    }
  }

  /**
   * Mark proxy as failed
   * Removes proxy if it reaches max consecutive failures
   */
  markFailure(proxyUrl: string): void {
    const proxy = this.findProxyByUrl(proxyUrl);
    if (!proxy) {
      return;
    }

    proxy.consecutiveFailures++;

    if (proxy.consecutiveFailures >= this.maxConsecutiveFailures) {
      this.removeProxy(proxyUrl);
      console.log(`Removed dead proxy after ${this.maxConsecutiveFailures} failures: ${proxy.masked}`);
    }
  }

  /**
   * Find proxy by URL
   */
  private findProxyByUrl(proxyUrl: string): ProxyWithStats | undefined {
    return this.proxies.find(p => p.url === proxyUrl);
  }

  /**
   * Remove proxy from the pool
   */
  private removeProxy(proxyUrl: string): void {
    const index = this.proxies.findIndex(p => p.url === proxyUrl);
    if (index !== -1) {
      this.proxies.splice(index, 1);
      
      // Adjust currentIndex if needed
      if (this.currentIndex >= this.proxies.length && this.proxies.length > 0) {
        this.currentIndex = 0;
      }
    }
  }

  /**
   * Get count of active proxies
   */
  getProxyCount(): number {
    return this.proxies.length;
  }

  /**
   * Get all proxies with their stats (for debugging)
   */
  getProxiesWithStats(): Array<{masked: string; failures: number}> {
    return this.proxies.map(p => ({
      masked: p.masked,
      failures: p.consecutiveFailures,
    }));
  }

  /**
   * Wait for request delay
   * Ensures minimum delay between requests
   */
  async waitForDelay(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    const remaining = this.requestDelayMs - elapsed;

    if (remaining > 0) {
      await new Promise(resolve => setTimeout(resolve, remaining));
    }

    this.lastRequestTime = Date.now();
  }

  /**
   * Clear all proxies
   */
  clear(): void {
    this.proxies = [];
    this.currentIndex = 0;
  }
}

/**
 * Singleton proxy manager instance
 */
let globalProxyManager: ProxyManager | null = null;

/**
 * Get or create global proxy manager
 */
export async function getProxyManager(): Promise<ProxyManager> {
  if (!globalProxyManager) {
    globalProxyManager = new ProxyManager();
    await globalProxyManager.initialize();
  }
  return globalProxyManager;
}

/**
 * Reset global proxy manager (useful for testing)
 */
export function resetProxyManager(): void {
  globalProxyManager = null;
}
