// Servidor WebSocket y WebRTC para sistema tipo walkie-talkie
const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;

// Mapa de clientes: nombre => ws
const clients = new Map();

function broadcastUserList() {
  const userList = [...clients.keys()];
  const payload = JSON.stringify({ type: 'userlist', users: userList });
  for (const ws of clients.values()) {
    ws.send(payload);
  }
}

wss.on('connection', (ws) => {
  let username = null;

  ws.on('message', (message) => {
    let data;
    try {
      data = JSON.parse(message);
    } catch (err) {
      return ws.send(JSON.stringify({ type: 'error', message: 'Formato JSON inválido' }));
    }

    switch (data.type) {
      case 'register': {
        const name = data.name?.trim();
        if (!name || clients.has(name)) {
          return ws.send(JSON.stringify({ type: 'error', message: 'Nombre inválido o en uso' }));
        }
        username = name;
        clients.set(username, ws);
        broadcastUserList();
        break;
      }
      case 'signal': {
        const target = clients.get(data.to);
        if (target && username) {
          target.send(JSON.stringify({ type: 'signal', from: username, signal: data.signal }));
        }
        break;
      }
      case 'disconnect': {
        if (username) {
          clients.delete(username);
          broadcastUserList();
        }
        break;
      }
    }
  });

  ws.on('close', () => {
    if (username) {
      clients.delete(username);
      broadcastUserList();
    }
  });
});

server.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
