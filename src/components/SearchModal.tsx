import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Search, X, MessageSquare } from 'lucide-react';
import { Message } from '../types/chat';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  messages: Message[];
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  messages,
}) => {
  const [query, setQuery] = useState('');

  if (!isOpen) return null;

  const filtered = query.trim()
    ? messages.filter(
        (m) =>
          m.content.toLowerCase().includes(query.toLowerCase()) ||
          m.sender.toLowerCase().includes(query.toLowerCase())
      )
    : [];

  return (
    <div id="search-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        id="search-card"
        className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl text-slate-100 max-h-[80vh] flex flex-col"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-base text-white flex items-center gap-2">
            <Search className="w-5 h-5 text-emerald-400" />
            <span>Buscar no Histórico de Mensagens</span>
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="relative mb-4">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Digite palavras-chave ou nome do usuário..."
            autoFocus
            className="w-full pl-4 pr-10 py-3 bg-slate-950/80 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 text-sm"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 top-3 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {!query.trim() ? (
            <p className="text-center py-8 text-xs text-slate-500">
              Digite algo para procurar nas {messages.length} mensagens salvas.
            </p>
          ) : filtered.length === 0 ? (
            <p className="text-center py-8 text-xs text-slate-500">
              Nenhuma mensagem encontrada para "{query}".
            </p>
          ) : (
            filtered.map((msg) => (
              <div
                key={msg.id}
                className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1 text-xs"
              >
                <div className="flex items-center justify-between text-emerald-400 font-semibold">
                  <span>{msg.sender}</span>
                  <span className="text-[10px] text-slate-500">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-slate-200">{msg.content}</p>
              </div>
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
};
