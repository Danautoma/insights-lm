-- Add credits column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS credits integer DEFAULT 10 NOT NULL;

-- Add index for credits column
CREATE INDEX IF NOT EXISTS idx_profiles_credits ON public.profiles(credits);

-- Update existing users to have 10 credits
UPDATE public.profiles SET credits = 10 WHERE credits IS NULL;

-- Add user_id and document_type columns to sources table
ALTER TABLE public.sources 
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS document_type text;

-- Add indexes for new columns
CREATE INDEX IF NOT EXISTS idx_sources_user_id ON public.sources(user_id);
CREATE INDEX IF NOT EXISTS idx_sources_document_type ON public.sources(document_type);

-- Update existing sources to have user_id from their notebook
UPDATE public.sources 
SET user_id = notebooks.user_id 
FROM public.notebooks 
WHERE sources.notebook_id = notebooks.id 
AND sources.user_id IS NULL;
