import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Profile } from '@/integrations/supabase/types';

// A função que busca o perfil no banco de dados
const fetchProfile = async (userId: string): Promise<Profile | null> => {
  if (!userId) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error fetching profile:', error);
    return null;
  }
  return data;
};

// O nosso hook que usa a função acima
export const useProfile = () => {
  const { user } = useAuth();

  // Pegamos a função 'refetch' que o useQuery nos oferece
  const { 
    data: profile, 
    isLoading: loading, 
    error, 
    refetch // <--- A função que queremos
  } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: () => fetchProfile(user!.id),
    enabled: !!user,
  });

  // --- A GRANDE MUDANÇA ESTÁ AQUI ---
  // Nós agora retornamos o 'refetch' que pegamos do useQuery,
  // mas com o nome 'refetchProfile', que é o que a nossa página espera.
  return {
    profile,
    loading,
    error,
    refetchProfile: refetch, // <--- ESTA É A LINHA DA CORREÇÃO
  };
};
