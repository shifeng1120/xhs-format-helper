import { loadConfigFromEnv } from './config.js';
import { launchBrowser } from './browser.js';
import { startAgent } from './agent.js';

const config = loadConfigFromEnv();
const browser = await launchBrowser(config);

startAgent({ config, browser });

process.on('SIGINT', async () => {
  await browser.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await browser.close();
  process.exit(0);
});
