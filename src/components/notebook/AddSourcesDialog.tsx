import React, { useState, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Upload, FileText, Link, Copy, Check } from 'lucide-react';
import MultipleWebsiteUrlsDialog from './MultipleWebsiteUrlsDialog';
import CopiedTextDialog from './CopiedTextDialog';
import { useSources } from '@/hooks/useSources';
import { useFileUpload } from '@/hooks/useFileUpload';
import { useDocumentProcessing } from '@/hooks/useDocumentProcessing';
import { useNotebookGeneration } from '@/hooks/useNotebookGeneration';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface AddSourcesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notebookId?: string;
}

const AddSourcesDialog = ({
  open,
  onOpenChange,
  notebookId
}: AddSourcesDialogProps) => {
  const [dragActive, setDragActive] = useState(false);
  const [showCopiedTextDialog, setShowCopiedTextDialog] = useState(false);
  const [showMultipleWebsiteDialog, setShowMultipleWebsiteDialog] = useState(false);
  const [isLocallyProcessing, setIsLocallyProcessing] = useState(false);

  const {
    sources,
    addSourceAsync,
    updateSource,
    isAdding
  } = useSources(notebookId);

  const {
    uploadFile,
    uploading: isUploading
  } = useFileUpload();

  const {
    processDocumentAsync,
    isProcessing
  } = useDocumentProcessing();

  const {
    generateNotebookContentAsync,
    isGenerating
  } = useNotebookGeneration();

  const {
    toast
  } = useToast();

  // Reset local processing state when dialog opens
  useEffect(() => {
    if (open) {
      setIsLocallyProcessing(false);
    }
  }, [open]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const files = Array.from(e.dataTransfer.files);
      handleFileUpload(files);
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const files = Array.from(e.target.files);
      handleFileUpload(files);
    }
  }, []);

  const processFileAsync = async (file: File, sourceId: string, notebookId: string, documentType?: string) => {
    try {
      console.log('Starting file processing for:', file.name, 'source:', sourceId, 'notebook:', notebookId);
      const fileType = file.type.includes('pdf') ? 'pdf' : file.type.includes('audio') ? 'audio' : 'text';

      // Update status to uploading
      updateSource({
        sourceId,
        updates: {
          processing_status: 'uploading'
        }
      });

      // Upload the file
      console.log('Calling uploadFile with params:', { fileName: file.name, notebookId, sourceId, documentType });
      const filePath = await uploadFile(file, notebookId, sourceId, documentType);
      if (!filePath) {
        throw new Error('File upload failed - no file path returned');
      }
      console.log('File uploaded successfully:', filePath);

      // Manually increment sources_uploaded counter after successful upload
      try {
        console.log('Incrementing sources_uploaded counter for notebook:', notebookId);
        
        // 1. Buscar o valor atual da coluna sources_uploaded
        const { data: currentNotebook, error: fetchError } = await supabase
          .from('notebooks')
          .select('sources_uploaded')
          .eq('id', notebookId)
          .single();
        
        if (fetchError) {
          console.error('Erro ao buscar notebook atual:', fetchError);
          throw fetchError;
        }
        
        // 2. Somar +1 ao valor atual
        const currentCount = currentNotebook?.sources_uploaded || 0;
        const newCount = currentCount + 1;
        
        console.log('Atualizando contador:', { currentCount, newCount });
        
        // 3. Executar update na tabela notebooks
        const { error: updateError } = await supabase
          .from('notebooks')
          .update({ sources_uploaded: newCount })
          .eq('id', notebookId);
        
        if (updateError) {
          console.error('Erro ao atualizar contador de arquivos:', updateError);
          throw updateError;
        }
        
        console.log('Contador de arquivos incrementado com sucesso:', newCount);
      } catch (counterError) {
        console.error('Falha ao incrementar contador de arquivos:', counterError);
        // Não falha o upload se o contador falhar
      }

      // Update with file path and set to processing
      updateSource({
        sourceId,
        updates: {
          file_path: filePath,
          processing_status: 'processing'
        }
      });

      // O processamento agora é iniciado pelo webhook do Make.com
      // A geração do conteúdo é feita pelo workflow customizado no n8n
      try {
        await processDocumentAsync();
        await generateNotebookContentAsync();
        console.log('Document processing completed for:', sourceId);
      } catch (processingError) {
        console.error('Document processing failed:', processingError);

        // Update to completed with basic info if processing fails
        updateSource({
          sourceId,
          updates: {
            processing_status: 'completed'
          }
        });
      }
    } catch (error) {
      console.error('File processing failed for:', file.name, error);

      // Update status to failed
      updateSource({
        sourceId,
        updates: {
          processing_status: 'failed'
        }
      });
    }
  };

  const handleFileUpload = async (files: File[]) => {
    if (!notebookId) {
      toast({
        title: "Error",
        description: "No notebook selected",
        variant: "destructive"
      });
      return;
    }

    console.log('Processing multiple files with delay strategy:', files.length);
    setIsLocallyProcessing(true);

    try {
      // Step 1: Create the first source immediately (this will trigger generation if it's the first source)
      const firstFile = files[0];
      const firstFileType = firstFile.type.includes('pdf') ? 'pdf' : firstFile.type.includes('audio') ? 'audio' : 'text';
      const firstSourceData = {
        notebookId,
        title: firstFile.name,
        type: firstFileType as 'pdf' | 'text' | 'website' | 'youtube' | 'audio',
        file_size: firstFile.size,
        processing_status: 'pending',
        metadata: {
          fileName: firstFile.name,
          fileType: firstFile.type
        }
      };
      
      console.log('Creating first source for:', firstFile.name);
      const firstSource = await addSourceAsync(firstSourceData);
      
      let remainingSources = [];
      
      // Step 2: If there are more files, add a delay before creating the rest
      if (files.length > 1) {
        console.log('Adding 150ms delay before creating remaining sources...');
        await new Promise(resolve => setTimeout(resolve, 150));
        
        // Create remaining sources
        remainingSources = await Promise.all(files.slice(1).map(async (file, index) => {
          const fileType = file.type.includes('pdf') ? 'pdf' : file.type.includes('audio') ? 'audio' : 'text';
          const sourceData = {
            notebookId,
            title: file.name,
            type: fileType as 'pdf' | 'text' | 'website' | 'youtube' | 'audio',
            file_size: file.size,
            processing_status: 'pending',
            metadata: {
              fileName: file.name,
              fileType: file.type
            }
          };
          console.log('Creating source for:', file.name);
          return await addSourceAsync(sourceData);
        }));
        
        console.log('Remaining sources created:', remainingSources.length);
      }

      // Combine all created sources
      const allCreatedSources = [firstSource, ...remainingSources];

      console.log('All sources created successfully:', allCreatedSources.length);

      // Step 3: Close dialog immediately
      setIsLocallyProcessing(false);
      onOpenChange(false);

      // Step 4: Show success toast
      toast({
        title: "Files Added",
        description: `${files.length} file${files.length > 1 ? 's' : ''} added and processing started`
      });

      // Step 5: Process files in parallel (background)
      const processingPromises = files.map((file, index) => processFileAsync(file, allCreatedSources[index].id, notebookId));

      // Don't await - let processing happen in background
      Promise.allSettled(processingPromises).then(results => {
        const successful = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected').length;

        console.log('File processing completed:', {
          successful,
          failed
        });

        if (failed > 0) {
          toast({
            title: "Processing Issues",
            description: `${failed} file${failed > 1 ? 's' : ''} had processing issues. Check the sources list for details.`,
            variant: "destructive"
          });
        }
      });
    } catch (error) {
      console.error('Error creating sources:', error);
      setIsLocallyProcessing(false);
      toast({
        title: "Error",
        description: "Failed to add files. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleTextSubmit = async (title: string, content: string) => {
    if (!notebookId) return;
    setIsLocallyProcessing(true);

    try {
      // Create source record first to get the ID
      const createdSource = await addSourceAsync({
        notebookId,
        title,
        type: 'text',
        content,
        processing_status: 'processing',
        metadata: {
          characterCount: content.length,
          webhookProcessed: true
        }
      });

      // Increment sources_uploaded counter for text sources
      try {
        console.log('Incrementing sources_uploaded counter for text source in notebook:', notebookId);
        
        // 1. Buscar o valor atual da coluna sources_uploaded
        const { data: currentNotebook, error: fetchError } = await supabase
          .from('notebooks')
          .select('sources_uploaded')
          .eq('id', notebookId)
          .single();
        
        if (fetchError) {
          console.error('Erro ao buscar notebook atual para texto:', fetchError);
          throw fetchError;
        }
        
        // 2. Somar +1 ao valor atual
        const currentCount = currentNotebook?.sources_uploaded || 0;
        const newCount = currentCount + 1;
        
        console.log('Atualizando contador para texto:', { currentCount, newCount });
        
        // 3. Executar update na tabela notebooks
        const { error: updateError } = await supabase
          .from('notebooks')
          .update({ sources_uploaded: newCount })
          .eq('id', notebookId);
        
        if (updateError) {
          console.error('Erro ao atualizar contador de arquivos para texto:', updateError);
          throw updateError;
        }
        
        console.log('Contador de arquivos incrementado com sucesso para texto:', newCount);
      } catch (counterError) {
        console.error('Falha ao incrementar contador de arquivos para texto:', counterError);
      }

      // Send to webhook endpoint with source ID
      const { data, error } = await supabase.functions.invoke('process-additional-sources', {
        body: {
          type: 'copied-text',
          notebookId,
          title,
          content,
          sourceIds: [createdSource.id], // Pass the source ID
          timestamp: new Date().toISOString()
        }
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Success",
        description: "Text has been added and sent for processing"
      });
    } catch (error) {
      console.error('Error adding text source:', error);
      toast({
        title: "Error",
        description: "Failed to add text source",
        variant: "destructive"
      });
    } finally {
      setIsLocallyProcessing(false);
    }

    onOpenChange(false);
  };

  const handleMultipleWebsiteSubmit = async (urls: string[]) => {
    if (!notebookId) return;
    setIsLocallyProcessing(true);

    try {
      console.log('Creating sources for multiple websites with delay strategy:', urls.length);
      
      // Create the first source immediately (this will trigger generation if it's the first source)
      const firstSource = await addSourceAsync({
        notebookId,
        title: `Website 1: ${urls[0]}`,
        type: 'website',
        url: urls[0],
        processing_status: 'processing',
        metadata: {
          originalUrl: urls[0],
          webhookProcessed: true
        }
      });
      
      console.log('First source created:', firstSource.id);
      
      let remainingSources = [];
      
      // If there are more URLs, add a delay before creating the rest
      if (urls.length > 1) {
        console.log('Adding 150ms delay before creating remaining sources...');
        await new Promise(resolve => setTimeout(resolve, 150));
        
        // Create remaining sources
        remainingSources = await Promise.all(urls.slice(1).map(async (url, index) => {
          return await addSourceAsync({
            notebookId,
            title: `Website ${index + 2}: ${url}`,
            type: 'website',
            url,
            processing_status: 'processing',
            metadata: {
              originalUrl: url,
              webhookProcessed: true
            }
          });
        }));
        
        console.log('Remaining sources created:', remainingSources.length);
      }

      // Combine all created sources
      const allCreatedSources = [firstSource, ...remainingSources];

      // Increment sources_uploaded counter for each website
      try {
        console.log(`Incrementing sources_uploaded counter for ${urls.length} websites in notebook:`, notebookId);
        
        // 1. Buscar o valor atual da coluna sources_uploaded
        const { data: currentNotebook, error: fetchError } = await supabase
          .from('notebooks')
          .select('sources_uploaded')
          .eq('id', notebookId)
          .single();
        
        if (fetchError) {
          console.error('Erro ao buscar notebook atual para websites:', fetchError);
          throw fetchError;
        }
        
        // 2. Somar o número de websites ao valor atual
        const currentCount = currentNotebook?.sources_uploaded || 0;
        const newCount = currentCount + urls.length;
        
        console.log('Atualizando contador para websites:', { currentCount, websitesCount: urls.length, newCount });
        
        // 3. Executar update na tabela notebooks
        const { error: updateError } = await supabase
          .from('notebooks')
          .update({ sources_uploaded: newCount })
          .eq('id', notebookId);
        
        if (updateError) {
          console.error('Erro ao atualizar contador de arquivos para websites:', updateError);
          throw updateError;
        }
        
        console.log('Contador de arquivos incrementado com sucesso para websites:', newCount);
      } catch (counterError) {
        console.error('Falha ao incrementar contador de arquivos para websites:', counterError);
      }

      // Send to webhook endpoint with all source IDs
      const { data, error } = await supabase.functions.invoke('process-additional-sources', {
        body: {
          type: 'multiple-websites',
          notebookId,
          urls,
          sourceIds: allCreatedSources.map(source => source.id), // Pass array of source IDs
          timestamp: new Date().toISOString()
        }
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Success",
        description: `${urls.length} website${urls.length > 1 ? 's' : ''} added and sent for processing`
      });

      onOpenChange(false);
    } catch (error) {
      console.error('Error adding multiple websites:', error);
      toast({
        title: "Error",
        description: "Failed to add websites",
        variant: "destructive"
      });
    } finally {
      setIsLocallyProcessing(false);
    }
  };

  // Function to handle document type upload
  const handleDocumentTypeUpload = async (files: File[], documentType: string) => {
    if (!notebookId) {
      toast({
        title: "Erro",
        description: "Nenhum dossiê selecionado",
        variant: "destructive"
      });
      return;
    }

    if (files.length === 0) return;

    setIsLocallyProcessing(true);

    try {
      const file = files[0]; // Only take the first file for document types
      const fileType = file.type.includes('pdf') ? 'pdf' : file.type.includes('audio') ? 'audio' : 'text';
      
      const sourceData = {
        notebookId,
        title: file.name,
        type: fileType as 'pdf' | 'text' | 'website' | 'youtube' | 'audio',
        file_size: file.size,
        processing_status: 'pending',
        metadata: {
          fileName: file.name,
          fileType: file.type,
          documentType: documentType
        }
      };
      
      console.log('Creating source for document type:', documentType, file.name);
      const createdSource = await addSourceAsync(sourceData);

      // Close dialog immediately
      setIsLocallyProcessing(false);
      onOpenChange(false);

      // Show success toast
      toast({
        title: "Documento Adicionado",
        description: `${documentType} adicionado com sucesso e processamento iniciado`
      });

      // Process file in background
      processFileAsync(file, createdSource.id, notebookId, documentType).catch(error => {
        console.error('File processing failed:', error);
        toast({
          title: "Erro no Processamento",
          description: "Houve um problema ao processar o documento. Verifique a lista de documentos.",
          variant: "destructive"
        });
      });
    } catch (error) {
      console.error('Error creating document source:', error);
      setIsLocallyProcessing(false);
      toast({
        title: "Erro",
        description: "Falha ao adicionar documento. Tente novamente.",
        variant: "destructive"
      });
    }
  };

  // Use local processing state instead of global processing states
  const isProcessingFiles = isLocallyProcessing;

  // Component for document type upload
  const DocumentTypeUpload = ({ 
    type, 
    title, 
    description, 
    icon, 
    sources, 
    onFileSelect, 
    isProcessing 
  }: {
    type: string;
    title: string;
    description: string;
    icon: string;
    sources: any[];
    onFileSelect: (files: File[]) => void;
    isProcessing: boolean;
  }) => {
    const hasDocument = sources?.some(source => source.document_type === type);
    
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
        const files = Array.from(e.target.files);
        onFileSelect(files);
      }
    };

    return (
      <div className={`border-2 border-dashed rounded-lg p-6 transition-colors ${
        hasDocument 
          ? 'border-green-300 bg-green-50' 
          : isProcessing 
            ? 'border-gray-300 bg-gray-50 opacity-50' 
            : 'border-gray-300 hover:border-gray-400'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="text-2xl">{icon}</div>
            <div>
              <h3 className="font-medium text-gray-900">{title}</h3>
              <p className="text-sm text-gray-600">{description}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {hasDocument ? (
              <div className="flex items-center space-x-2 text-green-600">
                <Check className="h-5 w-5" />
                <span className="text-sm font-medium">Enviado</span>
              </div>
            ) : (
              <>
                <input
                  type="file"
                  accept=".pdf,.txt,.md"
                  onChange={handleFileChange}
                  disabled={isProcessing || hasDocument}
                  className="hidden"
                  id={`file-${type}`}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById(`file-${type}`)?.click()}
                  disabled={isProcessing || hasDocument}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Enviar
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-black rounded flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="16px" fill="#FFFFFF">
                    <path d="M480-80q-33 0-56.5-23.5T400-160h160q0 33-23.5 56.5T480-80ZM320-200v-80h320v80H320Zm10-120q-69-41-109.5-110T180-580q0-125 87.5-212.5T480-880q125 0 212.5 87.5T780-580q0 81-40.5 150T630-320H330Zm24-80h252q45-32 69.5-79T700-580q0-92-64-156t-156-64q-92 0-156 64t-64 156q0 54 24.5 101t69.5 79Zm126 0Z" />
                  </svg>
                </div>
                <DialogTitle className="text-xl font-medium">InsightsLM</DialogTitle>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-medium mb-2">Adicionar Documentos ao Dossiê</h2>
              <p className="text-gray-600 text-sm mb-1">Envie os documentos específicos para análise jurídica.</p>
              <p className="text-gray-500 text-xs">
                Cada tipo de documento pode ser enviado apenas uma vez por dossiê.
              </p>
            </div>

            {/* Document Type Upload Areas */}
            <div className="space-y-4">
              {/* Processo Judicial */}
              <DocumentTypeUpload
                type="processo"
                title="Processo Judicial"
                description="Documento principal do processo"
                icon="⚖️"
                sources={sources}
                onFileSelect={(files) => handleDocumentTypeUpload(files, 'processo')}
                isProcessing={isProcessingFiles}
              />

              {/* Edital */}
              <DocumentTypeUpload
                type="edital"
                title="Edital"
                description="Edital do concurso ou licitação"
                icon="📋"
                sources={sources}
                onFileSelect={(files) => handleDocumentTypeUpload(files, 'edital')}
                isProcessing={isProcessingFiles}
              />

              {/* Matrícula */}
              <DocumentTypeUpload
                type="matricula"
                title="Matrícula"
                description="Documento de matrícula ou inscrição"
                icon="🎓"
                sources={sources}
                onFileSelect={(files) => handleDocumentTypeUpload(files, 'matricula')}
                isProcessing={isProcessingFiles}
              />
            </div>

            {/* Integration Options */}
            <div className="grid grid-cols-2 gap-4">
              <Button
                variant="outline"
                className="h-auto p-4 flex flex-col items-center space-y-2"
                onClick={() => setShowMultipleWebsiteDialog(true)}
                disabled={isProcessingFiles}
              >
                <Link className="h-6 w-6 text-green-600" />
                <span className="font-medium">Link - Website</span>
                <span className="text-sm text-gray-500">Multiple URLs at once</span>
              </Button>

              <Button
                variant="outline"
                className="h-auto p-4 flex flex-col items-center space-y-2"
                onClick={() => setShowCopiedTextDialog(true)}
                disabled={isProcessingFiles}
              >
                <Copy className="h-6 w-6 text-purple-600" />
                <span className="font-medium">Paste Text - Copied Text</span>
                <span className="text-sm text-gray-500">Add copied content</span>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Sub-dialogs */}
      <CopiedTextDialog 
        open={showCopiedTextDialog} 
        onOpenChange={setShowCopiedTextDialog} 
        onSubmit={handleTextSubmit} 
      />

      <MultipleWebsiteUrlsDialog 
        open={showMultipleWebsiteDialog} 
        onOpenChange={setShowMultipleWebsiteDialog} 
        onSubmit={handleMultipleWebsiteSubmit} 
      />
    </>
  );
};

export default AddSourcesDialog;
