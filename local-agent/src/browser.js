import { chromium } from 'playwright';

export async function launchBrowser(config) {
  const context = await chromium.launchPersistentContext(config.chromeUserDataDir, {
    headless: config.headless,
    channel: 'chrome',
    viewport: { width: 1440, height: 1000 },
  });

  const pages = context.pages();
  const page = pages[0] || await context.newPage();

  return {
    context,
    page,
    async close() {
      await context.close();
    },
  };
}
