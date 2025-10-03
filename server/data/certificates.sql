-- Certificates schema
-- Creates a certificate_status enum and a certificates table suitable for Supabase/Postgres.
-- Includes timestamps and status-specific timestamps to track the lifecycle.

-- Ensure pgcrypto is available for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Status enum reflecting the workflow
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'certificate_status') THEN
    CREATE TYPE certificate_status AS ENUM (
      'requested',
      'pending_approval',
      'approved',
      'printing',
      'ready_for_collection',
      'delivered',
      'cancelled'
    );
  END IF;
END $$;

-- Main certificates table
CREATE TABLE IF NOT EXISTS certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Optional relations to other domain entities. Keep nullable to avoid hard FK constraints.
  student_id uuid NULL,
  batch_id uuid NULL,
  course_id uuid NULL,
  -- Human readable type/name of certificate (e.g. "Completion", "Transcript")
  certificate_type text NULL,
  requester_name text NULL,
  requester_email text NULL,
  requested_at timestamptz NOT NULL DEFAULT now(),
  status certificate_status NOT NULL DEFAULT 'requested',
  -- Status timestamps / audit
  approved_by uuid NULL,
  approved_at timestamptz NULL,
  printing_started_at timestamptz NULL,
  ready_at timestamptz NULL,
  delivered_at timestamptz NULL,
  cancelled_at timestamptz NULL,
  -- Arbitrary notes and metadata
  notes text NULL,
  metadata jsonb NULL DEFAULT '{}'::jsonb,
  status_history jsonb NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_certificates_status ON certificates (status);
CREATE INDEX IF NOT EXISTS idx_certificates_student_id ON certificates (student_id);
CREATE INDEX IF NOT EXISTS idx_certificates_requested_at ON certificates (requested_at DESC);

-- Trigger to keep updated_at current on modification
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trigger_update_updated_at ON certificates;
CREATE TRIGGER trigger_update_updated_at
BEFORE UPDATE ON certificates
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();
