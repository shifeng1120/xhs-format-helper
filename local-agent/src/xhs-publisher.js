const CREATOR_PUBLISH_URL = 'https://creator.xiaohongshu.com/publish/publish';

async function pageLocation(page) {
  const title = typeof page.title === 'function' ? await page.title().catch(() => '') : '';
  const url = typeof page.url === 'function' ? page.url() : '';
  return { title, url };
}

function missingPublishFormError({ label, selector, title, url }) {
  return new Error(
    `Cannot find Xiaohongshu ${label} field. ` +
    '请先在 Local Agent 打开的 Chrome 窗口里登录小红书创作者中心，并确认已经进入发布页面。' +
    ` selector=${selector} title=${title || 'unknown'} url=${url || 'unknown'}`,
  );
}

async function fillFirstAvailable(page, selector, value, label) {
  const locator = page.locator(selector);
  const count = await locator.count();
  if (count !== 1) {
    const location = await pageLocation(page);
    throw missingPublishFormError({ label, selector, ...location });
  }
  await locator.fill(value);
}

async function uploadImages(page, imagePaths) {
  if (!imagePaths.length) return;

  const fileInput = page.locator('input[type="file"]');
  const count = await fileInput.count();
  if (count < 1) {
    throw new Error('Cannot find Xiaohongshu image upload input');
  }

  await fileInput.setInputFiles(imagePaths);
}

export async function publishXhsNote(page, task) {
  const title = String(task.title || '').trim();
  const content = String(task.content || '').trim();
  const imagePaths = Array.isArray(task.imagePaths) ? task.imagePaths : [];
  const publish = Boolean(task.publish);
  const confirmBeforePublish = task.confirmBeforePublish !== false;

  if (!title) throw new Error('Xiaohongshu title is required');
  if (!content) throw new Error('Xiaohongshu content is required');

  await page.goto(CREATOR_PUBLISH_URL);
  await page.waitForLoadState('domcontentloaded');
  await uploadImages(page, imagePaths);

  await fillFirstAvailable(
    page,
    'input[placeholder*="标题"], textarea[placeholder*="标题"]',
    title,
    'title',
  );
  await fillFirstAvailable(
    page,
    'textarea, [contenteditable="true"]',
    content,
    'content',
  );

  if (!publish) {
    return { draftReady: true, published: false };
  }

  if (confirmBeforePublish) {
    return {
      draftReady: true,
      published: false,
      needsManualPublish: true,
      message: 'Draft is ready. User must review and click publish manually.',
    };
  }

  const publishButton = page.getByText('发布');
  const count = await publishButton.count();
  if (count < 1) {
    throw new Error('Cannot find Xiaohongshu publish button');
  }
  await publishButton.click();

  return { draftReady: true, published: true };
}
