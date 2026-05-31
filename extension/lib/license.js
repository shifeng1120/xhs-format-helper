// ============================================
// 小红书排版助手 - License 验证逻辑
// ============================================

const XhsLicense = {
  PRO_KEY_PREFIX: 'XHS-PRO-',

  /** 生成 License Key（用户购买后使用） */
  generate(username) {
    const prefix = this.PRO_KEY_PREFIX;
    const userPart = (username || 'USER').slice(0, 4).toUpperCase();
    const timePart = Date.now().toString(36).slice(-4).toUpperCase();
    const checkDigit = this._checksum(userPart + timePart);
    return `${prefix}${userPart}-${timePart}-${checkDigit}`;
  },

  /** 验证 License Key */
  verify(key) {
    if (!key || typeof key !== 'string') return false;
    const cleaned = key.trim().toUpperCase();

    // 格式: XHS-PRO-XXXX-XXXX-XX
    const pattern = /^XHS-PRO-([A-Z0-9]{4})-([A-Z0-9]{4})-([A-Z0-9]{2})$/;
    const match = cleaned.match(pattern);
    if (!match) return false;

    const [, userPart, timePart, checkDigit] = match;
    const expected = this._checksum(userPart + timePart);
    return checkDigit === expected;
  },

  /** 简单校验和 */
  _checksum(str) {
    let sum = 0;
    for (let i = 0; i < str.length; i++) {
      sum += str.charCodeAt(i);
    }
    const hex = (sum % 256).toString(16).toUpperCase();
    return hex.padStart(2, '0');
  },
};
