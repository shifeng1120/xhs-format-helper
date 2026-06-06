// ============================================
// 小红书排版助手 - 爆款封面生成器 v2.3
// 大字封面图，提升笔记点击率
// ============================================

(function (global) {
  'use strict';

  const FONT_FAMILY =
    '-apple-system, BlinkMacSystemFont, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif';

  const COVER_STYLES = [
    {
      id: 'xhs-hot',
      name: '小红书爆款',
      emoji: '🔥',
      bg: { type: 'gradient', colors: ['#ff4757', '#ff6b81', '#ff8fab'] },
      titleColor: '#ffffff',
      subtitleColor: 'rgba(255,255,255,0.9)',
      decor: '✨',
      titleSize: 0.11,
      align: 'center',
    },
    {
      id: 'contrast',
      name: '黑白冲击',
      emoji: '⚡',
      bg: { type: 'solid', color: '#1a1a1a' },
      titleColor: '#ffffff',
      subtitleColor: '#cccccc',
      decor: '',
      titleSize: 0.12,
      align: 'left',
    },
    {
      id: 'pastel',
      name: '奶油治愈',
      emoji: '🤍',
      bg: { type: 'gradient', colors: ['#fff8f0', '#ffe0e6', '#ffc3d0'] },
      titleColor: '#5d4037',
      subtitleColor: '#8d6e63',
      decor: '🌸',
      titleSize: 0.1,
      align: 'center',
    },
    {
      id: 'mint-pop',
      name: '清新种草',
      emoji: '🌿',
      bg: { type: 'gradient', colors: ['#00b894', '#55efc4', '#dfe6e9'] },
      titleColor: '#ffffff',
      subtitleColor: 'rgba(255,255,255,0.88)',
      decor: '💚',
      titleSize: 0.105,
      align: 'center',
    },
    {
      id: 'purple-dream',
      name: '梦幻紫调',
      emoji: '💜',
      bg: { type: 'gradient', colors: ['#6c5ce7', '#a29bfe', '#fd79a8'] },
      titleColor: '#ffffff',
      subtitleColor: 'rgba(255,255,255,0.85)',
      decor: '✨',
      titleSize: 0.1,
      align: 'center',
    },
    {
      id: 'sunset-warm',
      name: '日落暖色',
      emoji: '🌅',
      bg: { type: 'gradient', colors: ['#e17055', '#fdcb6e', '#ffeaa7'] },
      titleColor: '#2d3436',
      subtitleColor: '#636e72',
      decor: '',
      titleSize: 0.1,
      align: 'left',
    },
    {
      id: 'minimal',
      name: '极简大字',
      emoji: '◻️',
      bg: { type: 'solid', color: '#ffffff' },
      titleColor: '#212121',
      subtitleColor: '#757575',
      decor: '',
      titleSize: 0.115,
      align: 'left',
      border: '#f0f0f0',
    },
    {
      id: 'notebook',
      name: '手账贴纸',
      emoji: '📒',
      bg: { type: 'solid', color: '#fff9e6' },
      titleColor: '#d84315',
      subtitleColor: '#6d4c41',
      decor: '📌',
      titleSize: 0.095,
      align: 'center',
    },
  ];

  const SIZES = {
    portrait: { width: 1080, height: 1440, label: '3:4 竖版' },
    square: { width: 1080, height: 1080, label: '1:1 方图' },
  };

  function roundRect(ctx, x, y, w, h, r) {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  function drawBg(ctx, style, w, h) {
    const bg = style.bg;
    if (bg.type === 'gradient') {
      const g = ctx.createLinearGradient(0, 0, w, h);
      bg.colors.forEach((c, i) => g.addColorStop(i / Math.max(bg.colors.length - 1, 1), c));
      ctx.fillStyle = g;
    } else {
      ctx.fillStyle = bg.color;
    }
    ctx.fillRect(0, 0, w, h);

    if (style.border) {
      ctx.strokeStyle = style.border;
      ctx.lineWidth = 4;
      ctx.strokeRect(20, 20, w - 40, h - 40);
    }

    if (style.id === 'notebook') {
      ctx.strokeStyle = '#ffe0b2';
      ctx.lineWidth = 1;
      for (let y = 120; y < h - 60; y += 48) {
        ctx.beginPath();
        ctx.moveTo(80, y);
        ctx.lineTo(w - 60, y);
        ctx.stroke();
      }
      ctx.fillStyle = '#ffcdd2';
      ctx.fillRect(50, 0, 6, h);
    }
  }

  function wrapText(ctx, text, maxWidth, maxLines) {
    const chars = [...text];
    const lines = [];
    let current = '';
    for (const ch of chars) {
      const test = current + ch;
      if (ctx.measureText(test).width > maxWidth && current) {
        lines.push(current);
        current = ch;
        if (maxLines && lines.length >= maxLines) break;
      } else {
        current = test;
      }
    }
    if (current && (!maxLines || lines.length < maxLines)) lines.push(current);
    if (maxLines && lines.length >= maxLines && chars.length > [...lines.join('')].length) {
      const last = lines[lines.length - 1];
      lines[lines.length - 1] = last.slice(0, Math.max(0, last.length - 1)) + '…';
    }
    return lines;
  }

  function generateCover(options) {
    const opts = options || {};
    const style = COVER_STYLES.find((s) => s.id === opts.styleId) || COVER_STYLES[0];
    const size = SIZES[opts.sizeKey || 'portrait'] || SIZES.portrait;
    const title = (opts.title || '点击阅读全文').trim().slice(0, 40);
    const subtitle = (opts.subtitle || '').trim().slice(0, 60);

    const canvas = document.createElement('canvas');
    canvas.width = size.width;
    canvas.height = size.height;
    const ctx = canvas.getContext('2d');

    drawBg(ctx, style, size.width, size.height);

    const pad = size.width * 0.1;
    const contentW = size.width - pad * 2;
    const titleFontSize = Math.round(size.width * style.titleSize);
    const subFontSize = Math.round(titleFontSize * 0.42);

    ctx.textBaseline = 'top';
    ctx.fillStyle = style.titleColor;
    ctx.font = `800 ${titleFontSize}px ${FONT_FAMILY}`;

    const titleLines = wrapText(ctx, title, contentW, 4);
    const subLines = subtitle
      ? wrapText(ctx, subtitle, contentW, 2)
      : [];

    const titleBlockH = titleLines.length * titleFontSize * 1.15;
    const subBlockH = subLines.length * subFontSize * 1.4;
    const decorH = style.decor ? titleFontSize * 1.2 : 0;
    const totalH = decorH + titleBlockH + (subLines.length ? subBlockH + 24 : 0);
    let startY = (size.height - totalH) / 2;

    if (style.decor) {
      ctx.font = `${Math.round(titleFontSize * 1.1)}px ${FONT_FAMILY}`;
      const decorX = style.align === 'center' ? size.width / 2 : pad;
      ctx.textAlign = style.align === 'center' ? 'center' : 'left';
      ctx.fillText(style.decor, decorX, startY);
      startY += decorH;
      ctx.textAlign = 'left';
    }

    ctx.font = `800 ${titleFontSize}px ${FONT_FAMILY}`;
    ctx.fillStyle = style.titleColor;
    titleLines.forEach((line, i) => {
      const y = startY + i * titleFontSize * 1.15;
      if (style.align === 'center') {
        ctx.textAlign = 'center';
        ctx.fillText(line, size.width / 2, y);
      } else {
        ctx.textAlign = 'left';
        ctx.fillText(line, pad, y);
      }
    });

    if (subLines.length) {
      const subY = startY + titleBlockH + 24;
      ctx.font = `500 ${subFontSize}px ${FONT_FAMILY}`;
      ctx.fillStyle = style.subtitleColor;
      subLines.forEach((line, i) => {
        const y = subY + i * subFontSize * 1.4;
        if (style.align === 'center') {
          ctx.textAlign = 'center';
          ctx.fillText(line, size.width / 2, y);
        } else {
          ctx.textAlign = 'left';
          ctx.fillText(line, pad, y);
        }
      });
    }

    ctx.textAlign = 'left';

    return {
      success: true,
      dataUrl: canvas.toDataURL('image/png', 1.0),
      width: canvas.width,
      height: canvas.height,
      style: style.name,
      size: size.label,
      images: [{
        dataUrl: canvas.toDataURL('image/png', 1.0),
        width: canvas.width,
        height: canvas.height,
        page: 1,
        total: 1,
      }],
    };
  }

  global.XhsCoverGenerator = {
    COVER_STYLES,
    SIZES,
    generateCover,
  };
})(typeof window !== 'undefined' ? window : self);
