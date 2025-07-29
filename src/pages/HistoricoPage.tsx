import React from 'react';
import { useNotebooks } from '@/hooks/useNotebooks';
import { useNotebookDelete } from '@/hooks/useNotebookDelete';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import { useAuth } from '@/contexts/AuthContext';

const HistoricoPage = () => {
  const { notebooks, isLoading } = useNotebooks();
  const { deleteNotebook } = useNotebookDelete();
  const { user } = useAuth();

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd/MM/yyyy', { locale: ptBR });
    } catch {
      return 'Data inválida';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Concluído';
      case 'processing':
        return 'Processando';
      case 'failed':
        return 'Falhou';
      default:
        return 'Pendente';
    }
  };

  const handleDelete = async (notebookId: string) => {
    if (window.confirm('Tem certeza que deseja excluir este dossiê?')) {
      await deleteNotebook(notebookId);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <DashboardHeader userEmail={user?.email} />
        <main className="max-w-7xl mx-auto px-6 py-8">
          <h1 className="text-3xl font-bold mb-6">Histórico de Análises</h1>
          <div className="flex justify-center items-center h-64">
            <div className="text-gray-500">Carregando...</div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader userEmail={user?.email} />
      
      <main className="max-w-7xl mx-auto px-6 py-8">
        <h1 className="text-3xl font-bold mb-6">Histórico de Análises</h1>
        
        {notebooks && notebooks.length > 0 ? (
          <div className="border rounded-lg bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título do Dossiê</TableHead>
                  <TableHead>Data de Criação</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {notebooks.map((notebook) => (
                  <TableRow key={notebook.id}>
                    <TableCell className="font-medium">
                      {notebook.title || 'Dossiê Sem Título'}
                    </TableCell>
                    <TableCell>
                      {formatDate(notebook.created_at)}
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        notebook.generation_status === 'completed' 
                          ? 'bg-green-100 text-green-800'
                          : notebook.generation_status === 'processing'
                          ? 'bg-yellow-100 text-yellow-800'
                          : notebook.generation_status === 'failed'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {getStatusText(notebook.generation_status)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Link to={`/analise/${notebook.id}`}>
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4 mr-1" />
                            Ver Análise
                          </Button>
                        </Link>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleDelete(notebook.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-gray-500 mb-4">Nenhum dossiê encontrado</div>
            <Link to="/">
              <Button>Criar Primeiro Dossiê</Button>
            </Link>
          </div>
        )}
      </main>
    </div>
  );
};

export default HistoricoPage;
