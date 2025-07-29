import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import { User } from 'lucide-react';

const PerfilPage = () => {
  const { user } = useAuth();
  // Corrigido: useProfile agora retorna refetchProfile
  const { profile, loading, refetchProfile } = useProfile();
  const { toast } = useToast();
  
  const [fullName, setFullName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile?.full_name) {
      setFullName(profile.full_name);
    }
  }, [profile]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleSave = async () => {
    if (!user || !profile) return;

    setSaving(true);
    try {
      let newAvatarUrl = profile.avatar_url;

      // 1. Lógica de Upload para o Storage
      if (selectedFile) {
        const fileExt = selectedFile.name.split('.').pop();
        // O caminho do arquivo é o ID do usuário, garantindo um único avatar por usuário.
        const filePath = `${user.id}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('avatares')
          .upload(filePath, selectedFile, {
            upsert: true, // Crucial para sobrescrever o avatar antigo
          });

        if (uploadError) {
          // Lança um erro específico do Storage
          throw new Error(`Erro no Storage: ${uploadError.message}`);
        }
        
        // Pega a URL pública APENAS após o upload bem-sucedido
        const { data } = supabase.storage
          .from('avatares')
          .getPublicUrl(filePath);

        newAvatarUrl = data.publicUrl;
      }

      // 2. Lógica de Update no Banco de Dados
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          avatar_url: newAvatarUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (updateError) {
        // Lança um erro específico do Banco de Dados
        throw new Error(`Erro no Banco de Dados: ${updateError.message}`);
      }

      toast({ title: "Sucesso!", description: "Seu perfil foi atualizado." });
      setSelectedFile(null);
      refetchProfile(); // Força a atualização dos dados do perfil na tela
      
    } catch (error: any) {
      console.error('Erro ao salvar o perfil:', error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível salvar as alterações.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const renderAvatar = () => {
    if (profile?.avatar_url) {
      return (
        <img 
          src={`${profile.avatar_url}?t=${new Date().getTime()}`} // Adicionado timestamp para evitar cache
          alt={profile.full_name || 'Avatar'} 
          className="w-24 h-24 rounded-full object-cover border-4 border-gray-200"
        />
      );
    }
    return (
      <div className="w-24 h-24 bg-primary rounded-full flex items-center justify-center border-4 border-gray-200">
        <User className="w-12 h-12 text-white" />
      </div>
    );
  };

  if (loading) {
    return (
      <div>
        {/* Usando o DashboardHeader para manter a consistência mesmo no loading */}
        <DashboardHeader />
        <main className="max-w-7xl mx-auto px-6 py-8">
          <h1 className="text-3xl font-bold mb-6">Meu Perfil</h1>
          <div className="flex justify-center items-center h-64">
            <div className="text-gray-500">Carregando...</div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div>
      <DashboardHeader />
      <main className="max-w-7xl mx-auto px-6 py-8">
        <h1 className="text-3xl font-bold mb-6">Meu Perfil</h1>
        <div className="max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle>Informações do Perfil</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col items-center space-y-4">
                {renderAvatar()}
                <p className="text-sm text-gray-500">Foto do Perfil</p>
                <div className="text-center space-y-2">
                  <p className="text-sm text-gray-600">Selecione uma nova foto de perfil:</p>
                  <div className="flex justify-center">
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      <div className="py-2 px-4 rounded-full border-0 text-sm font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors">
                        Escolher arquivo
                      </div>
                    </label>
                  </div>
                  {selectedFile && (
                    <p className="text-xs text-green-600 mt-1">
                      Arquivo selecionado: {selectedFile.name}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Nome Completo</Label>
                  <Input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Digite seu nome completo"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="bg-gray-100 cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-500">
                    O e-mail não pode ser alterado
                  </p>
                </div>
                <Button 
                  onClick={handleSave} 
                  disabled={saving || !fullName.trim()}
                  className="w-full"
                >
                  {saving ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default PerfilPage;