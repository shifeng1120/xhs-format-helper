// ============================================
// 小红书排版助手 - 自定义模板存储 v2.4
// 不直接调用 chrome.storage，避免 context invalidated
// ============================================

(function (global) {
  'use strict';

  const STORAGE_KEY = 'xhs_fmt_custom_templates';
  const LS_KEY = 'xhs_fmt_fb_' + STORAGE_KEY;
  const MAX_CUSTOM = 10;
  let memoryCache = null;

  function readLocal() {
    if (Array.isArray(memoryCache)) return memoryCache;
    try {
      const raw = localStorage.getItem(LS_KEY);
      memoryCache = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(memoryCache)) memoryCache = [];
      return memoryCache;
    } catch (e) {
      memoryCache = [];
      return memoryCache;
    }
  }

  function writeLocal(list) {
    memoryCache = Array.isArray(list) ? list : [];
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(memoryCache));
    } catch (e) { /* ignore */ }
  }

  async function getCustomTemplates() {
    const bridge = global.XhsChromeBridge;
    if (bridge?.syncGet) {
      try {
        const data = await bridge.syncGet(STORAGE_KEY, null);
        if (Array.isArray(data)) {
          memoryCache = data;
          writeLocal(data);
          return data;
        }
      } catch (e) {
        console.warn('[排版助手] 读取自定义模板失败，使用本地缓存:', e?.message || e);
      }
    }
    return readLocal();
  }

  async function saveCustomTemplate(template) {
    const list = await getCustomTemplates();
    const entry = {
      id: 'custom-' + Date.now().toString(36),
      name: template.name || '我的模板',
      category: '自定义',
      emoji: template.emoji || '⭐',
      desc: template.desc || '用户自定义排版规则',
      color: template.color || '#ff6b81',
      exampleInput: template.exampleInput || '输入你的文案...\n第一点\n第二点',
      exampleOutput: template.exampleOutput || '',
      rules: { ...(template.rules || {}) },
      createdAt: Date.now(),
    };

    if (!entry.exampleOutput && entry.rules && global.XhsFormatEngine?.formatWithTemplate) {
      try {
        entry.exampleOutput = global.XhsFormatEngine.formatWithTemplate(entry.exampleInput, entry) || '';
      } catch (e) { /* ignore */ }
    }

    list.unshift(entry);
    if (list.length > MAX_CUSTOM) list.length = MAX_CUSTOM;
    writeLocal(list);

    const bridge = global.XhsChromeBridge;
    if (bridge?.syncSet) {
      try {
        await bridge.syncSet(STORAGE_KEY, list);
      } catch (e) {
        console.warn('[排版助手] 同步自定义模板失败，已保存到本地:', e?.message || e);
      }
    }
    return entry;
  }

  async function deleteCustomTemplate(id) {
    const list = (await getCustomTemplates()).filter((t) => t.id !== id);
    writeLocal(list);
    const bridge = global.XhsChromeBridge;
    if (bridge?.syncSet) {
      try {
        await bridge.syncSet(STORAGE_KEY, list);
      } catch (e) { /* ignore */ }
    }
    return true;
  }

  async function getAllTemplates() {
    const builtin = global.XhsTemplates || [];
    try {
      const custom = await getCustomTemplates();
      return [...custom, ...builtin];
    } catch (e) {
      return [...builtin];
    }
  }

  global.XhsCustomTemplates = {
    getCustomTemplates,
    saveCustomTemplate,
    deleteCustomTemplate,
    getAllTemplates,
    MAX_CUSTOM,
  };
})(typeof window !== 'undefined' ? window : self);
