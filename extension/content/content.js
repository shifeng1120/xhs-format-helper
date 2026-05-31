// ============================================
// 小红书排版助手 - 内容注入脚本
// 功能：注入浮动排版工具栏到小红书编辑器
// ============================================

(function () {
  'use strict';

  // ---------- 配置 ----------
  const CONFIG = {
    STORAGE_KEY: 'xhs_fmt_settings',
    PRO_KEY: 'xhs_fmt_pro_key',
    PRO_KEY_PREFIX: 'XHS-PRO-',
    TOOLBAR_ID: 'xhs-fmt-toolbar',
    DEBOUNCE_MS: 300,
    OBSERVER_INTERVAL: 2000,
  };

  // ---------- 状态 ----------
  let state = {
    isPro: false,
    toolbarInjected: false,
    currentSelection: null,
  };

  // ---------- 工具函数 ----------

  /** 加载 Chrome 存储 */
  async function loadStorage(key) {
    return new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.sync.get(key, (result) => resolve(result[key]));
      } else {
        resolve(localStorage.getItem(key));
      }
    });
  }

  /** 保存到 Chrome 存储 */
  async function saveStorage(key, value) {
    return new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.sync.set({ [key]: value }, resolve);
      } else {
        localStorage.setItem(key, JSON.stringify(value));
        resolve();
      }
    });
  }

  /** 检查 Pro 许可证是否有效 */
  function isValidProKey(key) {
    if (!key || typeof key !== 'string') return false;
    return key.startsWith(CONFIG.PRO_KEY_PREFIX) && key.length >= 16;
  }

  /** 防抖 */
  function debounce(fn, ms) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), ms);
    };
  }

  // ---------- 初始化 Pro 状态 ----------

  async function initProStatus() {
    const savedKey = await loadStorage(CONFIG.PRO_KEY);
    state.isPro = isValidProKey(savedKey);
    return state.isPro;
  }

  // ---------- 检测编辑器 DOM ----------

  /** 查找小红书编辑器中的 contenteditable 区域 */
  function findEditor() {
    // 小红书 PC 端编辑器通常是 contenteditable 的 div
    const editors = document.querySelectorAll('[contenteditable="true"]');
    for (const el of editors) {
      // 找到最可能是笔记编辑器的那个（面积最大或含有特定类名）
      if (el.offsetWidth > 200 && el.offsetHeight > 100) {
        return el;
      }
    }
    // 兜底：通过选区判断
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const node = sel.getRangeAt(0).commonAncestorContainer;
      const editable = node.closest?.('[contenteditable="true"]');
      if (editable) return editable;
    }
    return null;
  }

  /** 查找编辑器上方适合插入工具栏的位置 */
  function findToolbarAnchor(editor) {
    // 1. 看编辑器父容器是否有 header/toolbar 区域
    const parent = editor.parentElement;
    if (parent) {
      // 2. 在编辑器前面插入
      return editor;
    }
    return editor;
  }

  // ---------- 注入工具栏 ----------

  function injectToolbar() {
    if (state.toolbarInjected) return;
    const editor = findEditor();
    if (!editor) return;

    const toolbar = createToolbarElement();
    if (!toolbar) return;

    // 插入到编辑器前面
    editor.parentNode.insertBefore(toolbar, editor);
    state.toolbarInjected = true;
    console.log('[小红书排版助手] 工具栏已注入');
  }

  /** 创建工具栏 DOM */
  function createToolbarElement() {
    // 避免重复创建
    if (document.getElementById(CONFIG.TOOLBAR_ID)) return null;

    const toolbar = document.createElement('div');
    toolbar.id = CONFIG.TOOLBAR_ID;

    // ---- 字号 ----
    toolbar.appendChild(createLabel('字号'));
    const fontSizeSelect = createSelect(
      ['14', '15', '16', '17', '18', '20', '22', '24'],
      ['14', '15', '16', '17', '18', '20', '22', '24'],
      '16',
      (val) => execFormat('fontSize', val)
    );
    toolbar.appendChild(fontSizeSelect);
    toolbar.appendChild(createDivider());

    // ---- 行距 ----
    toolbar.appendChild(createLabel('行距'));
    const lineHeightSelect = createSelect(
      ['1.0', '1.5', '1.75', '2.0', '2.5'],
      ['1.0', '1.5', '1.75', '2.0', '2.5'],
      '1.75',
      (val) => applyLineHeight(val)
    );
    toolbar.appendChild(lineHeightSelect);
    toolbar.appendChild(createDivider());

    // ---- 颜色 ----
    toolbar.appendChild(createLabel('颜色'));
    toolbar.appendChild(createColorPicker('foreColor', '#333333'));
    toolbar.appendChild(createPresetColors([
      '#333333', '#ff4757', '#ff6348', '#ffa502',
      '#2ed573', '#1e90ff', '#a855f7', '#000000'
    ], 'foreColor'));
    toolbar.appendChild(createDivider());

    // ---- 加粗/斜体/下划线 ----
    toolbar.appendChild(createToggleBtn('B', '加粗', () => execFormat('bold')));
    toolbar.appendChild(createToggleBtn('I', '斜体', () => execFormat('italic')));
    toolbar.appendChild(createToggleBtn('U', '下划线', () => execFormat('underline')));
    toolbar.appendChild(createDivider());

    // ---- 对齐 ----
    toolbar.appendChild(createBtn('⬅', '左对齐', () => execFormat('justifyLeft')));
    toolbar.appendChild(createBtn('⬇', '居中对齐', () => execFormat('justifyCenter')));
    toolbar.appendChild(createBtn('➡', '右对齐', () => execFormat('justifyRight')));
    toolbar.appendChild(createDivider());

    // ---- 缩进 ----
    toolbar.appendChild(createBtn('↔', '减少缩进', () => execFormat('outdent')));
    toolbar.appendChild(createBtn('→', '增加缩进', () => execFormat('indent')));
    toolbar.appendChild(createDivider());

    // ---- Pro 功能（锁定） ----
    const proClass = state.isPro ? '' : ' xhs-fmt-btn-pro';
    toolbar.appendChild(createBtnText('📋 模板', () => showProModal(), true));
    toolbar.appendChild(createBtnText('🎨 配色', () => showProModal(), true));
    toolbar.appendChild(createBtnText('🧹 清理', () => showProModal(), true));

    // ---- 升级入口 ----
    if (!state.isPro) {
      toolbar.appendChild(createDivider());
      const upgradeBtn = document.createElement('button');
      upgradeBtn.className = 'xhs-fmt-btn-text';
      upgradeBtn.style.cssText = 'background:#1976d2 !important;color:#fff !important;border-radius:6px !important;font-weight:600 !important;';
      upgradeBtn.textContent = '⭐ 升级Pro';
      upgradeBtn.title = '解锁全部高级功能';
      upgradeBtn.addEventListener('click', showProModal);
      toolbar.appendChild(upgradeBtn);
    }

    return toolbar;
  }

  // ---------- DOM 辅助函数 ----------

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

  function createBtn(text, title, onClick) {
    const btn = document.createElement('button');
    btn.className = 'xhs-fmt-btn';
    btn.textContent = text;
    btn.title = title;
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      onClick();
    });
    return btn;
  }

  function createToggleBtn(text, title, onToggle) {
    const btn = createBtn(text, title, () => {
      onToggle();
      btn.classList.toggle('active');
    });
    return btn;
  }

  function createBtnText(text, onClick, isPro = false) {
    const btn = document.createElement('button');
    btn.className = 'xhs-fmt-btn-text' + (isPro && !state.isPro ? ' xhs-fmt-btn-pro' : '');
    btn.textContent = text;
    btn.title = text;
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      onClick();
    });
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
      onChange(e.target.value);
    });
    return select;
  }

  function createColorPicker(command, defaultValue) {
    const wrapper = document.createElement('span');
    wrapper.className = 'xhs-fmt-color-wrapper';
    const input = document.createElement('input');
    input.type = 'color';
    input.className = 'xhs-fmt-color';
    input.value = defaultValue;
    input.title = '自定义颜色';
    input.addEventListener('input', (e) => {
      e.preventDefault();
      e.stopPropagation();
      execFormat(command, e.target.value);
    });
    wrapper.appendChild(input);
    return wrapper;
  }

  function createPresetColors(colors, command) {
    const wrapper = document.createElement('span');
    wrapper.className = 'xhs-fmt-preset-colors';
    colors.forEach((color) => {
      const dot = document.createElement('span');
      dot.className = 'xhs-fmt-preset-color';
      dot.style.backgroundColor = color;
      dot.title = color;
      dot.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        execFormat(command, color);
        // 移除其他 active
        wrapper.querySelectorAll('.xhs-fmt-preset-color').forEach((d) => d.classList.remove('active'));
        dot.classList.add('active');
      });
      wrapper.appendChild(dot);
    });
    return wrapper;
  }

  // ---------- 排版命令执行 ----------

  /** 执行 document.execCommand */
  function execFormat(command, value) {
    const editor = findEditor();
    if (!editor) return;

    // 确保编辑器获得焦点
    editor.focus();

    // 保存选区
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    try {
      if (value !== undefined) {
        document.execCommand(command, false, value);
      } else {
        document.execCommand(command, false, null);
      }
    } catch (e) {
      console.warn('[小红书排版助手] execCommand 失败:', command, e);
    }

    // 重新聚焦编辑器
    editor.focus();
  }

  /** 应用行距 */
  function applyLineHeight(value) {
    const editor = findEditor();
    if (!editor) return;
    editor.focus();

    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    const range = sel.getRangeAt(0);
    let container = range.commonAncestorContainer;

    // 如果选区没有包裹元素，创建一个
    if (container.nodeType === Node.TEXT_NODE) {
      container = container.parentElement;
    }

    // 应用行高到最近的块级元素
    let block = container;
    while (block && block !== editor) {
      const display = window.getComputedStyle(block).display;
      if (display === 'block' || display === 'div' || display === 'p') {
        block.style.lineHeight = value;
        return;
      }
      block = block.parentElement;
    }

    // 兜底：直接设置到选区包裹元素
    try {
      document.execCommand('insertHTML', false, `<span style="line-height:${value}">${range.toString()}</span>`);
    } catch (e) {
      console.warn('[小红书排版助手] 行距设置失败:', e);
    }

    editor.focus();
  }

  // ---------- Pro 弹窗 ----------

  function showProModal() {
    if (state.isPro) return;

    // 避免重复弹窗
    if (document.getElementById('xhs-fmt-pro-modal-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'xhs-fmt-pro-modal-overlay';
    overlay.innerHTML = `
      <div id="xhs-fmt-pro-modal">
        <h2>⭐ 升级到 Pro</h2>
        <p>解锁全部高级功能：排版模板、配色方案、格式清理、自定义模板、话题标签管理</p>
        <span class="xhs-fmt-price">¥29.9 <small>终身买断</small></span>
        <button class="xhs-fmt-pro-btn-buy">立即升级 →</button>
        <br/>
        <button class="xhs-fmt-pro-btn-close">以后再说</button>
      </div>
    `;

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });

    // 等 DOM 挂载后绑定事件
    setTimeout(() => {
      const buyBtn = overlay.querySelector('.xhs-fmt-pro-btn-buy');
      const closeBtn = overlay.querySelector('.xhs-fmt-pro-btn-close');

      if (buyBtn) {
        buyBtn.addEventListener('click', () => {
          // 打开面包多支付链接（需要替换为真实链接）
          window.open('https://mianbaoduo.com/xxxxx', '_blank');
        });
      }

      if (closeBtn) {
        closeBtn.addEventListener('click', () => overlay.remove());
      }
    }, 100);

    document.body.appendChild(overlay);
  }

  // ---------- MutationObserver 监控编辑器出现 ----------

  /** 监听 DOM 变化，等待编辑器出现后注入工具栏 */
  function startObserver() {
    const observer = new MutationObserver(
      debounce(() => {
        if (!state.toolbarInjected) {
          injectToolbar();
        }
      }, CONFIG.DEBOUNCE_MS)
    );

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // 立即尝试一次
    injectToolbar();
  }

  // ---------- 启动 ----------

  async function init() {
    console.log('[小红书排版助手] 插件已加载');

    // 初始化 Pro 状态
    await initProStatus();
    console.log('[小红书排版助手] Pro 状态:', state.isPro);

    // 开始监控编辑器 DOM
    startObserver();
  }

  // 页面加载完成后初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
