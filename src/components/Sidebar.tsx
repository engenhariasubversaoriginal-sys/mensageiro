import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Plus, Hash, Lock, Users, MessageSquare, Copy, Check, ShieldAlert, Sparkles } from 'lucide-react';
import { Room } from '../types/chat';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  rooms: Room[];
  currentRoomId: string;
  onSelectRoom: (roomId: string) => void;
  onlineUsers: string[];
  nickname: string;
  onOpenCreateRoom: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  rooms,
  currentRoomId,
  onSelectRoom,
  onlineUsers,
  nickname,
  onOpenCreateRoom,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);

  const handleCopyInvite = () => {
    const inviteText = `${window.location.origin}\n\nSenha de Acesso: shutdown`;
    navigator.clipboard.writeText(inviteText);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay for mobile backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            id="sidebar-overlay"
            className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-sm lg:hidden"
          />

          {/* Sidebar Drawer */}
          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 280 }}
            id="sidebar-drawer"
            className="fixed top-0 bottom-0 left-0 z-50 w-80 max-w-[85vw] bg-slate-900 border-r border-slate-800 shadow-2xl flex flex-col text-slate-100"
          >
            {/* Header */}
            <div id="sidebar-header" className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white leading-none">Shutdown Messenger</h3>
                  <span className="text-[11px] text-slate-400">Senha: shutdown</span>
                </div>
              </div>
              <button
                id="btn-close-sidebar"
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content scrollable */}
            <div id="sidebar-scrollable" className="flex-1 overflow-y-auto p-3 space-y-6">
              {/* Rooms Section */}
              <div>
                <div className="flex items-center justify-between px-2 mb-2">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Canais de Mensagens
                  </span>
                  <button
                    id="btn-open-create-room"
                    onClick={onOpenCreateRoom}
                    className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 font-medium px-2 py-1 rounded-md hover:bg-emerald-500/10 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Nova Sala</span>
                  </button>
                </div>

                <div className="space-y-1">
                  {rooms.map((room) => {
                    const isActive = room.id === currentRoomId;
                    return (
                      <button
                        key={room.id}
                        id={`btn-select-room-${room.id}`}
                        onClick={() => {
                          onSelectRoom(room.id);
                          onClose();
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all text-sm font-medium ${
                          isActive
                            ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 shadow-sm'
                            : 'text-slate-300 hover:bg-slate-800/80 hover:text-white border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {room.isPrivate ? (
                            <Lock className="w-4 h-4 text-emerald-400 shrink-0" />
                          ) : (
                            <Hash className="w-4 h-4 text-slate-400 shrink-0" />
                          )}
                          <span className="truncate">{room.name}</span>
                        </div>
                        {room.unreadCount && room.unreadCount > 0 ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-bold">
                            {room.unreadCount}
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Online Users Section */}
              <div>
                <div className="flex items-center justify-between px-2 mb-2">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Online no App ({onlineUsers.length})</span>
                  </span>
                </div>

                <div className="space-y-1.5 px-1">
                  {onlineUsers.length === 0 ? (
                    <p className="text-xs text-slate-500 py-2 px-2 italic">Aguardando outros usuários...</p>
                  ) : (
                    onlineUsers.map((user, idx) => {
                      const isMe = user === nickname;
                      return (
                        <div
                          key={idx}
                          className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-xs font-medium text-slate-300 bg-slate-950/40 border border-slate-800/60"
                        >
                          <span className="relative flex h-2.5 w-2.5 shrink-0">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                          </span>
                          <span className="truncate flex-1">
                            {user} {isMe && <span className="text-[10px] text-emerald-400 font-bold">(Você)</span>}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Footer invite helper */}
            <div id="sidebar-footer" className="p-3 border-t border-slate-800 bg-slate-950/50">
              <button
                id="btn-copy-invite"
                onClick={handleCopyInvite}
                className="w-full py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-medium flex items-center justify-center gap-2 transition-colors border border-slate-700/60"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-400 font-semibold">Link & Senha Copiados!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-slate-400" />
                    <span>Convidar Amigo (Com Senha)</span>
                  </>
                )}
              </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
};
