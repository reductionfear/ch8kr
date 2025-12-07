/**
 * Proxy Module
 * 
 * Exports proxy manager and parser utilities
 */

export { ProxyManager, getProxyManager, resetProxyManager } from './manager';
export { parseProxy, parseProxyList, isValidProxy } from './parser';
export type { ParsedProxy } from './parser';
export type { ProxyManagerConfig } from './manager';
