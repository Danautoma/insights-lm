
import React from 'react';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import EmptyDashboard from '@/components/dashboard/EmptyDashboard';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';

const Dashboard = () => {
  const { user, loading: authLoading, error: authError } = useAuth();
  const { profile } = useProfile();

  const getGreeting = () => {
    if (profile?.full_name) {
      return `Olá, ${profile.full_name}!`;
    }
    return 'Olá!';
  };

  // Show loading while auth is initializing
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <DashboardHeader userEmail={user?.email} />
        <main className="max-w-7xl mx-auto px-6 py-8">
          <div className="mb-8">
            <h1 className="text-4xl font-medium text-gray-900 mb-2">Bem-vindo à sua Central de Análises</h1>
          </div>
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Inicializando...</p>
          </div>
        </main>
      </div>
    );
  }

  // Show auth error if present
  if (authError) {
    return (
      <div className="min-h-screen bg-gray-50">
        <DashboardHeader userEmail={user?.email} />
        <main className="max-w-7xl mx-auto px-6 py-8">
          <div className="mb-8">
            <h1 className="text-4xl font-medium text-gray-900 mb-2">Bem-vindo à sua Central de Análises</h1>
          </div>
          <div className="text-center py-16">
            <p className="text-red-600">Erro de autenticação: {authError}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Tentar Novamente
            </button>
          </div>
        </main>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-gradient-to-b from-[#e0f7fa] to-white">
      <DashboardHeader userEmail={user?.email} />
      
      <main className="max-w-7xl mx-auto px-6 py-[60px]">
        <div className="mb-8">
          <h1 className="font-medium text-foreground mb-2 text-5xl">{getGreeting()}</h1>
        </div>

        <EmptyDashboard />
      </main>
    </div>
  );
};

export default Dashboard;
