// ============================================
// 小红书排版助手 - 本地工作区
// 账号风格库与草稿历史都保存在本机，不依赖服务器
// ============================================

(function (global) {
  'use strict';

  const STYLE_KEY = 'xhs_fmt_account_styles';
  const DRAFT_KEY = 'xhs_fmt_local_drafts';
  const MAX_STYLES = 8;
  const MAX_DRAFTS = 20;

  const DEFAULT_STYLE = {
    id: 'default',
    name: '默认账号风格',
    persona: '真诚、有经验、像朋友一样分享',
    tone: '自然口语化，少用夸张营销词',
    cta: '觉得有用可以先收藏，之后慢慢看',
    tags: '#小红书运营 #内容创作 #干货分享',
    updatedAt: null,
  };

  function bridge() {
    return global.XhsChromeBridge || null;
  }

  function uid(prefix) {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
  }

  async function getLocal(key, fallback) {
    const api = bridge();
    if (api?.localGet) return api.localGet(key, fallback);
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  async function setLocal(key, value) {
    const api = bridge();
    if (api?.localSet) return api.localSet(key, value);
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  }

  function normalizeStyle(style) {
    const now = new Date().toISOString();
    return {
      id: style.id || uid('style'),
      name: String(style.name || '我的账号风格').trim().slice(0, 24),
      persona: String(style.persona || '').trim().slice(0, 160),
      tone: String(style.tone || '').trim().slice(0, 160),
      cta: String(style.cta || '').trim().slice(0, 120),
      tags: String(style.tags || '').trim().slice(0, 160),
      updatedAt: now,
    };
  }

  function normalizeDraft(draft) {
    const text = String(draft.text || '').trim();
    const title = String(draft.title || text.split('\n').find(Boolean) || '未命名草稿').trim().slice(0, 36);
    return {
      id: draft.id || uid('draft'),
      title,
      text: text.slice(0, 20000),
      source: draft.source || 'publish-editor',
      createdAt: draft.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      wordCount: text.length,
    };
  }

  async function getStyles() {
    const styles = await getLocal(STYLE_KEY, null);
    if (Array.isArray(styles) && styles.length) return styles.slice(0, MAX_STYLES);
    const first = { ...DEFAULT_STYLE, updatedAt: new Date().toISOString() };
    await setLocal(STYLE_KEY, [first]);
    return [first];
  }

  async function saveStyle(style) {
    const normalized = normalizeStyle(style);
    const styles = await getStyles();
    const next = [
      normalized,
      ...styles.filter((item) => item.id !== normalized.id),
    ].slice(0, MAX_STYLES);
    await setLocal(STYLE_KEY, next);
    return normalized;
  }

  async function deleteStyle(id) {
    const styles = await getStyles();
    const next = styles.filter((item) => item.id !== id);
    await setLocal(STYLE_KEY, next.length ? next : [{ ...DEFAULT_STYLE, updatedAt: new Date().toISOString() }]);
  }

  async function getDrafts() {
    const drafts = await getLocal(DRAFT_KEY, []);
    return Array.isArray(drafts) ? drafts.slice(0, MAX_DRAFTS) : [];
  }

  async function saveDraft(draft) {
    const normalized = normalizeDraft(draft);
    if (!normalized.text) return null;
    const drafts = await getDrafts();
    const next = [
      normalized,
      ...drafts.filter((item) => item.id !== normalized.id),
    ].slice(0, MAX_DRAFTS);
    await setLocal(DRAFT_KEY, next);
    return normalized;
  }

  async function deleteDraft(id) {
    const drafts = await getDrafts();
    await setLocal(DRAFT_KEY, drafts.filter((item) => item.id !== id));
  }

  function buildStylePrompt(style) {
    if (!style) return '';
    return [
      style.persona ? `人设：${style.persona}` : '',
      style.tone ? `语气：${style.tone}` : '',
      style.cta ? `固定引导：${style.cta}` : '',
      style.tags ? `常用标签：${style.tags}` : '',
    ].filter(Boolean).join('\n');
  }

  global.XhsWorkspace = {
    STYLE_KEY,
    DRAFT_KEY,
    MAX_STYLES,
    MAX_DRAFTS,
    getStyles,
    saveStyle,
    deleteStyle,
    getDrafts,
    saveDraft,
    deleteDraft,
    buildStylePrompt,
  };
})(typeof window !== 'undefined' ? window : self);
