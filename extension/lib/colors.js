// ============================================
// 小红书排版助手 - 配色方案
// 10 套使用配色
// ============================================

const XhsColorSchemes = [
  {
    id: 'default',
    name: '经典黑白',
    colors: {
      primary: '#333333',
      secondary: '#666666',
      accent: '#1976D2',
      bg: '#FFFFFF',
    },
  },
  {
    id: 'rose',
    name: '玫瑰红茶',
    colors: {
      primary: '#5D4037',
      secondary: '#8D6E63',
      accent: '#E91E63',
      bg: '#FFF8F0',
    },
  },
  {
    id: 'ocean',
    name: '深海蓝调',
    colors: {
      primary: '#1A237E',
      secondary: '#5C6BC0',
      accent: '#00BCD4',
      bg: '#E8EAF6',
    },
  },
  {
    id: 'forest',
    name: '森林物语',
    colors: {
      primary: '#1B5E20',
      secondary: '#4CAF50',
      accent: '#FF9800',
      bg: '#F1F8E9',
    },
  },
  {
    id: 'sunset',
    name: '日落余晖',
    colors: {
      primary: '#E65100',
      secondary: '#FF8A65',
      accent: '#FFD54F',
      bg: '#FFF3E0',
    },
  },
  {
    id: 'lavender',
    name: '薰衣草田',
    colors: {
      primary: '#4A148C',
      secondary: '#7E57C2',
      accent: '#CE93D8',
      bg: '#F3E5F5',
    },
  },
  {
    id: 'matcha',
    name: '抹茶拿铁',
    colors: {
      primary: '#33691E',
      secondary: '#8BC34A',
      accent: '#FFAB91',
      bg: '#F1F8E9',
    },
  },
  {
    id: 'chocolate',
    name: '巧克力慕斯',
    colors: {
      primary: '#3E2723',
      secondary: '#6D4C41',
      accent: '#FFB300',
      bg: '#FFF8E1',
    },
  },
  {
    id: 'sky',
    name: '天空之城',
    colors: {
      primary: '#01579B',
      secondary: '#40C4FF',
      accent: '#FF4081',
      bg: '#E1F5FE',
    },
  },
  {
    id: 'mono',
    name: '高级灰调',
    colors: {
      primary: '#212121',
      secondary: '#757575',
      accent: '#9E9E9E',
      bg: '#F5F5F5',
    },
  },
];

/** 应用配色方案到选区文本 */
function applyColorScheme(schemeId, editor) {
  const scheme = XhsColorSchemes.find((s) => s.id === schemeId);
  if (!scheme || !editor) return;

  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;

  // 应用文字颜色为主色
  document.execCommand('foreColor', false, scheme.colors.primary);
  editor.focus();
}
