
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export const useNotebookDelete = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  const deleteNotebook = useMutation({
    mutationFn: async (notebookId: string) => {
      console.log('Starting notebook deletion process for:', notebookId);
      
      try {
        // First, get the notebook details for better error reporting
        const { data: notebook, error: fetchError } = await supabase
          .from('notebooks')
          .select('id, title')
          .eq('id', notebookId)
          .single();

        if (fetchError) {
          console.error('Error fetching notebook:', fetchError);
          throw new Error('Failed to find notebook');
        }

        console.log('Found notebook to delete:', notebook.title);

        // Get all sources for this notebook to delete their files
        const { data: sources, error: sourcesError } = await supabase
          .from('sources')
          .select('id, title, file_path, type')
          .eq('notebook_id', notebookId);

        if (sourcesError) {
          console.error('Error fetching sources for notebook:', sourcesError);
          throw new Error('Failed to fetch sources for cleanup');
        }

        console.log(`Found ${sources?.length || 0} sources to clean up`);

        // Note: Files are now stored in Backblaze B2, not Supabase Storage
        // For now, we only delete the database records. File cleanup in Backblaze
        // can be handled separately if needed (e.g., via lifecycle policies)
        const filesInBackblaze = sources?.filter(source => source.file_path) || [];
        
        if (filesInBackblaze.length > 0) {
          console.log(`Found ${filesInBackblaze.length} files stored in Backblaze B2`);
          console.log('Database records will be deleted, file cleanup handled separately');
        } else {
          console.log('No files to track (URL-based sources or text content)');
        }

        // Delete the notebook - this will cascade delete all sources
        const { error: deleteError } = await supabase
          .from('notebooks')
          .delete()
          .eq('id', notebookId);

        if (deleteError) {
          console.error('Error deleting notebook:', deleteError);
          throw deleteError;
        }
        
        console.log('Notebook deleted successfully with cascade deletion');
        return notebook;
      } catch (error) {
        console.error('Error in deletion process:', error);
        throw error;
      }
    },
    onSuccess: (deletedNotebook, notebookId) => {
      console.log('Delete mutation success, invalidating queries');
      
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ['notebooks', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['sources', notebookId] });
      queryClient.invalidateQueries({ queryKey: ['notebook', notebookId] });
      
      toast({
        title: "Notebook deleted",
        description: `"${deletedNotebook?.title || 'Notebook'}" and all its sources have been successfully deleted.`,
      });
    },
    onError: (error: any) => {
      console.error('Delete mutation error:', error);
      
      let errorMessage = "Failed to delete the notebook. Please try again.";
      
      // Provide more specific error messages based on the error type
      if (error?.code === 'PGRST116') {
        errorMessage = "Notebook not found or you don't have permission to delete it.";
      } else if (error?.message?.includes('foreign key')) {
        errorMessage = "Cannot delete notebook due to data dependencies. Please contact support.";
      } else if (error?.message?.includes('network')) {
        errorMessage = "Network error. Please check your connection and try again.";
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  return {
    deleteNotebook: deleteNotebook.mutate,
    isDeleting: deleteNotebook.isPending,
  };
};
