import { Express, Request, Response, Router } from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import { Server as HTTPServer } from 'http';
import fs from 'fs';
import path from 'path';

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
}

export interface UserPresence {
  nickname: string;
  lastActive: number;
  currentRoom: string;
}

const REQUIRED_PASSWORD = 'shutdown';
const DATA_DIR = path.resolve(process.cwd(), 'data');
const MESSAGES_FILE = path.join(DATA_DIR, 'messages.json');
const ROOMS_FILE = path.join(DATA_DIR, 'rooms.json');

// Initial default rooms
const DEFAULT_ROOMS: Room[] = [
  {
    id: 'general',
    name: '💬 Geral',
    description: 'Bate-papo principal para todos os membros',
    createdTimestamp: Date.now(),
  },
  {
    id: 'noticias',
    name: '📢 Anúncios e Avisos',
    description: 'Canal de avisos e novidades importantes',
    createdTimestamp: Date.now(),
  },
  {
    id: 'privado',
    name: '🔒 Sala Secreta',
    description: 'Espaço reservado para conversas diretas',
    createdTimestamp: Date.now(),
  }
];

// Initial default welcome messages
const INITIAL_MESSAGES: Message[] = [
  {
    id: 'msg_welcome_1',
    roomId: 'general',
    sender: 'Sistema 🤖',
    content: 'Bem-vindo ao Shutdown Messenger! Digite sua mensagem e converse em tempo real com qualquer pessoa conectada.',
    type: 'system',
    timestamp: Date.now() - 3600000,
  }
];

// In-memory data structures
let rooms: Room[] = [];
let messages: Message[] = [];
const connectedUsers = new Map<WebSocket, { nickname: string; currentRoom: string }>();

// Load persistent data
function loadData() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (fs.existsSync(ROOMS_FILE)) {
      const content = fs.readFileSync(ROOMS_FILE, 'utf-8');
      rooms = JSON.parse(content);
    } else {
      rooms = [...DEFAULT_ROOMS];
      saveRooms();
    }

    if (fs.existsSync(MESSAGES_FILE)) {
      const content = fs.readFileSync(MESSAGES_FILE, 'utf-8');
      messages = JSON.parse(content);
    } else {
      messages = [...INITIAL_MESSAGES];
      saveMessages();
    }
  } catch (err) {
    console.error('Error loading data, using memory fallbacks:', err);
    rooms = [...DEFAULT_ROOMS];
    messages = [...INITIAL_MESSAGES];
  }
}

function saveRooms() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(ROOMS_FILE, JSON.stringify(rooms, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save rooms:', err);
  }
}

function saveMessages() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    // Keep last 1000 messages to keep file reasonably small
    const trimmed = messages.slice(-1000);
    fs.writeFileSync(MESSAGES_FILE, JSON.stringify(trimmed, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save messages:', err);
  }
}

loadData();

// Helper to broadcast WS payloads
export function broadcastWS(payload: any, roomIdFilter?: string) {
  const json = JSON.stringify(payload);
  connectedUsers.forEach((userData, ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      if (!roomIdFilter || userData.currentRoom === roomIdFilter || payload.type === 'room_created' || payload.type === 'user_joined' || payload.type === 'user_left') {
        ws.send(json);
      }
    }
  });
}

function getOnlineNicknames(): string[] {
  const set = new Set<string>();
  connectedUsers.forEach((userData) => {
    if (userData.nickname) set.add(userData.nickname);
  });
  return Array.from(set);
}

