import { useToast } from '@/hooks/use-toast';

export const useDocumentProcessing = () => {
  const { toast } = useToast();

  // Hook simplificado - a chamada para process-document foi removida
  // O processamento agora é iniciado pelo webhook do Make.com
  const processDocument = {
    mutateAsync: async () => {
      console.log('Hook de processamento de documento simplificado - processamento via webhook');
      return Promise.resolve();
    },
    mutate: () => {
      console.log('Hook de processamento de documento simplificado - processamento via webhook');
    },
    isPending: false,
  };

  return {
    processDocumentAsync: processDocument.mutateAsync,
    processDocument: processDocument.mutate,
    isProcessing: processDocument.isPending,
  };
};
