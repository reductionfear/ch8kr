# ch8kr API Documentation

## Overview

The ch8kr API provides card checking functionality through multiple payment gateways including Stripe and Shopify.

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Run Development Server (Optional Configuration)

The app works out-of-the-box with default values - no `.env.local` setup required!

```bash
npm run dev
```

**The API will be available at `http://localhost:3000/api/check`**

### 3. Optional: Configure Environment Variables (for customization)

If you want to customize settings or enable Supabase persistence, copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Then edit `.env.local` with your custom values:

**Optional - Supabase (for persisting results to database):**
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anonymous key

**Optional - Override defaults:**
- `FIREBASE_API_KEY` - Firebase API key (has working default)
- `STRIPE_KEY` - Stripe publishable key (has working default)
- Billing/shipping configuration (all have working defaults)
- Proxy configuration (optional)

**Note:** Without Supabase configuration, the app works perfectly but results won't be saved to a database.

### 4. Optional: Set Up Database (for result persistence)

If you want to persist results to Supabase, run the database schema migration:

```bash
# Using Supabase CLI
supabase db push

# Or manually execute the schema
psql -h your-db-host -U postgres -d postgres -f supabase/schema.sql
```

## API Endpoints

### POST /api/check

Check a credit card through a payment gateway.

**Request Body:**

```json
{
  "card": {
    "number": "4242424242424242",
    "exp_month": "12",
    "exp_year": "2025",
    "cvc": "123",
    "name": "Test Card" // optional
  },
  "gateway": "stripe", // or "shopify"
  "site_url": "https://example.myshopify.com", // required for shopify
  "proxy": "http://proxy-server:port", // optional
  "batch_id": "uuid" // optional, for batch tracking
}
```

**Response:**

```json
{
  "success": true,
  "status": "approved", // or "declined", "error"
  "card": {
    "last4": "4242",
    "exp_month": "12",
    "exp_year": "2025"
  },
  "gateway": "stripe",
  "result": {
    "code": "SUCCEEDED",
    "message": "Payment Successful",
    "amount": "$10.50"
  },
  "processing_time_ms": 1234,
  "site_url": null
}
```

**Error Response:**

```json
{
  "error": "Missing required fields: card and gateway",
  "message": "Detailed error message"
}
```

### GET /api/check

Health check endpoint.

**Response:**

```json
{
  "status": "ok",
  "service": "ch8kr card checking API",
  "version": "1.0.0",
  "gateways": ["stripe", "shopify"]
}
```

## Gateway Support

### Stripe Gateway

The Stripe gateway uses Firebase authentication to create payment intents through the Pangobooks flow.

**Features:**
- Automatic Firebase token generation
- Payment intent creation
- Card validation
- 3DS detection
- Saveable decline code handling

**Configuration:**
- `FIREBASE_API_KEY`
- `STRIPE_KEY`
- Billing/shipping information

### Shopify Gateway

The Shopify gateway implements the full Shopify checkout flow.

**Features:**
- Automatic product detection (finds cheapest available product)
- Cart creation
- Card tokenization
- Checkout session management

**Note:** The full checkout completion flow (steps 4-5) is not yet implemented. Currently returns success after tokenization.

**Configuration:**
- `site_url` required in request
- Checkout information (address, email, etc.)

## Database Schema

### Tables

#### `checks`
Stores individual card check results.

Key fields:
- `card_number_hash` - SHA-256 hash of card number
- `card_last4` - Last 4 digits
- `gateway` - Gateway used
- `status` - Result status
- `raw_response` - Full gateway response (JSONB)

#### `batches`
Tracks batch processing.

Key fields:
- `total_cards` - Total cards in batch
- `processed_cards` - Number processed
- `approved_cards` - Number approved
- `status` - Batch status

#### `batch_checks`
Junction table linking checks to batches.

## Development

### Build

```bash
npm run build
```

### Lint

```bash
npm run lint
```

### Type Check

```bash
npx tsc --noEmit
```

## Migration from Python Bot

This API replaces the legacy Python bot with the following improvements:

1. **Database Storage**: All results stored in Supabase (replaces `approved.txt`)
2. **Batch Tracking**: Proper batch management (replaces in-memory `active_batches`)
3. **Type Safety**: Full TypeScript implementation
4. **REST API**: Easy integration vs. file-based I/O
5. **Scalability**: Stateless API design for horizontal scaling

## Security Considerations

⚠️ **Important Security Notes:**

1. **Never store full card numbers** - We hash card numbers with SHA-256
2. **Use environment variables** - Never commit credentials to git
3. **HTTPS only in production** - Always use TLS for card data
4. **Rate limiting** - Implement rate limiting in production
5. **Access control** - Add authentication/authorization before production use

## Roadmap

- [ ] Complete Shopify checkout flow (steps 4-5)
- [ ] Add batch processing endpoint
- [ ] Implement webhook support
- [ ] Add authentication middleware
- [ ] Rate limiting
- [ ] Dashboard UI
- [ ] Results export functionality
- [ ] Multi-gateway parallel checking
