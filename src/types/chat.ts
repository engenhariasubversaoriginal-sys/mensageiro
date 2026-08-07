export interface Message {
  id: string;
  roomId: string;
  sender: string;
  content: string;
  type: 'text' | 'image' | 'voice' | 'file' | 'system';
  mediaUrl?: string;
  mediaName?: string;
  timestamp: number;
  replyTo?: {
    id: string;
    sender: string;
    content: string;
  };
  reactions?: Record<string, string[]>; // emoji -> array of nicknames
}

export interface Room {
  id: string;
  name: string;
  description?: string;
  isPrivate?: boolean;
  createdBy?: string;
  createdTimestamp: number;
  unreadCount?: number;
}

export interface AuthState {
  isAuthenticated: boolean;
  nickname: string;
}

export type ThemeMode = 'dark' | 'light';
