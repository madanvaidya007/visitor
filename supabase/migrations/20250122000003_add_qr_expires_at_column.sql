-- Add qr_expires_at column to visit_requests table
-- This column is needed for the enhanced QR code system with expiration tracking

ALTER TABLE public.visit_requests 
ADD COLUMN qr_expires_at TIMESTAMP WITH TIME ZONE;

-- Add index for efficient expiration queries
CREATE INDEX idx_visit_requests_qr_expires_at ON public.visit_requests(qr_expires_at);

-- Update existing records to set expiration time (24 hours from creation)
UPDATE public.visit_requests 
SET qr_expires_at = created_at + INTERVAL '24 hours'
WHERE qr_code IS NOT NULL AND qr_expires_at IS NULL;

-- Create function to automatically set QR expiration when QR code is generated
CREATE OR REPLACE FUNCTION public.set_qr_expiration()
RETURNS TRIGGER AS $$
BEGIN
  -- If qr_code is being set and qr_expires_at is not set, set expiration to 24 hours from now
  IF NEW.qr_code IS NOT NULL AND NEW.qr_code != OLD.qr_code AND NEW.qr_expires_at IS NULL THEN
    NEW.qr_expires_at = now() + INTERVAL '24 hours';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically set QR expiration
CREATE TRIGGER set_qr_expiration_trigger
  BEFORE UPDATE ON public.visit_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.set_qr_expiration();

-- Also handle INSERT case
CREATE OR REPLACE FUNCTION public.set_qr_expiration_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- If qr_code is being set and qr_expires_at is not set, set expiration to 24 hours from now
  IF NEW.qr_code IS NOT NULL AND NEW.qr_expires_at IS NULL THEN
    NEW.qr_expires_at = now() + INTERVAL '24 hours';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_qr_expiration_insert_trigger
  BEFORE INSERT ON public.visit_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.set_qr_expiration_on_insert();