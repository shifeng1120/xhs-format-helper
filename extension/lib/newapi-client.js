// ============================================
// 红薯发布助手 - NewAPI 文案工作流客户端
// 只处理文本请求，图片和草稿仍保留在浏览器本地
// ============================================

(function (global) {
  'use strict';

  const SETTINGS_KEY = 'xhs_fmt_newapi_settings';
  const DEFAULT_MODEL = 'gpt-4o-mini';

  function bridge() {
    return global.XhsChromeBridge || null;
  }

  async function getSettings() {
    const api = bridge();
    const fallback = { baseUrl: '', apiKey: '', model: DEFAULT_MODEL };
    if (api?.localGet) return (await api.localGet(SETTINGS_KEY, fallback)) || fallback;
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  async function saveSettings(settings) {
    const normalized = {
      baseUrl: String(settings.baseUrl || '').trim().replace(/\/+$/, ''),
      apiKey: String(settings.apiKey || '').trim(),
      model: String(settings.model || DEFAULT_MODEL).trim(),
    };
    const api = bridge();
    if (api?.localSet) await api.localSet(SETTINGS_KEY, normalized);
    else localStorage.setItem(SETTINGS_KEY, JSON.stringify(normalized));
    return normalized;
  }

  function isConfigured(settings) {
    return !!(settings?.baseUrl && settings?.apiKey && settings?.model);
  }

  function systemPrompt() {
    return [
      '你是一个小红书爆款文案策划，不要搬运原文，要做原创重写。',
      '输出必须贴近小红书图文笔记：标题有点击欲，开头有钩子，正文分段清晰，语言像真人。',
      '保留用户提供的事实、产品、身份和场景，不编造无法确认的经历或效果。',
      '避免违规承诺、绝对化用语和过度营销。',
      '必须严格输出 JSON，不要 Markdown，不要解释。',
      'JSON 字段：titles(数组3个), hooks(数组3个), body(字符串), tags(数组8个以内), coverTitle(字符串), coverSubtitle(字符串), risks(数组)。',
    ].join('\n');
  }

  function buildRewriteMessages(payload) {
    const style = payload.accountStyle || '';
    const source = payload.sourceText || '';
    const goal = payload.goal || '结构参考 + 原创重写';
    const industry = payload.industry || '通用';
    return [
      { role: 'system', content: systemPrompt() },
      {
        role: 'user',
        content: [
          `创作目标：${goal}`,
          `赛道/行业：${industry}`,
          style ? `账号风格：\n${style}` : '',
          '参考素材/原始文案：',
          source,
          '',
          '请完成：1. 拆出适合小红书的爆款表达方式；2. 输出原创重写稿；3. 给封面标题建议；4. 给风险提醒。',
        ].filter(Boolean).join('\n'),
      },
    ];
  }

  function parseJsonContent(content) {
    const raw = String(content || '').trim();
    try {
      return JSON.parse(raw);
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) {
        try { return JSON.parse(match[0]); } catch { /* ignore */ }
      }
    }
    return {
      titles: [],
      hooks: [],
      body: raw,
      tags: [],
      coverTitle: '',
      coverSubtitle: '',
      risks: ['AI 返回格式不是标准 JSON，已保留原始正文。'],
    };
  }

  async function chatCompletions(settings, messages) {
    if (!isConfigured(settings)) throw new Error('请先配置 NewAPI 地址、Token 和模型名');
    const response = await fetch(`${settings.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${settings.apiKey}`,
      },
      body: JSON.stringify({
        model: settings.model,
        messages,
        temperature: 0.78,
        response_format: { type: 'json_object' },
      }),
    });
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`NewAPI 请求失败：${response.status} ${text.slice(0, 120)}`);
    }
    return response.json();
  }

  async function rewriteXhs(payload) {
    const settings = await getSettings();
    const messages = buildRewriteMessages(payload || {});
    const data = await chatCompletions(settings, messages);
    const content = data?.choices?.[0]?.message?.content || '';
    const parsed = parseJsonContent(content);
    return {
      ...parsed,
      raw: content,
      usage: data?.usage || null,
    };
  }

  global.XhsNewApiClient = {
    SETTINGS_KEY,
    DEFAULT_MODEL,
    getSettings,
    saveSettings,
    isConfigured,
    buildRewriteMessages,
    rewriteXhs,
  };
})(typeof window !== 'undefined' ? window : self);
