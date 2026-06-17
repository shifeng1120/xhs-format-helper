function required(env, key) {
  const value = env[key];
  if (!value || !String(value).trim()) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return String(value).trim();
}

export function loadConfigFromEnv(env = process.env) {
  const confirmValue = String(env.XHS_CONFIRM_BEFORE_PUBLISH ?? 'true').toLowerCase();

  return {
    gatewayUrl: required(env, 'HERMES_GATEWAY_URL'),
    token: required(env, 'HERMES_AGENT_TOKEN'),
    userId: required(env, 'HERMES_USER_ID'),
    deviceId: required(env, 'HERMES_DEVICE_ID'),
    chromeUserDataDir: env.XHS_CHROME_USER_DATA_DIR || 'C:\\xhs-hermes-agent-profile',
    confirmBeforePublish: !['0', 'false', 'no'].includes(confirmValue),
    headless: String(env.XHS_HEADLESS ?? 'false').toLowerCase() === 'true',
  };
}
