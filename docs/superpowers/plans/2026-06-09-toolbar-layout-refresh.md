# Toolbar Layout Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganize the Xiaohongshu helper toolbar so primary actions, style controls, and creative tools are visually separated.

**Architecture:** Keep the existing content script and CSS ownership. Add a small DOM grouping helper in `extension/content/content.js`, then style those groups in `extension/content/styles.css` without changing command behavior.

**Tech Stack:** Chrome extension content script, plain JavaScript, CSS, Node syntax/structure checks.

---

### Task 1: Add Structure Check

**Files:**
- Create: `extension/scripts/check-toolbar-layout.js`

- [ ] Add a Node script that reads `content.js` and `styles.css` and asserts the toolbar contains `xhs-fmt-toolbar-main`, `xhs-fmt-toolbar-style`, and `xhs-fmt-toolbar-tools`.
- [ ] Run `node extension/scripts/check-toolbar-layout.js` and confirm it fails before implementation because the group classes do not exist.

### Task 2: Group Toolbar Controls

**Files:**
- Modify: `extension/content/content.js`

- [ ] Add a `createToolbarGroup(className, label)` helper near the existing toolbar helper functions.
- [ ] In `createToolbarElement()`, append primary actions to a main group, font/line-height/B/I/alignment controls to a style group, and cover/image/AI/template/clean/tag controls to a tools group.
- [ ] Preserve locked and upgrade behavior by placing locked feature buttons in the same groups and keeping the upgrade button after tool groups.

### Task 3: Restyle Toolbar

**Files:**
- Modify: `extension/content/styles.css`

- [ ] Change `#xhs-fmt-toolbar` to a vertical grouped container.
- [ ] Add group styles with compact headers, pill-like group backgrounds, and predictable wrapping inside each group.
- [ ] Keep existing button, select, color, fixed, and dock behavior compatible.

### Task 4: Verify

**Files:**
- Run: `node extension/scripts/check-toolbar-layout.js`
- Run: `node extension/scripts/check-syntax.js`

- [ ] Confirm both commands pass.
- [ ] Inspect the resulting toolbar CSS for no broken selectors or unstyled groups.
