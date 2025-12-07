/**
 * API Route: POST /api/check
 * 
 * Handles card checking through different payment gateways
 * Accepts card details and gateway type, returns check result
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkCardStripe, CardInfo as StripeCardInfo } from '@/lib/gateways/stripe';
import { checkCardShopify, CardInfo as ShopifyCardInfo } from '@/lib/gateways/shopify';
import { createSupabaseClient } from '@/lib/supabase/client';
import crypto from 'crypto';

/**
 * Request body interface
 */
interface CheckRequest {
  card: {
    number: string;
    exp_month: string;
    exp_year: string;
    cvc: string;
    name?: string;
  };
  gateway: 'stripe' | 'shopify';
  site_url?: string; // Required for Shopify
  proxy?: string;
  batch_id?: string; // Optional batch tracking
}

/**
 * Hash card number for storage (without storing full PAN)
 */
function hashCardNumber(cardNumber: string): string {
  return crypto.createHash('sha256').update(cardNumber).digest('hex');
}

/**
 * Get last 4 digits of card
 */
function getCardLast4(cardNumber: string): string {
  return cardNumber.slice(-4);
}

/**
 * POST /api/check
 * Main endpoint for card checking
 */
export async function POST(request: NextRequest) {
  try {
    const body: CheckRequest = await request.json();

    // Validate request
    if (!body.card || !body.gateway) {
      return NextResponse.json(
        { error: 'Missing required fields: card and gateway' },
        { status: 400 }
      );
    }

    const { card, gateway, site_url, proxy, batch_id } = body;

    // Validate card details
    if (!card.number || !card.exp_month || !card.exp_year || !card.cvc) {
      return NextResponse.json(
        { error: 'Missing card details: number, exp_month, exp_year, cvc are required' },
        { status: 400 }
      );
    }

    // Validate gateway-specific requirements
    if (gateway === 'shopify' && !site_url) {
      return NextResponse.json(
        { error: 'site_url is required for Shopify gateway' },
        { status: 400 }
      );
    }

    const startTime = Date.now();

    // Process based on gateway
    let result;
    if (gateway === 'stripe') {
      result = await checkCardStripe(card as StripeCardInfo, proxy);
    } else if (gateway === 'shopify') {
      result = await checkCardShopify(site_url!, card as ShopifyCardInfo, proxy);
    } else {
      return NextResponse.json(
        { error: `Unsupported gateway: ${gateway}` },
        { status: 400 }
      );
    }

    const processingTime = Date.now() - startTime;

    // Determine status
    let status: 'approved' | 'declined' | 'error';
    if (result.success) {
      status = 'approved';
    } else if (result.reason.includes('Network Error') || result.reason.includes('Failed')) {
      status = 'error';
    } else {
      status = 'declined';
    }

    // Extract response code from result
    let responseCode = status.toUpperCase();
    if (result.response?.error?.code) {
      responseCode = result.response.error.code;
    } else if (result.response?.status) {
      responseCode = result.response.status;
    }

    // Prepare data for database
    const checkData = {
      card_number_hash: hashCardNumber(card.number),
      card_last4: getCardLast4(card.number),
      exp_month: card.exp_month,
      exp_year: card.exp_year,
      gateway,
      status,
      response_code: responseCode,
      response_message: result.reason,
      amount_cents: result.amount ? parseAmountToCents(result.amount) : null,
      currency: 'usd',
      raw_response: result.response,
      site_url: site_url || null,
      proxy_used: proxy || null,
      processing_time_ms: processingTime,
    };

    // Save to Supabase
    try {
      const supabase = createSupabaseClient();
      const { data: checkRecord, error: dbError } = await supabase
        .from('checks')
        .insert(checkData)
        .select()
        .single();

      if (dbError) {
        console.error('Database error:', dbError);
        // Don't fail the request if database save fails
      } else if (checkRecord && batch_id) {
        // Link to batch if batch_id provided
        const { error: batchLinkError } = await supabase
          .from('batch_checks')
          .insert({
            batch_id,
            check_id: checkRecord.id,
          });
        
        if (batchLinkError) {
          console.error('Batch link error:', batchLinkError);
        }
      }
    } catch (dbError) {
      console.error('Database connection error:', dbError);
      // Continue even if database fails
    }

    // Return response
    return NextResponse.json({
      success: result.success,
      status,
      card: {
        last4: getCardLast4(card.number),
        exp_month: card.exp_month,
        exp_year: card.exp_year,
      },
      gateway,
      result: {
        code: responseCode,
        message: result.reason,
        amount: result.amount,
      },
      processing_time_ms: processingTime,
      site_url: site_url || null,
    });

  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * Parse amount string to cents
 * e.g., "$10.50" -> 1050
 */
function parseAmountToCents(amountStr: string): number | null {
  try {
    const cleaned = amountStr.replace(/[^0-9.]/g, '');
    const amount = parseFloat(cleaned);
    if (isNaN(amount)) return null;
    return Math.round(amount * 100);
  } catch {
    return null;
  }
}

/**
 * GET /api/check
 * Health check endpoint
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'ch8kr card checking API',
    version: '1.0.0',
    gateways: ['stripe', 'shopify'],
  });
}
