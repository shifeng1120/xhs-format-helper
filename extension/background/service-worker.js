// ============================================
// 小红书排版助手 - 后台 Service Worker
// ============================================

const STORAGE_KEYS = {
  PRO_KEY: 'xhs_fmt_pro_key',
  STATS: 'xhs_fmt_stats',
  SETTINGS: 'xhs_fmt_settings',
};

// ---------- 统计 ----------

async function getStats() {
  const result = await chrome.storage.local.get(STORAGE_KEYS.STATS);
  return result[STORAGE_KEYS.STATS] || { installDate: null, proActivated: false, formatCount: 0 };
}

async function incrementFormatCount() {
  const stats = await getStats();
  stats.formatCount = (stats.formatCount || 0) + 1;
  await chrome.storage.local.set({ [STORAGE_KEYS.STATS]: stats });
}

async function setProActivated() {
  const stats = await getStats();
  stats.proActivated = true;
  await chrome.storage.local.set({ [STORAGE_KEYS.STATS]: stats });
}

// ---------- 安装/更新事件 ----------

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // 首次安装
    const stats = {
      installDate: new Date().toISOString(),
      proActivated: false,
      formatCount: 0,
    };
    chrome.storage.local.set({ [STORAGE_KEYS.STATS]: stats });
    console.log('[小红书排版助手] 已安装');
  } else if (details.reason === 'update') {
    console.log('[小红书排版助手] 已更新:', details.previousVersion, '→', chrome.runtime.getManifest().version);
  }
});

// ---------- 消息处理 ----------

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case 'getStats':
      getStats().then(sendResponse);
      return true;

    case 'incrementFormatCount':
      incrementFormatCount().then(() => sendResponse({ success: true }));
      return true;

    case 'verifyProKey':
      const key = message.key || '';
      const isValid = key.startsWith('XHS-PRO-') && key.length >= 16;
      if (isValid) {
        setProActivated().then(() => sendResponse({ valid: true }));
      } else {
        sendResponse({ valid: false });
      }
      return true;

    case 'isPro':
      chrome.storage.sync.get(STORAGE_KEYS.PRO_KEY, (result) => {
        const key = result[STORAGE_KEYS.PRO_KEY] || '';
        sendResponse({ isPro: key.startsWith('XHS-PRO-') && key.length >= 16 });
      });
      return true;

    default:
      sendResponse({ error: 'unknown action' });
      return true;
  }
});
