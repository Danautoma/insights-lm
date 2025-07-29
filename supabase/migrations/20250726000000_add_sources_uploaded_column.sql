-- Add sources_uploaded column to notebooks table
ALTER TABLE public.notebooks 
ADD COLUMN IF NOT EXISTS sources_uploaded integer DEFAULT 0;

-- Create function to increment sources_uploaded counter
CREATE OR REPLACE FUNCTION public.increment_sources_uploaded(notebook_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.notebooks 
    SET sources_uploaded = COALESCE(sources_uploaded, 0) + 1,
        updated_at = timezone('utc'::text, now())
    WHERE id = notebook_id_param 
    AND user_id = auth.uid();
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.increment_sources_uploaded(uuid) TO authenticated;
