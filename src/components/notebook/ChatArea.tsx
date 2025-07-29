import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Upload, FileText, Loader2, RefreshCw } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Link } from 'react-router-dom';
import { useChatMessages } from '@/hooks/useChatMessages';
import { useSources } from '@/hooks/useSources';
import { useFileUpload } from '@/hooks/useFileUpload';
import { useDocumentProcessing } from '@/hooks/useDocumentProcessing';
import { useNotebookGeneration } from '@/hooks/useNotebookGeneration';
import { useProfile } from '@/hooks/useProfile';
import { useToast } from '@/hooks/use-toast';
import MarkdownRenderer from '@/components/chat/MarkdownRenderer';
import SaveToNoteButton from './SaveToNoteButton';
import { Citation } from '@/types/message';

interface ChatAreaProps {
  hasSource: boolean;
  notebookId?: string;
  notebook?: {
    id: string;
    title: string;
    description?: string;
    generation_status?: string;
    icon?: string;
    example_questions?: string[];
  } | null;
  onCitationClick?: (citation: Citation) => void;
}

const ChatArea = ({
  hasSource,
  notebookId,
  notebook,
  onCitationClick
}: ChatAreaProps) => {
  const [message, setMessage] = useState('');
  const [pendingUserMessage, setPendingUserMessage] = useState<string | null>(null);
  const [showAiLoading, setShowAiLoading] = useState(false);
  const [clickedQuestions, setClickedQuestions] = useState<Set<string>>(new Set());
  const [isUploading, setIsUploading] = useState(false);
  
  const isGenerating = notebook?.generation_status === 'generating';
  
  const {
    messages,
    sendMessage,
    isSending,
    deleteChatHistory,
    isDeletingChatHistory
  } = useChatMessages(notebookId);
  
  const {
    sources,
    addSourceAsync,
    updateSource
  } = useSources(notebookId);

  const {
    uploadFile
  } = useFileUpload();

  const {
    processDocumentAsync
  } = useDocumentProcessing();

  // Removido 'generateNotebookContentAsync' pois será chamado a partir do useSources
  
  const { toast } = useToast();
  
  const { profile, loading: profileLoading } = useProfile();
  
  const sourceCount = sources?.length || 0;
  
  const hasCredits = profile?.credits && profile.credits > 0;
  const isUploadDisabled = !hasCredits || isUploading || profileLoading;

  const hasProcessedSource = sources?.some(source => source.processing_status === 'completed') || false;

  const isChatDisabled = !hasProcessedSource;

  const [lastMessageCount, setLastMessageCount] = useState(0);

  const latestMessageRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const processoInputRef = useRef<HTMLInputElement>(null);
  const editalInputRef = useRef<HTMLInputElement>(null);
  const matriculaInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (file: File, documentType: 'processo' | 'edital' | 'matricula') => {
    if (!notebookId) {
      toast({
        title: "Erro",
        description: "Nenhum dossiê selecionado",
        variant: "destructive"
      });
      return;
    }

    if (!hasCredits) {
      toast({
        title: "Créditos Insuficientes",
        description: "Você não possui créditos suficientes para fazer upload de documentos.",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    let createdSourceId: string | null = null;

    try {
      const sourceData = {
        notebookId,
        title: `${documentType === 'processo' ? 'Processo Judicial' : documentType === 'edital' ? 'Edital do Leilão' : 'Matrícula do Imóvel'}: ${file.name}`,
        type: 'pdf' as 'pdf',
        file_size: file.size,
        processing_status: 'uploading',
        metadata: {
          fileName: file.name,
          fileType: file.type,
          documentType: documentType
        }
      };

      const createdSource = await addSourceAsync(sourceData);
      createdSourceId = createdSource.id;

      const filePath = await uploadFile(file, notebookId, createdSource.id, documentType);
      if (!filePath) {
        throw new Error('Upload do arquivo falhou');
      }

      updateSource({
        sourceId: createdSource.id,
        updates: {
          file_path: filePath,
          processing_status: 'processing'
        }
      });

      // O processamento agora é iniciado pelo webhook do Make.com
      // Apenas registramos que o upload foi concluído
      await processDocumentAsync();

      toast({
        title: "Sucesso",
        description: `${documentType === 'processo' ? 'Processo judicial' : documentType === 'edital' ? 'Edital do leilão' : 'Matrícula do imóvel'} enviado. A análise foi iniciada.`
      });

    } catch (error: any) {
      console.error('Falha no fluxo de upload:', error);
      
      if (createdSourceId) {
        updateSource({
          sourceId: createdSourceId,
          updates: {
            processing_status: 'failed'
          }
        });
      }

      toast({
        title: "Erro",
        description: error.message || "Falha no upload ou processamento do arquivo.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  // O resto do seu componente permanece igual...
  // Handle file input changes
  const handleProcessoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file, 'processo');
    }
    if (processoInputRef.current) {
      processoInputRef.current.value = '';
    }
  };

  const handleEditalFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file, 'edital');
    }
    if (editalInputRef.current) {
      editalInputRef.current.value = '';
    }
  };

  const handleMatriculaFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file, 'matricula');
    }
    if (matriculaInputRef.current) {
      matriculaInputRef.current.value = '';
    }
  };

  // Button click handlers
  const handleProcessoClick = () => {
    processoInputRef.current?.click();
  };

  const handleEditalClick = () => {
    editalInputRef.current?.click();
  };

  const handleMatriculaClick = () => {
    matriculaInputRef.current?.click();
  };
  useEffect(() => {
    if (messages.length > lastMessageCount && pendingUserMessage) {
      setPendingUserMessage(null);
      setShowAiLoading(false);
    }
    setLastMessageCount(messages.length);
  }, [messages.length, lastMessageCount, pendingUserMessage]);

  useEffect(() => {
    if (latestMessageRef.current && scrollAreaRef.current) {
      const viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (viewport) {
        setTimeout(() => {
          latestMessageRef.current?.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
        }, 50);
      }
    }
  }, [pendingUserMessage, messages.length, showAiLoading]);
  const handleSendMessage = async (messageText?: string) => {
    const textToSend = messageText || message.trim();
    if (textToSend && notebookId) {
      try {
        setPendingUserMessage(textToSend);
        await sendMessage({
          notebookId: notebookId,
          role: 'user',
          content: textToSend
        });
        setMessage('');
        setShowAiLoading(true);
      } catch (error) {
        console.error('Failed to send message:', error);
        setPendingUserMessage(null);
        setShowAiLoading(false);
      }
    }
  };
  const handleRefreshChat = () => {
    if (notebookId) {
      console.log('Refresh button clicked for notebook:', notebookId);
      deleteChatHistory(notebookId);
      setClickedQuestions(new Set());
    }
  };
  const handleCitationClick = (citation: Citation) => {
    onCitationClick?.(citation);
  };
  const handleExampleQuestionClick = (question: string) => {
    setClickedQuestions(prev => new Set(prev).add(question));
    setMessage(question);
    handleSendMessage(question);
  };

  const isUserMessage = (msg: any) => {
    const messageType = msg.message?.type || msg.message?.role;
    return messageType === 'human' || messageType === 'user';
  };

  const isAiMessage = (msg: any) => {
    const messageType = msg.message?.type || msg.message?.role;
    return messageType === 'ai' || messageType === 'assistant';
  };

  const shouldShowScrollTarget = () => {
    return messages.length > 0 || pendingUserMessage || showAiLoading;
  };

  const shouldShowRefreshButton = messages.length > 0;

  const exampleQuestions = notebook?.example_questions?.filter(q => !clickedQuestions.has(q)) || [];

  const getPlaceholderText = () => {
    if (isChatDisabled) {
      if (sourceCount === 0) {
        return "Faça o upload de um documento para começar...";
      } else {
        return "Aguarde enquanto seus documentos são processados...";
      }
    }
    return "Comece a digitar...";
  };
  return <div className="flex-1 flex flex-col h-full overflow-hidden">
      {hasSource ? <div className="flex-1 flex flex-col h-full overflow-hidden">
          <div className="p-4 border-b border-gray-200 flex-shrink-0">
            <div className="max-w-4xl mx-auto flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900">Chat</h2>
              {shouldShowRefreshButton && <Button variant="ghost" size="sm" onClick={handleRefreshChat} disabled={isDeletingChatHistory || isChatDisabled} className="flex items-center space-x-2">
                  <RefreshCw className={`h-4 w-4 ${isDeletingChatHistory ? 'animate-spin' : ''}`} />
                  <span>{isDeletingChatHistory ? 'Limpando...' : 'Limpar Chat'}</span>
                </Button>}
            </div>
          </div>

          <ScrollArea className="flex-1 h-full" ref={scrollAreaRef}>
            <div className="p-8 border-b border-gray-200">
              <div className="max-w-4xl mx-auto">
                <div className="flex items-center space-x-4 mb-6">
                  <div className="w-10 h-10 flex items-center justify-center bg-transparent">
                    {isGenerating ? <Loader2 className="text-black font-normal w-10 h-10 animate-spin" /> : <span className="text-[40px] leading-none">{notebook?.icon || '☕'}</span>}
                  </div>
                  <div>
                    <h1 className="text-2xl font-medium text-gray-900">
                      {isGenerating ? 'Gerando conteúdo...' : notebook?.title || 'Dossiê sem título'}
                    </h1>
                    <p className="text-sm text-gray-600">{sourceCount} documento{sourceCount !== 1 ? 's' : ''}</p>
                  </div>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-6 mb-6">
                  {isGenerating ? <div className="flex items-center space-x-2 text-gray-600">
                      
                      <p>A IA está analisando seu documento e gerando um título e uma descrição...</p>
                    </div> : <MarkdownRenderer content={notebook?.description || 'Nenhuma descrição disponível para este dossiê.'} className="prose prose-gray max-w-none text-gray-700 leading-relaxed" />}
                </div>

                {(messages.length > 0 || pendingUserMessage || showAiLoading) && <div className="mb-6 space-y-4">
                    {messages.map((msg) => <div key={msg.id} className={`flex ${isUserMessage(msg) ? 'justify-end' : 'justify-start'}`}>
                        <div className={`${isUserMessage(msg) ? 'max-w-xs lg:max-w-md px-4 py-2 bg-blue-500 text-white rounded-lg' : 'w-full'}`}>
                          <div className={isUserMessage(msg) ? '' : 'prose prose-gray max-w-none text-gray-800'}>
                            <MarkdownRenderer content={msg.message.content} className={isUserMessage(msg) ? '' : ''} onCitationClick={handleCitationClick} isUserMessage={isUserMessage(msg)} />
                          </div>
                          {isAiMessage(msg) && <div className="mt-2 flex justify-start">
                              <SaveToNoteButton content={msg.message.content} notebookId={notebookId} />
                            </div>}
                        </div>
                      </div>)}
                    
                    {pendingUserMessage && <div className="flex justify-end">
                        <div className="max-w-xs lg:max-w-md px-4 py-2 bg-blue-500 text-white rounded-lg">
                          <MarkdownRenderer content={pendingUserMessage} className="" isUserMessage={true} />
                        </div>
                      </div>}
                    
                    {showAiLoading && <div className="flex justify-start" ref={latestMessageRef}>
                        <div className="flex items-center space-x-2 px-4 py-3 bg-gray-100 rounded-lg">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{
                      animationDelay: '0.1s'
                    }}></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{
                      animationDelay: '0.2s'
                    }}></div>
                        </div>
                      </div>}
                    
                    {!showAiLoading && shouldShowScrollTarget() && <div ref={latestMessageRef} />}
                  </div>}
              </div>
            </div>
          </ScrollArea>

          <div className="p-6 border-t border-gray-200 flex-shrink-0">
            <div className="max-w-4xl mx-auto">
              <div className="flex space-x-4">
                <div className="flex-1 relative">
                  <Input placeholder={getPlaceholderText()} value={message} onChange={e => setMessage(e.target.value)} onKeyDown={e => e.key === 'Enter' && !isChatDisabled && !isSending && !pendingUserMessage && handleSendMessage()} className="pr-12" disabled={isChatDisabled || isSending || !!pendingUserMessage} />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-gray-500">
                    {sourceCount} documento{sourceCount !== 1 ? 's' : ''}
                  </div>
                </div>
                <Button onClick={() => handleSendMessage()} disabled={!message.trim() || isChatDisabled || isSending || !!pendingUserMessage}>
                  {isSending || pendingUserMessage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
              
              {!isChatDisabled && !pendingUserMessage && !showAiLoading && exampleQuestions.length > 0 && <div className="mt-4">
                  <Carousel className="w-full max-w-4xl">
                    <CarouselContent className="-ml-2 md:-ml-4">
                      {exampleQuestions.map((question, index) => <CarouselItem key={index} className="pl-2 md:pl-4 basis-auto">
                          <Button variant="outline" size="sm" className="text-left whitespace-nowrap h-auto py-2 px-3 text-sm" onClick={() => handleExampleQuestionClick(question)}>
                            {question}
                          </Button>
                        </CarouselItem>)}
                    </CarouselContent>
                    {exampleQuestions.length > 2 && <>
                        <CarouselPrevious className="left-0" />
                        <CarouselNext className="right-0" />
                      </>}
                  </Carousel>
                </div>}
            </div>
          </div>
        </div> :
    <ScrollArea className="flex-1 h-full">
        <div className="p-8 max-w-4xl mx-auto space-y-6">
          {!hasCredits && !profileLoading && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
              <div className="text-center">
                <div className="flex justify-center mb-4">
                  <svg className="h-8 w-8 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-yellow-800 mb-2">
                  Créditos Insuficientes
                </h3>
                <p className="text-yellow-700 mb-4">
                  Você não possui créditos suficientes para iniciar uma nova análise.
                </p>
                <Link to="/creditos">
                  <Button className="bg-yellow-600 hover:bg-yellow-700 text-white">
                    Adquirir Mais Créditos
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {profile && (
            <div className="text-center mb-4">
              <p className="text-sm text-gray-600">
                Créditos disponíveis: <span className="font-medium">{profile.credits}</span>
              </p>
            </div>
          )}

          <div className="bg-white border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-primary transition-colors">
            <div className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center bg-gray-100">
              <FileText className="h-6 w-6 text-gray-600" />
            </div>
            <h3 className="text-xl font-medium text-gray-900 mb-3">1. Processo Judicial</h3>
            <p className="text-gray-600 mb-6">Faça upload do processo judicial relacionado ao imóvel</p>
            <Button onClick={handleProcessoClick} size="lg" disabled={isUploadDisabled}>
              {isUploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
              {isUploading ? 'Enviando...' : 'Enviar Processo'}
            </Button>
          </div>

          <div className="bg-white border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-primary transition-colors">
            <div className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center bg-gray-100">
              <FileText className="h-6 w-6 text-gray-600" />
            </div>
            <h3 className="text-xl font-medium text-gray-900 mb-3">2. Edital do Leilão</h3>
            <p className="text-gray-600 mb-6">Faça upload do edital do leilão do imóvel</p>
            <Button onClick={handleEditalClick} size="lg" disabled={isUploadDisabled}>
              {isUploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
              {isUploading ? 'Enviando...' : 'Enviar Edital'}
            </Button>
          </div>

          <div className="bg-white border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-primary transition-colors">
            <div className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center bg-gray-100">
              <FileText className="h-6 w-6 text-gray-600" />
            </div>
            <h3 className="text-xl font-medium text-gray-900 mb-3">3. Matrícula do Imóvel</h3>
            <p className="text-gray-600 mb-6">Faça upload da matrícula atualizada do imóvel</p>
            <Button onClick={handleMatriculaClick} size="lg" disabled={isUploadDisabled}>
              {isUploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
              {isUploading ? 'Enviando...' : 'Enviar Matrícula'}
            </Button>
          </div>
        </div>
      </ScrollArea>}
      
      <input
        ref={processoInputRef}
        type="file"
        accept=".pdf,.txt,.md"
        onChange={handleProcessoFileChange}
        className="hidden"
      />
      <input
        ref={editalInputRef}
        type="file"
        accept=".pdf,.txt,.md"
        onChange={handleEditalFileChange}
        className="hidden"
      />
      <input
        ref={matriculaInputRef}
        type="file"
        accept=".pdf,.txt,.md"
        onChange={handleMatriculaFileChange}
        className="hidden"
      />
    </div>;
};

export default ChatArea;
