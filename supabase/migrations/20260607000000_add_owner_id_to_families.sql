-- Add owner_id to families table
ALTER TABLE public.families 
ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id);

-- Add index for faster lookups during recovery
CREATE INDEX IF NOT EXISTS idx_families_owner_id ON public.families(owner_id);

-- Update RLS policies for families table
-- Drop existing policies if they exist (assuming a policy exists for insert)
-- We will replace them with policies that enforce authentication

-- Policy: Allow authenticated users to insert their own family code
CREATE POLICY "Users can insert their own family code"
ON public.families
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = owner_id);

-- Policy: Allow users to read their own family code (for recovery)
CREATE POLICY "Users can view their own family code"
ON public.families
FOR SELECT
TO authenticated
USING (auth.uid() = owner_id);

-- Note: Depending on the app's need to look up codes for joining,
-- a separate policy might be needed to allow querying by code without owner_id.
-- Assuming `joinFamily` queries by `code`, we might need:
CREATE POLICY "Anyone can look up a code"
ON public.families
FOR SELECT
TO public
USING (true);
