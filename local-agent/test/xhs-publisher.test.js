import test from 'node:test';
import assert from 'node:assert/strict';
import { publishXhsNote } from '../src/xhs-publisher.js';

function createFakePage() {
  const calls = [];
  return {
    calls,
    async goto(url) {
      calls.push(['goto', url]);
    },
    async waitForLoadState(state) {
      calls.push(['waitForLoadState', state]);
    },
    getByText(text) {
      calls.push(['getByText', text]);
      return {
        async count() {
          return text === '发布' ? 1 : 0;
        },
        async click() {
          calls.push(['clickText', text]);
        },
      };
    },
    locator(selector) {
      calls.push(['locator', selector]);
      return {
        async count() {
          if (selector.includes('input[type="file"]')) return 1;
          if (selector.includes('textarea')) return 1;
          if (selector.includes('input')) return 1;
          return 0;
        },
        async setInputFiles(files) {
          calls.push(['setInputFiles', files]);
        },
        async fill(value) {
          calls.push(['fill', selector, value]);
        },
      };
    },
  };
}

test('opens creator page, uploads images, fills title and content without final publish by default', async () => {
  const page = createFakePage();

  const result = await publishXhsNote(page, {
    title: '标题',
    content: '正文',
    imagePaths: ['D:\\素材\\1.png'],
    publish: false,
  });

  assert.equal(result.draftReady, true);
  assert.equal(result.published, false);
  assert.deepEqual(page.calls, [
    ['goto', 'https://creator.xiaohongshu.com/publish/publish'],
    ['waitForLoadState', 'domcontentloaded'],
    ['locator', 'input[type="file"]'],
    ['setInputFiles', ['D:\\素材\\1.png']],
    ['locator', 'input[placeholder*="标题"], textarea[placeholder*="标题"]'],
    ['fill', 'input[placeholder*="标题"], textarea[placeholder*="标题"]', '标题'],
    ['locator', 'textarea, [contenteditable="true"]'],
    ['fill', 'textarea, [contenteditable="true"]', '正文'],
  ]);
});

test('clicks publish button only when publish is true and confirmation is disabled', async () => {
  const page = createFakePage();

  const result = await publishXhsNote(page, {
    title: '标题',
    content: '正文',
    imagePaths: [],
    publish: true,
    confirmBeforePublish: false,
  });

  assert.equal(result.published, true);
  assert.ok(page.calls.some((call) => call[0] === 'clickText' && call[1] === '发布'));
});

test('requires manual confirmation when final publish is requested but confirmation is enabled', async () => {
  const page = createFakePage();

  const result = await publishXhsNote(page, {
    title: '标题',
    content: '正文',
    imagePaths: [],
    publish: true,
    confirmBeforePublish: true,
  });

  assert.equal(result.published, false);
  assert.equal(result.needsManualPublish, true);
  assert.ok(!page.calls.some((call) => call[0] === 'clickText' && call[1] === '发布'));
});

test('explains that login may be required when the publish form is missing', async () => {
  const page = {
    async goto() {},
    async waitForLoadState() {},
    async title() {
      return '小红书创作者服务平台';
    },
    url() {
      return 'https://creator.xiaohongshu.com/login';
    },
    locator() {
      return {
        async count() {
          return 0;
        },
      };
    },
  };

  await assert.rejects(
    () => publishXhsNote(page, {
      title: '标题',
      content: '正文',
      imagePaths: [],
      publish: false,
    }),
    /登录小红书创作者中心/,
  );
});

test('does not fill ambiguous login page inputs as a title field', async () => {
  const page = {
    async goto() {},
    async waitForLoadState() {},
    async title() {
      return '小红书登录';
    },
    url() {
      return 'https://creator.xiaohongshu.com/login';
    },
    locator(selector) {
      return {
        async count() {
          if (selector === 'input[placeholder*="标题"], textarea[placeholder*="标题"]') {
            return 6;
          }
          return 0;
        },
        async fill() {
          throw new Error('should not fill ambiguous fields');
        },
      };
    },
  };

  await assert.rejects(
    () => publishXhsNote(page, {
      title: '标题',
      content: '正文',
      imagePaths: [],
      publish: false,
    }),
    /登录小红书创作者中心/,
  );
});
