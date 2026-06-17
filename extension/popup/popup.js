// ============================================
// 红薯创作助手 - 弹窗控制台
// ============================================

(function () {
  'use strict';

  const BUY_URL = 'https://afdian.com/item/b4dab2045cf111f18bfd52540025c377';
  const ISSUE_URL = 'https://github.com/shifeng1120/xhs-format-helper/issues';
  const EDITOR_URL = 'https://creator.xiaohongshu.com/publish/publish';
  const PRO_KEY = 'xhs_fmt_pro_key';

  const els = {
    statusBadge: document.getElementById('status-badge'),
    statusTitle: document.getElementById('status-title'),
    formatCount: document.getElementById('format-count'),
    trialRemaining: document.getElementById('trial-remaining'),
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

  function send(action, payload) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action, ...(payload || {}) }, (result) => {
        resolve(result || null);
      });
    });
  }

  function syncSet(data) {
    return new Promise((resolve) => chrome.storage.sync.set(data, resolve));
  }

  function syncRemove(key) {
    return new Promise((resolve) => chrome.storage.sync.remove(key, resolve));
  }

  function formatKey(key) {
    return String(key || '').trim().toUpperCase();
  }

  function isValidProKey(key) {
    return /^XHS-PRO-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{2}$/.test(key);
  }

  function setBadge(source) {
    const meta = {
      activation: ['Pro 已激活', 'Pro', 'badge badge-pro'],
      trial: ['全功能试用中', '试用中', 'badge badge-trial'],
      expired: ['试用已结束', '已过期', 'badge badge-expired'],
      none: ['Free 基础版', 'Free', 'badge badge-free'],
    }[source] || ['Free 基础版', 'Free', 'badge badge-free'];

    els.statusTitle.textContent = meta[0];
    els.statusBadge.textContent = meta[1];
    els.statusBadge.className = meta[2];
  }

  function setResult(message, ok) {
    els.activateResult.textContent = message;
    els.activateResult.className = ok ? 'success-msg' : 'error-msg';
    els.activateResult.classList.remove('hidden');
  }

  function hideResultSoon() {
    setTimeout(() => els.activateResult.classList.add('hidden'), 3200);
  }

  async function updateUI() {
    const [proStatus, trial, stats] = await Promise.all([
      send('isPro'),
      send('checkTrialStatus'),
      send('getStats'),
    ]);

    const source = proStatus?.source || 'none';
    setBadge(source);
    els.formatCount.textContent = stats?.formatCount || 0;
    els.version.textContent = chrome.runtime.getManifest().version;

    if (source === 'activation') {
      els.trialRemaining.textContent = '永久';
      els.proActivated.classList.remove('hidden');
      els.proUpgrade.classList.add('hidden');
    } else {
      const days = trial?.remainingDays || 0;
      els.trialRemaining.textContent = source === 'trial' ? `${days}天` : '0天';
      els.proActivated.classList.add('hidden');
      els.proUpgrade.classList.remove('hidden');
    }

    els.activateSection.classList.remove('show');
  }

  els.btnBuy?.addEventListener('click', () => {
    chrome.tabs.create({ url: BUY_URL });
  });

  els.btnShowActivate?.addEventListener('click', () => {
    els.activateSection.classList.add('show');
    els.activateResult.classList.add('hidden');
    els.licenseInput.focus();
  });

  els.btnCancelActivate?.addEventListener('click', () => {
    els.activateSection.classList.remove('show');
    els.licenseInput.value = '';
    els.activateResult.classList.add('hidden');
  });

  els.btnActivate?.addEventListener('click', async () => {
    const key = formatKey(els.licenseInput.value);

    if (!key) {
      setResult('请输入激活码。', false);
      return;
    }

    if (!isValidProKey(key)) {
      setResult('激活码格式不正确，请检查是否为 XHS-PRO-XXXX-XXXX-XX。', false);
      return;
    }

    const response = await send('verifyProKey', { key });
    if (response?.valid) {
      await syncSet({ [PRO_KEY]: key });
      setResult('激活成功，Pro 功能已解锁。刷新发布页后即可使用全部能力。', true);
      els.licenseInput.value = '';
      await updateUI();
      hideResultSoon();
    } else {
      setResult('激活失败，请确认激活码是否完整。', false);
    }
  });

  els.btnDeactivate?.addEventListener('click', async () => {
    if (!confirm('确定退出 Pro 状态吗？退出后高级功能会重新锁定。')) return;
    await syncRemove(PRO_KEY);
    await updateUI();
  });

  els.btnOpenEditor?.addEventListener('click', () => {
    chrome.tabs.query({ url: '*://creator.xiaohongshu.com/*' }, (tabs) => {
      if (tabs?.length) {
        chrome.tabs.update(tabs[0].id, { active: true });
      } else {
        chrome.tabs.create({ url: EDITOR_URL });
      }
    });
  });

  els.btnContact?.addEventListener('click', () => {
    chrome.tabs.create({ url: ISSUE_URL });
  });

  document.addEventListener('DOMContentLoaded', updateUI);
})();
