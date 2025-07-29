import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// A interface do resultado atualizada para incluir o JOIN com analysis_checklist
export interface AnalysisResult {
  id: string;
  process_id: string;
  checklist_id: string;
  summary: string;
  confidence_score: number | null;
  created_at: string;
  updated_at: string;
  analysis_checklist?: {
    id: string;
    topic_title: string;
    description: string;
  };
}

// O hook com a lógica CORRIGIDA
export const useAnalysisResults = (notebookId?: string) => {
  const { user } = useAuth();

  const {
    data: analysisResults = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['analysis-results', notebookId],
    queryFn: async () => {
      // Só executa se tivermos o ID do dossiê e o usuário
      if (!notebookId || !user) return [];

      // --- AQUI ESTÁ A GRANDE MUDANÇA ---
      // Chamando nossa Edge Function em vez da tabela diretamente
      const { data, error } = await supabase.functions.invoke('get-analysis-results', {
        body: { notebookId: notebookId },
      });

      if (error) {
        console.error('Edge Function error:', error);
        throw new Error(error.message || 'Erro ao buscar resultados da análise');
      }

      // A função retorna um objeto { results: [...] }, então pegamos de dentro
      return data.results as AnalysisResult[];
    },
    // O resto da lógica continua igual
    enabled: !!notebookId && !!user,
    refetchInterval: (query) => {
      const data = query.state.data;
      // A condição de polling precisa checar o erro para não ficar em loop
      const shouldPoll = data && data.length === 0 && !query.state.error;
      return shouldPoll ? 20000 : false;
    },
    refetchIntervalInBackground: true,
  });

  return {
    analysisResults,
    isLoading,
    error,
  };
};
