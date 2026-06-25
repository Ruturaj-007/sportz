import AgentAPI from 'apminsight';
AgentAPI.config();
import path from 'path';
import { fileURLToPath } from 'url';

import express from 'express';
import http from 'http';
import { matchRouter } from './routes/matches.js';
import { attachWebSocketServer } from './ws/server.js';
import { securityMiddleware } from './arcjet.js';
import { commentaryRouter } from './routes/commentary.js';
import { espnRouter } from './routes/espn.js';
import { startESPNPoller } from './ws/espn-poller.js';

const PORT = Number(process.env.PORT || 8000);
const HOST = process.env.HOST || '0.0.0.0';

const app = express();
const server = http.createServer(app);

app.use(express.json());

// CORS for frontend
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

app.get('/', (req, res) => res.send('Sportz API'));
app.get('/healthz', (req, res) => res.status(200).send('OK'));

// Legacy routes
app.use('/matches', matchRouter);
app.use('/matches/:id/commentary', commentaryRouter);

// ESPN routes
app.use('/api/v1', espnRouter);

const { broadcastMatchCreated, broadcastCommentary, broadcastToAll } = attachWebSocketServer(server);
app.locals.broadcastMatchCreated = broadcastMatchCreated;
app.locals.broadcastCommentary = broadcastCommentary;

// Start ESPN live score polling
startESPNPoller(broadcastToAll);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use(express.static(path.join(__dirname, '../public')));

server.listen(PORT, HOST, () => {
  const base = HOST === '0.0.0.0' ? `http://localhost:${PORT}` : `http://${HOST}:${PORT}`;
  console.log(`Server: ${base}`);
  console.log(`ESPN API: ${base}/api/v1/matches/live`);
  console.log(`WS: ${base.replace('http', 'ws')}/ws`);
});