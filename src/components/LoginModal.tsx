import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Lock, User, KeyRound, MessageSquare, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';
import { chatService } from '../services/chatService';

interface LoginModalProps {
  onLoginSuccess: (nickname: string) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ onLoginSuccess }) => {
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanNick = nickname.trim();
    if (!cleanNick) {
      setError('Por favor, informe seu nome ou apelido.');
      return;
    }

    if (!password.trim()) {
      setError('Por favor, digite a senha de acesso.');
      return;
    }

    setIsLoading(true);

    try {
      const result = await chatService.verifyPassword(password);
      if (result.success) {
        onLoginSuccess(cleanNick);
      } else {
        setError(result.error || 'Senha incorreta. Tente novamente.');
      }
    } catch (err) {
      setError('Falha ao conectar com o servidor.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div id="login-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        id="login-card"
        className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl text-slate-100"
      >
        <div id="login-header" className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mb-4 shadow-inner">
            <MessageSquare className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white mb-1">
            Shutdown Messenger
          </h1>
          <p className="text-sm text-slate-400">
            Mensagens privadas e instantâneas protegidas por senha
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="nickname-input" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Seu Apelido / Nome
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <User className="w-5 h-5" />
              </div>
              <input
                id="nickname-input"
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Ex: Gabriel, Julia, Alex..."
                maxLength={24}
                required
                className="w-full pl-11 pr-4 py-3 bg-slate-950/60 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors text-base"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="password-input" className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Senha de Acesso
              </label>
              <span className="text-[11px] text-emerald-400 font-mono bg-emerald-950/50 border border-emerald-800/40 px-2 py-0.5 rounded-md">
                Dica: shutdown
              </span>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <KeyRound className="w-5 h-5" />
              </div>
              <input
                id="password-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Digite a senha..."
                required
                className="w-full pl-11 pr-4 py-3 bg-slate-950/60 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors text-base"
              />
            </div>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              id="login-error-badge"
              className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs font-medium"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}

          <button
            id="login-submit-btn"
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 px-4 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 font-semibold rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 disabled:opacity-50 text-base"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
            ) : (
              <>
                <span>Entrar no Chat</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>

        <div id="login-footer" className="mt-6 pt-5 border-t border-slate-800/80 text-center flex items-center justify-center gap-1.5 text-xs text-slate-500">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>Acesso restrito por senha única fixa (<span className="font-mono text-slate-300">shutdown</span>)</span>
        </div>
      </motion.div>
    </div>
  );
};
