import WebSocket from 'ws';
import { createHelloMessage, createTaskResultMessage, parseGatewayMessage } from './protocol.js';
import { publishXhsNote } from './xhs-publisher.js';

export function startAgent({ config, browser, logger = console }) {
  const socket = new WebSocket(config.gatewayUrl);

  socket.on('open', () => {
    socket.send(JSON.stringify(createHelloMessage({
      userId: config.userId,
      deviceId: config.deviceId,
      token: config.token,
    })));
    logger.log(`[agent] connected as ${config.userId}/${config.deviceId}`);
  });

  socket.on('message', async (raw) => {
    let task;
    try {
      task = parseGatewayMessage(raw);
      const payload = {
        ...task.payload,
        confirmBeforePublish:
          task.payload.confirmBeforePublish ?? config.confirmBeforePublish,
      };
      const result = await publishXhsNote(browser.page, payload);
      socket.send(JSON.stringify(createTaskResultMessage({
        taskId: task.taskId,
        ok: true,
        result,
      })));
    } catch (error) {
      const taskId = task?.taskId || 'unknown';
      socket.send(JSON.stringify(createTaskResultMessage({
        taskId,
        ok: false,
        error: error.message,
      })));
      logger.error('[agent] task failed:', error);
    }
  });

  socket.on('close', () => {
    logger.log('[agent] disconnected from gateway');
  });

  socket.on('error', (error) => {
    logger.error('[agent] websocket error:', error.message);
  });

  return socket;
}
