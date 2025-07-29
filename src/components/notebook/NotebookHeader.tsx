import React from 'react';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLogout } from '@/services/authService';
import { useProfile } from '@/hooks/useProfile';
import Logo from '@/components/ui/Logo';

interface NotebookHeaderProps {
  title: string;
  notebookId?: string;
  hasSource?: boolean;
}

const NotebookHeader = ({ title, notebookId, hasSource }: NotebookHeaderProps) => {
  const navigate = useNavigate();
  const { logout } = useLogout();
  const { profile } = useProfile();

  const handleIconClick = () => {
    navigate('/');
  };

  const handleVerAnaliseClick = () => {
    if (notebookId) {
      navigate(`/analise/${notebookId}`);
    }
  };

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
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <button 
            onClick={handleIconClick}
            className="hover:bg-gray-50 rounded transition-colors p-1"
          >
            <Logo />
          </button>
          <h1 className="text-xl font-medium text-foreground">Dossiê AI</h1>
        </div>
        
        <div className="flex items-center space-x-4">
          {hasSource && (
            <Button 
              onClick={handleVerAnaliseClick}
              variant="default"
              size="sm"
            >
              Ver Análise
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="p-0">
                {renderAvatar()}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
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

export default NotebookHeader;