export function setupChatBackend(app: Express, httpServer?: HTTPServer) {
  const router = Router();

  // Auth verification endpoint
  router.post('/auth/verify', (req: Request, res: Response) => {
    const { password } = req.body || {};
    if (!password) {
      return res.status(400).json({ success: false, error: 'Senha é obrigatória' });
    }

    if (String(password).trim().toLowerCase() === REQUIRED_PASSWORD) {
      return res.json({ success: true, message: 'Acesso autorizado' });
    }

    return res.status(401).json({ success: false, error: 'Senha incorreta! Tente novamente.' });
  });

  // Get rooms
  router.get('/rooms', (_req: Request, res: Response) => {
    res.json({ rooms, onlineUsers: getOnlineNicknames() });
  });

  // Create room
  router.post('/rooms', (req: Request, res: Response) => {
    const { name, description, createdBy, isPrivate } = req.body || {};
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Nome da sala inválido' });
    }

    const cleanName = name.trim();
    const id = cleanName.toLowerCase().replace(/[^a-z0-9_-]/g, '-').replace(/-+/g, '-') || `room-${Date.now()}`;

    const existing = rooms.find(r => r.id === id);
    if (existing) {
      return res.json({ room: existing });
    }

    const newRoom: Room = {
      id,
      name: cleanName,
      description: description ? String(description).trim() : undefined,
      isPrivate: !!isPrivate,
      createdBy: createdBy ? String(createdBy).trim() : 'Anônimo',
      createdTimestamp: Date.now(),
    };

    rooms.push(newRoom);
    saveRooms();

    // Broadcast new room
    broadcastWS({ type: 'room_created', room: newRoom });

    res.status(201).json({ room: newRoom });
  });

  // Get messages for a room
  router.get('/messages', (req: Request, res: Response) => {
    const roomId = (req.query.roomId as string) || 'general';
    const limit = parseInt(req.query.limit as string) || 100;

    const roomMsgs = messages
      .filter(m => m.roomId === roomId)
      .slice(-limit);

    res.json({ messages: roomMsgs });
  });

  // Post new message via HTTP REST
  router.post('/messages', (req: Request, res: Response) => {
    const { roomId = 'general', sender, content, type = 'text', mediaUrl, mediaName, replyTo } = req.body || {};

    if (!sender || typeof sender !== 'string' || !sender.trim()) {
      return res.status(400).json({ error: 'Apelido do remetente é obrigatório' });
    }

    if (!content && !mediaUrl) {
      return res.status(400).json({ error: 'Mensagem vazia' });
    }

    const newMessage: Message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      roomId: String(roomId),
      sender: String(sender).trim(),
      content: content ? String(content).trim() : '',
      type: ['text', 'image', 'voice', 'file', 'system'].includes(type) ? type : 'text',
      mediaUrl: mediaUrl ? String(mediaUrl) : undefined,
      mediaName: mediaName ? String(mediaName) : undefined,
      timestamp: Date.now(),
      replyTo: replyTo && typeof replyTo === 'object' ? replyTo : undefined,
      reactions: {},
    };

    messages.push(newMessage);
    saveMessages();

    // Broadcast to WS clients
    broadcastWS({ type: 'message', message: newMessage });

    res.status(201).json({ message: newMessage });
  });

  // Toggle emoji reaction
  router.post('/messages/:id/react', (req: Request, res: Response) => {
    const { id } = req.params;
    const { emoji, nickname } = req.body || {};

    if (!emoji || !nickname) {
      return res.status(400).json({ error: 'Emoji e apelido são obrigatórios' });
    }

    const msg = messages.find(m => m.id === id);
    if (!msg) {
      return res.status(404).json({ error: 'Mensagem não encontrada' });
    }

    if (!msg.reactions) msg.reactions = {};

    const users = msg.reactions[emoji] || [];
    const idx = users.indexOf(nickname);

    if (idx >= 0) {
      users.splice(idx, 1);
      if (users.length === 0) {
        delete msg.reactions[emoji];
      } else {
        msg.reactions[emoji] = users;
      }
    } else {
      msg.reactions[emoji] = [...users, nickname];
    }

    saveMessages();

    broadcastWS({
      type: 'reaction',
      messageId: msg.id,
      roomId: msg.roomId,
      reactions: msg.reactions,
    });

    res.json({ messageId: msg.id, reactions: msg.reactions });
  });

  // Delete message
  router.delete('/messages/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const idx = messages.findIndex(m => m.id === id);

    if (idx === -1) {
      return res.status(404).json({ error: 'Mensagem não encontrada' });
    }

    const [deleted] = messages.splice(idx, 1);
    saveMessages();

    broadcastWS({
      type: 'message_deleted',
      messageId: id,
      roomId: deleted.roomId,
    });

    res.json({ success: true, messageId: id });
  });

  // Online users list
  router.get('/online', (_req: Request, res: Response) => {
    res.json({ onlineUsers: getOnlineNicknames() });
  });

  // Mount API router
  app.use('/api', router);

  // Configure WebSocket server if httpServer is available
  if (httpServer) {
    const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

    wss.on('connection', (ws: WebSocket) => {
      connectedUsers.set(ws, { nickname: '', currentRoom: 'general' });

      ws.on('message', (raw: string) => {
        try {
          const data = JSON.parse(raw.toString());

          if (data.type === 'auth' || data.type === 'join') {
            const { nickname, password, roomId = 'general' } = data;

            // Optional password verify on socket
            if (password && String(password).trim().toLowerCase() !== REQUIRED_PASSWORD) {
              ws.send(JSON.stringify({ type: 'error', message: 'Senha incorreta' }));
              return;
            }

            const cleanNick = String(nickname || 'Anônimo').trim();
            connectedUsers.set(ws, { nickname: cleanNick, currentRoom: roomId });

            // Send initial state to connected client
            const roomMsgs = messages.filter(m => m.roomId === roomId).slice(-100);
            ws.send(JSON.stringify({
              type: 'init',
              rooms,
              messages: roomMsgs,
              onlineUsers: getOnlineNicknames(),
            }));

            // Notify everyone user joined
            broadcastWS({
              type: 'user_joined',
              nickname: cleanNick,
              onlineUsers: getOnlineNicknames(),
            });
          }

          if (data.type === 'switch_room') {
            const current = connectedUsers.get(ws);
            if (current) {
              const newRoom = data.roomId || 'general';
              current.currentRoom = newRoom;
              connectedUsers.set(ws, current);

              const roomMsgs = messages.filter(m => m.roomId === newRoom).slice(-100);
              ws.send(JSON.stringify({
                type: 'room_switched',
                roomId: newRoom,
                messages: roomMsgs,
              }));
            }
          }

          if (data.type === 'typing') {
            const current = connectedUsers.get(ws);
            if (current && current.nickname) {
              broadcastWS({
                type: 'user_typing',
                nickname: current.nickname,
                roomId: data.roomId || current.currentRoom,
                isTyping: !!data.isTyping,
              }, data.roomId || current.currentRoom);
            }
          }

          if (data.type === 'send_message') {
            const current = connectedUsers.get(ws);
            const sender = current?.nickname || data.sender || 'Anônimo';
            const { roomId = 'general', content, messageType = 'text', mediaUrl, mediaName, replyTo } = data;

            if (!content && !mediaUrl) return;

            const newMessage: Message = {
              id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
              roomId,
              sender,
              content: content ? String(content).trim() : '',
              type: messageType,
              mediaUrl,
              mediaName,
              timestamp: Date.now(),
              replyTo,
              reactions: {},
            };

            messages.push(newMessage);
            saveMessages();

            broadcastWS({ type: 'message', message: newMessage });
          }
        } catch (e) {
          console.error('Error handling WS message:', e);
        }
      });

      ws.on('close', () => {
        const current = connectedUsers.get(ws);
        connectedUsers.delete(ws);
        if (current && current.nickname) {
          broadcastWS({
            type: 'user_left',
            nickname: current.nickname,
            onlineUsers: getOnlineNicknames(),
          });
        }
      });
    });

    console.log('WebSocket Chat server initialized at /ws');
  }
}
