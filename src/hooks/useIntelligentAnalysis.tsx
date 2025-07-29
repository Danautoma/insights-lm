import { useState } from 'react';
import { useNotebooks } from './useNotebooks';

export function useIntelligentAnalysis() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { notebooks } = useNotebooks();

  const startAnalysis = async (notebookId: string) => {
    setIsAnalyzing(true);
    setError(null);

    try {
      console.log('Iniciando análise inteligente para o notebook:', notebookId);
      
      const response = await fetch('https://webhooks.arrematanteai.com/webhook/daccab28-77fb-46af-9465-2231cf82bd66', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notebook_id: notebookId
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Erro na análise inteligente:', {
          status: response.status,
          statusText: response.statusText,
          errorText: errorText
        });
        throw new Error(`Erro HTTP ${response.status}: ${response.statusText}`);
      }

      const responseText = await response.text();
      console.log('Análise inteligente iniciada com sucesso:', responseText);
      
      return { success: true, message: responseText };
    } catch (error: any) {
      console.error('Falha ao iniciar análise inteligente:', error);
      setError(error.message);
      throw error;
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getNotebookStatus = (notebookId: string) => {
    const notebook = notebooks?.find(n => n.id === notebookId);
    if (!notebook) return { canAnalyze: false, statusText: 'Dossiê não encontrado' };

    const sourcesUploaded = notebook.sources_uploaded || 0;
    const sourcesProcessed = notebook.sources_processed || 0;

    console.log('Status do notebook:', {
      notebookId,
      sourcesUploaded,
      sourcesProcessed
    });

    if (sourcesUploaded === 0) {
      return {
        canAnalyze: false,
        statusText: 'Nenhum Documento para Análise'
      };
    }

    if (sourcesProcessed < sourcesUploaded) {
      return {
        canAnalyze: false,
        statusText: `Processando documentos... (${sourcesProcessed} de ${sourcesUploaded})`
      };
    }

    if (sourcesProcessed === sourcesUploaded && sourcesUploaded > 0) {
      return {
        canAnalyze: true,
        statusText: `${sourcesProcessed} documentos prontos para análise`
      };
    }

    return {
      canAnalyze: false,
      statusText: 'Status indeterminado'
    };
  };

  return {
    startAnalysis,
    getNotebookStatus,
    isAnalyzing,
    error
  };
}
