export const CAPABILITIES = ['xhs.publish_note'];

function readJson(raw) {
  try {
    return JSON.parse(String(raw));
  } catch (error) {
    throw new Error(`Invalid gateway message JSON: ${error.message}`);
  }
}

function assertString(value, name) {
  if (!value || typeof value !== 'string') {
    throw new Error(`Invalid gateway message: ${name} must be a non-empty string`);
  }
}

export function createHelloMessage({ userId, deviceId, token }) {
  assertString(userId, 'userId');
  assertString(deviceId, 'deviceId');
  assertString(token, 'token');

  return {
    type: 'agent.hello',
    userId,
    deviceId,
    token,
    capabilities: CAPABILITIES,
  };
}

export function parseGatewayMessage(raw) {
  const message = readJson(raw);

  if (message.type !== 'task.run') {
    throw new Error(`Unsupported gateway message type: ${message.type}`);
  }

  assertString(message.taskId, 'taskId');
  assertString(message.tool, 'tool');

  if (!CAPABILITIES.includes(message.tool)) {
    throw new Error(`Unsupported tool: ${message.tool}`);
  }

  const payload = message.payload || {};
  if (typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('Invalid gateway message: payload must be an object');
  }

  return {
    type: message.type,
    taskId: message.taskId,
    tool: message.tool,
    payload: {
      title: String(payload.title || ''),
      content: String(payload.content || ''),
      imagePaths: Array.isArray(payload.imagePaths) ? payload.imagePaths.map(String) : [],
      publish: Boolean(payload.publish),
      confirmBeforePublish: payload.confirmBeforePublish,
    },
  };
}

export function createTaskResultMessage({ taskId, ok, result, error }) {
  const message = {
    type: 'task.result',
    taskId,
    ok: Boolean(ok),
  };

  if (ok) {
    message.result = result || {};
  } else {
    message.error = String(error || 'Unknown task error');
  }

  return message;
}
