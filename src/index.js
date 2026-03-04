import express from 'express';
import http from 'node:http';

import { matchRouter } from './routes/matches.routes.js';
import { attachWebSocketServer } from './ws/server.js';
import { securityMiddleware } from './arcjet.js';
import { commentaryRouter } from './routes/commentary.routes.js';

const app = express();

const rawPort = process.env.PORT ?? '8000';
const PORT = Number.parseInt(rawPort, 10);
if (!Number.isInteger(PORT) || PORT < 0 || PORT > 65535) {
  throw new Error(`Invalid PORT value: ${rawPort}`);
}
const HOST = process.env.HOST || '0.0.0.0';

app.use(express.json());
app.use(securityMiddleware());

const server = http.createServer(app);

app.get('/', (req, res) => {
  res.json({ message: 'Server is up and running.' });
});

app.use('/matches', matchRouter);
app.use('/matches/:id/commentary', commentaryRouter);

const { broadcastMatchCreated } = attachWebSocketServer(server);
app.locals.broadcastMatchCreated = broadcastMatchCreated;

server.listen(PORT, HOST, () => {
  const baseUrl =
    HOST === '0.0.0.0' ? `http://localhost:${PORT}` : `http://${HOST}:${PORT}`;

  console.log(`Server is running on  ${baseUrl}`);
  console.log(
    `WebSocket Server is running on  ${baseUrl.replace('http', 'ws')}/ws`,
  );
});
