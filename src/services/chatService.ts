import { Message, Room } from '../types/chat';

type EventListener = (data: any) => void;

class ChatService {
  private ws: WebSocket | null = null;
  private listeners: Map<string, Set<EventListener>> = new Map();
  private reconnectTimer: any = null;
  public isConnected: boolean = false;
  private currentNickname: string = '';
  private currentRoomId: string = 'general';
  private pollingTimer: any = null;

  // Verify password with backend
  async verifyPassword(password: string): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      return data;
    } catch (err: any) {
      console.error('Verify error:', err);
      return { success: false, error: 'Erro ao conectar ao servidor' };
    }
  }

  // Connect WebSocket
  connectWS(nickname: string, roomId: string = 'general') {
    this.currentNickname = nickname;
    this.currentRoomId = roomId;

    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      this.sendWS({ type: 'switch_room', roomId });
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.isConnected = true;
        this.emit('connection_change', { connected: true });

        // Authenticate & Join room
        this.sendWS({
          type: 'auth',
          password: 'shutdown',
          nickname,
          roomId,
        });

        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }

        // Stop fallback polling if active
        if (this.pollingTimer) {
          clearInterval(this.pollingTimer);
          this.pollingTimer = null;
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleWSMessage(data);
        } catch (e) {
          console.error('WS parse error:', e);
        }
      };

      this.ws.onerror = (err) => {
        console.warn('WS error, fallback to REST polling:', err);
        this.isConnected = false;
        this.emit('connection_change', { connected: false });
        this.startPollingFallback();
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        this.emit('connection_change', { connected: false });
        this.startPollingFallback();

        // Schedule auto-reconnect
        if (!this.reconnectTimer) {
          this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            if (this.currentNickname) {
              this.connectWS(this.currentNickname, this.currentRoomId);
            }
          }, 3000);
        }
      };
    } catch (err) {
      console.error('Failed to create WebSocket:', err);
      this.startPollingFallback();
    }
  }

  private startPollingFallback() {
    if (this.pollingTimer) return;
    this.pollingTimer = setInterval(() => {
      this.fetchRooms();
      this.fetchMessages(this.currentRoomId);
    }, 4000);
  }

  private sendWS(payload: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    }
  }

  private handleWSMessage(data: any) {
    if (data.type === 'init') {
      this.emit('init', data);
    } else if (data.type === 'message') {
      this.emit('message', data.message);
    } else if (data.type === 'room_created') {
      this.emit('room_created', data.room);
    } else if (data.type === 'message_deleted') {
      this.emit('message_deleted', data);
    } else if (data.type === 'reaction') {
      this.emit('reaction', data);
    } else if (data.type === 'user_joined' || data.type === 'user_left') {
      this.emit('presence_change', data);
    } else if (data.type === 'user_typing') {
      this.emit('user_typing', data);
    } else if (data.type === 'room_switched') {
      this.emit('room_switched', data);
    }
  }

  switchRoom(roomId: string) {
    this.currentRoomId = roomId;
    if (this.isConnected && this.ws) {
      this.sendWS({ type: 'switch_room', roomId });
    }
    this.fetchMessages(roomId);
  }

  sendTyping(isTyping: boolean) {
    if (this.isConnected) {
      this.sendWS({ type: 'typing', roomId: this.currentRoomId, isTyping });
    }
  }

  // REST API methods
  async fetchRooms(): Promise<Room[]> {
    try {
      const res = await fetch('/api/rooms');
      const data = await res.json();
      if (data.rooms) {
        this.emit('rooms_update', data.rooms);
        if (data.onlineUsers) {
          this.emit('online_users', data.onlineUsers);
        }
        return data.rooms;
      }
    } catch (e) {
      console.error('Fetch rooms error:', e);
    }
    return [];
  }

  async fetchMessages(roomId: string): Promise<Message[]> {
    try {
      const res = await fetch(`/api/messages?roomId=${encodeURIComponent(roomId)}`);
      const data = await res.json();
      if (data.messages) {
        this.emit('messages_loaded', { roomId, messages: data.messages });
        return data.messages;
      }
    } catch (e) {
      console.error('Fetch messages error:', e);
    }
    return [];
  }

  async sendMessage(params: {
    roomId: string;
    sender: string;
    content: string;
    type?: 'text' | 'image' | 'voice' | 'file' | 'system';
    mediaUrl?: string;
    mediaName?: string;
    replyTo?: { id: string; sender: string; content: string };
  }): Promise<Message | null> {
    // Try WS first if connected
    if (this.isConnected) {
      this.sendWS({
        type: 'send_message',
        roomId: params.roomId,
        sender: params.sender,
        content: params.content,
        messageType: params.type || 'text',
        mediaUrl: params.mediaUrl,
        mediaName: params.mediaName,
        replyTo: params.replyTo,
      });
      return null;
    }

    // Fallback to HTTP REST
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      const data = await res.json();
      return data.message || null;
    } catch (e) {
      console.error('Send message error:', e);
      return null;
    }
  }

  async createRoom(name: string, description?: string, createdBy?: string, isPrivate?: boolean): Promise<Room | null> {
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, createdBy, isPrivate }),
      });
      const data = await res.json();
      return data.room || null;
    } catch (e) {
      console.error('Create room error:', e);
      return null;
    }
  }

  async reactToMessage(messageId: string, emoji: string, nickname: string) {
    try {
      const res = await fetch(`/api/messages/${encodeURIComponent(messageId)}/react`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emoji, nickname }),
      });
      return await res.json();
    } catch (e) {
      console.error('React error:', e);
    }
  }

  async deleteMessage(messageId: string) {
    try {
      const res = await fetch(`/api/messages/${encodeURIComponent(messageId)}`, {
        method: 'DELETE',
      });
      return await res.json();
    } catch (e) {
      console.error('Delete message error:', e);
    }
  }

  // Event listener system
  on(event: string, listener: EventListener) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
  }

  off(event: string, listener: EventListener) {
    if (this.listeners.has(event)) {
      this.listeners.get(event)!.delete(listener);
    }
  }

  private emit(event: string, data: any) {
    if (this.listeners.has(event)) {
      this.listeners.get(event)!.forEach((listener) => {
        try {
          listener(data);
        } catch (e) {
          console.error(`Error in listener for ${event}:`, e);
        }
      });
    }
  }
}

export const chatService = new ChatService();
