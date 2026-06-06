// ============================================
// 小红书排版助手 - 图文卡片生成器 v2.1
// Canvas 渲染，输出小红书标准尺寸图片
// ============================================

(function (global) {
  'use strict';

  const FONT_FAMILY =
    '-apple-system, BlinkMacSystemFont, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Segoe UI Emoji", sans-serif';

  const IMAGE_STYLES = [
    {
      id: 'xhs-pink',
      name: '小红书经典',
      emoji: '💗',
      type: 'card',
      bg: { type: 'gradient', colors: ['#ff6b81', '#ff8fab', '#ffd6e0'], angle: 135 },
      cardBg: '#ffffff',
      titleColor: '#ff4757',
      textColor: '#333333',
      accentColor: '#ff6b81',
      decorEmoji: '✨',
    },
    {
      id: 'cream',
      name: '奶油简约',
      emoji: '🤍',
      type: 'card',
      bg: { type: 'gradient', colors: ['#fff8f0', '#ffe8d6', '#ffd4b8'], angle: 180 },
      cardBg: '#ffffff',
      titleColor: '#e65100',
      textColor: '#5d4037',
      accentColor: '#ff9800',
      decorEmoji: '☕',
    },
    {
      id: 'mint',
      name: '清新薄荷',
      emoji: '🌿',
      type: 'card',
      bg: { type: 'gradient', colors: ['#e8f5e9', '#c8e6c9', '#a5d6a7'], angle: 160 },
      cardBg: '#ffffff',
      titleColor: '#2e7d32',
      textColor: '#37474f',
      accentColor: '#43a047',
      decorEmoji: '🍃',
    },
    {
      id: 'sunset',
      name: '日落暖调',
      emoji: '🌅',
      type: 'full',
      bg: { type: 'gradient', colors: ['#ff6b35', '#ff9a56', '#ffd166'], angle: 135 },
      cardBg: 'rgba(255,255,255,0.92)',
      titleColor: '#bf360c',
      textColor: '#4e342e',
      accentColor: '#ff6b35',
      decorEmoji: '🧡',
    },
    {
      id: 'lavender',
      name: '薰衣草紫',
      emoji: '💜',
      type: 'card',
      bg: { type: 'gradient', colors: ['#f3e5f5', '#e1bee7', '#ce93d8'], angle: 150 },
      cardBg: '#ffffff',
      titleColor: '#7b1fa2',
      textColor: '#4a148c',
      accentColor: '#ab47bc',
      decorEmoji: '🌸',
    },
    {
      id: 'night',
      name: '深夜氛围',
      emoji: '🌙',
      type: 'full',
      bg: { type: 'gradient', colors: ['#1a1a2e', '#16213e', '#0f3460'], angle: 180 },
      cardBg: 'rgba(255,255,255,0.08)',
      titleColor: '#ffffff',
      textColor: '#e0e0e0',
      accentColor: '#ff6b81',
      decorEmoji: '✨',
    },
    {
      id: 'notebook',
      name: '手账笔记',
      emoji: '📒',
      type: 'notebook',
      bg: { type: 'solid', color: '#fff9e6' },
      cardBg: '#fffef5',
      titleColor: '#5d4037',
      textColor: '#4e342e',
      accentColor: '#ff8a65',
      decorEmoji: '✏️',
      lineColor: '#ffe0b2',
    },
    {
      id: 'pure-white',
      name: '极简白底',
      emoji: '◻️',
      type: 'minimal',
      bg: { type: 'solid', color: '#ffffff' },
      cardBg: '#ffffff',
      titleColor: '#212121',
      textColor: '#424242',
      accentColor: '#ff6b81',
      decorEmoji: '',
      borderColor: '#f0f0f0',
    },
  ];

  /** 8 种图文排版版式（与配色独立） */
  const IMAGE_LAYOUTS = [
    { id: 'classic', name: '经典卡片', emoji: '📇', desc: '白卡片+标题+正文' },
    { id: 'magazine', name: '杂志大标题', emoji: '📰', desc: '超大标题+正文区' },
    { id: 'checklist', name: '清单勾选', emoji: '✅', desc: '每条内容独立色块' },
    { id: 'interview', name: '面试题单', emoji: '🎯', desc: '编号题+左侧强调线' },
    { id: 'poster', name: '海报居中', emoji: '🖼️', desc: '居中大字海报风' },
    { id: 'top-band', name: '顶栏分区', emoji: '📊', desc: '彩色顶栏+白底正文' },
    { id: 'sidebar', name: '侧栏强调', emoji: '📌', desc: '左侧色条+内容区' },
    { id: 'immersive', name: '全屏沉浸', emoji: '🌈', desc: '渐变底+无卡片' },
  ];

  const SIZES = {
    portrait: { width: 1080, height: 1440, label: '3:4 竖版', ratio: '3:4' },
    square: { width: 1080, height: 1080, label: '1:1 方图', ratio: '1:1' },
  };

  function resolveLayout(layoutId) {
    return IMAGE_LAYOUTS.find((l) => l.id === layoutId) || IMAGE_LAYOUTS[0];
  }

  function isNumberedLine(line) {
    return /^\d+[\.\、．]\s*/.test((line || '').trim());
  }

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

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  function drawBackground(ctx, style, w, h, bgImage, overlayOpacity) {
    if (bgImage) {
      const scale = Math.max(w / bgImage.width, h / bgImage.height);
      const sw = bgImage.width * scale;
      const sh = bgImage.height * scale;
      const sx = (w - sw) / 2;
      const sy = (h - sh) / 2;
      ctx.drawImage(bgImage, sx, sy, sw, sh);
      const overlay = overlayOpacity != null ? overlayOpacity : 0.72;
      ctx.fillStyle = `rgba(255,255,255,${overlay})`;
      ctx.fillRect(0, 0, w, h);
      return;
    }

    const bg = style.bg;
    if (bg.type === 'gradient') {
      const grad = ctx.createLinearGradient(0, 0, w, h);
      bg.colors.forEach((c, i) => {
        grad.addColorStop(i / Math.max(bg.colors.length - 1, 1), c);
      });
      ctx.fillStyle = grad;
    } else {
      ctx.fillStyle = bg.color || '#ffffff';
    }
    ctx.fillRect(0, 0, w, h);

    if (style.type === 'notebook') {
      ctx.strokeStyle = style.lineColor || '#ffe0b2';
      ctx.lineWidth = 1;
      const startY = Math.round(h * 0.12);
      for (let y = startY; y < h - 40; y += Math.round(h * 0.045)) {
        ctx.beginPath();
        ctx.moveTo(w * 0.1, y);
        ctx.lineTo(w * 0.92, y);
        ctx.stroke();
      }
      ctx.fillStyle = '#ffcdd2';
      ctx.fillRect(w * 0.08, 0, 4, h);
    }
  }

  function measureTextWidth(ctx, text) {
    return ctx.measureText(text).width;
  }

  function wrapLine(ctx, line, maxWidth) {
    const chars = [...line];
    const lines = [];
    let current = '';
    for (const ch of chars) {
      const test = current + ch;
      if (measureTextWidth(ctx, test) > maxWidth && current) {
        lines.push(current);
        current = ch;
      } else {
        current = test;
      }
    }
    if (current) lines.push(current);
    return lines.length ? lines : [''];
  }

  function wrapAllLines(ctx, textLines, maxWidth) {
    const result = [];
    textLines.forEach((line) => {
      if (!line.trim()) {
        result.push('');
        return;
      }
      result.push(...wrapLine(ctx, line.trim(), maxWidth));
    });
    return result;
  }

  function isHighlightLine(line) {
    return /^[▪️➡️✅📌💡⚠️🚫🔑📍🎯✨💬🌟❤️🤍🌙💪🔖]/.test(line) ||
      /^Step\d/.test(line) ||
      line.startsWith('**');
  }

  function stripBoldMarkers(line) {
    return line.replace(/\*\*(.+?)\*\*/g, '$1');
  }

  function extractTitle(text) {
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
    return lines[0] || '小红书笔记';
  }

  function getBodyLines(text, title) {
    const lines = text.split('\n');
    const trimmed = lines.map((l) => l.trim());
    const firstIdx = trimmed.findIndex((l) => l.length > 0);
    if (firstIdx === -1) return [''];
    const firstLine = stripBoldMarkers(trimmed[firstIdx]);
    if (title && firstLine === stripBoldMarkers(title)) {
      return lines.slice(firstIdx + 1);
    }
    return lines.slice(firstIdx);
  }

  function getLayout(size, style) {
    const margin = Math.round(size.width * 0.07);
    const padding = Math.round(size.width * 0.06);
    const footerH = 56;
    let cardX = margin;
    let cardY = margin;
    let cardW = size.width - margin * 2;
    let cardH = size.height - margin * 2;

    if (style.type === 'minimal') {
      cardX = margin * 0.5;
      cardY = margin * 0.5;
      cardW = size.width - margin;
      cardH = size.height - margin;
    }

    return {
      cardX,
      cardY,
      cardW,
      cardH,
      contentX: cardX + padding,
      contentY: cardY + padding,
      contentW: cardW - padding * 2,
      contentH: cardH - padding * 2 - footerH,
      footerY: cardY + cardH - padding,
    };
  }

  function paginateLines(wrappedLines, lineHeight) {
    const pages = [];
    let current = [];
    let height = 0;
    const emptyH = lineHeight * 0.55;

    wrappedLines.forEach((line) => {
      const h = line === '' ? emptyH : lineHeight;
      if (height + h > lineHeight * 18 && current.length > 0) {
        pages.push(current);
        current = [];
        height = 0;
      }
      current.push(line);
      height += h;
    });
    if (current.length) pages.push(current);
    return pages.length ? pages : [['']];
  }

  function paginateWithTitle(wrappedLines, lineHeight, titleLines, titleBlockH, maxContentH) {
    const pages = [];
    let current = [];
    let height = 0;
    const emptyH = lineHeight * 0.55;
    const firstPageMax = maxContentH - titleBlockH;

    wrappedLines.forEach((line) => {
      const h = line === '' ? emptyH : lineHeight;
      const limit = pages.length === 0 ? firstPageMax : maxContentH;
      if (height + h > limit && current.length > 0) {
        pages.push(current);
        current = [];
        height = 0;
      }
      current.push(line);
      height += h;
    });
    if (current.length) pages.push(current);
    return pages.length ? pages : [['']];
  }

  function drawLayoutChrome(ctx, style, layout, size, title, showTitle) {
    const lid = style.layout?.id || 'classic';
    const { cardX, cardY, cardW, cardH, contentX, contentY, contentW } = layout;

    if (lid === 'immersive') return { contentY, titleColor: '#ffffff', textColor: '#f5f5f5' };

    if (lid === 'top-band' && showTitle && title) {
      const bandH = Math.round(cardH * 0.24);
      ctx.fillStyle = style.accentColor;
      roundRect(ctx, cardX, cardY, cardW, cardH, 28);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      roundRect(ctx, cardX, cardY + bandH - 12, cardW, cardH - bandH + 12, 20);
      ctx.fill();
      return { contentY: cardY + bandH + 20, titleColor: '#ffffff', titleY: cardY + 28, titleInBand: true };
    }

    if (lid === 'sidebar') {
      ctx.fillStyle = style.cardBg || '#fff';
      roundRect(ctx, cardX, cardY, cardW, cardH, 24);
      ctx.fill();
      ctx.fillStyle = style.accentColor;
      roundRect(ctx, cardX, cardY, 10, cardH, 6);
      ctx.fill();
      return { contentX: contentX + 8 };
    }

    return null;
  }

  function drawCard(ctx, style, layout) {
    const lid = style.layout?.id || 'classic';
    if (lid === 'immersive') return;

    const { cardX, cardY, cardW, cardH } = layout;

    if (style.type === 'minimal') {
      ctx.strokeStyle = style.borderColor || '#f0f0f0';
      ctx.lineWidth = 2;
      roundRect(ctx, cardX, cardY, cardW, cardH, 16);
      ctx.stroke();
      ctx.fillStyle = style.cardBg;
      roundRect(ctx, cardX + 1, cardY + 1, cardW - 2, cardH - 2, 15);
      ctx.fill();
      return;
    }

    if (style.type === 'notebook') {
      return;
    }

    if (style.type === 'card') {
      ctx.shadowColor = 'rgba(0,0,0,0.08)';
      ctx.shadowBlur = 24;
      ctx.shadowOffsetY = 8;
      ctx.fillStyle = style.cardBg;
      roundRect(ctx, cardX, cardY, cardW, cardH, 28);
      ctx.fill();
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
      return;
    }

    if (style.type === 'full') {
      ctx.fillStyle = style.cardBg;
      roundRect(ctx, cardX, cardY, cardW, cardH, 28);
      ctx.fill();
    }
  }

  function renderPage(pageLines, pageIndex, totalPages, style, size, title, showTitle, renderOpts) {
    const opts = renderOpts || {};
    const layoutMeta = style.layout || resolveLayout('classic');
    const lid = layoutMeta.id;
    const canvas = document.createElement('canvas');
    canvas.width = size.width;
    canvas.height = size.height;
    const ctx = canvas.getContext('2d');

    drawBackground(ctx, style, size.width, size.height, opts.bgImage, opts.bgOverlay);
    const layout = getLayout(size, style);
    const chrome = drawLayoutChrome(ctx, style, layout, size, title, showTitle);
    if (!chrome) drawCard(ctx, style, layout);

    let titleSize = Math.round(size.width * 0.052);
    let bodySize = Math.round(size.width * 0.038);
    if (lid === 'magazine') titleSize = Math.round(size.width * 0.078);
    if (lid === 'poster') { titleSize = Math.round(size.width * 0.068); bodySize = Math.round(size.width * 0.042); }
    if (lid === 'interview') bodySize = Math.round(size.width * 0.036);
    if (lid === 'checklist') bodySize = Math.round(size.width * 0.035);

    const lineHeight = Math.round(bodySize * 1.72);
    let { contentX, contentY, contentW } = layout;
    if (chrome?.contentX) contentX = chrome.contentX;
    if (chrome?.contentY) contentY = chrome.contentY;

    let y = contentY;
    const centerX = size.width / 2;
    const alignCenter = lid === 'poster';
    const titleColor = chrome?.titleColor || style.titleColor;
    const textColor = lid === 'immersive' ? '#f0f0f0' : style.textColor;

    ctx.textBaseline = 'top';
    ctx.textAlign = alignCenter ? 'center' : 'left';

    if (showTitle && title && !chrome?.titleInBand) {
      ctx.font = `bold ${titleSize}px ${FONT_FAMILY}`;
      ctx.fillStyle = titleColor;
      if (lid === 'immersive') {
        ctx.shadowColor = 'rgba(0,0,0,0.35)';
        ctx.shadowBlur = 8;
      }
      const titleWrapped = wrapLine(ctx, stripBoldMarkers(title), contentW);
      titleWrapped.forEach((tl) => {
        ctx.fillText(tl, alignCenter ? centerX : contentX, y);
        y += Math.round(titleSize * (lid === 'magazine' ? 1.2 : 1.35));
      });
      ctx.shadowBlur = 0;
      if (lid !== 'poster') {
        y += Math.round(lineHeight * 0.4);
        ctx.strokeStyle = style.accentColor;
        ctx.lineWidth = lid === 'magazine' ? 5 : 3;
        ctx.beginPath();
        const lineW = alignCenter ? Math.min(contentW * 0.35, 180) : Math.min(contentW * 0.25, 120);
        const lx = alignCenter ? centerX - lineW / 2 : contentX;
        ctx.moveTo(lx, y);
        ctx.lineTo(lx + lineW, y);
        ctx.stroke();
        y += Math.round(lineHeight * 0.6);
      } else {
        y += Math.round(lineHeight * 0.5);
      }
    }

    if (chrome?.titleInBand && showTitle && title) {
      ctx.font = `bold ${Math.round(size.width * 0.055)}px ${FONT_FAMILY}`;
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'left';
      const titleWrapped = wrapLine(ctx, stripBoldMarkers(title), contentW);
      let ty = chrome.titleY || layout.cardY + 28;
      titleWrapped.forEach((tl) => {
        ctx.fillText(tl, layout.contentX, ty);
        ty += Math.round(size.width * 0.06);
      });
      y = layout.cardY + Math.round(layout.cardH * 0.24) + 16;
      ctx.textAlign = alignCenter ? 'center' : 'left';
    }

    pageLines.forEach((line) => {
      if (line === '') {
        y += lineHeight * 0.45;
        return;
      }
      const displayLine = stripBoldMarkers(line);
      const bold = isHighlightLine(displayLine) || isNumberedLine(displayLine);
      const drawX = alignCenter ? centerX : contentX;
      const maxW = contentW - (lid === 'interview' ? 24 : 0);

      if (lid === 'checklist') {
        const boxH = lineHeight + 14;
        ctx.fillStyle = style.accentColor + '18';
        roundRect(ctx, contentX - 6, y - 4, contentW + 12, boxH, 12);
        ctx.fill();
        ctx.font = `600 ${bodySize}px ${FONT_FAMILY}`;
        ctx.fillStyle = style.accentColor;
        ctx.textAlign = 'left';
        ctx.fillText('✓', contentX, y + 2);
        ctx.font = `${bold ? '600' : '400'} ${bodySize}px ${FONT_FAMILY}`;
        ctx.fillStyle = bold ? style.titleColor : textColor;
        const wrapped = wrapLine(ctx, displayLine, maxW - 28);
        wrapped.forEach((wl, wi) => {
          ctx.fillText(wl, contentX + 28, y + wi * lineHeight);
        });
        y += boxH + 8;
        return;
      }

      if (lid === 'interview' && isNumberedLine(displayLine)) {
        ctx.fillStyle = style.accentColor;
        roundRect(ctx, contentX, y + 4, 6, lineHeight - 4, 3);
        ctx.fill();
        ctx.font = `600 ${bodySize}px ${FONT_FAMILY}`;
        ctx.fillStyle = style.titleColor;
        ctx.textAlign = 'left';
        const wrapped = wrapLine(ctx, displayLine, maxW - 16);
        wrapped.forEach((wl, wi) => {
          ctx.fillText(wl, contentX + 16, y + wi * lineHeight);
        });
        y += wrapped.length * lineHeight + 6;
        return;
      }

      ctx.font = `${bold ? '600' : '400'} ${bodySize}px ${FONT_FAMILY}`;
      ctx.fillStyle = bold ? style.titleColor : textColor;
      if (lid === 'immersive') {
        ctx.shadowColor = 'rgba(0,0,0,0.3)';
        ctx.shadowBlur = 4;
      }
      const wrapped = wrapLine(ctx, displayLine, maxW);
      wrapped.forEach((wl, wi) => {
        ctx.fillText(wl, drawX, y + wi * lineHeight);
      });
      ctx.shadowBlur = 0;
      y += wrapped.length * lineHeight + (lid === 'poster' ? 8 : 2);
    });

    if (pageIndex === 0 && style.decorEmoji && lid !== 'top-band') {
      ctx.font = `${Math.round(size.width * 0.07)}px ${FONT_FAMILY}`;
      ctx.textAlign = 'left';
      ctx.fillText(style.decorEmoji, layout.cardX + layout.cardW - paddingRight(style, size) - 10, layout.contentY - 4);
    }

    if (totalPages > 1) {
      ctx.font = `500 ${Math.round(bodySize * 0.82)}px ${FONT_FAMILY}`;
      ctx.fillStyle = lid === 'immersive' ? '#ffffff' : style.accentColor;
      ctx.textAlign = 'center';
      ctx.fillText(`${pageIndex + 1} / ${totalPages}`, size.width / 2, layout.footerY);
      ctx.textAlign = 'left';
    }

    return canvas;
  }

  function paddingRight(style, size) {
    return Math.round(size.width * 0.06);
  }

  /** 生成图片列表（支持自定义背景，返回 Promise） */
  async function generate(text, options) {
    try {
      if (!text || !text.trim()) {
        return { success: false, message: '没有可生成图片的文字内容', images: [] };
      }

      const opts = options || {};
      const theme = IMAGE_STYLES.find((s) => s.id === (opts.themeId || opts.styleId)) || IMAGE_STYLES[0];
      const layoutPreset = resolveLayout(opts.layoutId || (theme.id === 'night' || theme.id === 'sunset' ? 'immersive' : 'classic'));
      const style = { ...theme, layout: layoutPreset };
      const size = SIZES[opts.sizeKey || 'portrait'] || SIZES.portrait;
      const title = opts.title || extractTitle(text);
      const bodyLines = getBodyLines(text, title);

      let bgImage = null;
      if (opts.customBgDataUrl) {
        try {
          bgImage = await loadImage(opts.customBgDataUrl);
        } catch (e) {
          return { success: false, message: '自定义背景图加载失败', images: [] };
        }
      }

      const renderOpts = {
        bgImage,
        bgOverlay: opts.bgOverlay != null ? opts.bgOverlay : 0.72,
      };

      const measureCanvas = document.createElement('canvas');
      const mctx = measureCanvas.getContext('2d');
      if (!mctx) {
        return { success: false, message: 'Canvas 不可用，请刷新页面后重试', images: [] };
      }

      const bodySize = Math.round(size.width * 0.038);
      const titleSize = Math.round(size.width * 0.052);
      const lineHeight = Math.round(bodySize * 1.72);
      const pageLayout = getLayout(size, style);

      mctx.font = `${bodySize}px ${FONT_FAMILY}`;
      const wrapped = wrapAllLines(mctx, bodyLines, pageLayout.contentW);

      mctx.font = `bold ${titleSize}px ${FONT_FAMILY}`;
      const titleWrapped = wrapLine(mctx, stripBoldMarkers(title), pageLayout.contentW);
      const titleBlockH = titleWrapped.length * Math.round(titleSize * 1.35) + Math.round(lineHeight * 1.0);

      const pages = paginateWithTitle(wrapped, lineHeight, titleWrapped, titleBlockH, pageLayout.contentH);

      const images = pages.map((pageLines, i) => {
        const canvas = renderPage(pageLines, i, pages.length, style, size, title, i === 0, renderOpts);
        return {
          dataUrl: canvas.toDataURL('image/png', 1.0),
          width: canvas.width,
          height: canvas.height,
          page: i + 1,
          total: pages.length,
        };
      });

      return {
        success: true,
        message: `已生成 ${images.length} 张图片`,
        images,
        title,
        style: bgImage ? `自定义背景 · ${layoutPreset.name}` : `${layoutPreset.name} · ${theme.name}`,
        layout: layoutPreset.name,
        theme: theme.name,
        size: size.label,
      };
    } catch (e) {
      console.error('[XhsImageGenerator] generate failed:', e);
      return {
        success: false,
        message: (e && e.message) || '图片生成失败，请刷新页面后重试',
        images: [],
      };
    }
  }

  /** 下载单张图片 */
  function downloadImage(dataUrl, filename) {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename || 'xhs-note.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  /** 批量下载 */
  function downloadAll(images, baseName) {
    const name = baseName || 'xhs-note';
    images.forEach((img, i) => {
      setTimeout(() => {
        downloadImage(img.dataUrl, `${name}-${img.page}.png`);
      }, i * 350);
    });
  }

  global.XhsImageGenerator = {
    IMAGE_STYLES,
    IMAGE_LAYOUTS,
    SIZES,
    generate,
    downloadImage,
    downloadAll,
    extractTitle,
    loadImage,
    resolveLayout,
  };
})(typeof window !== 'undefined' ? window : self);
