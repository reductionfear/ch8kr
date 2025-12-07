/**
 * Shopify Gateway - Port of neww.py
 * 
 * This module handles Shopify checkout flow including:
 * - Product detection
 * - Cart creation
 * - Card tokenization
 * - Payment submission
 */

import axios, { AxiosRequestConfig } from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';
import { getProxyManager } from '../proxy';

/**
 * Card information interface
 */
export interface CardInfo {
  number: string;
  exp_month: string;
  exp_year: string;
  cvc: string;
  name?: string;
}

/**
 * Checkout configuration
 */
interface CheckoutData {
  email: string;
  first_name: string;
  last_name: string;
  address1: string;
  city: string;
  province: string;
  zip: string;
  country: string;
  phone: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

/**
 * Product details
 */
interface ProductDetails {
  id: string;
  variant_id: string;
  price: number;
  price_str: string;
  title: string;
  available: boolean;
}

/**
 * Shopify check result
 */
export interface ShopifyCheckResult {
  success: boolean;
  response: any;
  reason: string;
  amount?: string;
}

// Default checkout data (from Python)
const DEFAULT_CHECKOUT_DATA: CheckoutData = {
  email: process.env.CHECKOUT_EMAIL || 'test@example.com',
  first_name: process.env.CHECKOUT_FIRST_NAME || 'John',
  last_name: process.env.CHECKOUT_LAST_NAME || 'Doe',
  address1: process.env.CHECKOUT_ADDRESS1 || '4024 College Point Boulevard',
  city: process.env.CHECKOUT_CITY || 'Flushing',
  province: process.env.CHECKOUT_PROVINCE || 'NY',
  zip: process.env.CHECKOUT_ZIP || '11354',
  country: process.env.CHECKOUT_COUNTRY || 'US',
  phone: process.env.CHECKOUT_PHONE || '2494851515',
  coordinates: {
    latitude: 40.7589,
    longitude: -73.9851,
  },
};

/**
 * Create appropriate proxy agent based on proxy URL
 */
function createProxyAgent(proxyUrl: string): HttpsProxyAgent | SocksProxyAgent {
  if (proxyUrl.startsWith('socks5://') || proxyUrl.startsWith('socks5h://')) {
    return new SocksProxyAgent(proxyUrl);
  }
  return new HttpsProxyAgent(proxyUrl);
}

/**
 * Create a session with proper headers
 */
function createSession(shopUrl: string, proxy?: string) {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'application/json',
    'Accept-Language': 'en-US',
    'Content-Type': 'application/json',
    'Origin': shopUrl,
    'Referer': `${shopUrl}/`,
  };

  const config: AxiosRequestConfig = {
    headers,
    timeout: 10000,
    validateStatus: () => true,
  };

  if (proxy) {
    config.proxy = false;
    config.httpsAgent = createProxyAgent(proxy);
  }

  return { config, headers };
}

/**
 * Normalize shop URL
 */
function normalizeShopUrl(shopUrl: string): string {
  if (!shopUrl.startsWith('http://') && !shopUrl.startsWith('https://')) {
    return `https://${shopUrl}`;
  }
  return shopUrl;
}

/**
 * Auto-detect the cheapest available product on the Shopify store
 * Port of auto_detect_cheapest_product from Python
 */
