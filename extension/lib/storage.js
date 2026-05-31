// ============================================
// 小红书排版助手 - Chrome Storage 封装
// ============================================

const XhsStorage = {
  /** 获取存储值 */
  async get(key, defaultValue = null) {
    try {
      const result = await chrome.storage.sync.get(key);
      return result[key] !== undefined ? result[key] : defaultValue;
    } catch {
      try {
        const val = localStorage.getItem(key);
        return val !== null ? JSON.parse(val) : defaultValue;
      } catch {
        return defaultValue;
      }
    }
  },

  /** 设置存储值 */
  async set(key, value) {
    try {
      await chrome.storage.sync.set({ [key]: value });
    } catch {
      localStorage.setItem(key, JSON.stringify(value));
    }
  },

  /** 删除存储值 */
  async remove(key) {
    try {
      await chrome.storage.sync.remove(key);
    } catch {
      localStorage.removeItem(key);
    }
  },

  /** 获取本地存储（不同步） */
  async getLocal(key, defaultValue = null) {
    try {
      const result = await chrome.storage.local.get(key);
      return result[key] !== undefined ? result[key] : defaultValue;
    } catch {
      return defaultValue;
    }
  },

  /** 设置本地存储 */
  async setLocal(key, value) {
    try {
      await chrome.storage.local.set({ [key]: value });
    } catch {
      // 静默失败
    }
  },
};
