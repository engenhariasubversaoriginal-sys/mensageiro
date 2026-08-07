import React from 'react';
import { Menu, Volume2, VolumeX, Search, LogOut, Users, Sparkles, Hash, Lock } from 'lucide-react';
import { Room } from '../types/chat';

interface HeaderProps {
  currentRoom: Room | null;
  onlineCount: number;
  nickname: string;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onOpenSidebar: () => void;
  onOpenSearch: () => void;
  onLogout: () => void;
  unreadTotal: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentRoom,
  onlineCount,
  nickname,
  soundEnabled,
  onToggleSound,
  onOpenSidebar,
  onOpenSearch,
  onLogout,
  unreadTotal,
}) => {
  return (
    <header id="main-app-header" className="sticky top-0 z-30 h-16 bg-slate-900/90 backdrop-blur-md border-b border-slate-800/80 px-3 sm:px-4 flex items-center justify-between text-slate-100 shrink-0">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <button
          id="btn-toggle-sidebar"
          onClick={onOpenSidebar}
          className="relative p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 active:bg-slate-700 transition-colors"
          title="Menu de Canais e Conversas"
        >
          <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
          {unreadTotal > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-slate-950 animate-pulse">
              {unreadTotal > 9 ? '9+' : unreadTotal}
            </span>
          )}
        </button>

        <div className="flex items-center gap-2 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            {currentRoom?.isPrivate ? <Lock className="w-4 h-4" /> : <Hash className="w-4 h-4" />}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-semibold text-white truncate max-w-[140px] sm:max-w-[220px]">
                {currentRoom?.name || 'Carregando...'}
              </h2>
              <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-medium text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>{onlineCount} {onlineCount === 1 ? 'online' : 'online'}</span>
              </div>
            </div>
            <p className="text-xs text-slate-400 truncate max-w-[150px] sm:max-w-[280px]">
              {currentRoom?.description || `Conectado como ${nickname}`}
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        <button
          id="btn-search-messages"
          onClick={onOpenSearch}
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title="Buscar Mensagens"
        >
          <Search className="w-5 h-5" />
        </button>

        <button
          id="btn-toggle-sound"
          onClick={onToggleSound}
          className={`p-2 rounded-xl transition-colors ${
            soundEnabled
              ? 'text-emerald-400 hover:bg-emerald-500/10'
              : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
          }`}
          title={soundEnabled ? 'Sons ativados (Clique para silenciar)' : 'Sons desativados (Clique para ativar)'}
        >
          {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
        </button>

        <div className="h-6 w-px bg-slate-800 mx-1 hidden sm:block" />

        <div className="hidden sm:flex items-center gap-2 pl-1">
          <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-emerald-400 uppercase">
            {nickname.charAt(0)}
          </div>
          <span className="text-xs font-medium text-slate-300 truncate max-w-[100px]">
            {nickname}
          </span>
        </div>

        <button
          id="btn-logout"
          onClick={onLogout}
          className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
          title="Sair do Apelido"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
};
