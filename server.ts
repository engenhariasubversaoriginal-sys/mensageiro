import express from 'express';
import { createServer } from 'http';
import path from 'path';
import { setupChatBackend } from './server/chatBackend.js';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '15mb' }));

const httpServer = createServer(app);

// Mount API and WebSocket
setupChatBackend(app, httpServer);

// Serve static build in production
const distPath = path.resolve(process.cwd(), 'dist');
app.use(express.static(distPath));

app.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on http://0.0.0.0:${PORT}`);
});
