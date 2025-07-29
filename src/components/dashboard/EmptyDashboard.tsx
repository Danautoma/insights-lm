import React from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useNotebooks } from '@/hooks/useNotebooks';
import { useToast } from '@/hooks/use-toast';

const EmptyDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const {
    createNotebookAsync,
    isCreating
  } = useNotebooks();
  
  const handleCreateNotebook = async () => {
    console.log('Create dossie button clicked');
    console.log('isCreating:', isCreating);
    
    try {
      const newNotebook = await createNotebookAsync({
        title: 'Novo Dossiê',
        description: 'Dossiê para análise de documentos jurídicos'
      });
      
      console.log('Navigating to dossie:', newNotebook.id);
      navigate(`/dossie/${newNotebook.id}`);
      
      toast({
        title: "Dossiê Criado",
        description: "Seu novo dossiê foi criado com sucesso!",
      });
    } catch (error) {
      console.error('Failed to create dossie:', error);
      toast({
        title: "Erro",
        description: "Falha ao criar o dossiê. Tente novamente.",
        variant: "destructive"
      });
    }
  };
  return <div className="text-center py-16">
      <Button onClick={handleCreateNotebook} size="lg" className="bg-primary hover:bg-primary/90 text-lg px-8 py-6" disabled={isCreating}>
        {isCreating ? 'Criando...' : '+ Iniciar Nova Análise'}
      </Button>
    </div>;
};
export default EmptyDashboard;
