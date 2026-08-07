import React, { useState, useEffect, useCallback } from 'react';
import { AuthState, Message, Room } from './types/chat';
import { chatService } from './services/chatService';
import { soundService } from './services/soundService';
import { LoginModal } from './components/LoginModal';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { ChatStream } from './components/ChatStream';
import { MessageInput } from './components/MessageInput';
import { CreateRoomModal } from './components/CreateRoomModal';
import { SearchModal } from './components/SearchModal';
import { ImageLightbox } from './components/ImageLightbox';

export default function App() {
  const [authState, setAuthState] = useState<AuthState>(() => {
    const savedNick = localStorage.getItem('shutdown_nick');
    return {
      isAuthenticated: !!savedNick,
      nickname: savedNick || '',
    };
  });

  const [rooms, setRooms] = useState<Room[]>([
    { id: 'general', name: '💬 Geral', description: 'Bate-papo principal para todos', createdTimestamp: Date.now() },
    { id: 'noticias', name: '📢 Anúncios e Avisos', description: 'Avisos importantes', createdTimestamp: Date.now() },
    { id: 'privado', name: '🔒 Sala Secreta', description: 'Espaço reservado', createdTimestamp: Date.now() },
  ]);

  const [currentRoomId, setCurrentRoomId] = useState<string>('general');
  const [messages, setMessages] = useState<Message[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);

  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [isCreateRoomOpen, setIsCreateRoomOpen] = useState<boolean>(false);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [replyingMessage, setReplyingMessage] = useState<Message | null>(null);

  // Unread badge tracker
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  // Auth handler
  const handleLoginSuccess = (nickname: string) => {
    localStorage.setItem('shutdown_nick', nickname);
    setAuthState({ isAuthenticated: true, nickname });
  };

  const handleLogout = () => {
    localStorage.removeItem('shutdown_nick');
    setAuthState({ isAuthenticated: false, nickname: '' });
  };

  // Connect and set event listeners on mount or login
  useEffect(() => {
    if (!authState.isAuthenticated || !authState.nickname) return;

    chatService.connectWS(authState.nickname, currentRoomId);
    chatService.fetchRooms();
    chatService.fetchMessages(currentRoomId);

    const handleInit = (data: any) => {
      if (data.rooms) setRooms(data.rooms);
      if (data.messages) setMessages(data.messages);
      if (data.onlineUsers) setOnlineUsers(data.onlineUsers);
    };

    const handleMessage = (newMsg: Message) => {
      setMessages((prev) => {
        // Idempotency check
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });

      // Play sound if message is from another user
      if (newMsg.sender !== authState.nickname) {
        soundService.playReceiveSound();
      } else {
        soundService.playSendSound();
      }

      // If message is in another room, increment unread count
      if (newMsg.roomId !== currentRoomId) {
        setUnreadCounts((prev) => ({
          ...prev,
          [newMsg.roomId]: (prev[newMsg.roomId] || 0) + 1,
        }));
      }
    };

    const handleRoomCreated = (newRoom: Room) => {
      setRooms((prev) => {
        if (prev.some((r) => r.id === newRoom.id)) return prev;
        return [...prev, newRoom];
      });
    };

    const handleMessageDeleted = (data: { messageId: string }) => {
      setMessages((prev) => prev.filter((m) => m.id !== data.messageId));
    };

    const handleReaction = (data: { messageId: string; reactions: Record<string, string[]> }) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === data.messageId ? { ...m, reactions: data.reactions } : m))
      );
    };

    const handlePresenceChange = (data: { onlineUsers: string[] }) => {
      if (data.onlineUsers) setOnlineUsers(data.onlineUsers);
    };

    const handleUserTyping = (data: { nickname: string; isTyping: boolean; roomId: string }) => {
      if (data.roomId === currentRoomId && data.nickname !== authState.nickname) {
        setTypingUsers((prev) => {
          if (data.isTyping) {
            return prev.includes(data.nickname) ? prev : [...prev, data.nickname];
          } else {
            return prev.filter((u) => u !== data.nickname);
          }
        });
      }
    };

    const handleRoomSwitched = (data: { roomId: string; messages: Message[] }) => {
      if (data.messages) setMessages(data.messages);
    };

    const handleRoomsUpdate = (roomList: Room[]) => {
      setRooms(roomList);
    };

    const handleMessagesLoaded = (data: { roomId: string; messages: Message[] }) => {
      if (data.roomId === currentRoomId) {
        setMessages(data.messages);
      }
    };

    chatService.on('init', handleInit);
    chatService.on('message', handleMessage);
    chatService.on('room_created', handleRoomCreated);
    chatService.on('message_deleted', handleMessageDeleted);
    chatService.on('reaction', handleReaction);
    chatService.on('presence_change', handlePresenceChange);
    chatService.on('user_typing', handleUserTyping);
    chatService.on('room_switched', handleRoomSwitched);
    chatService.on('rooms_update', handleRoomsUpdate);
    chatService.on('messages_loaded', handleMessagesLoaded);

    return () => {
      chatService.off('init', handleInit);
      chatService.off('message', handleMessage);
      chatService.off('room_created', handleRoomCreated);
      chatService.off('message_deleted', handleMessageDeleted);
      chatService.off('reaction', handleReaction);
      chatService.off('presence_change', handlePresenceChange);
      chatService.off('user_typing', handleUserTyping);
      chatService.off('room_switched', handleRoomSwitched);
      chatService.off('rooms_update', handleRoomsUpdate);
      chatService.off('messages_loaded', handleMessagesLoaded);
    };
  }, [authState.isAuthenticated, authState.nickname, currentRoomId]);

  // Switch Room
  const handleSelectRoom = (roomId: string) => {
    setCurrentRoomId(roomId);
    setReplyingMessage(null);
    setTypingUsers([]);
    chatService.switchRoom(roomId);

    // Clear unread badge
    setUnreadCounts((prev) => ({
      ...prev,
      [roomId]: 0,
    }));
  };

  // Create Room
  const handleCreateRoom = async (name: string, description?: string, isPrivate?: boolean) => {
    const newRoom = await chatService.createRoom(name, description, authState.nickname, isPrivate);
    if (newRoom) {
      handleSelectRoom(newRoom.id);
    }
  };

  // Send Message
  const handleSendMessage = (
    content: string,
    type: 'text' | 'image' | 'voice' | 'file' = 'text',
    mediaUrl?: string,
    mediaName?: string,
    replyTo?: { id: string; sender: string; content: string }
  ) => {
    chatService.sendMessage({
      roomId: currentRoomId,
      sender: authState.nickname,
      content,
      type,
      mediaUrl,
      mediaName,
      replyTo,
    });
  };

  // Toggle Reaction
  const handleReact = (messageId: string, emoji: string) => {
    chatService.reactToMessage(messageId, emoji, authState.nickname);
  };

  // Delete Message
  const handleDelete = (messageId: string) => {
    chatService.deleteMessage(messageId);
  };

  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    soundService.enabled = next;
  };

  const currentRoom = rooms.find((r) => r.id === currentRoomId) || rooms[0] || null;
  const totalUnread = Object.values(unreadCounts).reduce((a: number, b: number) => a + b, 0);

  if (!authState.isAuthenticated) {
    return <LoginModal onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div id="app-root-container" className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 font-sans overflow-hidden select-none">
      {/* Header */}
      <Header
        currentRoom={currentRoom}
        onlineCount={onlineUsers.length}
        nickname={authState.nickname}
        soundEnabled={soundEnabled}
        onToggleSound={handleToggleSound}
        onOpenSidebar={() => setIsSidebarOpen(true)}
        onOpenSearch={() => setIsSearchOpen(true)}
        onLogout={handleLogout}
        unreadTotal={totalUnread}
      />

      {/* Main Chat Stream Container */}
      <main id="chat-stream-main" className="flex-1 flex flex-col min-h-0 relative">
        <ChatStream
          messages={messages}
          nickname={authState.nickname}
          onReact={handleReact}
          onDelete={handleDelete}
          onReply={(msg) => setReplyingMessage(msg)}
          onOpenLightBox={(url) => setLightboxImage(url)}
          typingUsers={typingUsers}
        />

        {/* Bottom Input */}
        <MessageInput
          onSendMessage={handleSendMessage}
          replyingMessage={replyingMessage}
          onClearReply={() => setReplyingMessage(null)}
          onTyping={(isTyping) => chatService.sendTyping(isTyping)}
        />
      </main>

      {/* Sidebar Drawer */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        rooms={rooms.map((r) => ({ ...r, unreadCount: unreadCounts[r.id] || 0 }))}
        currentRoomId={currentRoomId}
        onSelectRoom={handleSelectRoom}
        onlineUsers={onlineUsers}
        nickname={authState.nickname}
        onOpenCreateRoom={() => {
          setIsSidebarOpen(false);
          setIsCreateRoomOpen(true);
        }}
      />

      {/* Modals */}
      <CreateRoomModal
        isOpen={isCreateRoomOpen}
        onClose={() => setIsCreateRoomOpen(false)}
        onCreate={handleCreateRoom}
      />

      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        messages={messages}
      />

      <ImageLightbox
        imageUrl={lightboxImage}
        onClose={() => setLightboxImage(null)}
      />
    </div>
  );
}
