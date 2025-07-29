
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

export const useNotebookGeneration = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Hook simplificado - a chamada para generate-notebook-content foi removida
  // A geração do conteúdo agora é feita pelo workflow customizado no n8n
  const generateNotebookContent = {
    mutate: () => {
      console.log('Hook de geração de notebook simplificado - geração via n8n workflow');
    },
    mutateAsync: async () => {
      console.log('Hook de geração de notebook simplificado - geração via n8n workflow');
      return Promise.resolve();
    },
    isPending: false,
  };

  return {
    generateNotebookContent: generateNotebookContent.mutate,
    generateNotebookContentAsync: generateNotebookContent.mutateAsync,
    isGenerating: generateNotebookContent.isPending,
  };
};
