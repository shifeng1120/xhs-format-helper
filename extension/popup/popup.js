// ============================================
// 小红书排版助手 - 弹出页逻辑
// ============================================

(function () {
  'use strict';

  const PRO_KEY_PREFIX = 'XHS-PRO-';
  const BUY_URL = 'https://mianbaoduo.com/xxxxx'; // ⚠️ TODO: 替换为面包多商品链接（创建商品后更新）
  const EDITOR_URLS = [
    'https://creator.xiaohongshu.com/publish/publish',
    'https://creator.xiaohongshu.com/note/editor',
  ];

  // ---------- DOM 引用 ----------
  const els = {
    statusBadge: document.getElementById('status-badge'),
    formatCount: document.getElementById('format-count'),
    version: document.getElementById('version'),
    proActivated: document.getElementById('pro-activated-section'),
    proUpgrade: document.getElementById('pro-upgrade-section'),
    activateSection: document.getElementById('activate-section'),
    activateResult: document.getElementById('activate-result'),
    licenseInput: document.getElementById('license-input'),
    btnBuy: document.getElementById('btn-buy-pro'),
    btnActivate: document.getElementById('btn-activate'),
    btnShowActivate: document.getElementById('btn-show-activate'),
    btnCancelActivate: document.getElementById('btn-cancel-activate'),
    btnDeactivate: document.getElementById('btn-deactivate-pro'),
    btnOpenEditor: document.getElementById('btn-open-editor'),
    btnContact: document.getElementById('btn-contact'),
  };

  // ---------- 工具函数 ----------

  function formatKey(key) {
    return key.trim().toUpperCase();
  }

  function isValidProKey(key) {
    return /^XHS-PRO-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{2}$/.test(key);
  }

  // ---------- 状态管理 ----------

  async function checkProStatus() {
    return new Promise((resolve) => {
      chrome.storage.sync.get('xhs_fmt_pro_key', (result) => {
        const key = result['xhs_fmt_pro_key'] || '';
        resolve(isValidProKey(key));
      });
    });
  }

  async function saveProKey(key) {
    return new Promise((resolve) => {
      chrome.storage.sync.set({ 'xhs_fmt_pro_key': key }, resolve);
    });
  }

  async function removeProKey() {
    return new Promise((resolve) => {
      chrome.storage.sync.remove('xhs_fmt_pro_key', resolve);
    });
  }

  async function getStats() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: 'getStats' }, (result) => {
        resolve(result || { formatCount: 0 });
      });
    });
  }

  // ---------- UI 更新 ----------

  async function updateUI() {
    const isPro = await checkProStatus();
    const stats = await getStats();

    // 状态标签
    if (isPro) {
      els.statusBadge.textContent = 'Pro 已激活';
      els.statusBadge.className = 'badge badge-pro';
    } else {
      els.statusBadge.textContent = 'Free 版';
      els.statusBadge.className = 'badge badge-free';
    }

    // 使用次数
    els.formatCount.textContent = stats.formatCount || 0;

    // 版本号
    els.version.textContent = chrome.runtime.getManifest().version;

    // 显示/隐藏 Pro 区域
    if (isPro) {
      els.proActivated.classList.remove('hidden');
      els.proUpgrade.classList.add('hidden');
    } else {
      els.proActivated.classList.add('hidden');
      els.proUpgrade.classList.remove('hidden');
    }

    // 确保激活输入区和结果区隐藏
    els.activateSection.classList.add('hidden');
    els.activateResult.classList.add('hidden');
  }

  // ---------- 事件绑定 ----------

  // 购买 Pro
  els.btnBuy.addEventListener('click', () => {
    chrome.tabs.create({ url: BUY_URL });
  });

  // 显示激活码输入
  els.btnShowActivate.addEventListener('click', () => {
    els.activateSection.classList.remove('hidden');
    els.licenseInput.focus();
  });

  // 取消激活
  els.btnCancelActivate.addEventListener('click', () => {
    els.activateSection.classList.add('hidden');
    els.licenseInput.value = '';
  });

  // 激活 Pro
  els.btnActivate.addEventListener('click', async () => {
    const rawKey = els.licenseInput.value.trim();
    const key = formatKey(rawKey);

    if (!key) {
      showResult('请输入激活码', false);
      return;
    }

    if (!isValidProKey(key)) {
      showResult('激活码格式不正确，请检查后重试', false);
      return;
    }

    // 验证并保存
    chrome.runtime.sendMessage(
      { action: 'verifyProKey', key },
      async (response) => {
        if (response && response.valid) {
          await saveProKey(key);
          showResult('✅ 激活成功！所有 Pro 功能已解锁', true);
          els.activateSection.classList.add('hidden');
          els.licenseInput.value = '';
          setTimeout(() => updateUI(), 1000);
        } else {
          showResult('激活失败，请检查激活码是否正确', false);
        }
      }
    );
  });

  // 退出 Pro
  els.btnDeactivate.addEventListener('click', async () => {
    if (confirm('确定要退出 Pro 模式吗？退出后高级功能将被锁定。')) {
      await removeProKey();
      await updateUI();
    }
  });

  // 打开小红书编辑器
  els.btnOpenEditor.addEventListener('click', () => {
    // 尝试打开创作者后台
    chrome.tabs.query({ url: '*://creator.xiaohongshu.com/*' }, (tabs) => {
      if (tabs.length > 0) {
        chrome.tabs.update(tabs[0].id, { active: true });
      } else {
        chrome.tabs.create({ url: EDITOR_URLS[0] });
      }
    });
  });

  // 反馈
  els.btnContact.addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://github.com/xhs-format-helper/xhs-format-helper/issues' });
  });

  // ---------- 辅助 ----------

  function showResult(msg, isSuccess) {
    els.activateResult.textContent = msg;
    els.activateResult.className = isSuccess ? 'success-msg' : 'error-msg';
    els.activateResult.classList.remove('hidden');
    setTimeout(() => els.activateResult.classList.add('hidden'), 3000);
  }

  // ---------- 初始化 ----------

  document.addEventListener('DOMContentLoaded', updateUI);
})();
