
import React from 'react';
import { Button } from '@/components/ui/button';
import { User, LogOut, UserCircle, History, CreditCard } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { useLogout } from '@/services/authService';
import Logo from '@/components/ui/Logo';
import { useProfile } from '@/hooks/useProfile';
import { Link } from 'react-router-dom';

interface DashboardHeaderProps {
  userEmail?: string;
}

const DashboardHeader = ({ userEmail }: DashboardHeaderProps) => {
  const { logout } = useLogout();
  const { profile } = useProfile();

  const getInitials = (fullName: string | null) => {
    if (!fullName) return 'U';
    return fullName
      .split(' ')
      .map(name => name.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const renderAvatar = () => {
    if (profile?.avatar_url) {
      return (
        <img 
          src={profile.avatar_url} 
          alt={profile.full_name || 'Avatar'} 
          className="w-8 h-8 rounded-full object-cover cursor-pointer"
        />
      );
    }

    return (
      <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity">
        <span className="text-white text-sm font-medium">
          {getInitials(profile?.full_name)}
        </span>
      </div>
    );
  };

  return (
    <header className="bg-white px-6 py-4">
      <div className="flex items-center justify-between">
        <Link to="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
          <Logo />
          <h1 className="text-xl font-medium text-foreground">Dossiê AI</h1>
        </Link>
        
        <div className="flex items-center space-x-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="p-0">
                {renderAvatar()}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem asChild>
                <Link to="/perfil" className="cursor-pointer">
                  <UserCircle className="h-4 w-4 mr-2" />
                  Meu Perfil
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/historico" className="cursor-pointer">
                  <History className="h-4 w-4 mr-2" />
                  Histórico de Análises
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/creditos" className="cursor-pointer">
                  <CreditCard className="h-4 w-4 mr-2" />
                  Créditos
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="cursor-pointer">
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;
