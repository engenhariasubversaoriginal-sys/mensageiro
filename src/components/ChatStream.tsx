import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Message } from '../types/chat';
import { Play, Pause, Reply, Trash2, Smile, Download, FileText, CheckCheck, Clock, CornerDownRight } from 'lucide-react';

interface ChatStreamProps {
  messages: Message[];
  nickname: string;
  onReact: (messageId: string, emoji: string) => void;
  onDelete: (messageId: string) => void;
  onReply: (message: Message) => void;
  onOpenLightBox: (imageUrl: string) => void;
  typingUsers: string[];
}

const EMOJI_PRESETS = ['👍', '❤️', '😂', '🔥', '😮', '🚀', '🔒'];

export const ChatStream: React.FC<ChatStreamProps> = ({
  messages,
  nickname,
  onReact,
  onDelete,
  onReply,
  onOpenLightBox,
  typingUsers,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeReactionMenu, setActiveReactionMenu] = useState<string | null>(null);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement }>({});

  // Auto scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, typingUsers]);

  const toggleVoicePlayback = (id: string, url: string) => {
    if (playingVoiceId === id) {
      audioRefs.current[id]?.pause();
      setPlayingVoiceId(null);
    } else {
      if (playingVoiceId && audioRefs.current[playingVoiceId]) {
        audioRefs.current[playingVoiceId].pause();
      }
      if (!audioRefs.current[id]) {
        const audio = new Audio(url);
        audio.onended = () => setPlayingVoiceId(null);
        audioRefs.current[id] = audio;
      }
      audioRefs.current[id].play();
      setPlayingVoiceId(id);
    }
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDateLabel = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' });
  };

  // Avatar color generator based on username
  const getAvatarColor = (name: string) => {
    const colors = [
      'bg-indigo-500',
      'bg-emerald-500',
      'bg-teal-500',
      'bg-rose-500',
      'bg-amber-500',
      'bg-cyan-500',
      'bg-violet-500',
      'bg-fuchsia-500',
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <div
      ref={scrollRef}
      id="chat-stream-container"
      className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4 bg-slate-950/60"
    >
      {messages.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
          <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mb-3 text-slate-400">
            💬
          </div>
          <p className="text-sm font-medium text-slate-400">Nenhuma mensagem ainda neste canal</p>
          <p className="text-xs text-slate-500 mt-1">Seja o primeiro a enviar uma mensagem para todos!</p>
        </div>
      ) : (
        messages.map((msg, index) => {
          const isMe = msg.sender === nickname;
          const isSystem = msg.type === 'system';
          const prevMsg = messages[index - 1];
          const showDateHeader = !prevMsg || new Date(prevMsg.timestamp).toDateString() !== new Date(msg.timestamp).toDateString();

          if (isSystem) {
            return (
              <div key={msg.id} className="flex flex-col items-center justify-center my-3">
                {showDateHeader && (
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 bg-slate-900/80 border border-slate-800 px-2.5 py-1 rounded-full mb-2">
                    {formatDateLabel(msg.timestamp)}
                  </span>
                )}
                <div className="text-xs text-slate-400 bg-slate-900/60 border border-slate-800/80 px-3 py-1.5 rounded-full text-center max-w-sm">
                  {msg.content}
                </div>
              </div>
            );
          }

          return (
            <div key={msg.id} className="space-y-1">
              {showDateHeader && (
                <div className="flex justify-center my-3">
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 bg-slate-900/80 border border-slate-800 px-2.5 py-1 rounded-full">
                    {formatDateLabel(msg.timestamp)}
                  </span>
                </div>
              )}

              <div
                id={`message-bubble-${msg.id}`}
                className={`group relative flex gap-2.5 items-end ${isMe ? 'justify-end' : 'justify-start'}`}
              >
                {/* Avatar for other users */}
                {!isMe && (
                  <div
                    className={`w-8 h-8 rounded-full ${getAvatarColor(msg.sender)} text-slate-950 font-bold text-xs flex items-center justify-center shrink-0 uppercase shadow-md mb-1`}
                    title={msg.sender}
                  >
                    {msg.sender.charAt(0)}
                  </div>
                )}

                {/* Message Box */}
                <div className={`relative max-w-[82%] sm:max-w-[70%] rounded-2xl p-3 shadow-md ${
                  isMe
                    ? 'bg-emerald-600 text-white rounded-br-none'
                    : 'bg-slate-900 border border-slate-800 text-slate-100 rounded-bl-none'
                }`}>
                  {/* Sender Name */}
                  {!isMe && (
                    <div className="text-xs font-bold text-emerald-400 mb-1 flex items-center gap-1">
                      <span>{msg.sender}</span>
                    </div>
                  )}

                  {/* Quoted Reply if present */}
                  {msg.replyTo && (
                    <div className={`p-2 rounded-lg text-xs mb-2 border-l-2 ${
                      isMe
                        ? 'bg-emerald-700/60 border-white/60 text-emerald-100'
                        : 'bg-slate-950/60 border-emerald-500 text-slate-300'
                    }`}>
                      <div className="font-semibold flex items-center gap-1 text-[11px]">
                        <CornerDownRight className="w-3 h-3" />
                        <span>{msg.replyTo.sender}</span>
                      </div>
                      <p className="truncate italic opacity-90 mt-0.5">{msg.replyTo.content}</p>
                    </div>
                  )}

                  {/* Message Content according to type */}
                  {msg.type === 'text' && (
                    <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                      {msg.content}
                    </p>
                  )}

                  {msg.type === 'image' && (
                    <div className="space-y-1.5">
                      <div
                        onClick={() => msg.mediaUrl && onOpenLightBox(msg.mediaUrl)}
                        className="cursor-pointer overflow-hidden rounded-xl border border-black/10 max-h-60 bg-black/20"
                      >
                        <img
                          src={msg.mediaUrl}
                          alt="Imagem enviada"
                          className="w-full h-full object-cover hover:scale-105 transition-transform"
                        />
                      </div>
                      {msg.content && (
                        <p className="text-sm whitespace-pre-wrap break-words mt-1">{msg.content}</p>
                      )}
                    </div>
                  )}

                  {msg.type === 'voice' && (
                    <div className="flex items-center gap-3 p-1">
                      <button
                        onClick={() => msg.mediaUrl && toggleVoicePlayback(msg.id, msg.mediaUrl)}
                        className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-95 ${
                          isMe ? 'bg-white text-emerald-700' : 'bg-emerald-500 text-slate-950'
                        }`}
                      >
                        {playingVoiceId === msg.id ? (
                          <Pause className="w-5 h-5 fill-current" />
                        ) : (
                          <Play className="w-5 h-5 fill-current ml-0.5" />
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between text-xs font-semibold mb-1">
                          <span>Áudio de Voz</span>
                          <span className="opacity-80 font-mono">0:15</span>
                        </div>
                        <div className="h-2 w-full bg-black/20 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 ${
                              playingVoiceId === msg.id ? 'w-full animate-pulse bg-emerald-300' : 'w-1/3 bg-slate-400'
                            }`}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {msg.type === 'file' && (
                    <a
                      href={msg.mediaUrl}
                      download={msg.mediaName || 'arquivo'}
                      target="_blank"
                      rel="noreferrer"
                      className={`flex items-center gap-3 p-2.5 rounded-xl border ${
                        isMe ? 'bg-emerald-700/50 border-emerald-500/50 text-white' : 'bg-slate-950/60 border-slate-800 text-slate-200'
                      }`}
                    >
                      <FileText className="w-6 h-6 text-emerald-400 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold truncate">{msg.mediaName || 'Arquivo anexado'}</p>
                        <span className="text-[10px] opacity-75">Clique para baixar</span>
                      </div>
                      <Download className="w-4 h-4 shrink-0 opacity-80" />
                    </a>
                  )}

                  {/* Timestamp & Status */}
                  <div className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${
                    isMe ? 'text-emerald-100/80' : 'text-slate-400'
                  }`}>
                    <span>{formatTime(msg.timestamp)}</span>
                    {isMe && <CheckCheck className="w-3 h-3 text-emerald-200" />}
                  </div>

                  {/* Reactions List */}
                  {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2 pt-1 border-t border-black/10">
                      {Object.entries(msg.reactions).map(([emoji, users]) => {
                        const userList = (users || []) as string[];
                        const reactedByMe = userList.includes(nickname);
                        return (
                          <button
                            key={emoji}
                            onClick={() => onReact(msg.id, emoji)}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold transition-transform active:scale-90 ${
                              reactedByMe
                                ? 'bg-emerald-500/30 text-white border border-emerald-400/50'
                                : 'bg-slate-950/40 text-slate-300 border border-slate-800'
                            }`}
                            title={`Reagido por: ${userList.join(', ')}`}
                          >
                            <span>{emoji}</span>
                            <span>{userList.length}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Action Quick Bar on hover/click */}
                  <div className={`absolute top-0 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-full px-2 py-1 shadow-lg z-10 ${
                    isMe ? 'right-2' : 'left-2'
                  }`}>
                    {EMOJI_PRESETS.slice(0, 4).map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => onReact(msg.id, emoji)}
                        className="hover:scale-125 transition-transform text-sm p-0.5"
                      >
                        {emoji}
                      </button>
                    ))}
                    <button
                      onClick={() => onReply(msg)}
                      className="p-1 text-slate-400 hover:text-white transition-colors"
                      title="Responder"
                    >
                      <Reply className="w-3.5 h-3.5" />
                    </button>
                    {(isMe || msg.sender === nickname) && (
                      <button
                        onClick={() => onDelete(msg.id)}
                        className="p-1 text-rose-400 hover:text-rose-300 transition-colors"
                        title="Apagar mensagem"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })
      )}

      {/* Typing indicator */}
      {typingUsers.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-emerald-400 font-medium py-1 px-3 bg-slate-900/70 border border-slate-800/80 rounded-full w-fit animate-pulse">
          <Smile className="w-3.5 h-3.5" />
          <span>{typingUsers.join(', ')} {typingUsers.length === 1 ? 'está digitando...' : 'estão digitando...'}</span>
        </div>
      )}
    </div>
  );
};
