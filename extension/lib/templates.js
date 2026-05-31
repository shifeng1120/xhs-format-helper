// ============================================
// 小红书排版助手 - 排版模板定义
// 5 套小红书风格模板
// ============================================

const XhsTemplates = [
  {
    id: 'clean',
    name: '清新简约',
    emoji: '🌿',
    desc: '干净利落，适合日常分享',
    style: {
      fontSize: '16px',
      lineHeight: '1.75',
      color: '#333333',
      textAlign: 'left',
    },
    headingStyle: {
      fontSize: '20px',
      fontWeight: 'bold',
      color: '#333333',
    },
  },
  {
    id: 'business',
    name: '干练商务',
    emoji: '💼',
    desc: '专业正式，适合职场/知识分享',
    style: {
      fontSize: '15px',
      lineHeight: '1.5',
      color: '#222222',
      textAlign: 'left',
    },
    headingStyle: {
      fontSize: '18px',
      fontWeight: 'bold',
      color: '#1a1a1a',
    },
  },
  {
    id: 'cute',
    name: '可爱清新',
    emoji: '🌸',
    desc: '甜美可爱，适合美妆/穿搭/日常',
    style: {
      fontSize: '16px',
      lineHeight: '2.0',
      color: '#555555',
      textAlign: 'center',
    },
    headingStyle: {
      fontSize: '22px',
      fontWeight: 'bold',
      color: '#e91e63',
    },
  },
  {
    id: 'minimal',
    name: '极简留白',
    emoji: '◻️',
    desc: '大量留白，适合摄影/艺术/生活感悟',
    style: {
      fontSize: '17px',
      lineHeight: '2.5',
      color: '#444444',
      textAlign: 'left',
    },
    headingStyle: {
      fontSize: '24px',
      fontWeight: '300',
      color: '#222222',
    },
  },
  {
    id: 'vintage',
    name: '复古文艺',
    emoji: '📜',
    desc: '复古色调，适合书评/影评/情感',
    style: {
      fontSize: '16px',
      lineHeight: '1.8',
      color: '#5D4037',
      textAlign: 'left',
    },
    headingStyle: {
      fontSize: '20px',
      fontWeight: 'bold',
      color: '#3E2723',
    },
  },
];

/** 应用模板到编辑器 */
function applyTemplate(templateId, editor) {
  const template = XhsTemplates.find((t) => t.id === templateId);
  if (!template || !editor) return;

  // 应用到编辑器内的所有段落
  const paragraphs = editor.querySelectorAll('p, div[style*="margin"], [data-block]');
  if (paragraphs.length === 0) {
    // 直接应用样式到编辑器内容
    editor.style.fontSize = template.style.fontSize;
    editor.style.lineHeight = template.style.lineHeight;
    editor.style.color = template.style.color;
    editor.style.textAlign = template.style.textAlign;
  } else {
    paragraphs.forEach((p) => {
      p.style.fontSize = template.style.fontSize;
      p.style.lineHeight = template.style.lineHeight;
      p.style.color = template.style.color;
      p.style.textAlign = template.style.textAlign;
    });
  }
}