export async function autoDetectCheapestProduct(
  shopUrl: string,
  proxy?: string
): Promise<ProductDetails | null> {
  console.log('[0/5] Auto-detecting cheapest product...');
  
  const normalizedUrl = normalizeShopUrl(shopUrl);
  const { config } = createSession(normalizedUrl, proxy);

  try {
    // Try to fetch products from products.json endpoint
    const productsUrl = `${normalizedUrl}/products.json?limit=250`;
    const response = await axios.get(productsUrl, config);

    if (response.status === 200) {
      const data = response.data;
      const products = Array.isArray(data) ? data : data.products || [];

      const validProducts: ProductDetails[] = [];

      for (const product of products) {
        const productId = product.id;
        const productTitle = product.title || 'Unknown';
        const variants = product.variants || [];

        for (const variant of variants) {
          const variantId = variant.id;
          const priceStr = variant.price || '0';
          const available = variant.available !== false;

          try {
            const price = parseFloat(priceStr);

            if (available && price > 0) {
              validProducts.push({
                id: String(productId),
                variant_id: String(variantId),
                price,
                price_str: priceStr,
                title: productTitle,
                available: true,
              });
            }
          } catch {
            continue;
          }
        }
      }

      if (validProducts.length > 0) {
        // Sort by price and return cheapest
        validProducts.sort((a, b) => a.price - b.price);
        const cheapest = validProducts[0];
        console.log(`  ✅ Cheapest product found: ${cheapest.title} $${cheapest.price_str}`);
        return cheapest;
      }
    }
  } catch (error: any) {
    console.error('Error detecting product:', error.message);
  }

  console.log('  ❌ Could not auto-detect any products');
  return null;
}

/**
 * Create a checkout session by adding product to cart
 * Port of step1_add_to_cart from Python (simplified)
 */
async function createCheckoutSession(
  shopUrl: string,
  variantId: string,
  proxy?: string
): Promise<{ checkoutToken: string | null; sessionToken: string | null }> {
  console.log('[1/5] Adding to cart and creating checkout...');

  const normalizedUrl = normalizeShopUrl(shopUrl);
  const { config, headers } = createSession(normalizedUrl, proxy);

  try {
    // Add to cart
    const addUrl = `${normalizedUrl}/cart/add.js`;
    const payload = { id: variantId, quantity: 1 };

    await axios.post(addUrl, payload, { ...config, headers });

    // Navigate to checkout
    const checkoutUrl = `${normalizedUrl}/checkout`;
    const response = await axios.get(checkoutUrl, {
      ...config,
      maxRedirects: 5,
      headers,
    });

    const finalUrl = response.request?.res?.responseUrl || response.config.url || '';

    if (finalUrl.includes('/checkouts/cn/')) {
      const checkoutToken = finalUrl.split('/checkouts/cn/')[1]?.split('/')[0];
      console.log(`  [OK] Checkout token: ${checkoutToken}`);

      // Extract session token from HTML (simplified - in production, parse the HTML)
      const html = response.data;
      const sessionToken = extractSessionToken(html);

      return { checkoutToken, sessionToken };
    }
  } catch (error: any) {
    console.error('  [ERROR] Checkout creation failed:', error.message);
  }

  return { checkoutToken: null, sessionToken: null };
}

/**
 * Extract session token from HTML
 * Simplified version - in production, use proper HTML parsing
 */
function extractSessionToken(html: string): string | null {
  try {
    const metaPattern = /<meta\s+name="serialized-session-token"\s+content="([^"]+)"/;
    const match = html.match(metaPattern);

    if (match && match[1]) {
      // Unescape HTML entities
      const content = match[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&');
      const token = content.trim().replace(/^"|"$/g, '');

      if (token.length > 50) {
        console.log('  [OK] Session token extracted');
        return token;
      }
    }
  } catch (error) {
    console.error('  [WARNING] Failed to extract session token');
  }

  console.log('  [WARNING] Session token not found');
  return null;
}

/**
 * Tokenize credit card with Shopify
 * Port of step2_tokenize_card from Python (simplified)
 */
