import http from 'node:http';
import { WebSocketServer } from 'ws';

const PORT = Number(process.env.PORT || 8787);
const agents = new Map();

function sendJson(socket, message) {
  socket.send(JSON.stringify(message));
}

const server = http.createServer((request, response) => {
  if (request.method === 'POST' && request.url === '/tasks/xhs-publish') {
    let body = '';
    request.on('data', (chunk) => {
      body += chunk;
    });
    request.on('end', () => {
      try {
        const task = JSON.parse(body || '{}');
        const agent = agents.get(task.deviceId);
        if (!agent) {
          response.writeHead(404, { 'content-type': 'application/json' });
          response.end(JSON.stringify({ ok: false, error: 'Agent device is offline' }));
          return;
        }

        const taskId = task.taskId || `task-${Date.now()}`;
        sendJson(agent.socket, {
          type: 'task.run',
          taskId,
          tool: 'xhs.publish_note',
          payload: {
            title: task.title,
            content: task.content,
            imagePaths: task.imagePaths || [],
            publish: Boolean(task.publish),
          },
        });

        response.writeHead(202, { 'content-type': 'application/json' });
        response.end(JSON.stringify({ ok: true, taskId }));
      } catch (error) {
        response.writeHead(400, { 'content-type': 'application/json' });
        response.end(JSON.stringify({ ok: false, error: error.message }));
      }
    });
    return;
  }

  response.writeHead(200, { 'content-type': 'application/json' });
  response.end(JSON.stringify({
    ok: true,
    agents: Array.from(agents.keys()),
    postTaskUrl: `http://127.0.0.1:${PORT}/tasks/xhs-publish`,
  }));
});

const wss = new WebSocketServer({ server, path: '/agent/ws' });

wss.on('connection', (socket) => {
  let deviceId = null;

  socket.on('message', (raw) => {
    const message = JSON.parse(String(raw));

    if (message.type === 'agent.hello') {
      deviceId = message.deviceId;
      agents.set(deviceId, {
        socket,
        userId: message.userId,
        capabilities: message.capabilities || [],
      });
      console.log(`[gateway] agent online: ${message.userId}/${deviceId}`);
      return;
    }

    if (message.type === 'task.result') {
      console.log('[gateway] task result:', JSON.stringify(message, null, 2));
    }
  });

  socket.on('close', () => {
    if (deviceId) {
      agents.delete(deviceId);
      console.log(`[gateway] agent offline: ${deviceId}`);
    }
  });
});

server.listen(PORT, () => {
  console.log(`[gateway] listening on http://127.0.0.1:${PORT}`);
});
