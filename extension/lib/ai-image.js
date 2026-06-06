// ============================================
// 小红书排版助手 - AI 配图生成 v2.3
// 根据文案智能生成配图（免费引擎 + 可选 API Key）
// ============================================

(function (global) {
  'use strict';

  const STORAGE_KEY = 'xhs_fmt_ai_settings';
  const DAILY_LIMIT_TRIAL = 5;
  const DAILY_LIMIT_PRO = 30;

  const STYLE_PRESETS = [
    { id: 'xhs-life', name: '生活氛围', suffix: ', soft lighting, lifestyle photography, xiaohongshu aesthetic, warm tones, high quality' },
    { id: 'food', name: '美食探店', suffix: ', food photography, appetizing, restaurant ambiance, overhead shot, vibrant colors' },
    { id: 'beauty', name: '美妆护肤', suffix: ', beauty product photography, clean minimal, soft pink tones, aesthetic flat lay' },
    { id: 'travel', name: '旅行风景', suffix: ', travel photography, scenic view, cinematic, natural light, wanderlust' },
    { id: 'fashion', name: '穿搭时尚', suffix: ', fashion photography, outfit flat lay, trendy, instagram style, clean background' },
    { id: 'minimal', name: '极简留白', suffix: ', minimalist, lots of negative space, soft pastel colors, clean composition' },
  ];

  const PROMPT_TEMPLATES = [
    { label: '根据标题自动生成', value: 'auto' },
    { label: '氛围感生活场景', value: 'cozy lifestyle scene with warm natural light' },
    { label: '桌面好物摆拍', value: 'aesthetic desk flat lay with cute stationery and coffee' },
    { label: '城市街景', value: 'urban street photography with soft bokeh, golden hour' },
    { label: '自然花草', value: 'beautiful flowers and plants, soft focus, dreamy atmosphere' },
  ];

  async function getSettings() {
    const b = global.XhsChromeBridge;
    if (!b) return { apiKey: '', provider: 'free', dailyCount: 0, lastDate: '' };
    return (await b.syncGet(STORAGE_KEY, { apiKey: '', provider: 'free', dailyCount: 0, lastDate: '' })) || {};
  }

  async function saveSettings(settings) {
    const b = global.XhsChromeBridge;
    if (b) await b.syncSet(STORAGE_KEY, settings);
  }

  function todayStr() {
    return new Date().toISOString().slice(0, 10);
  }

  async function checkDailyLimit(isProActivated) {
    const settings = await getSettings();
    const today = todayStr();
    let count = settings.dailyCount || 0;
    if (settings.lastDate !== today) {
      count = 0;
    }
    const limit = isProActivated ? DAILY_LIMIT_PRO : DAILY_LIMIT_TRIAL;
    return { allowed: count < limit, count, limit, settings, today };
  }

  async function incrementDailyCount() {
    const settings = await getSettings();
    const today = todayStr();
    let count = settings.dailyCount || 0;
    if (settings.lastDate !== today) count = 0;
    count++;
    await saveSettings({ ...settings, dailyCount: count, lastDate: today });
  }

  /** 从文案提取 AI 提示词 */
  function buildPromptFromText(text, styleId) {
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
    const title = lines[0] || 'lifestyle';
    const preset = STYLE_PRESETS.find((s) => s.id === styleId) || STYLE_PRESETS[0];
    const clean = title.replace(/[✨🌸💡📌▪️➡️⚠️#]/g, '').slice(0, 80);
    return `${clean}${preset.suffix}`;
  }

  /** Pollinations 免费生图 */
  async function generateFreeImage(prompt, width, height) {
    const encoded = encodeURIComponent(prompt.slice(0, 500));
    const seed = Math.floor(Math.random() * 99999);
    const url = `https://image.pollinations.ai/prompt/${encoded}?width=${width}&height=${height}&seed=${seed}&model=flux&nologo=true&private=true&enhance=false`;

    const response = await fetch(url);
    if (!response.ok) throw new Error('AI 生图服务暂时不可用，请稍后重试');

    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /** 主入口 */
  async function generateAiImage(options) {
    const opts = options || {};
    const width = opts.width || 1080;
    const height = opts.height || 1440;
    const isProActivated = !!opts.isProActivated;

    const limitCheck = await checkDailyLimit(isProActivated);
    if (!limitCheck.allowed) {
      return {
        success: false,
        message: `今日 AI 配图次数已用完（${limitCheck.limit}次/天），明天再来或升级 Pro`,
      };
    }

    let prompt = opts.prompt;
    if (!prompt || prompt === 'auto') {
      prompt = buildPromptFromText(opts.sourceText || '', opts.styleId || 'xhs-life');
    }

    if (!prompt.trim()) {
      return { success: false, message: '请先输入文案或自定义提示词' };
    }

    try {
      const dataUrl = await generateFreeImage(prompt, width, height);
      await incrementDailyCount();

      const image = {
        dataUrl,
        width,
        height,
        page: 1,
        total: 1,
        prompt,
      };

      return {
        success: true,
        message: 'AI 配图生成成功',
        images: [image],
        prompt,
        remaining: limitCheck.limit - limitCheck.count - 1,
      };
    } catch (e) {
      return { success: false, message: e.message || 'AI 生图失败' };
    }
  }

  global.XhsAiImage = {
    STYLE_PRESETS,
    PROMPT_TEMPLATES,
    generateAiImage,
    buildPromptFromText,
    checkDailyLimit,
    getSettings,
    saveSettings,
    DAILY_LIMIT_TRIAL,
    DAILY_LIMIT_PRO,
  };
})(typeof window !== 'undefined' ? window : self);