async function tokenizeCard(
  shopUrl: string,
  card: CardInfo,
  proxy?: string
): Promise<string | null> {
  console.log('[2/5] Tokenizing credit card...');

  const scopeHost = new URL(normalizeShopUrl(shopUrl)).hostname;

  const payload = {
    credit_card: {
      number: card.number,
      month: parseInt(card.exp_month),
      year: parseInt(card.exp_year),
      verification_value: card.cvc,
      start_month: null,
      start_year: null,
      issue_number: '',
      name: card.name || 'Test Card',
    },
    payment_session_scope: scopeHost,
  };

  const endpoints = [
    {
      url: 'https://checkout.pci.shopifyinc.com/sessions',
      origin: 'https://checkout.pci.shopifyinc.com',
      referer: 'https://checkout.pci.shopifyinc.com/',
    },
  ];

  for (const endpoint of endpoints) {
    const headers = {
      Origin: endpoint.origin,
      Referer: endpoint.referer,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    };

    const config: AxiosRequestConfig = {
      method: 'POST',
      url: endpoint.url,
      headers,
      data: payload,
      timeout: 10000,
      validateStatus: () => true,
    };

    if (proxy) {
      config.proxy = false;
      config.httpsAgent = createProxyAgent(proxy);
    }

    try {
      const response = await axios(config);

      if (response.status === 200) {
        const tokenData = response.data;
        const cardSessionId = tokenData.id;

        if (cardSessionId) {
          console.log(`  [OK] Card session ID: ${cardSessionId}`);
          return cardSessionId;
        }
      } else if (response.status === 403) {
        console.log('  [TOKEN] 403 Forbidden - Proxy/IP blocked by payment gateway');
        return null;
      }
    } catch (error: any) {
      console.error(`  [TOKEN] Request failed: ${error.message}`);
      continue;
    }
  }

  console.log('  [ERROR] Tokenization failed');
  return null;
}

/**
 * Main function to check a card using Shopify gateway
 * Simplified version of the full Shopify flow
 * Now supports proxy rotation and request delays
 */
export async function checkCardShopify(
  shopUrl: string,
  card: CardInfo,
  proxy?: string
): Promise<ShopifyCheckResult> {
  const normalizedUrl = normalizeShopUrl(shopUrl);
  
  // Get proxy manager
  const proxyManager = await getProxyManager();
  
  // Use provided proxy or get next from manager
  const proxyUrl = proxy || proxyManager.getNextProxy() || undefined;

  try {
    // Wait for request delay if configured
    await proxyManager.waitForDelay();
    
    // Step 1: Detect product
    const product = await autoDetectCheapestProduct(normalizedUrl, proxyUrl);

    if (!product) {
      if (proxyUrl) proxyManager.markFailure(proxyUrl);
      return {
        success: false,
        response: {},
        reason: 'No products found on site',
      };
    }

    // Wait between requests
    await proxyManager.waitForDelay();

    // Step 2: Create checkout session
    const { checkoutToken, sessionToken } = await createCheckoutSession(
      normalizedUrl,
      product.variant_id,
      proxyUrl
    );

    if (!checkoutToken || !sessionToken) {
      if (proxyUrl) proxyManager.markFailure(proxyUrl);
      return {
        success: false,
        response: {},
        reason: 'Failed to create checkout session',
      };
    }

    // Wait between requests
    await proxyManager.waitForDelay();

    // Step 3: Tokenize card
    const cardSessionId = await tokenizeCard(normalizedUrl, card, proxyUrl);

    if (!cardSessionId) {
      if (proxyUrl) proxyManager.markFailure(proxyUrl);
      return {
        success: false,
        response: {},
        reason: 'Failed to tokenize card',
      };
    }

    // Mark proxy as successful
    if (proxyUrl) proxyManager.markSuccess(proxyUrl);

    // Note: Steps 4-5 (proposal and completion) are extremely complex
    // and would require significant additional code. For now, we return
    // a success indicator that the card was tokenized successfully.

    console.log('[3/5] Card tokenized successfully');
    console.log('[INFO] Full checkout flow not yet implemented');

    return {
      success: true,
      response: {
        checkout_token: checkoutToken,
        session_token: sessionToken,
        card_session_id: cardSessionId,
        product,
      },
      reason: 'Card tokenized successfully (full flow pending)',
      amount: `$${product.price_str}`,
    };
  } catch (error: any) {
    // Mark proxy as failed on exception
    if (proxyUrl) proxyManager.markFailure(proxyUrl);
    
    return {
      success: false,
      response: { error: { message: error.message } },
      reason: 'Network Error',
    };
  }
}
