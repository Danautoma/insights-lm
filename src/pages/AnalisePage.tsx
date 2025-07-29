import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAnalysisResults } from '@/hooks/useAnalysisResults';
import { useNotebooks } from '@/hooks/useNotebooks';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Loader2, ArrowLeft, FileText, Clock, Bot } from 'lucide-react';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import AnalysisChat from '@/components/chat/AnalysisChat';

const AnalisePage = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const { analysisResults, isLoading, error } = useAnalysisResults(id);
  const { notebooks } = useNotebooks();

  const notebook = notebooks?.find(n => n.id === id);

  // Debug log para verificar o estado das variáveis
  console.log('Debug do Status da Análise:', { 
    isLoading, 
    error, 
    analysisResults, 
    analysisResultsLength: analysisResults?.length,
    id 
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <DashboardHeader userEmail={user?.email} />
        <main className="max-w-7xl mx-auto px-6 py-8">
          <div className="mb-4">
            <Link to={`/dossie/${id}`}>
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar ao Dossiê
              </Button>
            </Link>
          </div>
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
              <h2 className="text-xl font-medium text-gray-900 mb-2">Analisando...</h2>
              <p className="text-gray-600">Carregando os resultados da análise do dossiê</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <DashboardHeader userEmail={user?.email} />
        <main className="max-w-7xl mx-auto px-6 py-8">
          <div className="mb-4">
            <Link to={`/dossie/${id}`}>
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar ao Dossiê
              </Button>
            </Link>
          </div>
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <FileText className="h-8 w-8 mx-auto mb-4 text-gray-400" />
              <h2 className="text-xl font-medium text-gray-900 mb-2">Erro ao carregar análise</h2>
              <p className="text-gray-600">Não foi possível carregar os resultados da análise</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader userEmail={user?.email} />
      
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-4">
          <Link to={`/dossie/${id}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar ao Dossiê
            </Button>
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Análise do Dossiê
          </h1>
          <p className="text-gray-600">
            {notebook?.title || 'Dossiê Sem Título'}
          </p>
        </div>

        {analysisResults.length === 0 ? (
          <div className="text-center py-12">
            <div className="flex justify-center mb-4">
              <div className="relative">
                <Bot className="h-12 w-12 text-blue-500" />
                <Clock className="h-6 w-6 text-blue-400 absolute -bottom-1 -right-1 animate-pulse" />
              </div>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Sua análise está sendo processada
            </h3>
            <p className="text-gray-600 mb-4">
              Nossos robôs estão trabalhando nos seus documentos.
            </p>
            <p className="text-sm text-gray-500">
              Esta página será atualizada automaticamente em breve.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            <Accordion type="single" collapsible className="space-y-4">
              {analysisResults.map((result) => (
                <AccordionItem 
                  key={result.id} 
                  value={result.id}
                  className="border border-gray-200 rounded-lg bg-white"
                >
                  <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-gray-50">
                    <div className="flex items-center justify-between w-full">
                      <h3 className="text-left font-medium text-gray-900">
                        {result.analysis_checklist?.topic_title || `Análise #${result.id.toString().slice(0, 8)}`}
                      </h3>
                      {result.confidence_score && (
                        <span className="text-sm text-gray-500 mr-4">
                          Confiança: {Math.round(result.confidence_score * 100)}%
                        </span>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-6 pb-4">
                    <div className="prose prose-gray max-w-none">
                      <p className="text-gray-700 leading-relaxed">
                        {result.summary}
                      </p>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>

            {/* Chat Component */}
            {id && (
              <div className="mt-8">
                <AnalysisChat notebookId={id} />
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default AnalisePage;
