import test from 'node:test';
import assert from 'node:assert/strict';
import { loadConfigFromEnv } from '../src/config.js';

test('loads required agent config from env values', () => {
  const config = loadConfigFromEnv({
    HERMES_GATEWAY_URL: 'wss://example.com/agent/ws',
    HERMES_AGENT_TOKEN: 'agent-token',
    HERMES_USER_ID: 'user-1',
    HERMES_DEVICE_ID: 'device-1',
    XHS_CHROME_USER_DATA_DIR: 'D:\\xhs-agent-profile',
    XHS_CONFIRM_BEFORE_PUBLISH: 'false',
  });

  assert.equal(config.gatewayUrl, 'wss://example.com/agent/ws');
  assert.equal(config.token, 'agent-token');
  assert.equal(config.userId, 'user-1');
  assert.equal(config.deviceId, 'device-1');
  assert.equal(config.chromeUserDataDir, 'D:\\xhs-agent-profile');
  assert.equal(config.confirmBeforePublish, false);
});

test('rejects missing gateway url', () => {
  assert.throws(
    () => loadConfigFromEnv({
      HERMES_AGENT_TOKEN: 'agent-token',
      HERMES_USER_ID: 'user-1',
      HERMES_DEVICE_ID: 'device-1',
    }),
    /HERMES_GATEWAY_URL/,
  );
});
