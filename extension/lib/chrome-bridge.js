// ============================================
// 小红书排版助手 - Chrome API 安全桥接
// 处理 Extension context invalidated
// ============================================

(function (global) {
  'use strict';

  let invalidatedNotified = false;

  function lastErrorMessage() {
    try {
      return chrome?.runtime?.lastError?.message || '';
    } catch (e) {
      return String(e?.message || e || '');
    }
  }

  function isContextInvalidated(err) {
    const msg = String(err?.message || err || lastErrorMessage());
    return /Extension context invalidated|Receiving end does not exist|message port closed/i.test(msg);
  }

  function hasChromeStorage() {
    try {
      if (typeof chrome === 'undefined') return false;
      const id = chrome.runtime?.id;
      const sync = chrome.storage?.sync;
      return !!(id && sync && typeof sync.get === 'function');
    } catch (e) {
      return false;
    }
  }

  function lsGet(key, fallback) {
    try {
      const raw = localStorage.getItem('xhs_fmt_fb_' + key);
      if (raw == null) return fallback;
      return JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  }

  function lsSet(key, value) {
    try {
      localStorage.setItem('xhs_fmt_fb_' + key, JSON.stringify(value));
      return true;
    } catch (e) {
      return false;
    }
  }

  function lsRemove(key) {
    try {
      localStorage.removeItem('xhs_fmt_fb_' + key);
    } catch (e) { /* ignore */ }
  }

  function notifyInvalidated() {
    if (invalidatedNotified) return;
    invalidatedNotified = true;
    try {
      global.dispatchEvent(new CustomEvent('xhs-fmt-context-invalidated'));
    } catch (e) { /* ignore */ }
  }

  function syncGet(key, defaultValue) {
    return new Promise((resolve) => {
      if (!hasChromeStorage()) {
        resolve(lsGet(key, defaultValue));
        return;
      }
      let settled = false;
      const finish = (val) => {
        if (settled) return;
        settled = true;
        resolve(val);
      };
      try {
        chrome.storage.sync.get(key, (result) => {
          try {
            const err = lastErrorMessage();
            if (err) {
              if (isContextInvalidated(err)) notifyInvalidated();
              finish(lsGet(key, defaultValue));
              return;
            }
            const val = result?.[key];
            finish(val !== undefined ? val : defaultValue);
          } catch (e) {
            if (isContextInvalidated(e)) notifyInvalidated();
            finish(lsGet(key, defaultValue));
          }
        });
      } catch (e) {
        if (isContextInvalidated(e)) notifyInvalidated();
        finish(lsGet(key, defaultValue));
      }
    });
  }

  function syncSet(key, value) {
    return new Promise((resolve) => {
      lsSet(key, value);
      if (!hasChromeStorage()) {
        resolve(false);
        return;
      }
      try {
        chrome.storage.sync.set({ [key]: value }, () => {
          const err = lastErrorMessage();
          if (err && isContextInvalidated(err)) notifyInvalidated();
          resolve(!err);
        });
      } catch (e) {
        if (isContextInvalidated(e)) notifyInvalidated();
        resolve(false);
      }
    });
  }

  function syncRemove(key) {
    return new Promise((resolve) => {
      lsRemove(key);
      if (!hasChromeStorage()) {
        resolve(false);
        return;
      }
      try {
        chrome.storage.sync.remove(key, () => {
          const err = lastErrorMessage();
          if (err && isContextInvalidated(err)) notifyInvalidated();
          resolve(!err);
        });
      } catch (e) {
        if (isContextInvalidated(e)) notifyInvalidated();
        resolve(false);
      }
    });
  }

  function localGet(key, defaultValue) {
    return new Promise((resolve) => {
      if (!hasChromeStorage()) {
        resolve(lsGet('local_' + key, defaultValue));
        return;
      }
      try {
        chrome.storage.local.get(key, (result) => {
          const err = lastErrorMessage();
          if (err) {
            if (isContextInvalidated(err)) notifyInvalidated();
            resolve(lsGet('local_' + key, defaultValue));
            return;
          }
          const val = result?.[key];
          resolve(val !== undefined ? val : defaultValue);
        });
      } catch (e) {
        if (isContextInvalidated(e)) notifyInvalidated();
        resolve(lsGet('local_' + key, defaultValue));
      }
    });
  }

  function localSet(key, value) {
    return new Promise((resolve) => {
      lsSet('local_' + key, value);
      if (!hasChromeStorage()) {
        resolve(false);
        return;
      }
      try {
        chrome.storage.local.set({ [key]: value }, () => {
          const err = lastErrorMessage();
          if (err && isContextInvalidated(err)) notifyInvalidated();
          resolve(!err);
        });
      } catch (e) {
        if (isContextInvalidated(e)) notifyInvalidated();
        resolve(false);
      }
    });
  }

  function localRemove(key) {
    return new Promise((resolve) => {
      lsRemove('local_' + key);
      if (!hasChromeStorage()) {
        resolve(false);
        return;
      }
      try {
        chrome.storage.local.remove(key, () => {
          const err = lastErrorMessage();
          if (err && isContextInvalidated(err)) notifyInvalidated();
          resolve(!err);
        });
      } catch (e) {
        if (isContextInvalidated(e)) notifyInvalidated();
        resolve(false);
      }
    });
  }

  function sendMessage(action, data) {
    return new Promise((resolve) => {
      if (!hasChromeStorage()) {
        resolve(null);
        return;
      }
      try {
        chrome.runtime.sendMessage({ action, ...(data || {}) }, (result) => {
          const err = lastErrorMessage();
          if (err) {
            if (isContextInvalidated(err)) notifyInvalidated();
            resolve(null);
            return;
          }
          resolve(result ?? null);
        });
      } catch (e) {
        if (isContextInvalidated(e)) notifyInvalidated();
        resolve(null);
      }
    });
  }

  global.XhsChromeBridge = {
    isContextInvalidated,
    hasChromeStorage,
    notifyInvalidated,
    syncGet,
    syncSet,
    syncRemove,
    localGet,
    localSet,
    localRemove,
    sendMessage,
  };
})(typeof window !== 'undefined' ? window : self);
