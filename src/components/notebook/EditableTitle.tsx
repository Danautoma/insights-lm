import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Edit2 } from 'lucide-react';
import { useNotebookUpdate } from '@/hooks/useNotebookUpdate';
import { useToast } from '@/hooks/use-toast';

interface EditableTitleProps {
  title: string;
  notebookId?: string;
}

const EditableTitle = ({ title, notebookId }: EditableTitleProps) => {
  const { toast } = useToast();
  const { updateNotebook, isUpdating } = useNotebookUpdate();
  
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(title);
  const inputRef = useRef<HTMLInputElement>(null);

  // Update editTitle when title prop changes
  useEffect(() => {
    setEditTitle(title);
  }, [title]);

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleEditClick = () => {
    setIsEditing(true);
  };

  const handleSaveTitle = async () => {
    if (!notebookId || editTitle.trim() === title) {
      setIsEditing(false);
      setEditTitle(title); // Reset to original if no change
      return;
    }

    if (editTitle.trim() === '') {
      toast({
        title: "Erro",
        description: "O título não pode estar vazio",
        variant: "destructive"
      });
      setEditTitle(title); // Reset to original
      return;
    }

    try {
      updateNotebook({
        id: notebookId,
        updates: { title: editTitle.trim() }
      });

      toast({
        title: "Sucesso",
        description: "Título atualizado com sucesso!"
      });

      setIsEditing(false);
    } catch (error) {
      console.error('Error updating title:', error);
      toast({
        title: "Erro",
        description: "Falha ao atualizar o título",
        variant: "destructive"
      });
      setEditTitle(title); // Reset to original on error
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveTitle();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditTitle(title); // Reset to original
    }
  };

  const handleBlur = () => {
    handleSaveTitle();
  };

  return (
    <div className="flex items-center justify-center space-x-2 mb-6">
      {isEditing ? (
        <Input
          ref={inputRef}
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          onKeyDown={handleKeyPress}
          onBlur={handleBlur}
          disabled={isUpdating}
          className="text-lg font-medium text-center max-w-md"
          placeholder="Nome do dossiê"
        />
      ) : (
        <>
          <h2 
            className="text-lg font-medium text-gray-900 cursor-pointer hover:text-gray-700 transition-colors text-center"
            onClick={handleEditClick}
            title="Clique para editar o título"
          >
            {title}
          </h2>
          <button
            onClick={handleEditClick}
            className="p-1 hover:bg-gray-100 rounded transition-colors opacity-60 hover:opacity-100"
            title="Editar título"
          >
            <Edit2 className="h-4 w-4 text-gray-500" />
          </button>
        </>
      )}
    </div>
  );
};

export default EditableTitle;
