import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Mic, Smile, X, Image as ImageIcon, FileText, Square, CornerDownRight } from 'lucide-react';
import { Message } from '../types/chat';

interface MessageInputProps {
  onSendMessage: (
    content: string,
    type?: 'text' | 'image' | 'voice' | 'file',
    mediaUrl?: string,
    mediaName?: string,
    replyTo?: { id: string; sender: string; content: string }
  ) => void;
  replyingMessage: Message | null;
  onClearReply: () => void;
  onTyping: (isTyping: boolean) => void;
}

const QUICK_EMOJIS = ['😄', '😂', '❤️', '👍', '🔥', '🚀', '🔒', '💬', '✨', '🎧', '📸', '📁', '🎉', '👏', '💯', '⭐'];

export const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  replyingMessage,
  onClearReply,
  onTyping,
}) => {
  const [text, setText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const typingTimerRef = useRef<any>(null);

  // Auto typing signal
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    onTyping(true);

    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      onTyping(false);
    }, 2000);
  };

  const handleSend = () => {
    const cleanText = text.trim();
    if (!cleanText) return;

    onSendMessage(
      cleanText,
      'text',
      undefined,
      undefined,
      replyingMessage
        ? { id: replyingMessage.id, sender: replyingMessage.sender, content: replyingMessage.content }
        : undefined
    );

    setText('');
    setShowEmojiPicker(false);
    onClearReply();
    onTyping(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const insertEmoji = (emoji: string) => {
    setText((prev) => prev + emoji);
  };

  // Image Upload Handler
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (base64) {
        onSendMessage(
          text.trim() || 'Foto enviada',
          'image',
          base64,
          file.name,
          replyingMessage
            ? { id: replyingMessage.id, sender: replyingMessage.sender, content: replyingMessage.content }
            : undefined
        );
        setText('');
        onClearReply();
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // File Upload Handler
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (base64) {
        onSendMessage(
          text.trim() || `Arquivo: ${file.name}`,
          'file',
          base64,
          file.name,
          replyingMessage
            ? { id: replyingMessage.id, sender: replyingMessage.sender, content: replyingMessage.content }
            : undefined
        );
        setText('');
        onClearReply();
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Voice Recording
  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result as string;
          if (base64) {
            onSendMessage('Áudio de voz', 'voice', base64, 'audio.webm');
          }
        };
        reader.readAsDataURL(audioBlob);

        // Stop media tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);

      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      alert('Não foi possível acessar o microfone para gravar áudio.');
    }
  };

  const stopVoiceRecording = (send: boolean) => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (mediaRecorderRef.current && isRecording) {
      if (!send) {
        // Cancel recording without sending
        mediaRecorderRef.current.onstop = null;
        mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      }
      mediaRecorderRef.current.stop();
    }

    setIsRecording(false);
    setRecordingSeconds(0);
  };

  const formatSecs = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div id="message-input-toolbar" className="sticky bottom-0 z-20 bg-slate-900 border-t border-slate-800 p-2 sm:p-3">
      {/* Hidden inputs */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageSelect}
        className="hidden"
      />
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Quoted Reply Banner */}
      {replyingMessage && (
        <div className="flex items-center justify-between p-2 mb-2 bg-slate-950/80 border-l-4 border-emerald-500 rounded-r-xl text-xs text-slate-300">
          <div className="flex items-center gap-2 min-w-0">
            <CornerDownRight className="w-4 h-4 text-emerald-400 shrink-0" />
            <div className="truncate">
              <span className="font-semibold text-emerald-400">Respondendo a {replyingMessage.sender}:</span>{' '}
              <span className="italic">{replyingMessage.content || 'Mídia'}</span>
            </div>
          </div>
          <button
            onClick={onClearReply}
            className="p-1 text-slate-400 hover:text-white rounded-md"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Emoji Quick Picker Popup */}
      {showEmojiPicker && (
        <div id="emoji-picker-panel" className="mb-2 p-3 bg-slate-950 border border-slate-800 rounded-2xl shadow-xl flex flex-wrap gap-2 max-h-36 overflow-y-auto">
          {QUICK_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => insertEmoji(emoji)}
              className="text-xl p-1.5 hover:bg-slate-800 rounded-xl transition-transform active:scale-125"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Voice Recorder active state */}
      {isRecording ? (
        <div className="flex items-center justify-between gap-3 p-2 bg-rose-950/40 border border-rose-500/30 rounded-2xl animate-pulse">
          <div className="flex items-center gap-2 text-rose-400 text-sm font-semibold pl-2">
            <div className="w-3 h-3 rounded-full bg-rose-500 animate-ping" />
            <span>Gravando áudio... {formatSecs(recordingSeconds)}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => stopVoiceRecording(false)}
              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-xl transition-colors"
              title="Cancelar"
            >
              <X className="w-5 h-5" />
            </button>
            <button
              onClick={() => stopVoiceRecording(true)}
              className="px-4 py-2 bg-rose-500 hover:bg-rose-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1 shadow-lg"
            >
              <Send className="w-4 h-4" />
              <span>Enviar</span>
            </button>
          </div>
        </div>
      ) : (
        /* Regular Input Toolbar */
        <div className="flex items-end gap-1.5 sm:gap-2">
          {/* File/Image Actions */}
          <div className="flex items-center gap-0.5 sm:gap-1">
            <button
              id="btn-upload-image"
              onClick={() => imageInputRef.current?.click()}
              className="p-2.5 rounded-xl text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition-colors"
              title="Enviar Foto / Imagem"
            >
              <ImageIcon className="w-5 h-5" />
            </button>
            <button
              id="btn-upload-file"
              onClick={() => fileInputRef.current?.click()}
              className="p-2.5 rounded-xl text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition-colors"
              title="Anexar Arquivo"
            >
              <Paperclip className="w-5 h-5" />
            </button>
            <button
              id="btn-toggle-emojis"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className={`p-2.5 rounded-xl transition-colors ${
                showEmojiPicker ? 'text-emerald-400 bg-slate-800' : 'text-slate-400 hover:text-emerald-400 hover:bg-slate-800'
              }`}
              title="Emojis"
            >
              <Smile className="w-5 h-5" />
            </button>
          </div>

          {/* Text Area */}
          <div className="flex-1 min-w-0">
            <textarea
              id="chat-textarea"
              value={text}
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
              placeholder="Digite sua mensagem..."
              rows={1}
              className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-800 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors text-sm sm:text-base resize-none max-h-28"
            />
          </div>

          {/* Voice Record OR Send Button */}
          {text.trim() ? (
            <button
              id="btn-send-message"
              onClick={handleSend}
              className="p-3 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 font-bold rounded-2xl transition-transform active:scale-95 shadow-lg shadow-emerald-500/20 shrink-0"
              title="Enviar Mensagem"
            >
              <Send className="w-5 h-5" />
            </button>
          ) : (
            <button
              id="btn-start-record-voice"
              onClick={startVoiceRecording}
              className="p-3 bg-slate-800 hover:bg-emerald-500 hover:text-slate-950 text-slate-300 rounded-2xl transition-all shrink-0"
              title="Gravar Áudio de Voz"
            >
              <Mic className="w-5 h-5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};
