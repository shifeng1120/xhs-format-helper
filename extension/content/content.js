// ============================================
// 小红书排版助手 - 内容注入脚本 v2.6.0
// ============================================

(function () {
  'use strict';

  if (window.self !== window.top) return;

  const CONFIG = {
    STORAGE_KEY: 'xhs_fmt_settings',
    PRO_KEY: 'xhs_fmt_pro_key',
    LAST_TEMPLATE_KEY: 'xhs_fmt_last_template',
    LAST_IMAGE_STYLE_KEY: 'xhs_fmt_last_image_style',
    LAST_IMAGE_LAYOUT_KEY: 'xhs_fmt_last_image_layout',
    LAST_IMAGE_SIZE_KEY: 'xhs_fmt_last_image_size',
    CUSTOM_BG_KEY: 'xhs_fmt_custom_bg',
    TOOLBAR_ID: 'xhs-fmt-toolbar',
    RESTORE_BTN_ID: 'xhs-fmt-restore-pill',
    FLOAT_BTN_ID: 'xhs-fmt-float-btn',
    DEBOUNCE_MS: 300,
  };

  let state = {
    isPro: false,
    proSource: 'none',
    toolbarInjected: false,
    activePanel: null,
    lastTemplateId: 'plant-grass',
    floatBtnVisible: false,
    formatCapture: null,
    floatHideTimer: null,
    lastUrl: location.href,
    toolbarCollapsed: false,
  };

  function isPublishPage() {
    const href = location.href;
    const pathHash = `${location.pathname}${location.search}${location.hash}`;
    if (!/xiaohongshu\.com/i.test(location.hostname)) return false;
    return /\/publish/i.test(pathHash) || /target=(image|article|video)/i.test(href);
  }

  async function ensureEditor(timeoutMs) {
    return window.XhsEditorUtils?.waitForEditor?.(timeoutMs || 5000) || findEditor();
  }

  function editorNotFoundHint() {
    if (!isPublishPage()) {
      return '❌ 请先打开 creator.xiaohongshu.com 发布页';
    }
    return '❌ 未找到正文编辑区，请先点击正文输入框再试';
  }

  function attachPanel(panel, editor) {
    const anchor = editor?.parentNode;
    if (anchor) {
      anchor.insertBefore(panel, editor.nextSibling);
    } else {
      panel.classList.add('xhs-fmt-panel-floating');
      document.body.appendChild(panel);
    }
    state.activePanel = panel;
  }

  function shouldShowExtensionUI() {
    return isPublishPage();
  }

  function shouldShowToolbar() {
    return shouldShowExtensionUI() && !state.toolbarCollapsed;
  }

  function removeExtensionUI() {
    document.getElementById(CONFIG.TOOLBAR_ID)?.remove();
    state.toolbarInjected = false;
    hideFloatBtn();
    closeActivePanel();
    closeImagePreview();
    document.getElementById('xhs-fmt-format-modal')?.remove();
    document.getElementById('xhs-fmt-insert-guide')?.remove();
    document.getElementById('xhs-fmt-gen-modal')?.remove();
    document.getElementById('xhs-fmt-upload-hint')?.remove();
    document.querySelector('.xhs-fmt-tooltip')?.remove();
  }

  function showRestorePill() {
    if (!isPublishPage()) return;
    let pill = document.getElementById(CONFIG.RESTORE_BTN_ID);
    if (!pill) {
      pill = document.createElement('button');
      pill.id = CONFIG.RESTORE_BTN_ID;
      pill.className = 'xhs-fmt-restore-pill';
      pill.textContent = '✨ 排版助手';
      pill.title = '点击恢复工具栏';
      pill.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        restoreToolbar();
      });
      document.body.appendChild(pill);
    }
    pill.style.display = 'block';
  }

  function hideRestorePill() {
    document.getElementById(CONFIG.RESTORE_BTN_ID)?.remove();
  }

  function collapseToolbar() {
    state.toolbarCollapsed = true;
    removeExtensionUI();
    showRestorePill();
    showTooltip('工具栏已收起，点右下角「✨ 排版助手」恢复');
  }

  function restoreToolbar() {
    state.toolbarCollapsed = false;
    hideRestorePill();
    state.toolbarInjected = false;
    injectToolbar();
    showTooltip('✅ 工具栏已恢复');
  }

  function syncExtensionUI() {
    sessionStorage.removeItem('xhs_fmt_toolbar_hidden');

    if (!shouldShowExtensionUI()) {
      state.toolbarCollapsed = false;
      removeExtensionUI();
      hideRestorePill();
      return;
    }

    if (state.toolbarCollapsed) {
      document.getElementById(CONFIG.TOOLBAR_ID)?.remove();
      state.toolbarInjected = false;
      showRestorePill();
      return;
    }

    hideRestorePill();
    if (!state.toolbarInjected) injectToolbar();
  }

  function watchPageNavigation() {
    const check = () => {
      if (location.href !== state.lastUrl) {
        state.lastUrl = location.href;
        syncExtensionUI();
      }
    };
    window.addEventListener('popstate', check);
    window.addEventListener('hashchange', check);
    setInterval(check, 1000);
  }

  function captureBeforeFormat() {
    state.formatCapture = window.XhsEditorUtils?.captureFormatContext() || null;
  }

  /** 根据内容智能推荐模板 */
  function suggestTemplateId(text) {
    if (!text) return null;
    const analysis = window.XhsFormatEngine?.analyzeContent?.(text);
    if (analysis?.recommendedTemplateId) return analysis.recommendedTemplateId;
    const numbered = (text.match(/\d+[\.\、．]/g) || []).length;
    if (/面试|八股|RAG|Agent|Spring|Java|HashMap|线程池|过拟合|微调|幻觉|面试官|场景设计/i.test(text) && numbered >= 2) {
      return 'interview';
    }
    if (numbered >= 4) return 'tutorial';
    return null;
  }

  // ---------- 工具函数 ----------

  function debounce(fn, ms) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), ms);
    };
  }

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  async function loadStorage(key) {
    return window.XhsChromeBridge?.syncGet(key) ?? null;
  }

  async function saveStorage(key, value) {
    await window.XhsChromeBridge?.syncSet(key, value);
  }

  async function loadLocalStorage(key) {
    return window.XhsChromeBridge?.localGet(key) ?? null;
  }

  async function saveLocalStorage(key, value) {
    await window.XhsChromeBridge?.localSet(key, value);
  }

  function buildCategories(templates) {
    const cats = {};
    templates.forEach((t) => {
      if (!cats[t.category]) cats[t.category] = [];
      cats[t.category].push(t);
    });
    return cats;
  }

  function getImageGenerateOptions(styleId, sizeKey, customBgDataUrl, layoutId) {
    return {
      styleId,
      themeId: styleId,
      layoutId: layoutId || 'classic',
      sizeKey,
      customBgDataUrl: customBgDataUrl || null,
    };
  }

  function incrementFormatCount() {
    window.XhsChromeBridge?.sendMessage('incrementFormatCount');
  }

  // ---------- Pro 状态 ----------

  async function initProStatus() {
    const result = await window.XhsChromeBridge?.sendMessage('isPro');
    if (result) {
      state.isPro = result.isPro;
      state.proSource = result.source || 'none';
    }
    return state.isPro;
  }

  const EXT_REFRESH_KEY = 'xhs_fmt_needs_refresh';

  function showContextRefreshBanner() {
    if (document.getElementById('xhs-fmt-ctx-banner')) return;
    const bar = document.createElement('div');
    bar.id = 'xhs-fmt-ctx-banner';
    bar.className = 'xhs-fmt-ctx-banner';
    bar.innerHTML = `
      <span>排版助手已更新，请刷新页面后继续使用</span>
      <button type="button" class="xhs-fmt-ctx-refresh">刷新页面</button>
      <button type="button" class="xhs-fmt-ctx-dismiss">✕</button>
    `;
    bar.querySelector('.xhs-fmt-ctx-refresh').addEventListener('click', () => location.reload());
    bar.querySelector('.xhs-fmt-ctx-dismiss').addEventListener('click', () => bar.remove());
    document.body.appendChild(bar);
  }

  function watchExtensionUpdate() {
    const markPageVersion = () => {
      try {
        const ver = chrome.runtime.getManifest().version;
        sessionStorage.setItem('xhs_fmt_page_ver', ver);
      } catch (e) { /* 旧脚本上下文 */ }
    };

    const checkNeedsRefresh = async () => {
      try {
        const needVer = await window.XhsChromeBridge?.localGet?.(EXT_REFRESH_KEY, null);
        const pageVer = sessionStorage.getItem('xhs_fmt_page_ver');
        if (needVer && pageVer && pageVer !== needVer) {
          showContextRefreshBanner();
        }
      } catch (e) { /* ignore */ }
    };

    markPageVersion();
    checkNeedsRefresh();

    try {
      chrome.storage?.onChanged?.addListener((changes, area) => {
        if (area === 'local' && changes[EXT_REFRESH_KEY]) {
          showContextRefreshBanner();
        }
      });
    } catch (e) { /* ignore */ }
  }

  async function loadLastTemplate() {
    const id = await loadStorage(CONFIG.LAST_TEMPLATE_KEY);
    if (id && window.XhsTemplateUtils?.getTemplateById(id)) {
      state.lastTemplateId = id;
    }
  }

  // ---------- 编辑器检测 ----------

  function findEditor() {
    return window.XhsEditorUtils?.findEditor() || null;
  }

  // ---------- 工具栏注入 ----------

  function injectToolbar() {
    if (!shouldShowToolbar()) return;
    if (state.toolbarInjected) return;

    const existing = document.getElementById(CONFIG.TOOLBAR_ID);
    if (existing) {
      state.toolbarInjected = true;
      return;
    }

    const toolbar = createToolbarElement();
    if (!toolbar) return;

    toolbar.addEventListener('mousedown', (e) => {
      if (e.target.closest('.xhs-fmt-toolbar-close, button, select, input, option')) return;
      e.preventDefault();
      captureBeforeFormat();
    });

    const editor = findEditor();
    const parent = editor?.parentNode;
    if (parent) {
      parent.insertBefore(toolbar, editor);
    } else {
      toolbar.classList.add('xhs-fmt-toolbar-dock');
      document.body.appendChild(toolbar);
    }
    state.toolbarInjected = true;
  }

  function refreshToolbar() {
    const old = document.getElementById(CONFIG.TOOLBAR_ID);
    if (old) old.remove();
    state.toolbarInjected = false;
    injectToolbar();
  }

  function createToolbarElement() {
    const toolbar = document.createElement('div');
    toolbar.id = CONFIG.TOOLBAR_ID;

    // 核心：一键排版（最醒目）
    if (state.isPro) {
      toolbar.appendChild(createPrimaryBtn('✨ 一键排版', '选中文字或全文智能排版', () => {
        openTemplatePanel();
      }));
      toolbar.appendChild(createBtnText('⚡ 快速排版', '用上次模板一键排版', () => {
        quickFormat();
      }));
      toolbar.appendChild(createPrimaryBtn('🚀 排版并生图', '排版+封面+内容图，完整图文包', () => {
        formatAndGenerateImages();
      }, 'alt'));
      toolbar.appendChild(createDivider());
    } else if (state.proSource === 'expired') {
      toolbar.appendChild(createLockedBtn('✨ 一键排版', '试用已过期'));
    }

    // 基础格式
    toolbar.appendChild(createLabel('字号'));
    toolbar.appendChild(createSelect(
      ['14', '15', '16', '17', '18', '20'],
      ['14', '15', '16', '17', '18', '20'],
      '16',
      (val) => execFormat('fontSize', val)
    ));
    toolbar.appendChild(createDivider());

    toolbar.appendChild(createLabel('行距'));
    toolbar.appendChild(createSelect(
      ['1.0', '1.5', '1.75', '2.0', '2.5'],
      ['1.0', '1.5', '1.75', '2.0', '2.5'],
      '1.75',
      (val) => applyLineHeight(val)
    ));
    toolbar.appendChild(createDivider());

    toolbar.appendChild(createToggleBtn('B', '加粗', () => execFormat('bold')));
    toolbar.appendChild(createToggleBtn('I', '斜体', () => execFormat('italic')));
    toolbar.appendChild(createDivider());

    toolbar.appendChild(createBtn('左', '左对齐', () => execFormat('justifyLeft')));
    toolbar.appendChild(createBtn('中', '居中', () => execFormat('justifyCenter')));
    toolbar.appendChild(createDivider());

    if (state.isPro) {
      toolbar.appendChild(createBtnText('🎨 爆款封面', '大字封面图，提升点击率', () => openCoverGeneratorPanel()));
      toolbar.appendChild(createBtnText('🖼️ 生成图片', '文案转图文卡片，可下载发布', () => openImageGeneratorPanel()));
      toolbar.appendChild(createBtnText('🤖 AI配图', '智能生成氛围配图', () => openAiImagePanel()));
      toolbar.appendChild(createBtnText('📋 模板', '选择排版模板', () => openTemplatePanel()));
      toolbar.appendChild(createBtnText('🧹 清理', '清理多余空行', () => runFormatCleaner()));
      toolbar.appendChild(createBtnText('🏷️ 标签', '插入话题标签', () => openHashtagPanel()));
    } else if (state.proSource === 'expired') {
      toolbar.appendChild(createLockedBtn('🎨 爆款封面', '试用已过期'));
      toolbar.appendChild(createLockedBtn('🖼️ 生成图片', '试用已过期'));
      toolbar.appendChild(createLockedBtn('🤖 AI配图', '试用已过期'));
      toolbar.appendChild(createLockedBtn('📋 模板', '试用已过期'));
      toolbar.appendChild(createLockedBtn('🧹 清理', '试用已过期'));
      toolbar.appendChild(createLockedBtn('🏷️ 标签', '试用已过期'));
    }

    if (state.proSource !== 'activation') {
      toolbar.appendChild(createDivider());
      const upgradeBtn = document.createElement('button');
      upgradeBtn.className = 'xhs-fmt-btn-text xhs-fmt-btn-upgrade';
      upgradeBtn.textContent = state.proSource === 'trial' ? '⭐ 试用中·升级' : '⭐ 升级Pro';
      upgradeBtn.title = '解锁12套排版模板';
      upgradeBtn.addEventListener('click', showProModal);
      toolbar.appendChild(upgradeBtn);
    }

    const closeBtn = document.createElement('button');
    closeBtn.className = 'xhs-fmt-toolbar-close';
    closeBtn.type = 'button';
    closeBtn.textContent = '✕';
    closeBtn.title = '收起工具栏（点右下角「排版助手」可恢复）';
    closeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      collapseToolbar();
    });
    toolbar.appendChild(closeBtn);

    return toolbar;
  }

  // ---------- DOM 辅助 ----------

  function createLabel(text) {
    const span = document.createElement('span');
    span.className = 'xhs-fmt-label';
    span.textContent = text;
    return span;
  }

  function createDivider() {
    const div = document.createElement('span');
    div.className = 'xhs-fmt-divider';
    return div;
  }

  function normalizeHandlerArgs(text, title, handler) {
    if (typeof title === 'function' && (handler === undefined || handler === null)) {
      return { label: text, tip: text, fn: title };
    }
    return { label: text, tip: title || text, fn: handler };
  }

  function bindClick(btn, fn) {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (typeof fn === 'function') fn();
    });
  }

  function createBtn(text, title, onClick) {
    const { label, tip, fn } = normalizeHandlerArgs(text, title, onClick);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'xhs-fmt-btn';
    btn.textContent = label;
    btn.title = tip;
    bindClick(btn, fn);
    return btn;
  }

  function createToggleBtn(text, title, onToggle) {
    const { label, tip, fn } = normalizeHandlerArgs(text, title, onToggle);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'xhs-fmt-btn';
    btn.textContent = label;
    btn.title = tip;
    bindClick(btn, () => {
      if (typeof fn === 'function') fn();
      btn.classList.toggle('active');
    });
    return btn;
  }

  function createBtnText(text, title, onClick) {
    const { label, tip, fn } = normalizeHandlerArgs(text, title, onClick);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'xhs-fmt-btn-text';
    btn.textContent = label;
    btn.title = tip;
    bindClick(btn, fn);
    return btn;
  }

  function createPrimaryBtn(text, title, onClick, variant) {
    const { label, tip, fn } = normalizeHandlerArgs(text, title, onClick);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = variant === 'alt' ? 'xhs-fmt-btn-primary xhs-fmt-btn-primary-alt' : 'xhs-fmt-btn-primary';
    btn.textContent = label;
    btn.title = tip;
    bindClick(btn, fn);
    return btn;
  }

  function createLockedBtn(text, reason) {
    const btn = document.createElement('button');
    btn.className = 'xhs-fmt-btn-text xhs-fmt-btn-pro';
    btn.textContent = text;
    btn.title = reason;
    btn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); showProModal(); });
    return btn;
  }

  function createSelect(values, labels, defaultValue, onChange) {
    const select = document.createElement('select');
    select.className = 'xhs-fmt-select';
    values.forEach((v, i) => {
      const opt = document.createElement('option');
      opt.value = v;
      opt.textContent = labels[i] || v;
      if (v === defaultValue) opt.selected = true;
      select.appendChild(opt);
    });
    select.addEventListener('change', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (typeof onChange === 'function') onChange(e.target.value);
    });
    return select;
  }

  // ---------- 排版命令 ----------

  function execFormat(command, value) {
    const editor = findEditor();
    if (!editor) return;
    editor.focus();
    const sel = window.getSelection();
    if (!sel?.rangeCount) return;
    try {
      document.execCommand(command, false, value !== undefined ? value : null);
    } catch (e) {
      console.warn('[小红书排版助手] execCommand 失败:', command, e);
    }
    editor.focus();
  }

  function applyLineHeight(value) {
    const editor = findEditor();
    if (!editor) return;
    editor.focus();
    const sel = window.getSelection();
    if (!sel?.rangeCount) return;
    const range = sel.getRangeAt(0);
    let container = range.commonAncestorContainer;
    if (container.nodeType === Node.TEXT_NODE) container = container.parentElement;
    let block = container;
    while (block && block !== editor) {
      const display = window.getComputedStyle(block).display;
      if (display === 'block' || block.tagName === 'P' || block.tagName === 'DIV') {
        block.style.lineHeight = value;
        return;
      }
      block = block.parentElement;
    }
    try {
      document.execCommand('insertHTML', false, `<span style="line-height:${value}">${range.toString()}</span>`);
    } catch (e) { /* ignore */ }
    editor.focus();
  }

  // =============================================
  // 核心：一键排版
  // =============================================

  async function resolveTemplate(id) {
    const all = await (window.XhsCustomTemplates?.getAllTemplates() || Promise.resolve(window.XhsTemplates || []));
    return all.find((t) => t.id === id) || window.XhsTemplateUtils?.getTemplateById(id);
  }

  async function quickFormat() {
    const tpl = await resolveTemplate(state.lastTemplateId);
    if (!tpl) {
      openTemplatePanel();
      return;
    }
    applyTemplateFormat(tpl);
  }

  async function applyTemplateFormat(template, silent) {
    if (!state.formatCapture) captureBeforeFormat();

    const capture = state.formatCapture;
    const editor = capture?.editor || findEditor();
    const sourcePreview = capture?.sourceText
      || (editor ? window.XhsEditorUtils?.getEditorTextRobust(editor) : '')
      || window.getSelection()?.toString()
      || '';

    if (!sourcePreview.trim()) {
      if (!silent) showTooltip('⚠️ 没读到文字！请先用鼠标全选正文，再点「一键排版」');
      return { success: false };
    }

    const betterId = suggestTemplateId(sourcePreview);
    if (betterId) {
      const better = await resolveTemplate(betterId);
      if (better) template = better;
    }

    const engine = window.XhsFormatEngine;
    if (!engine) {
      if (!silent) showTooltip('❌ 排版引擎加载失败，请刷新页面');
      return { success: false };
    }

    const result = await engine.applyFormat(editor, template, { capture });
    state.formatCapture = null;

    if (result.formatted) {
      state.lastTemplateId = template.id;
      saveStorage(CONFIG.LAST_TEMPLATE_KEY, template.id);
      incrementFormatCount();
    }

    if (!silent) {
      await showFormatResultModal(result);
      if (result.success) {
        showTooltip('✅ ' + result.message);
      } else {
        showTooltip('⚠️ ' + result.message);
      }
    }
    return result;
  }

  /** 排版 + 生图一条龙 */
  async function formatAndGenerateImages() {
    if (!state.isPro) {
      showProModal();
      return;
    }

    if (!isPublishPage()) {
      showTooltip(editorNotFoundHint());
      return;
    }
    const editor = await ensureEditor(4000);
    const engine = window.XhsFormatEngine;
    const imgGen = window.XhsImageGenerator;
    if (!engine || !imgGen) {
      showTooltip('❌ 模块加载失败，请刷新页面');
      return;
    }

    const tpl = await resolveTemplate(state.lastTemplateId);
    if (tpl) applyTemplateFormat(tpl, true);

    await new Promise((r) => setTimeout(r, 80));
    const cap = state.formatCapture || window.XhsEditorUtils?.captureFormatContext?.();
    const text = (editor ? engine.getEditorText(editor) : '') || cap?.sourceText || '';
    if (!text.trim()) {
      showTooltip('⚠️ 请先在正文输入框输入文案');
      return;
    }

    showTooltip('🚀 正在排版并生成完整图文包...');

    const styleId = (await loadStorage(CONFIG.LAST_IMAGE_STYLE_KEY)) || 'xhs-pink';
    const layoutId = (await loadStorage(CONFIG.LAST_IMAGE_LAYOUT_KEY)) || 'interview';
    const sizeKey = (await loadStorage(CONFIG.LAST_IMAGE_SIZE_KEY)) || 'portrait';
    const customBg = await loadLocalStorage(CONFIG.CUSTOM_BG_KEY);
    const { title, subtitle } = extractTitleSubtitle(text);

    syncTitleToXhs(title);

    const contentResult = await imgGen.generate(text, getImageGenerateOptions(styleId, sizeKey, customBg, layoutId));
    if (!contentResult.success) {
      showTooltip('⚠️ ' + contentResult.message);
      return;
    }

    const coverGen = window.XhsCoverGenerator;
    let allImages = contentResult.images;
    let packageLabel = contentResult.style;

    if (coverGen && title) {
      const coverResult = coverGen.generateCover({
        title,
        subtitle,
        styleId: 'xhs-hot',
        sizeKey,
      });
      const total = contentResult.images.length + 1;
      allImages = [
        { ...coverResult.images[0], page: 1, total, isCover: true },
        ...contentResult.images.map((img, i) => ({ ...img, page: i + 2, total })),
      ];
      packageLabel = `封面+${contentResult.style}`;
    }

    incrementFormatCount();
    showGeneratedImagesModal({
      ...contentResult,
      images: allImages,
      style: packageLabel,
      title,
    }, '📦 完整图文包已生成（封面+内容）');
  }

  // ---------- 模板选择面板 ----------

  async function openTemplatePanel() {
    if (!state.isPro) {
      showProModal();
      return;
    }

    closeActivePanel();
    if (!isPublishPage()) {
      showTooltip(editorNotFoundHint());
      return;
    }
    if (!state.formatCapture) captureBeforeFormat();
    const editor = await ensureEditor(3000);

    const templates = await (window.XhsCustomTemplates?.getAllTemplates() || Promise.resolve(window.XhsTemplates || []));
    const categories = buildCategories(templates);
    const categoryNames = Object.keys(categories);

    const panel = document.createElement('div');
    panel.className = 'xhs-fmt-panel xhs-fmt-panel-large';
    panel.id = 'xhs-fmt-panel-' + uid();

    const cap = state.formatCapture;
    const capLen = cap?.sourceText?.length || 0;
    const analysis = window.XhsFormatEngine?.analyzeContent?.(cap?.sourceText || '');
    const recommendedId = analysis?.recommendedTemplateId || suggestTemplateId(cap?.sourceText || '') || state.lastTemplateId;
    const recommendedTpl = templates.find((t) => t.id === recommendedId);
    const scopeHint = capLen
      ? `✅ 已捕获 ${capLen} 字，将${cap.replaceAll ? '替换全文' : '排版选中内容'} · 推荐「${recommendedTpl?.name || '智能模板'}」`
      : '⚠️ 请关闭面板，先全选文字，再点「一键排版」';

    const header = document.createElement('div');
    header.className = 'xhs-fmt-panel-header';
    header.innerHTML = `<span>✨ 选择排版模板</span><span class="xhs-fmt-panel-close">✕</span>`;
    header.querySelector('.xhs-fmt-panel-close').addEventListener('click', () => panel.remove());
    panel.appendChild(header);

    const hint = document.createElement('div');
    hint.className = 'xhs-fmt-panel-hint';
    hint.textContent = scopeHint;
    panel.appendChild(hint);

    // 分类标签
    const tabs = document.createElement('div');
    tabs.className = 'xhs-fmt-category-tabs';
    let activeCategory = '全部';

    const allTab = document.createElement('button');
    allTab.className = 'xhs-fmt-category-tab active';
    allTab.textContent = '全部';
    allTab.addEventListener('click', () => switchCategory('全部'));
    tabs.appendChild(allTab);

    categoryNames.forEach((cat) => {
      const tab = document.createElement('button');
      tab.className = 'xhs-fmt-category-tab';
      tab.textContent = cat;
      tab.dataset.category = cat;
      tab.addEventListener('click', () => switchCategory(cat));
      tabs.appendChild(tab);
    });
    panel.appendChild(tabs);

    const grid = document.createElement('div');
    grid.className = 'xhs-fmt-panel-grid xhs-fmt-template-grid';
    panel.appendChild(grid);

    function switchCategory(cat) {
      activeCategory = cat;
      tabs.querySelectorAll('.xhs-fmt-category-tab').forEach((t) => {
        t.classList.toggle('active', t.textContent === cat || (cat === '全部' && t.textContent === '全部'));
      });
      renderCards();
    }

    function renderCards() {
      grid.innerHTML = '';
      const list = activeCategory === '全部'
        ? templates
        : (categories[activeCategory] || []);
      const sorted = [...list].sort((a, b) => {
        if (a.id === recommendedId) return -1;
        if (b.id === recommendedId) return 1;
        if (a.id === state.lastTemplateId) return -1;
        if (b.id === state.lastTemplateId) return 1;
        return 0;
      });

      sorted.forEach((tpl) => {
        const card = document.createElement('div');
        card.className = 'xhs-fmt-template-card-v2';
        if (tpl.id === state.lastTemplateId) card.classList.add('active');
        if (tpl.id === recommendedId) card.classList.add('recommended');

        const previewLines = (tpl.exampleOutput || '').split('\n').slice(0, 5);
        const previewHtml = previewLines.map((l) => `<div class="xhs-fmt-preview-line">${escapeHtml(l)}</div>`).join('');

        const isCustom = String(tpl.id).startsWith('custom-');
        card.innerHTML = `
          <div class="xhs-fmt-card-header">
            <span class="xhs-fmt-card-emoji">${tpl.emoji}</span>
            <span class="xhs-fmt-card-name">${tpl.name}</span>
            <span class="xhs-fmt-card-tag">${tpl.id === recommendedId ? '推荐' : tpl.category}</span>
            ${isCustom ? '<button class="xhs-fmt-card-del" title="删除">✕</button>' : ''}
          </div>
          <div class="xhs-fmt-card-preview" style="border-left-color:${tpl.color || '#ff6b81'}">${previewHtml}</div>
          <div class="xhs-fmt-card-desc">${tpl.desc}</div>
          <button class="xhs-fmt-card-apply">一键套用</button>
        `;

        if (isCustom) {
          card.querySelector('.xhs-fmt-card-del')?.addEventListener('click', async (e) => {
            e.stopPropagation();
            await window.XhsCustomTemplates?.deleteCustomTemplate(tpl.id);
            renderCards();
            showTooltip('已删除自定义模板');
          });
        }

        const applyBtn = card.querySelector('.xhs-fmt-card-apply');
        applyBtn.addEventListener('mousedown', (e) => {
          e.preventDefault();
          captureBeforeFormat();
        });
        applyBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          applyTemplateFormat(tpl);
          panel.remove();
        });

        card.addEventListener('click', () => {
          showTemplateExample(tpl, panel);
        });

        grid.appendChild(card);
      });
    }

    renderCards();
    attachPanel(panel, editor);
  }

  function showTemplateExample(tpl, parentPanel) {
    let examplePanel = document.getElementById('xhs-fmt-example-panel');
    if (examplePanel) examplePanel.remove();

    examplePanel = document.createElement('div');
    examplePanel.id = 'xhs-fmt-example-panel';
    examplePanel.className = 'xhs-fmt-example-panel';

    const before = (tpl.exampleInput || '').split('\n').map((l) => `<div>${escapeHtml(l)}</div>`).join('');
    const after = (tpl.exampleOutput || '').split('\n').map((l) => `<div>${escapeHtml(l)}</div>`).join('');

    examplePanel.innerHTML = `
      <div class="xhs-fmt-example-header">
        <span>${tpl.emoji} ${tpl.name} · 效果预览</span>
        <span class="xhs-fmt-panel-close">✕</span>
      </div>
      <div class="xhs-fmt-example-body">
        <div class="xhs-fmt-example-col">
          <div class="xhs-fmt-example-label">排版前</div>
          <div class="xhs-fmt-example-content xhs-fmt-example-before">${before}</div>
        </div>
        <div class="xhs-fmt-example-arrow">→</div>
        <div class="xhs-fmt-example-col">
          <div class="xhs-fmt-example-label">排版后</div>
          <div class="xhs-fmt-example-content xhs-fmt-example-after">${after}</div>
        </div>
      </div>
      <button class="xhs-fmt-example-apply">✨ 用这个模板排版</button>
      ${state.proSource === 'activation' && !String(tpl.id).startsWith('custom-') ? '<button class="xhs-fmt-example-save">💾 保存为我的模板</button>' : ''}
    `;

    examplePanel.querySelector('.xhs-fmt-panel-close').addEventListener('click', () => examplePanel.remove());
    examplePanel.querySelector('.xhs-fmt-example-apply').addEventListener('click', () => {
      applyTemplateFormat(tpl);
      examplePanel.remove();
      if (parentPanel) parentPanel.remove();
    });

    examplePanel.querySelector('.xhs-fmt-example-save')?.addEventListener('click', async () => {
      const name = prompt('给模板起个名字：', tpl.name + '（我的）');
      if (!name) return;
      await window.XhsCustomTemplates?.saveCustomTemplate({
        name,
        emoji: tpl.emoji,
        desc: tpl.desc,
        color: tpl.color,
        rules: { ...tpl.rules },
        exampleInput: tpl.exampleInput,
        exampleOutput: tpl.exampleOutput,
      });
      showTooltip('✅ 模板已保存');
      examplePanel.remove();
      if (parentPanel) parentPanel.remove();
      openTemplatePanel();
    });

    document.body.appendChild(examplePanel);
  }

  function escapeHtml(text) {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // ---------- 浮动选中排版按钮 ----------

  function initSelectionFloatBtn() {
    let floatBtn = document.getElementById(CONFIG.FLOAT_BTN_ID);
    if (!floatBtn) {
      floatBtn = document.createElement('button');
      floatBtn.id = CONFIG.FLOAT_BTN_ID;
      floatBtn.className = 'xhs-fmt-float-btn';
      floatBtn.innerHTML = '✨ 一键排版';
      floatBtn.title = '排版选中文字';
      floatBtn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        captureBeforeFormat();
      });
      floatBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        hideFloatBtn();
        if (state.isPro) {
          openTemplatePanel();
        } else {
          showProModal();
        }
      });
      document.body.appendChild(floatBtn);
    }

    document.addEventListener('mouseup', debounce(() => {
      if (!shouldShowExtensionUI() || !state.isPro) { hideFloatBtn(); return; }
      const editor = findEditor();
      if (!editor) { hideFloatBtn(); return; }

      const { text, hasSelection } = window.XhsFormatEngine?.getSelectedText(editor) || {};
      if (hasSelection && text.length >= 4) {
        showFloatBtn();
      } else {
        hideFloatBtn();
      }
    }, 200));

    document.addEventListener('mousedown', (e) => {
      if (!e.target.closest('#' + CONFIG.FLOAT_BTN_ID)) hideFloatBtn();
    });
    document.addEventListener('keydown', () => hideFloatBtn());
    document.addEventListener('scroll', debounce(hideFloatBtn, 100), true);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) hideFloatBtn();
    });
  }

  function showFloatBtn() {
    const btn = document.getElementById(CONFIG.FLOAT_BTN_ID);
    const sel = window.getSelection();
    if (!btn || !sel?.rangeCount || !shouldShowExtensionUI()) return;

    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return;

    btn.style.top = Math.max(8, rect.top - 42) + 'px';
    btn.style.left = Math.min(window.innerWidth - 120, rect.left + rect.width / 2 - 50) + 'px';
    btn.style.display = 'block';
    state.floatBtnVisible = true;

    clearTimeout(state.floatHideTimer);
    state.floatHideTimer = setTimeout(hideFloatBtn, 4500);
  }

  function hideFloatBtn() {
    clearTimeout(state.floatHideTimer);
    const btn = document.getElementById(CONFIG.FLOAT_BTN_ID);
    if (btn) btn.style.display = 'none';
    state.floatBtnVisible = false;
  }

  // ---------- 格式清理 ----------

  function runFormatCleaner() {
    const editor = findEditor();
    if (!editor) return;

    const text = window.XhsFormatEngine?.getEditorText(editor) || '';
    if (!text) {
      showTooltip('⚠️ 编辑器内容为空');
      return;
    }

    const cleaned = window.XhsFormatEngine?.normalizeText(text) || text;
    const replace = window.XhsEditorUtils?.replaceEditorContent || window.XhsFormatEngine?.replaceEditorContent;
    replace?.(editor, cleaned, null);
    showTooltip('🧹 格式已清理，多余空行已去除');
    incrementFormatCount();
  }

  // ---------- 话题标签 ----------

  const COMMON_HASHTAGS = [
    '#日常分享', '#好物推荐', '#穿搭分享', '#美妆教程',
    '#旅行攻略', '#美食探店', '#读书笔记', '#职场干货',
    '#学习打卡', '#plog', '#OOTD', '#避坑指南',
  ];

  function openHashtagPanel() {
    closeActivePanel();
    const editor = findEditor();
    if (!editor) return;

    const panel = document.createElement('div');
    panel.className = 'xhs-fmt-panel';
    panel.id = 'xhs-fmt-panel-' + uid();

    const header = document.createElement('div');
    header.className = 'xhs-fmt-panel-header';
    header.innerHTML = '<span>🏷️ 插入话题标签</span><span class="xhs-fmt-panel-close">✕</span>';
    header.querySelector('.xhs-fmt-panel-close').addEventListener('click', () => panel.remove());
    panel.appendChild(header);

    const tagContainer = document.createElement('div');
    tagContainer.className = 'xhs-fmt-hashtag-container';
    COMMON_HASHTAGS.forEach((tag) => {
      const tagEl = document.createElement('span');
      tagEl.className = 'xhs-fmt-hashtag';
      tagEl.textContent = tag;
      tagEl.addEventListener('click', () => { insertTextAtCursor(tag + ' '); panel.remove(); });
      tagContainer.appendChild(tagEl);
    });
    panel.appendChild(tagContainer);

    editor.parentNode?.insertBefore(panel, editor.nextSibling);
    state.activePanel = panel;
  }

  function insertTextAtCursor(text) {
    const editor = findEditor();
    if (!editor) return;
    editor.focus();
    const sel = window.getSelection();
    if (!sel?.rangeCount) {
      editor.appendChild(document.createTextNode(text));
      return;
    }
    const range = sel.getRangeAt(0);
    range.deleteContents();
    range.insertNode(document.createTextNode(text));
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
    editor.dispatchEvent(new Event('input', { bubbles: true }));
  }

  // ---------- 面板管理 ----------

  // ---------- 图文卡片生成 ----------

  async function openImageGeneratorPanel() {
    if (!state.isPro) {
      showProModal();
      return;
    }

    closeActivePanel();
    if (!isPublishPage()) {
      showTooltip(editorNotFoundHint());
      return;
    }
    const editor = await ensureEditor(4000);

    const engine = window.XhsFormatEngine;
    const imgGen = window.XhsImageGenerator;
    if (!imgGen) {
      showTooltip('❌ 图片生成模块加载失败，请刷新页面');
      return;
    }

    const cap = window.XhsEditorUtils?.captureFormatContext?.();
    const { text: selText, hasSelection } = editor ? (engine?.getSelectedText(editor) || {}) : {};
    const sourceText = (hasSelection && selText)
      ? selText
      : (editor ? (engine?.getEditorText(editor) || '') : '') || cap?.sourceText || '';

    if (!sourceText.trim()) {
      showTooltip('⚠️ 请先在正文输入框输入文字，或选中文字后再生成');
    }

    const panel = document.createElement('div');
    panel.className = 'xhs-fmt-panel xhs-fmt-panel-large xhs-fmt-image-panel';
    panel.id = 'xhs-fmt-panel-' + uid();

    const autoTitle = imgGen.extractTitle(sourceText);
    let selectedStyleId = (await loadStorage(CONFIG.LAST_IMAGE_STYLE_KEY)) || 'xhs-pink';
    let selectedLayoutId = (await loadStorage(CONFIG.LAST_IMAGE_LAYOUT_KEY)) || 'classic';
    let selectedSizeKey = (await loadStorage(CONFIG.LAST_IMAGE_SIZE_KEY)) || 'portrait';
    let customBgDataUrl = (await loadLocalStorage(CONFIG.CUSTOM_BG_KEY)) || null;
    let generatedImages = [];

    const header = document.createElement('div');
    header.className = 'xhs-fmt-panel-header';
    header.innerHTML = '<span>🖼️ 生成图文卡片</span><span class="xhs-fmt-panel-close">✕</span>';
    header.querySelector('.xhs-fmt-panel-close').addEventListener('click', () => {
      closeImagePreview();
      panel.remove();
    });
    panel.appendChild(header);

    const hint = document.createElement('div');
    hint.className = 'xhs-fmt-panel-hint';
    hint.textContent = hasSelection
      ? `将选中 ${selText.length} 字生成图片（长文自动分页）`
      : '将全文生成图片（长文自动分页为多张轮播图）';
    panel.appendChild(hint);

    const body = document.createElement('div');
    body.className = 'xhs-fmt-image-body';
    body.innerHTML = `
      <div class="xhs-fmt-image-field">
        <label>封面标题</label>
        <input type="text" class="xhs-fmt-image-title" placeholder="自动取首行，可修改">
      </div>
      <div class="xhs-fmt-image-field">
        <label>图片尺寸</label>
        <div class="xhs-fmt-image-sizes"></div>
      </div>
      <div class="xhs-fmt-image-field">
        <label>排版版式（8 款，决定图文结构）</label>
        <div class="xhs-fmt-image-layouts"></div>
      </div>
      <div class="xhs-fmt-image-field">
        <label>配色风格（8 款）</label>
        <div class="xhs-fmt-image-styles"></div>
      </div>
      <div class="xhs-fmt-image-field">
        <label>自定义背景图（可选）</label>
        <div class="xhs-fmt-bg-upload-row">
          <input type="file" class="xhs-fmt-bg-file" accept="image/*" style="display:none">
          <button class="xhs-fmt-bg-upload-btn">📷 上传背景图</button>
          <button class="xhs-fmt-bg-clear-btn" style="display:none">清除</button>
          <span class="xhs-fmt-bg-hint">支持 JPG/PNG，建议竖图</span>
        </div>
        <div class="xhs-fmt-bg-preview" style="display:none"></div>
      </div>
      <button class="xhs-fmt-image-generate">🎨 立即生成图片</button>
      <div class="xhs-fmt-image-preview-area"></div>
    `;
    panel.appendChild(body);

    const sizeContainer = body.querySelector('.xhs-fmt-image-sizes');
    Object.entries(imgGen.SIZES).forEach(([key, sz]) => {
      const btn = document.createElement('button');
      btn.className = 'xhs-fmt-size-btn' + (key === selectedSizeKey ? ' active' : '');
      btn.textContent = sz.label;
      btn.dataset.key = key;
      btn.addEventListener('click', () => {
        selectedSizeKey = key;
        sizeContainer.querySelectorAll('.xhs-fmt-size-btn').forEach((b) => {
          b.classList.toggle('active', b.dataset.key === key);
        });
      });
      sizeContainer.appendChild(btn);
    });

    const layoutContainer = body.querySelector('.xhs-fmt-image-layouts');
    (imgGen.IMAGE_LAYOUTS || []).forEach((lo) => {
      const card = document.createElement('div');
      card.className = 'xhs-fmt-image-layout-card' + (lo.id === selectedLayoutId ? ' active' : '');
      card.dataset.id = lo.id;
      card.title = lo.desc || lo.name;
      card.innerHTML = `<span class="xhs-fmt-layout-emoji">${lo.emoji}</span><span>${lo.name}</span>`;
      card.addEventListener('click', () => {
        selectedLayoutId = lo.id;
        layoutContainer.querySelectorAll('.xhs-fmt-image-layout-card').forEach((c) => {
          c.classList.toggle('active', c.dataset.id === lo.id);
        });
      });
      layoutContainer.appendChild(card);
    });

    const styleContainer = body.querySelector('.xhs-fmt-image-styles');
    imgGen.IMAGE_STYLES.forEach((st) => {
      const card = document.createElement('div');
      card.className = 'xhs-fmt-image-style-card' + (st.id === selectedStyleId ? ' active' : '');
      card.dataset.id = st.id;
      const bgPreview = st.bg.type === 'gradient'
        ? `linear-gradient(135deg, ${st.bg.colors.join(', ')})`
        : st.bg.color;
      card.innerHTML = `
        <div class="xhs-fmt-style-swatch" style="background:${bgPreview}"></div>
        <span>${st.emoji} ${st.name}</span>
      `;
      card.addEventListener('click', () => {
        selectedStyleId = st.id;
        styleContainer.querySelectorAll('.xhs-fmt-image-style-card').forEach((c) => {
          c.classList.toggle('active', c.dataset.id === st.id);
        });
      });
      styleContainer.appendChild(card);
    });

    body.querySelector('.xhs-fmt-image-title').value = autoTitle;

    const bgFileInput = body.querySelector('.xhs-fmt-bg-file');
    const bgUploadBtn = body.querySelector('.xhs-fmt-bg-upload-btn');
    const bgClearBtn = body.querySelector('.xhs-fmt-bg-clear-btn');
    const bgPreview = body.querySelector('.xhs-fmt-bg-preview');

    if (customBgDataUrl) {
      bgPreview.style.display = 'block';
      bgPreview.innerHTML = `<img src="${customBgDataUrl}" alt="背景预览" />`;
      bgClearBtn.style.display = 'inline-block';
    }

    bgUploadBtn.addEventListener('click', () => bgFileInput.click());
    bgFileInput.addEventListener('change', () => {
      const file = bgFileInput.files?.[0];
      if (!file) return;
      if (file.size > 3 * 1024 * 1024) {
        showTooltip('⚠️ 图片请小于 3MB');
        return;
      }
      const reader = new FileReader();
      reader.onload = async () => {
        customBgDataUrl = reader.result;
        await saveLocalStorage(CONFIG.CUSTOM_BG_KEY, customBgDataUrl);
        bgPreview.style.display = 'block';
        bgPreview.innerHTML = `<img src="${customBgDataUrl}" alt="背景预览" />`;
        bgClearBtn.style.display = 'inline-block';
        showTooltip('✅ 背景图已设置');
      };
      reader.readAsDataURL(file);
    });
    bgClearBtn.addEventListener('click', async () => {
      customBgDataUrl = null;
      await window.XhsChromeBridge?.localRemove(CONFIG.CUSTOM_BG_KEY);
      bgPreview.style.display = 'none';
      bgPreview.innerHTML = '';
      bgClearBtn.style.display = 'none';
      bgFileInput.value = '';
    });

    const previewArea = body.querySelector('.xhs-fmt-image-preview-area');
    body.querySelector('.xhs-fmt-image-generate').addEventListener('click', async () => {
      const titleInput = body.querySelector('.xhs-fmt-image-title');
      const title = titleInput.value.trim() || autoTitle;

      previewArea.innerHTML = '<div class="xhs-fmt-image-loading">生成中...</div>';

      saveStorage(CONFIG.LAST_IMAGE_STYLE_KEY, selectedStyleId);
      saveStorage(CONFIG.LAST_IMAGE_LAYOUT_KEY, selectedLayoutId);
      saveStorage(CONFIG.LAST_IMAGE_SIZE_KEY, selectedSizeKey);

      try {
        const result = await imgGen.generate(sourceText, {
          ...getImageGenerateOptions(selectedStyleId, selectedSizeKey, customBgDataUrl, selectedLayoutId),
          title,
        });

        if (!result.success) {
          previewArea.innerHTML = `<div class="xhs-fmt-image-error">${result.message}</div>`;
          return;
        }

        generatedImages = result.images;
        incrementFormatCount();
        renderImagePreview(previewArea, result, title);
        showTooltip('✅ ' + result.message);
      } catch (e) {
        console.error('[小红书排版助手] 生图失败:', e);
        previewArea.innerHTML = `<div class="xhs-fmt-image-error">生图失败：${e?.message || e}。请刷新页面后重试</div>`;
      }
    });

    attachPanel(panel, editor);
  }

  function extractTitleSubtitle(text) {
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
    const clean = (s) => s.replace(/^[✨🌸💡📌▪️➡️⚠️#🛍️💼💄🍜◻️💭👗📖\s]+/, '').trim();
    return { title: clean(lines[0] || ''), subtitle: clean(lines[1] || '') };
  }

  function findNoteTitleInput() {
    const candidates = [...document.querySelectorAll('input[type="text"], textarea')];
    for (const el of candidates) {
      const hint = (el.placeholder || '') + (el.getAttribute('aria-label') || '') + (el.className || '');
      if (/标题|笔记标题|填写标题|title/i.test(hint)) return el;
      if (el.maxLength > 0 && el.maxLength <= 30 && el.offsetWidth > 100) return el;
    }
    return null;
  }

  function syncTitleToXhs(title) {
    const inp = findNoteTitleInput();
    if (inp && title) {
      const val = title.slice(0, 20);
      inp.value = val;
      inp.dispatchEvent(new Event('input', { bubbles: true }));
      inp.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }
    return false;
  }

  // ---------- 爆款封面生成 ----------

  async function openCoverGeneratorPanel() {
    if (!state.isPro) { showProModal(); return; }
    closeActivePanel();
    if (!isPublishPage()) { showTooltip(editorNotFoundHint()); return; }
    const editor = await ensureEditor(4000);
    const engine = window.XhsFormatEngine;
    if (!engine) { showTooltip('❌ 排版引擎加载失败'); return; }

    const cap = window.XhsEditorUtils?.captureFormatContext?.();
    const text = (editor ? engine.getEditorText(editor) : '') || cap?.sourceText || '';
    const { title, subtitle } = extractTitleSubtitle(text);
    const coverGen = window.XhsCoverGenerator;
    if (!coverGen) { showTooltip('❌ 封面模块加载失败'); return; }

    let selectedStyleId = 'xhs-hot';
    let selectedSizeKey = 'portrait';

    const panel = document.createElement('div');
    panel.className = 'xhs-fmt-panel xhs-fmt-panel-large xhs-fmt-image-panel';
    panel.id = 'xhs-fmt-panel-' + uid();

    panel.innerHTML = `
      <div class="xhs-fmt-panel-header">
        <span>🎨 爆款封面生成</span><span class="xhs-fmt-panel-close">✕</span>
      </div>
      <div class="xhs-fmt-panel-hint">小红书封面决定点击率！大字 + 高对比配色</div>
      <div class="xhs-fmt-image-body">
        <div class="xhs-fmt-image-field">
          <label>封面主标题（建议 ≤14 字）</label>
          <input type="text" class="xhs-fmt-cover-title" maxlength="40">
        </div>
        <div class="xhs-fmt-image-field">
          <label>副标题（可选）</label>
          <input type="text" class="xhs-fmt-cover-subtitle" maxlength="60">
        </div>
        <div class="xhs-fmt-image-field">
          <label><input type="checkbox" class="xhs-fmt-cover-sync-title" checked> 同步填入笔记标题栏</label>
        </div>
        <div class="xhs-fmt-image-field">
          <label>尺寸</label><div class="xhs-fmt-cover-sizes"></div>
        </div>
        <div class="xhs-fmt-image-field">
          <label>封面风格（8 款）</label><div class="xhs-fmt-cover-styles"></div>
        </div>
        <button class="xhs-fmt-image-generate">🎨 生成封面</button>
        <div class="xhs-fmt-image-preview-area"></div>
      </div>
    `;

    panel.querySelector('.xhs-fmt-panel-close').addEventListener('click', () => panel.remove());
    panel.querySelector('.xhs-fmt-cover-title').value = title || '我的小红书笔记';
    panel.querySelector('.xhs-fmt-cover-subtitle').value = subtitle;

    const sizeBox = panel.querySelector('.xhs-fmt-cover-sizes');
    Object.entries(coverGen.SIZES).forEach(([key, sz]) => {
      const btn = document.createElement('button');
      btn.className = 'xhs-fmt-size-btn' + (key === selectedSizeKey ? ' active' : '');
      btn.textContent = sz.label;
      btn.addEventListener('click', () => {
        selectedSizeKey = key;
        sizeBox.querySelectorAll('.xhs-fmt-size-btn').forEach((b) => b.classList.toggle('active', b.textContent === sz.label));
      });
      sizeBox.appendChild(btn);
    });

    const styleBox = panel.querySelector('.xhs-fmt-cover-styles');
    coverGen.COVER_STYLES.forEach((st) => {
      const card = document.createElement('div');
      card.className = 'xhs-fmt-image-style-card' + (st.id === selectedStyleId ? ' active' : '');
      const bg = st.bg.type === 'gradient' ? `linear-gradient(135deg,${st.bg.colors.join(',')})` : st.bg.color;
      card.innerHTML = `<div class="xhs-fmt-style-swatch" style="background:${bg}"></div><span>${st.emoji} ${st.name}</span>`;
      card.addEventListener('click', () => {
        selectedStyleId = st.id;
        styleBox.querySelectorAll('.xhs-fmt-image-style-card').forEach((c) => c.classList.remove('active'));
        card.classList.add('active');
      });
      styleBox.appendChild(card);
    });

    panel.querySelector('.xhs-fmt-image-generate').addEventListener('click', () => {
      const coverTitle = panel.querySelector('.xhs-fmt-cover-title').value.trim();
      const coverSub = panel.querySelector('.xhs-fmt-cover-subtitle').value.trim();
      const syncTitle = panel.querySelector('.xhs-fmt-cover-sync-title').checked;
      const preview = panel.querySelector('.xhs-fmt-image-preview-area');

      const result = coverGen.generateCover({
        title: coverTitle,
        subtitle: coverSub,
        styleId: selectedStyleId,
        sizeKey: selectedSizeKey,
      });

      if (syncTitle && syncTitleToXhs(coverTitle)) {
        showTooltip('✅ 封面已生成，标题已同步');
      }

      result.title = coverTitle;
      incrementFormatCount();
      renderImagePreview(preview, result, coverTitle);
      showTooltip('✅ 封面生成成功');
    });

    attachPanel(panel, editor);
  }

  // ---------- AI 配图 ----------

  async function openAiImagePanel() {
    if (!state.isPro) { showProModal(); return; }
    closeActivePanel();
    if (!isPublishPage()) { showTooltip(editorNotFoundHint()); return; }
    const editor = await ensureEditor(4000);
    const engine = window.XhsFormatEngine;
    const aiImg = window.XhsAiImage;
    if (!engine || !aiImg) { showTooltip('❌ 模块加载失败，请刷新页面'); return; }

    const cap = window.XhsEditorUtils?.captureFormatContext?.();
    const sourceText = (editor ? engine.getEditorText(editor) : '') || cap?.sourceText || '';
    const limitInfo = await aiImg.checkDailyLimit(state.proSource === 'activation');

    let selectedStyleId = 'xhs-life';
    let selectedSizeKey = 'portrait';

    const panel = document.createElement('div');
    panel.className = 'xhs-fmt-panel xhs-fmt-panel-large xhs-fmt-image-panel';
    panel.id = 'xhs-fmt-panel-' + uid();

    panel.innerHTML = `
      <div class="xhs-fmt-panel-header">
        <span>🤖 AI 智能配图</span><span class="xhs-fmt-panel-close">✕</span>
      </div>
      <div class="xhs-fmt-panel-hint">今日剩余 ${Math.max(0, limitInfo.limit - limitInfo.count)} / ${limitInfo.limit} 次 · 根据文案自动生成氛围配图</div>
      <div class="xhs-fmt-image-body">
        <div class="xhs-fmt-image-field">
          <label>提示词模板</label>
          <select class="xhs-fmt-ai-prompt-select"></select>
        </div>
        <div class="xhs-fmt-image-field">
          <label>自定义提示词（英文效果更佳，留空则根据文案自动生成）</label>
          <textarea class="xhs-fmt-ai-prompt" rows="2" placeholder="例：aesthetic coffee shop interior, warm lighting"></textarea>
        </div>
        <div class="xhs-fmt-image-field">
          <label>画面风格</label><div class="xhs-fmt-ai-styles"></div>
        </div>
        <div class="xhs-fmt-image-field">
          <label>尺寸</label><div class="xhs-fmt-ai-sizes"></div>
        </div>
        <button class="xhs-fmt-image-generate">🤖 生成 AI 配图</button>
        <div class="xhs-fmt-image-preview-area"></div>
      </div>
    `;

    panel.querySelector('.xhs-fmt-panel-close').addEventListener('click', () => panel.remove());

    const promptSelect = panel.querySelector('.xhs-fmt-ai-prompt-select');
    aiImg.PROMPT_TEMPLATES.forEach((p) => {
      const opt = document.createElement('option');
      opt.value = p.value;
      opt.textContent = p.label;
      promptSelect.appendChild(opt);
    });
    promptSelect.addEventListener('change', () => {
      if (promptSelect.value !== 'auto') {
        panel.querySelector('.xhs-fmt-ai-prompt').value = promptSelect.value;
      }
    });

    const styleBox = panel.querySelector('.xhs-fmt-ai-styles');
    aiImg.STYLE_PRESETS.forEach((st) => {
      const btn = document.createElement('button');
      btn.className = 'xhs-fmt-size-btn' + (st.id === selectedStyleId ? ' active' : '');
      btn.textContent = st.name;
      btn.addEventListener('click', () => {
        selectedStyleId = st.id;
        styleBox.querySelectorAll('.xhs-fmt-size-btn').forEach((b) => b.classList.toggle('active', b === btn));
      });
      styleBox.appendChild(btn);
    });

    const sizeBox = panel.querySelector('.xhs-fmt-ai-sizes');
    [['portrait', '3:4 竖版'], ['square', '1:1 方图']].forEach(([key, label]) => {
      const btn = document.createElement('button');
      btn.className = 'xhs-fmt-size-btn' + (key === selectedSizeKey ? ' active' : '');
      btn.textContent = label;
      btn.addEventListener('click', () => {
        selectedSizeKey = key;
        sizeBox.querySelectorAll('.xhs-fmt-size-btn').forEach((b) => b.classList.toggle('active', b === btn));
      });
      sizeBox.appendChild(btn);
    });

    panel.querySelector('.xhs-fmt-image-generate').addEventListener('click', async () => {
      const preview = panel.querySelector('.xhs-fmt-image-preview-area');
      const customPrompt = panel.querySelector('.xhs-fmt-ai-prompt').value.trim();
      const prompt = customPrompt || promptSelect.value;

      preview.innerHTML = '<div class="xhs-fmt-image-loading">🤖 AI 生成中，约需 10-30 秒...</div>';

      const w = selectedSizeKey === 'square' ? 1080 : 1080;
      const h = selectedSizeKey === 'square' ? 1080 : 1440;

      const result = await aiImg.generateAiImage({
        prompt,
        sourceText,
        styleId: selectedStyleId,
        width: w,
        height: h,
        isProActivated: state.proSource === 'activation',
      });

      if (!result.success) {
        preview.innerHTML = `<div class="xhs-fmt-image-error">${result.message}</div>`;
        showTooltip('⚠️ ' + result.message);
        return;
      }

      result.title = 'ai-cover';
      result.style = 'AI 配图';
      result.size = selectedSizeKey === 'square' ? '1:1' : '3:4';
      incrementFormatCount();
      renderImagePreview(preview, result, 'ai-image');
      panel.querySelector('.xhs-fmt-panel-hint').textContent =
        `今日剩余 ${result.remaining} 次 · 提示词：${(result.prompt || '').slice(0, 50)}...`;
      showTooltip('✅ AI 配图生成成功');
    });

    attachPanel(panel, editor);
  }

  function renderImagePreview(container, result, title) {
    const meta = [result.style, result.size].filter(Boolean).join(' · ') || '图片';
    container.innerHTML = `
      <div class="xhs-fmt-image-result-header">
        <span>✅ 已生成 <b>${result.images.length}</b> 张 · ${meta}</span>
        <div class="xhs-fmt-image-result-actions">
          <button class="xhs-fmt-image-insert-all">📤 插入发布页</button>
          <button class="xhs-fmt-image-download-all">⬇️ 全部下载</button>
          <button class="xhs-fmt-image-manual-guide">📋 手动上传指引</button>
        </div>
      </div>
      <div class="xhs-fmt-image-grid"></div>
      <div class="xhs-fmt-image-tips">💡 请先切换到「上传图文」笔记类型，再点「插入发布页」。失败请用「手动上传指引」</div>
    `;

    const grid = container.querySelector('.xhs-fmt-image-grid');
    result.images.forEach((img) => {
      const item = document.createElement('div');
      item.className = 'xhs-fmt-image-item';
      const pageLabel = img.isCover ? '封面' : `第 ${img.page}/${img.total} 张`;
      item.innerHTML = `
        <img src="${img.dataUrl}" alt="第${img.page}张" />
        <div class="xhs-fmt-image-item-footer">
          <span>${pageLabel}</span>
          <button class="xhs-fmt-image-dl-single" data-page="${img.page}">下载</button>
        </div>
      `;
      item.querySelector('img').addEventListener('click', () => showImageLightbox(img, result.images));
      item.querySelector('.xhs-fmt-image-dl-single').addEventListener('click', () => {
        window.XhsImageGenerator.downloadImage(img.dataUrl, `xhs-${sanitizeFilename(title)}-${img.page}.png`);
      });
      grid.appendChild(item);
    });

    container.querySelector('.xhs-fmt-image-download-all').addEventListener('click', () => {
      window.XhsImageGenerator.downloadAll(result.images, `xhs-${sanitizeFilename(title)}`);
      showTooltip('⬇️ 开始下载全部图片');
    });

    container.querySelector('.xhs-fmt-image-insert-all').addEventListener('click', async () => {
      const btn = container.querySelector('.xhs-fmt-image-insert-all');
      btn.textContent = '插入中...';
      btn.disabled = true;
      const uploadResult = await window.XhsUploadHelper?.uploadImagesToEditor(result.images);
      btn.disabled = false;
      btn.textContent = '📤 插入发布页';
      if (uploadResult?.success) {
        showTooltip('✅ ' + uploadResult.message);
      } else {
        showTooltip('⚠️ ' + (uploadResult?.message || '插入失败'));
        showImageInsertGuideModal(result.images, uploadResult);
      }
    });

    container.querySelector('.xhs-fmt-image-manual-guide')?.addEventListener('click', () => {
      showImageInsertGuideModal(result.images);
    });
  }

  function showImageInsertGuideModal(images, uploadResult) {
    document.getElementById('xhs-fmt-insert-guide')?.remove();
    const overlay = document.createElement('div');
    overlay.id = 'xhs-fmt-insert-guide';
    overlay.className = 'xhs-fmt-format-modal-overlay';

    const count = images?.length || 0;
    const partial = uploadResult?.uploaded ? `（已自动插入 ${uploadResult.uploaded} 张）` : '';

    overlay.innerHTML = `
      <div class="xhs-fmt-format-modal xhs-fmt-insert-guide-modal">
        <div class="xhs-fmt-format-modal-header">
          <span>📤 图片手动上传指引</span>
          <span class="xhs-fmt-panel-close">✕</span>
        </div>
        <div class="xhs-fmt-format-modal-status warn">
          小红书会拦截扩展自动上传${partial}，按下面步骤 100% 成功
        </div>
        <ol class="xhs-fmt-insert-steps">
          <li>确认在 <strong>creator.xiaohongshu.com</strong> 发布页，且选的是 <strong>「上传图文」</strong>（不是长文）</li>
          <li>点击页面上的 <strong>「添加图片」</strong> 或拖拽上传区域</li>
          <li>点下方 <strong>「全部下载」</strong>，在弹出的文件选择框里选中全部 ${count} 张图</li>
          <li>或逐张点「下载此图」，再手动添加到发布页</li>
        </ol>
        <div class="xhs-fmt-format-modal-actions">
          <button class="xhs-fmt-guide-download-all">⬇️ 全部下载（${count} 张）</button>
          <button class="xhs-fmt-guide-close">知道了</button>
        </div>
      </div>
    `;

    overlay.querySelector('.xhs-fmt-panel-close').addEventListener('click', () => overlay.remove());
    overlay.querySelector('.xhs-fmt-guide-close').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    overlay.querySelector('.xhs-fmt-guide-download-all').addEventListener('click', () => {
      window.XhsImageGenerator?.downloadAll(images, 'xhs-note');
      showTooltip('⬇️ 已触发下载，请在文件选择框里选中这些图片上传');
    });

    document.body.appendChild(overlay);
  }

  /** 排版并生图结果弹窗 */
  function showGeneratedImagesModal(result, headerText) {
    closeImagePreview();
    const overlay = document.createElement('div');
    overlay.id = 'xhs-fmt-gen-modal';
    overlay.className = 'xhs-fmt-gen-modal-overlay';

    const inner = document.createElement('div');
    inner.className = 'xhs-fmt-gen-modal';
    inner.innerHTML = `
      <div class="xhs-fmt-gen-modal-header">
        <span>${headerText || '🚀 排版并生图完成'}</span>
        <span class="xhs-fmt-panel-close">✕</span>
      </div>
      <div class="xhs-fmt-gen-modal-body"></div>
    `;
    overlay.appendChild(inner);

    inner.querySelector('.xhs-fmt-panel-close').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

    renderImagePreview(inner.querySelector('.xhs-fmt-gen-modal-body'), result, result.title);
    document.body.appendChild(overlay);
  }

  function sanitizeFilename(name) {
    return (name || 'note').replace(/[\\/:*?"<>|]/g, '').slice(0, 20);
  }

  function showImageLightbox(img, allImages) {
    closeImagePreview();
    const overlay = document.createElement('div');
    overlay.id = 'xhs-fmt-image-lightbox';
    overlay.className = 'xhs-fmt-image-lightbox';
    overlay.innerHTML = `
      <div class="xhs-fmt-lightbox-inner">
        <span class="xhs-fmt-lightbox-close">✕</span>
        <img src="${img.dataUrl}" />
        <div class="xhs-fmt-lightbox-bar">
          <span>第 ${img.page} / ${img.total} 张</span>
          <button class="xhs-fmt-lightbox-dl">下载此图</button>
        </div>
      </div>
    `;
    overlay.querySelector('.xhs-fmt-lightbox-close').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    overlay.querySelector('.xhs-fmt-lightbox-dl').addEventListener('click', () => {
      window.XhsImageGenerator.downloadImage(img.dataUrl, `xhs-note-${img.page}.png`);
    });
    document.body.appendChild(overlay);
  }

  function closeImagePreview() {
    document.getElementById('xhs-fmt-image-lightbox')?.remove();
    document.getElementById('xhs-fmt-gen-modal')?.remove();
  }

  function closeActivePanel() {
    if (state.activePanel?.parentNode) state.activePanel.remove();
    state.activePanel = null;
    document.getElementById('xhs-fmt-example-panel')?.remove();
    closeImagePreview();
  }

  function showTooltip(text) {
    document.querySelector('.xhs-fmt-tooltip')?.remove();
    const tip = document.createElement('div');
    tip.className = 'xhs-fmt-tooltip';
    tip.textContent = text;
    document.body.appendChild(tip);
    setTimeout(() => {
      tip.classList.add('xhs-fmt-tooltip-fade');
      setTimeout(() => tip.remove(), 300);
    }, 2500);
  }

  async function showFormatResultModal(result) {
    if (!result?.formatted) return;
    document.getElementById('xhs-fmt-format-modal')?.remove();

    const tpl = result.template || {};
    const overlay = document.createElement('div');
    overlay.id = 'xhs-fmt-format-modal';
    overlay.className = 'xhs-fmt-format-modal-overlay';

    const modal = document.createElement('div');
    modal.className = 'xhs-fmt-format-modal';
    modal.innerHTML = `
      <div class="xhs-fmt-format-modal-header">
        <span>${tpl.emoji || '✨'} ${tpl.name || '排版'} · 排版结果（${result.formatted.length} 字）</span>
        <span class="xhs-fmt-panel-close">✕</span>
      </div>
      <div class="xhs-fmt-format-modal-status warn">正在复制到剪贴板…</div>
      <textarea class="xhs-fmt-format-modal-text" readonly></textarea>
      <div class="xhs-fmt-format-modal-steps">
        <strong>手动粘贴（100% 有效）：</strong>
        ① 点击正文编辑区 → ② <kbd>Ctrl</kbd>+<kbd>A</kbd> 全选 → ③ <kbd>Ctrl</kbd>+<kbd>V</kbd> 粘贴
      </div>
      <div class="xhs-fmt-format-modal-actions">
        <button class="xhs-fmt-format-copy-btn">📋 一键复制排版结果</button>
        <button class="xhs-fmt-format-retry-btn">📝 再次写入编辑器</button>
      </div>
    `;

    const textarea = modal.querySelector('.xhs-fmt-format-modal-text');
    textarea.value = result.formatted;

    modal.querySelector('.xhs-fmt-panel-close').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

    modal.querySelector('.xhs-fmt-format-copy-btn').addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(result.formatted);
        showTooltip('✅ 已复制！请到正文区 Ctrl+A 全选后 Ctrl+V 粘贴');
      } catch (e) {
        textarea.focus();
        textarea.select();
        document.execCommand('copy');
        showTooltip('✅ 已选中文字，请 Ctrl+C 复制后粘贴');
      }
    });

    modal.querySelector('.xhs-fmt-format-retry-btn').addEventListener('click', async () => {
      const editor = result.editor || findEditor();
      const utils = window.XhsEditorUtils;
      if (!editor || !utils) {
        showTooltip('❌ 未找到编辑区，请用手动粘贴');
        return;
      }
      const ok = await utils.replaceEditorContent(editor, result.formatted, { replaceAll: true });
      if (ok) {
        showTooltip('✅ 写入成功');
      } else {
        const pasted = await utils.replaceViaClipboard(editor, result.formatted);
        showTooltip(pasted ? '✅ 已通过剪贴板写入' : '⚠️ 仍无法自动写入，请用「一键复制」手动粘贴');
      }
    });

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    const statusEl = modal.querySelector('.xhs-fmt-format-modal-status');
    let copied = false;
    try {
      await navigator.clipboard.writeText(result.formatted);
      copied = true;
    } catch (e) {
      textarea.focus();
      textarea.select();
      try { copied = document.execCommand('copy'); } catch (e2) { copied = false; }
    }

    if (copied) {
      statusEl.innerHTML = '📋 <strong>已自动复制！</strong>请到正文区 <kbd>Ctrl</kbd>+<kbd>A</kbd> 全选 → <kbd>Ctrl</kbd>+<kbd>V</kbd> 粘贴';
    } else {
      statusEl.innerHTML = '⚠️ 请选中下方文字，<kbd>Ctrl</kbd>+<kbd>C</kbd> 复制后粘贴到正文（小红书会拦截自动写入）';
    }

    setTimeout(() => { textarea.focus(); textarea.select(); }, 80);
  }

  // ---------- Pro 弹窗 ----------

  function showProModal() {
    if (state.proSource === 'activation') return;
    if (document.getElementById('xhs-fmt-pro-modal-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'xhs-fmt-pro-modal-overlay';
    overlay.innerHTML = `
      <div id="xhs-fmt-pro-modal">
        <h2>⭐ 解锁全部创作功能</h2>
        <p>12 套排版模板 + 图文卡片生成，选中文字一键排版，文案转图片直接发布</p>
        <span class="xhs-fmt-price">¥29.9 <small>终身买断</small></span>
        <button class="xhs-fmt-pro-btn-buy">立即升级 →</button>
        <br/>
        <button class="xhs-fmt-pro-btn-close">以后再说</button>
        <div style="margin-top:12px; text-align:center;">
          <span class="xhs-fmt-pro-link-activate" style="color:#ff6b81;cursor:pointer;font-size:13px;font-weight:600;">🔑 已有激活码？点击输入</span>
        </div>
        <div id="xhs-fmt-activate-section" style="display:none;margin-top:12px;">
          <input type="text" id="xhs-fmt-license-input" placeholder="XHS-PRO-XXXX-XXXX-XX"
                 style="width:90%;padding:8px;border:1px solid #ddd;border-radius:6px;font-family:monospace;font-size:13px;">
          <div style="margin-top:8px;">
            <button id="xhs-fmt-btn-activate" style="background:#ff6b81;color:#fff;border:none;border-radius:6px;padding:8px 16px;cursor:pointer;font-size:13px;">激活 Pro</button>
            <button id="xhs-fmt-btn-cancel-activate" style="background:#f5f5f5;color:#666;border:1px solid #ddd;border-radius:6px;padding:8px 16px;cursor:pointer;font-size:13px;margin-left:8px;">取消</button>
          </div>
          <div id="xhs-fmt-activate-result" style="margin-top:8px;font-size:13px;"></div>
        </div>
      </div>
    `;

    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

    setTimeout(() => {
      overlay.querySelector('.xhs-fmt-pro-btn-buy')?.addEventListener('click', () => {
        window.open('https://afdian.com/item/b4dab2045cf111f18bfd52540025c377', '_blank');
      });
      overlay.querySelector('.xhs-fmt-pro-btn-close')?.addEventListener('click', () => overlay.remove());
      overlay.querySelector('.xhs-fmt-pro-link-activate')?.addEventListener('click', () => {
        overlay.querySelector('#xhs-fmt-activate-section').style.display = 'block';
        overlay.querySelector('#xhs-fmt-license-input').focus();
      });
      overlay.querySelector('#xhs-fmt-btn-cancel-activate')?.addEventListener('click', () => {
        overlay.querySelector('#xhs-fmt-activate-section').style.display = 'none';
      });
      overlay.querySelector('#xhs-fmt-btn-activate')?.addEventListener('click', async () => {
        const input = overlay.querySelector('#xhs-fmt-license-input');
        const resultDiv = overlay.querySelector('#xhs-fmt-activate-result');
        const rawKey = input.value.trim().toUpperCase();
        if (!/^XHS-PRO-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{2}$/.test(rawKey)) {
          resultDiv.textContent = '激活码格式不正确';
          resultDiv.style.color = '#c62828';
          return;
        }
        const verified = await window.XhsChromeBridge?.sendMessage('verifyProKey', { key: rawKey });
        if (!verified?.valid) {
          resultDiv.textContent = '激活码校验失败，请检查是否复制完整';
          resultDiv.style.color = '#c62828';
          return;
        }
        await saveStorage(CONFIG.PRO_KEY, rawKey);
        state.isPro = true;
        state.proSource = 'activation';
        resultDiv.textContent = '✅ 激活成功！';
        resultDiv.style.color = '#2e7d32';
        setTimeout(() => { overlay.remove(); refreshToolbar(); }, 1200);
      });
    }, 50);

    document.body.appendChild(overlay);
  }

  // ---------- 启动自检 ----------

  function verifyModules() {
    const checks = [
      ['XhsChromeBridge', window.XhsChromeBridge],
      ['XhsEditorUtils', window.XhsEditorUtils],
      ['XhsTemplates', window.XhsTemplates],
      ['XhsFormatEngine', window.XhsFormatEngine],
      ['XhsCustomTemplates', window.XhsCustomTemplates],
      ['XhsImageGenerator', window.XhsImageGenerator],
      ['XhsCoverGenerator', window.XhsCoverGenerator],
      ['XhsAiImage', window.XhsAiImage],
      ['XhsUploadHelper', window.XhsUploadHelper],
    ];
    const missing = checks.filter(([, mod]) => !mod).map(([name]) => name);
    if (missing.length) {
      console.error('[小红书排版助手] 模块未加载:', missing.join(', '));
      showTooltip('❌ 插件模块加载失败，请刷新页面（缺少: ' + missing[0] + '）');
      return false;
    }
    return true;
  }

  function installErrorGuard() {
    window.addEventListener('error', (e) => {
      const msg = String(e.message || '');
      if (/Extension context invalidated/i.test(msg)) {
        showContextRefreshBanner();
        return;
      }
      if (/already been declared|SyntaxError/i.test(msg)) {
        showContextRefreshBanner();
      }
      if (!e.filename?.includes('xhs-format') && !e.filename?.includes('extension')) {
        const fromExt = /chrome-extension:\/\//.test(e.filename || '') ||
          msg.includes('Xhs') || msg.includes('xhs-fmt');
        if (!fromExt) return;
      }
      console.error('[小红书排版助手] 运行错误:', msg, e.filename, e.lineno);
    });
    window.addEventListener('unhandledrejection', (e) => {
      const msg = String(e.reason?.message || e.reason || '');
      if (/Extension context invalidated|already been declared/i.test(msg)) {
        showContextRefreshBanner();
        e.preventDefault();
      }
    });
  }

  function startObserver() {
    if (!document.body) return;
    const observer = new MutationObserver(debounce(syncExtensionUI, CONFIG.DEBOUNCE_MS));
    observer.observe(document.body, { childList: true, subtree: true });
    syncExtensionUI();
    watchPageNavigation();
  }

  document.addEventListener('click', (e) => {
    if (state.activePanel && !state.activePanel.contains(e.target) && !e.target.closest('#' + CONFIG.TOOLBAR_ID)) {
      closeActivePanel();
    }
  });

  async function init() {
    try {
      installErrorGuard();
      console.log('[小红书排版助手] v' + chrome.runtime.getManifest().version + ' 已加载');
      sessionStorage.removeItem('xhs_fmt_toolbar_hidden');
      window.addEventListener('xhs-fmt-context-invalidated', showContextRefreshBanner);
      watchExtensionUpdate();
      if (!verifyModules()) return;
      await initProStatus();
      await loadLastTemplate();
      window.XhsEditorUtils?.initSelectionSaver();
      startObserver();
      initSelectionFloatBtn();
      console.log('[小红书排版助手] 就绪 |', state.proSource, '| 模板', window.XhsTemplates?.length, '| 版式', window.XhsImageGenerator?.IMAGE_LAYOUTS?.length);
    } catch (e) {
      console.error('[小红书排版助手] 初始化失败:', e);
      showTooltip('❌ 插件初始化失败，请刷新页面');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
