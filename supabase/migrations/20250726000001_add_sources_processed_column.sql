-- Add sources_processed column to notebooks table
ALTER TABLE public.notebooks 
ADD COLUMN IF NOT EXISTS sources_processed integer DEFAULT 0;

-- Create function to increment sources_processed counter
CREATE OR REPLACE FUNCTION public.increment_sources_processed(notebook_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.notebooks 
    SET sources_processed = COALESCE(sources_processed, 0) + 1,
        updated_at = timezone('utc'::text, now())
    WHERE id = notebook_id_param 
    AND user_id = auth.uid();
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.increment_sources_processed(uuid) TO authenticated;
