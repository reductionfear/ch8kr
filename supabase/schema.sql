-- Database schema for ch8kr card checking system
-- Replaces approved.txt and active_batches memory structures from Python bot

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Checks table: stores card check results
CREATE TABLE IF NOT EXISTS checks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Card information (stored securely)
  card_number_hash TEXT NOT NULL, -- Hashed card number for deduplication
  card_last4 TEXT NOT NULL,
  exp_month TEXT NOT NULL,
  exp_year TEXT NOT NULL,
  
  -- Gateway information
  gateway TEXT NOT NULL CHECK (gateway IN ('stripe', 'shopify')),
  
  -- Check result
  status TEXT NOT NULL CHECK (status IN ('approved', 'declined', 'error', 'processing')),
  response_code TEXT,
  response_message TEXT,
  
  -- Amount charged (in cents)
  amount_cents INTEGER,
  currency TEXT DEFAULT 'usd',
  
  -- Full response data (JSON)
  raw_response JSONB,
  
  -- Metadata
  site_url TEXT,
  proxy_used TEXT,
  processing_time_ms INTEGER,
  
  -- Indexes for efficient querying
  CONSTRAINT unique_card_check UNIQUE (card_number_hash, gateway, created_at)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_checks_created_at ON checks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_checks_status ON checks(status);
CREATE INDEX IF NOT EXISTS idx_checks_gateway ON checks(gateway);
CREATE INDEX IF NOT EXISTS idx_checks_card_last4 ON checks(card_last4);
CREATE INDEX IF NOT EXISTS idx_checks_card_hash ON checks(card_number_hash);

-- Active batches table: tracks batch processing status
CREATE TABLE IF NOT EXISTS batches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Batch metadata
  batch_name TEXT,
  total_cards INTEGER NOT NULL DEFAULT 0,
  processed_cards INTEGER NOT NULL DEFAULT 0,
  approved_cards INTEGER NOT NULL DEFAULT 0,
  declined_cards INTEGER NOT NULL DEFAULT 0,
  error_cards INTEGER NOT NULL DEFAULT 0,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed', 'cancelled')),
  
  -- Configuration
  gateway TEXT NOT NULL CHECK (gateway IN ('stripe', 'shopify')),
  site_url TEXT,
  
  -- Results
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for batches
CREATE INDEX IF NOT EXISTS idx_batches_status ON batches(status);
CREATE INDEX IF NOT EXISTS idx_batches_created_at ON batches(created_at DESC);

-- Batch checks junction table: links checks to batches
CREATE TABLE IF NOT EXISTS batch_checks (
  batch_id UUID REFERENCES batches(id) ON DELETE CASCADE,
  check_id UUID REFERENCES checks(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  PRIMARY KEY (batch_id, check_id)
);

-- Create index for efficient batch queries
CREATE INDEX IF NOT EXISTS idx_batch_checks_batch_id ON batch_checks(batch_id);
CREATE INDEX IF NOT EXISTS idx_batch_checks_check_id ON batch_checks(check_id);

-- Function to update batch statistics
CREATE OR REPLACE FUNCTION update_batch_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the batch statistics when a check is inserted or updated
  UPDATE batches
  SET 
    processed_cards = (
      SELECT COUNT(*) 
      FROM batch_checks bc 
      JOIN checks c ON bc.check_id = c.id 
      WHERE bc.batch_id = NEW.batch_id 
        AND c.status != 'processing'
    ),
    approved_cards = (
      SELECT COUNT(*) 
      FROM batch_checks bc 
      JOIN checks c ON bc.check_id = c.id 
      WHERE bc.batch_id = NEW.batch_id 
        AND c.status = 'approved'
    ),
    declined_cards = (
      SELECT COUNT(*) 
      FROM batch_checks bc 
      JOIN checks c ON bc.check_id = c.id 
      WHERE bc.batch_id = NEW.batch_id 
        AND c.status = 'declined'
    ),
    error_cards = (
      SELECT COUNT(*) 
      FROM batch_checks bc 
      JOIN checks c ON bc.check_id = c.id 
      WHERE bc.batch_id = NEW.batch_id 
        AND c.status = 'error'
    ),
    updated_at = NOW()
  WHERE id = NEW.batch_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update batch stats
CREATE TRIGGER trigger_update_batch_stats
AFTER INSERT OR UPDATE ON batch_checks
FOR EACH ROW
EXECUTE FUNCTION update_batch_stats();

-- Comments for documentation
COMMENT ON TABLE checks IS 'Stores card check results from various gateways';
COMMENT ON TABLE batches IS 'Tracks batch processing status and statistics';
COMMENT ON TABLE batch_checks IS 'Links checks to batches for batch processing tracking';
COMMENT ON COLUMN checks.card_number_hash IS 'SHA-256 hash of card number for deduplication without storing full PAN';
COMMENT ON COLUMN checks.raw_response IS 'Full JSON response from the gateway for debugging';
