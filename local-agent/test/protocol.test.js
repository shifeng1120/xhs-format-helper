import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createHelloMessage,
  createTaskResultMessage,
  parseGatewayMessage,
} from '../src/protocol.js';

test('creates hello message with user and device identity', () => {
  const message = createHelloMessage({
    userId: 'user-1',
    deviceId: 'device-1',
    token: 'agent-token',
  });

  assert.equal(message.type, 'agent.hello');
  assert.equal(message.userId, 'user-1');
  assert.equal(message.deviceId, 'device-1');
  assert.equal(message.token, 'agent-token');
  assert.ok(message.capabilities.includes('xhs.publish_note'));
});

test('parses valid publish task message', () => {
  const parsed = parseGatewayMessage(JSON.stringify({
    type: 'task.run',
    taskId: 'task-1',
    tool: 'xhs.publish_note',
    payload: {
      title: '测试标题',
      content: '测试正文',
      imagePaths: ['D:\\素材\\1.png'],
      publish: false,
    },
  }));

  assert.equal(parsed.taskId, 'task-1');
  assert.equal(parsed.tool, 'xhs.publish_note');
  assert.equal(parsed.payload.title, '测试标题');
  assert.equal(parsed.payload.publish, false);
});

test('rejects unsupported task tool', () => {
  assert.throws(
    () => parseGatewayMessage(JSON.stringify({
      type: 'task.run',
      taskId: 'task-1',
      tool: 'file.read',
      payload: {},
    })),
    /Unsupported tool/,
  );
});

test('creates task result message for successful task', () => {
  const message = createTaskResultMessage({
    taskId: 'task-1',
    ok: true,
    result: { draftReady: true },
  });

  assert.deepEqual(message, {
    type: 'task.result',
    taskId: 'task-1',
    ok: true,
    result: { draftReady: true },
  });
});
