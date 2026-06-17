// ============================================
// 小红书排版助手 - 后台 Service Worker
// ============================================

const STORAGE_KEYS = {
  PRO_KEY: 'xhs_fmt_pro_key',
  STATS: 'xhs_fmt_stats',
  SETTINGS: 'xhs_fmt_settings',
  TRIAL_START: 'xhs_fmt_trial_start',
};

const TRIAL_DAYS = 7; // 试用天数

function licenseChecksum(str) {
  let sum = 0;
  for (let i = 0; i < str.length; i++) {
    sum += str.charCodeAt(i);
  }
  return (sum % 256).toString(16).toUpperCase().padStart(2, '0');
}

function verifyLicenseKey(key) {
  const cleaned = String(key || '').trim().toUpperCase();
  const match = cleaned.match(/^XHS-PRO-([A-Z0-9]{4})-([A-Z0-9]{4})-([A-Z0-9]{2})$/);
  if (!match) return false;
  return match[3] === licenseChecksum(match[1] + match[2]);
}

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

// ---------- 试用状态 ----------

async function getTrialStart() {
  const result = await chrome.storage.local.get(STORAGE_KEYS.TRIAL_START);
  return result[STORAGE_KEYS.TRIAL_START] || null;
}

async function setTrialStart() {
  const now = Date.now();
  await chrome.storage.local.set({ [STORAGE_KEYS.TRIAL_START]: now });
  return now;
}

async function checkTrialStatus() {
  let trialStart = await getTrialStart();

  // 首次安装：设置试用起始时间
  if (!trialStart) {
    trialStart = await setTrialStart();
  }

  const now = Date.now();
  const elapsed = now - trialStart;
  const trialPeriod = TRIAL_DAYS * 24 * 60 * 60 * 1000;
  const remaining = Math.max(0, trialPeriod - elapsed);

  return {
    inTrial: remaining > 0,
    remainingMs: remaining,
    remainingDays: Math.ceil(remaining / (24 * 60 * 60 * 1000)),
    trialStart,
  };
}

// ---------- 安装/更新事件 ----------

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // 首次安装：初始化试用
    const now = Date.now();
    const stats = {
      installDate: new Date().toISOString(),
      proActivated: false,
      formatCount: 0,
    };
    chrome.storage.local.set({
      [STORAGE_KEYS.STATS]: stats,
      [STORAGE_KEYS.TRIAL_START]: now,
    });
    console.log('[红薯创作助手] 已安装，7天试用期开始');
  } else if (details.reason === 'update') {
    const version = chrome.runtime.getManifest().version;
    console.log('[红薯创作助手] 已更新:', details.previousVersion, '→', version);
    chrome.storage.local.set({ xhs_fmt_needs_refresh: version });
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

    case 'checkTrialStatus':
      checkTrialStatus().then(sendResponse);
      return true;

    case 'verifyProKey':
      const key = message.key || '';
      const isValid = verifyLicenseKey(key);
      if (isValid) {
        setProActivated().then(() => sendResponse({ valid: true }));
      } else {
        sendResponse({ valid: false });
      }
      return true;

    case 'isPro': {
      // 返回 isPro（Pro激活 或 试用期内）
      const checkProAndTrial = async () => {
        const keyResult = await chrome.storage.sync.get(STORAGE_KEYS.PRO_KEY);
        const savedKey = keyResult[STORAGE_KEYS.PRO_KEY] || '';
        const hasProKey = verifyLicenseKey(savedKey);
        if (hasProKey) return { isPro: true, source: 'activation' };

        const trial = await checkTrialStatus();
        return { isPro: trial.inTrial, source: trial.inTrial ? 'trial' : 'expired', trial };
      };
      checkProAndTrial().then(sendResponse);
      return true;
    }

    default:
      sendResponse({ error: 'unknown action' });
      return true;
  }
});
