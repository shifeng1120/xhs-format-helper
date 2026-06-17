// ============================================
// 小红书排版助手 - 文案排版引擎 v2.0
// 将纯文本智能转换为小红书风格排版
// ============================================

(function (global) {
  'use strict';

  /** 清理文本：统一换行、去除多余空白 */
  function normalizeText(text) {
    if (!text) return '';
    return text
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  /** 把同一行里用空格/Tab 分隔的「13. xxx  14. yyy」拆成多行 */
  function preprocessNumberedText(text) {
    let t = normalizeText(text);
    if (/\d+[\.\、．][^\n]{4,}[\s\t]{2,}\d+[\.\、．]/.test(t)) {
      t = t.replace(/[\s\t]{2,}(?=\d+[\.\、．])/g, '\n');
    }
    if ((t.split('\n').length <= 2) && /\d+[\.\、．].{4,}\s+\d+[\.\、．]/.test(t)) {
      t = t.replace(/\s+(?=\d+[\.\、．])/g, '\n');
    }
    return t;
  }

  function countNumberedItems(text) {
    const t = preprocessNumberedText(text);
    return (t.match(/(?:^|\n)\s*\d+[\.\、．]\s*\S/g) || []).length;
  }

  function splitNumberedLineTail(line) {
    const m = line.match(/^(\d+[\.\、．]\s*.+?)(?:[\s\t]{2,})([^0-9].+)$/);
    if (m) return { item: m[1].trim(), tail: m[2].trim() };
    return { item: line.trim(), tail: null };
  }

  function parseNumberedContent(text) {
    const t = preprocessNumberedText(text);
    const allLines = t.split('\n').map((l) => l.trim()).filter(Boolean);
    const numbered = [];
    const intro = [];
    const footer = [];
    let seenNumbered = false;

    allLines.forEach((line) => {
      if (/^\d+[\.\、．]\s*/.test(line)) {
        seenNumbered = true;
        const { item, tail } = splitNumberedLineTail(line);
        numbered.push(item);
        if (tail) footer.push(tail);
      } else if (!seenNumbered) {
        intro.push(line);
      } else {
        footer.push(line);
      }
    });

    if (numbered.length < 2) {
      const parts = t.split(/(?=\d+[\.\、．]\s*)/).map((s) => s.trim()).filter((s) => /^\d+[\.\、．]/.test(s));
      if (parts.length >= 2) return { numbered: parts, intro: [], footer: [] };
    }
    return { numbered, intro, footer };
  }

  /** 面试题/编号清单专用排版 */
  function formatAsNumberedList(text, template) {
    const rules = template.rules || {};
    const { numbered, intro, footer } = parseNumberedContent(text);
    if (numbered.length < 2) return null;

    const output = [];
    const hook = intro[0]
      ? `${rules.hookEmoji || '🎯'} ${intro[0]}`
      : `${rules.hookEmoji || '🎯'} 高频面试题整理`;

    output.push(hook);
    output.push('');
    output.push(rules.listTitle || '📋 题单');
    numbered.forEach((item) => {
      output.push(`${rules.listBullet || '▪️'} ${item}`);
    });

    if (footer.length) {
      output.push('');
      footer.forEach((line) => {
        const wrapped = wrapLongLine(line, rules.maxLineLength || 28);
        wrapped.forEach((w) => output.push(w));
      });
    }

    if (rules.addCTA && rules.ctaText) {
      output.push('');
      output.push(rules.ctaText);
    }

    return output.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  }

  /** 按空行分段；若无空行则按单换行智能拆分 */
  function splitBlocks(text) {
    const normalized = normalizeText(text);
    let blocks = normalized
      .split(/\n{2,}/)
      .map((b) => b.trim())
      .filter(Boolean);

    // 用户常常直接粘贴一整段长文；先按中文标点拆成「可排版的段落」。
    if (blocks.length === 1 && !blocks[0].includes('\n') && blocks[0].length > 58) {
      const sentences = splitLongParagraph(blocks[0]);
      if (sentences.length >= 3) {
        blocks = [sentences[0], sentences.slice(1, -1).join('\n'), sentences[sentences.length - 1]];
      } else if (sentences.length === 2) {
        blocks = [sentences[0], sentences[1]];
      }
    }

    if (blocks.length === 1 && blocks[0].includes('\n')) {
      const lines = splitLines(blocks[0]);
      if (lines.length >= 3) {
        const hook = lines[0];
        const tail = lines[lines.length - 1];
        const middle = lines.slice(1, -1).join('\n');
        const tailLooksLikeList = isListLine(tail) || tail.length < 8;
        if (!tailLooksLikeList && middle) {
          blocks = [hook, middle, tail];
        } else if (middle) {
          blocks = [hook, lines.slice(1).join('\n')];
        }
      }
    }
    return blocks;
  }

  function splitLongParagraph(text) {
    const parts = String(text || '')
      .replace(/([。！？!?；;])\s*/g, '$1\n')
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    if (parts.length <= 2) {
      const commaParts = String(text || '')
        .replace(/([，,、])\s*/g, '$1\n')
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);
      if (commaParts.length >= 3) return commaParts;
      if (parts.length <= 1) return wrapLongLine(text, 24);
    }

    const merged = [];
    let buf = '';
    parts.forEach((part) => {
      if (!buf) {
        buf = part;
      } else if ((buf + part).length <= 28) {
        buf += part;
      } else {
        merged.push(buf);
        buf = part;
      }
    });
    if (buf) merged.push(buf);
    return merged;
  }

  /** 按单行拆分 */
  function splitLines(block) {
    return block
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
  }

  /** 检测是否为列表项 */
  function isListLine(line) {
    return /^(\d+[\.\)、．\s]|[-•·▪✅👉➡️✨💡⚠️#]|\[[ x]\])\s*/.test(line.trim());
  }

  /** 去除列表前缀 */
  function stripListPrefix(line) {
    return line
      .replace(/^(\d+[\.\)、．]\s*)/, '')
      .replace(/^[-•·▪✅👉➡️✨💡⚠️]\s*/, '')
      .replace(/^\[[ x]\]\s*/, '')
      .trim();
  }

  /** 长句智能断行（中文友好） */
  function wrapLongLine(line, maxLen) {
    if (!maxLen || line.length <= maxLen) return [line];
    const parts = [];
    let rest = line;
    while (rest.length > maxLen) {
      let cut = maxLen;
      const punct = rest.lastIndexOf('，', maxLen);
      const punct2 = rest.lastIndexOf('。', maxLen);
      const punct3 = rest.lastIndexOf('！', maxLen);
      const punct4 = rest.lastIndexOf('？', maxLen);
      const best = Math.max(punct, punct2, punct3, punct4);
      if (best > maxLen * 0.4) cut = best + 1;
      parts.push(rest.slice(0, cut).trim());
      rest = rest.slice(cut).trim();
    }
    if (rest) parts.push(rest);
    return parts;
  }

  /** 提取关键词加粗（价格、数字、核心词） */
  function boldKeywords(text, enabled) {
    if (!enabled) return text;
    return text
      .replace(/(¥\d+[\d.]*|\d+[\d.]*元|\d+[\d.]*块)/g, '**$1**')
      .replace(/(\d+个技巧|\d+步|\d+招|\d+款|\d+家|\d+天|\d+小时|\d+分钟|\d+%)/g, '**$1**')
      .replace(/(避坑|必看|亲测|干货|保姆级|新手|高频|模板|清单|攻略|收藏|复盘|涨粉|转化|效率|面试)/g, '**$1**')
      .replace(/\b(AI|RAG|Agent|Java|Spring|React|Vue|SQL|SOP|KPI|ROI|SEO)\b/g, '**$1**');
  }

  function analyzeContent(text) {
    const t = normalizeText(text);
    const numbered = countNumberedItems(t);
    const lines = splitLines(t);
    const hasPrice = /¥|\d+元|\d+块|人均|预算/.test(t);
    const hasSteps = /步骤|教程|方法|流程|怎么|如何|Step|第一|第二|第三/.test(t) || numbered >= 3;
    const hasCareer = /面试|简历|职场|求职|offer|八股|离职|汇报|升职|加薪/i.test(t);
    const hasBeauty = /护肤|美妆|粉底|口红|底妆|成分|肤质|妆/.test(t);
    const hasFoodTravel = /探店|旅行|攻略|酒店|咖啡|餐厅|人均|预约|打卡|城市/.test(t);
    const hasWarning = /避坑|踩雷|千万别|不要|后悔|翻车|雷区/.test(t);
    const hasEmotion = /后来|明白|真心|治愈|焦虑|关系|情绪|遗憾|孤独/.test(t);
    const hasOperator = /小红书|账号|涨粉|选题|对标|复盘|数据|运营|封面/.test(t);
    const hasConversion = /下单|链接|购买|适合|推荐|值得入|课程|私信|店铺|转化|成交|种草/.test(t);
    const hasViralTitle = /标题|点击|开头|钩子|爆款|封面|选题/.test(t);

    let recommendedTemplateId = 'plant-grass';
    if (hasCareer && numbered >= 2) recommendedTemplateId = 'interview';
    else if (hasCareer) recommendedTemplateId = 'career';
    else if (hasOperator) recommendedTemplateId = 'operator';
    else if (hasViralTitle) recommendedTemplateId = 'viral-title';
    else if (hasConversion) recommendedTemplateId = 'conversion';
    else if (hasWarning) recommendedTemplateId = 'warning';
    else if (hasSteps) recommendedTemplateId = 'tutorial';
    else if (hasBeauty) recommendedTemplateId = 'beauty';
    else if (hasFoodTravel || hasPrice) recommendedTemplateId = 'food-travel';
    else if (hasEmotion) recommendedTemplateId = 'emotional';
    else if (lines.length <= 5 && t.length < 90) recommendedTemplateId = 'daily-plog';

    const score = Math.min(99, 50 + Math.min(lines.length, 8) * 4 + Math.min(numbered, 6) * 5 + (hasSteps ? 10 : 0));
    return {
      text: t,
      lines,
      numbered,
      score,
      recommendedTemplateId,
      hasList: numbered >= 2 || lines.filter(isListLine).length >= 2,
      likelyLongParagraph: lines.length <= 1 && t.length > 58,
    };
  }

  function generateHashtags(text, template) {
    const t = text || '';
    const tags = new Set();
    const add = (tag) => tags.add(tag.startsWith('#') ? tag : `#${tag}`);

    if (template?.category) add(template.category);
    if (/小红书|笔记|运营|涨粉|转化/.test(t)) add('小红书运营');
    if (/面试|简历|offer|八股|求职/i.test(t)) { add('面试经验'); add('求职干货'); }
    if (/教程|步骤|方法|技巧|怎么|如何/.test(t)) { add('干货分享'); add('实用技巧'); }
    if (/护肤|美妆|粉底|口红|底妆/.test(t)) { add('美妆测评'); add('护肤分享'); }
    if (/探店|旅行|咖啡|餐厅|酒店|打卡/.test(t)) { add('周末去哪儿'); add('探店打卡'); }
    if (/避坑|踩雷|千万别|后悔/.test(t)) { add('避坑指南'); add('真实测评'); }
    if (/穿搭|显瘦|OOTD|搭配/.test(t)) { add('每日穿搭'); add('穿搭灵感'); }

    add('值得收藏');
    return Array.from(tags).slice(0, 5);
  }

  /** 转义 HTML */
  function escapeHtml(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  /** 行转 HTML（保留 **加粗** 标记） */
  function lineToHtml(line) {
    return line.split(/(\*\*.+?\*\*)/).map((part) => {
      const m = part.match(/^\*\*(.+?)\*\*$/);
      if (m) return `<b>${escapeHtml(m[1])}</b>`;
      return escapeHtml(part);
    }).join('');
  }

  /** 应用模板规则格式化文本 */
  function formatWithTemplate(text, template) {
    const rules = template.rules || {};
    const preprocessed = preprocessNumberedText(text);
    const analysis = analyzeContent(preprocessed);
    const numberedCount = countNumberedItems(preprocessed);

    if (numberedCount >= 2 && (template.id === 'interview' || template.id === 'tutorial' || numberedCount >= 3)) {
      const numberedFmt = formatAsNumberedList(preprocessed, template);
      if (numberedFmt) return numberedFmt;
    }

    const blocks = splitBlocks(preprocessed);
    if (blocks.length === 0) return '';

    const output = [];
    const gap = rules.paragraphGap === 2 ? '\n\n' : '\n';
    const listBullet = rules.listBullet || '▪️';
    const stepBullet = rules.stepBullet || '➡️';
    let stepIndex = 0;

    // 首段钩子处理
    const firstBlock = blocks[0];
    const firstLines = splitLines(firstBlock);
    let hookLine = firstLines[0] || '';

    if (rules.addHook && rules.hookEmoji && !hookLine.startsWith(rules.hookEmoji)) {
      hookLine = rules.hookEmoji + ' ' + hookLine;
    }
    if (rules.titlePrefix && !hookLine.includes(rules.titlePrefix)) {
      hookLine = rules.titlePrefix + hookLine;
    }

    hookLine = boldKeywords(hookLine, rules.boldKeywords);
    output.push(hookLine);

    // 首段剩余行
    if (firstLines.length > 1) {
      firstLines.slice(1).forEach((line) => {
        const wrapped = wrapLongLine(boldKeywords(line, rules.boldKeywords), rules.maxLineLength);
        wrapped.forEach((w) => output.push(w));
      });
    }

    // 中间段落
    for (let i = 1; i < blocks.length; i++) {
      const block = blocks[i];
      const lines = splitLines(block);

      // 章节标题检测（短句、无标点结尾）
      const isSectionTitle =
        lines.length === 1 &&
        lines[0].length <= 12 &&
        !/[。！？，、]$/.test(lines[0]) &&
        rules.sectionEmoji;

      if (isSectionTitle) {
        output.push('');
        output.push(rules.sectionEmoji + ' ' + lines[0]);
        output.push('');
        continue;
      }

      // 列表块检测
      const listLines = lines.filter((l) => isListLine(l) || lines.length >= 2);
      const looksLikeList =
        lines.length >= 2 &&
        (lines.filter(isListLine).length >= lines.length * 0.5 || rules.forceList);

      if (looksLikeList && (rules.listBullet || rules.useStepNumber)) {
        if (rules.listTitle) {
          output.push('');
          output.push(rules.listTitle);
        }
        lines.forEach((line) => {
          const content = stripListPrefix(line);
          const bullet = rules.useStepNumber ? stepBullet : listBullet;
          if (rules.useStepNumber) stepIndex++;
          const prefix = rules.useStepNumber ? `${bullet} Step${stepIndex} ` : `${bullet} `;
          const wrapped = wrapLongLine(boldKeywords(content, rules.boldKeywords), rules.maxLineLength);
          wrapped.forEach((w, wi) => {
            output.push(wi === 0 ? prefix + w : '   ' + w);
          });
        });
      } else {
        output.push('');
        lines.forEach((line) => {
          const wrapped = wrapLongLine(boldKeywords(line, rules.boldKeywords), rules.maxLineLength);
          wrapped.forEach((w) => output.push(w));
        });
      }
    }

    // 章节分隔线
    if (rules.sectionDivider && output.length > 4) {
      const mid = Math.floor(output.length * 0.6);
      output.splice(mid, 0, '', rules.sectionDivider, '');
    }

    // 结尾 CTA
    if (rules.addCTA && rules.ctaText) {
      output.push('');
      output.push(rules.ctaText);
    }

    // 话题标签
    if (rules.hashtags && rules.hashtags.length) {
      output.push('');
      output.push(rules.hashtags.join(' '));
    } else if (rules.autoHashtags !== false) {
      const tags = generateHashtags(preprocessed, template);
      if (tags.length) {
        output.push('');
        output.push(tags.join(' '));
      }
    }

    return output
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  /** 纯文本转 contenteditable HTML */
  function textToEditorHtml(text) {
    const lines = text.split('\n');
    const htmlParts = [];
    let inParagraph = false;

    lines.forEach((line, i) => {
      const trimmed = line.trim();
      if (!trimmed) {
        if (inParagraph) {
          htmlParts.push('</div>');
          inParagraph = false;
        }
        htmlParts.push('<div><br></div>');
        return;
      }

      const htmlLine = lineToHtml(trimmed);

      if (!inParagraph) {
        htmlParts.push(`<div>${htmlLine}`);
        inParagraph = true;
      } else {
        htmlParts.push(`<br>${htmlLine}`);
      }

      const nextEmpty = i + 1 >= lines.length || !lines[i + 1].trim();
      if (nextEmpty && inParagraph) {
        htmlParts.push('</div>');
        inParagraph = false;
      }
    });

    if (inParagraph) htmlParts.push('</div>');
    return htmlParts.join('');
  }

  /** 获取编辑器中选中的文本 */
  function getSelectedText(editor) {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return { text: '', range: null, hasSelection: false };

    const range = sel.getRangeAt(0);
    const text = sel.toString();

    if (!editor || !editor.contains(range.commonAncestorContainer)) {
      return { text: '', range: null, hasSelection: false };
    }

    return {
      text: text.trim(),
      range: range.cloneRange(),
      hasSelection: text.trim().length > 0,
    };
  }

  /** 获取编辑器全部文本 */
  function getEditorText(editor) {
    if (!editor) return '';
    return (editor.innerText || editor.textContent || '').trim();
  }

  /** 替换编辑器内容或选区 */
  function replaceEditorContent(editor, html, savedRange) {
    if (!editor) return false;

    editor.focus();

    try {
      if (savedRange && !savedRange.collapsed) {
        savedRange.deleteContents();
        const template = document.createElement('div');
        template.innerHTML = html;
        const frag = document.createDocumentFragment();
        while (template.firstChild) {
          frag.appendChild(template.firstChild);
        }
        savedRange.insertNode(frag);
        savedRange.collapse(false);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(savedRange);
      } else {
        editor.innerHTML = html;
        const range = document.createRange();
        range.selectNodeContents(editor);
        range.collapse(false);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      }

      editor.dispatchEvent(new Event('input', { bubbles: true }));
      editor.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    } catch (e) {
      console.warn('[小红书排版助手] 内容替换失败:', e);
      return false;
    }
  }

  function isOnlyCtaAppended(actual, source, formatted, ctaText) {
    if (!ctaText || !actual.includes(ctaText)) return false;
    const withoutCta = actual.replace(ctaText, '').trim();
    const src = source.trim();
    if (withoutCta.length >= src.length * 0.92 && actual.length < formatted.length * 0.85) return true;
    const fmtHead = formatted.slice(0, 20).trim();
    return !actual.includes(fmtHead.slice(0, 10)) && actual.includes(ctaText);
  }

  async function doReplace(replace, editor, text, opts) {
    const result = replace(editor, text, opts);
    return result && typeof result.then === 'function' ? result : result;
  }

  /** 主入口：格式化并写入编辑器（纯文本，兼容 Tiptap/ProseMirror） */
  async function applyFormat(editor, template, options) {
    const opts = options || {};
    const utils = global.XhsEditorUtils;
    const replace = utils?.replaceEditorContent || replaceEditorContent;
    const readText = utils?.getEditorTextRobust || getEditorText;

    let targetEditor = editor;
    let sourceText = '';
    let replaceOpts = { replaceAll: true };

    if (opts.capture?.sourceText) {
      sourceText = opts.capture.sourceText;
      targetEditor = opts.capture.editor || editor;
      replaceOpts = {
        replaceAll: opts.capture.replaceAll !== false,
        savedRange: opts.capture.range || null,
        textareaSel: opts.capture.textareaSel || null,
      };
    } else if (utils?.captureFormatContext) {
      const cap = utils.captureFormatContext();
      if (cap?.sourceText) {
        sourceText = cap.sourceText;
        targetEditor = cap.editor || editor;
        replaceOpts = {
          replaceAll: cap.replaceAll,
          savedRange: cap.range,
          textareaSel: cap.textareaSel,
        };
      }
    }

    if (!sourceText?.trim()) {
      sourceText = readText(targetEditor || editor) || '';
      replaceOpts = { replaceAll: true };
    }

    if (!sourceText?.trim()) {
      return { success: false, message: '请先输入或选中要排版的文字', formatted: '' };
    }

    const formatted = formatWithTemplate(sourceText.trim(), template);
    const ctaText = template.rules?.ctaText || '';
    let ok = await doReplace(replace, targetEditor || editor, formatted, replaceOpts);

    const after = readText(targetEditor || editor);
    const onlyAppendedCta = isOnlyCtaAppended(after, sourceText.trim(), formatted, ctaText);

    if (!ok || onlyAppendedCta || after.length < formatted.length * 0.5) {
      ok = await doReplace(replace, targetEditor || editor, formatted, { replaceAll: true });
    }

    const finalText = readText(targetEditor || editor);
    const stillOnlyCta = isOnlyCtaAppended(finalText, sourceText.trim(), formatted, ctaText);
    const headMark = formatted.slice(0, Math.min(24, formatted.length)).trim();
    const hasFormattedHead = headMark.length > 4 && finalText.includes(headMark.slice(0, 12));
    const lengthLooksReplaced = finalText.length <= Math.max(formatted.length * 1.2, formatted.length + 30);
    const success = ok && !stillOnlyCta && hasFormattedHead &&
      lengthLooksReplaced &&
      finalText.length >= Math.min(formatted.length * 0.55, sourceText.trim().length * 0.8);

    return {
      success,
      message: success
        ? `已用「${template.name}」排版${replaceOpts.replaceAll ? '全文' : '选中内容'}`
        : '自动写入失败，请用弹窗「一键复制」后 Ctrl+V 粘贴到正文',
      formatted,
      template,
      editor: targetEditor || editor,
    };
  }

  global.XhsFormatEngine = {
    normalizeText,
    analyzeContent,
    generateHashtags,
    formatWithTemplate,
    textToEditorHtml,
    getSelectedText,
    getEditorText,
    replaceEditorContent,
    applyFormat,
  };
})(typeof window !== 'undefined' ? window : self);
