// ============================================
// 小红书排版助手 - 图片上传助手 v2.7
// ============================================

(function (global) {
  'use strict';

  async function dataUrlToFile(dataUrl, filename) {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    return new File([blob], filename, { type: blob.type || 'image/png' });
  }

  function assignFilesToInput(input, files) {
    const dt = new DataTransfer();
    files.forEach((f) => dt.items.add(f));
    try {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'files')?.set;
      if (setter) setter.call(input, dt.files);
      else input.files = dt.files;
    } catch (e) {
      input.files = dt.files;
    }
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function assignFileToInput(input, file) {
    assignFilesToInput(input, [file]);
  }

  async function ensureImageNoteTab(utils) {
    const tabRe = /^上传图文$|^图文笔记$|^图片笔记$/;
    const els = utils.queryDeep?.('div, span, button, a, [role="tab"]') || [];
    for (const el of els) {
      const t = (el.textContent || '').trim();
      if (tabRe.test(t) && utils.isVisible?.(el)) {
        try { el.click(); } catch (e) { /* ignore */ }
        await utils.sleep(600);
        return true;
      }
    }
    return false;
  }

  function countUploadPreviews(utils) {
    const imgs = utils.queryDeep?.('img[src*="blob:"], img[src*="data:image"], [class*="upload"] img, [class*="preview"] img, [class*="image"] img') || [];
    return imgs.filter((img) => img.naturalWidth > 80 && utils.isVisible?.(img)).length;
  }

  async function waitForUploadPreviews(utils, minCount, timeoutMs) {
    const deadline = Date.now() + (timeoutMs || 8000);
    while (Date.now() < deadline) {
      if (countUploadPreviews(utils) >= minCount) return true;
      await utils.sleep(350);
    }
    return false;
  }

  async function findUploadInput(utils) {
    await ensureImageNoteTab(utils);
    utils.clickUploadTriggers();
    let input = await utils.waitForFileInput(6000);
    if (input) return input;

    const inputs = utils.findAllFileInputs?.() || [];
    const imageInput = inputs.find((i) => (i.accept || '').toLowerCase().includes('image'));
    return imageInput || inputs[0] || null;
  }

  async function uploadBatchViaInput(input, files) {
    assignFilesToInput(input, files);
    return true;
  }

  async function uploadViaDrop(utils, file) {
    const zones = utils.findDropZones();
    for (const zone of zones) {
      try {
        await utils.dropFileOnZone(zone, file);
        return true;
      } catch (e) { /* try next */ }
    }
    return false;
  }

  async function uploadImagesToEditor(images, options) {
    const opts = options || {};
    if (!images?.length) {
      return { success: false, message: '没有可上传的图片' };
    }

    const utils = global.XhsEditorUtils;
    if (!utils) {
      return { success: false, message: '上传模块未加载，请刷新页面' };
    }

    showUploadHint('📤 正在插入图片，请稍候…');

    const beforeCount = countUploadPreviews(utils);
    const input = await findUploadInput(utils);

    if (!input) {
      hideUploadHint();
      return {
        success: false,
        message: '未找到上传入口',
        needManual: true,
        images,
      };
    }

    try {
      input.scrollIntoView?.({ block: 'center', behavior: 'instant' });
    } catch (e) { /* ignore */ }

    const files = [];
    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      files.push(await dataUrlToFile(img.dataUrl || img, `xhs-note-${img.page || i + 1}.png`));
    }

    let uploaded = 0;

    try {
      await uploadBatchViaInput(input, files);
      const batchOk = await waitForUploadPreviews(utils, beforeCount + files.length, 10000);
      if (batchOk) uploaded = files.length;
    } catch (e) {
      console.warn('[排版助手] 批量上传失败，尝试逐张:', e);
    }

    if (uploaded === 0) {
      for (let i = 0; i < files.length; i++) {
        if (i > 0) {
          utils.clickUploadTriggers();
          const nextInput = await utils.waitForFileInput(3000) || input;
          await utils.sleep(500);
          try {
            await uploadBatchViaInput(nextInput, [files[i]]);
            await utils.sleep(1200);
            uploaded++;
          } catch (e) {
            const dropped = await uploadViaDrop(utils, files[i]);
            if (dropped) {
              await utils.sleep(1200);
              uploaded++;
            }
          }
        } else {
          try {
            await uploadBatchViaInput(input, [files[i]]);
            await utils.sleep(1200);
            uploaded++;
          } catch (e) {
            const dropped = await uploadViaDrop(utils, files[i]);
            if (dropped) {
              await utils.sleep(1200);
              uploaded++;
            }
          }
        }
      }
    }

    const afterCount = countUploadPreviews(utils);
    if (uploaded === 0 && afterCount > beforeCount) {
      uploaded = afterCount - beforeCount;
    }

    hideUploadHint();

    if (uploaded === 0) {
      return {
        success: false,
        message: '自动插入失败，请用「手动上传指引」',
        needManual: true,
        images,
      };
    }

    return {
      success: uploaded >= images.length,
      message: uploaded >= images.length
        ? `已成功插入 ${uploaded} 张图片`
        : `已插入 ${uploaded}/${images.length} 张，其余请手动上传`,
      uploaded,
      total: images.length,
      needManual: uploaded < images.length,
      images,
    };
  }

  async function copyImageToClipboard(dataUrl) {
    const blob = await (await fetch(dataUrl)).blob();
    if (navigator.clipboard?.write && window.ClipboardItem) {
      await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
      return true;
    }
    return false;
  }

  function showUploadHint(text) {
    hideUploadHint();
    const tip = document.createElement('div');
    tip.id = 'xhs-fmt-upload-hint';
    tip.className = 'xhs-fmt-tooltip';
    tip.textContent = text || '📤 正在插入图片…';
    document.body.appendChild(tip);
  }

  function hideUploadHint() {
    document.getElementById('xhs-fmt-upload-hint')?.remove();
  }

  global.XhsUploadHelper = {
    dataUrlToFile,
    uploadImagesToEditor,
    copyImageToClipboard,
    showUploadHint,
    hideUploadHint,
  };
})(typeof window !== 'undefined' ? window : self);
