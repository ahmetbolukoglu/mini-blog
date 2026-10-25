// AppNar smoke test — opens the generated app in a real (headless) Chrome,
// records load errors, then clicks every visible button on a fresh page and
// reports buttons that do nothing and errors thrown on click.
//
// Uses playwright-core with the Chrome that GitHub's Ubuntu runners ship, so
// no browser download is needed. If either is missing the test is skipped
// (the static checks in generate.mjs still run).
import { createServer } from 'node:http';
import { existsSync, statSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { extname, normalize, resolve } from 'node:path';

// UTF-8 like GitHub Pages, so Turkish labels survive even without <meta charset>.
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
};
const CHROMES = ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium-browser', '/usr/bin/chromium', 'C:/Program Files/Google/Chrome/Application/chrome.exe'];
const MAX_TARGETS = 30;

/**
 * Where an error came from, in the app's own files: " (at calculateDailyStats
 * src/logic.js:22 ← src/app.js:113)". Without this the model fixing the UI
 * cannot tell that a "Invalid date" thrown in logic.js comes from a wrong call
 * in app.js (seen in a real build that stayed broken for three rounds).
 */
export function whereFrom(stack = '') {
  const frames = [];
  for (const line of String(stack).split('\n')) {
    const m = line.match(/at (?:([\w$.<>]+) \()?[^()\s]*?\/((?:src\/)?[\w.-]+\.js):(\d+):\d+\)?/);
    if (m) frames.push(`${m[1] && m[1] !== '<anonymous>' ? `${m[1]} ` : ''}${m[2]}:${m[3]}`);
    if (frames.length === 3) break;
  }
  return frames.length ? ` (at ${frames.join(' ← ')})` : '';
}

/** Minimal static file server for the repo root; resolves with its base URL. */
export function serveStatic(root) {
  const base = resolve(root);
  const server = createServer(async (req, res) => {
    const path = normalize(decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname)).replace(/^([/\\])+/, '');
    const file = resolve(base, path || 'index.html');
    if (!file.startsWith(base) || !existsSync(file) || !statSync(file).isFile()) {
      res.writeHead(404).end('not found');
      return;
    }
    try {
      res.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream' }).end(await readFile(file));
    } catch {
      res.writeHead(404).end('not found');
    }
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve({ url: `http://127.0.0.1:${server.address().port}/`, close: () => server.close() })));
}

/** Runs inside the page: lists visible, enabled clickables in a stable order. */
function listTargets() {
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && !el.closest('[hidden],[aria-hidden="true"]');
  };
  return [...document.querySelectorAll('button, [role="button"], input[type="submit"], input[type="button"]')]
    .filter((el) => !el.disabled && visible(el))
    .map((el, i) => ({
      i,
      id: el.id || null,
      label: (
        (el.getAttribute('aria-label') || el.textContent || el.value || el.title || '').replace(/\s+/g, ' ').trim() ||
        (el.className ? `.${String(el.className).split(/\s+/)[0]} (no accessible name)` : '')
      ).slice(0, 60),
      submit: (el.type === 'submit' || el.tagName === 'BUTTON' && !el.getAttribute('type')) && Boolean(el.form),
    }));
}

/** Runs inside the page: fills the button's form with plausible values, clicks it and counts DOM changes. */
async function clickTarget(index) {
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && !el.closest('[hidden],[aria-hidden="true"]');
  };
  const els = [...document.querySelectorAll('button, [role="button"], input[type="submit"], input[type="button"]')].filter((el) => !el.disabled && visible(el));
  const el = els[index];
  if (!el) return { missing: true };
  if (el.form) {
    const today = new Date().toISOString().slice(0, 10);
    for (const f of el.form.elements) {
      if (!(f instanceof HTMLInputElement || f instanceof HTMLTextAreaElement || f instanceof HTMLSelectElement) || f.disabled || f.readOnly) continue;
      if (f instanceof HTMLSelectElement) {
        const opt = [...f.options].find((o) => o.value);
        if (opt && !f.value) f.value = opt.value;
      } else if (['checkbox', 'radio', 'hidden', 'file', 'submit', 'button', 'color', 'range'].includes(f.type)) {
        continue;
      } else if (!f.value) {
        f.value = { number: '3', date: today, 'datetime-local': `${today}T09:00`, time: '09:00', month: today.slice(0, 7), email: 'test@example.com', url: 'https://example.com', tel: '5551234567' }[f.type] ?? 'Test 1';
      }
      f.dispatchEvent(new Event('input', { bubbles: true }));
      f.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }
  let mutations = 0;
  const obs = new MutationObserver((list) => (mutations += list.length));
  obs.observe(document.documentElement, { subtree: true, childList: true, attributes: true, characterData: true });
  const before = location.href;
  el.click();
  await new Promise((r) => setTimeout(r, 350));
  obs.disconnect();
  return { mutations, navigated: location.href !== before };
}

/**
 * @returns {Promise<{skipped?: string, loadErrors: string[], clickErrors: {label: string, errors: string[]}[], deadButtons: {label: string, id: string|null}[], checked: number}>}
 */
export async function smokeTest(root = '.', { chromePath = process.env.CHROME_PATH } = {}) {
  const report = { loadErrors: [], clickErrors: [], deadButtons: [], checked: 0 };
  let chromium;
  try {
    ({ chromium } = await import('playwright-core'));
  } catch {
    return { ...report, skipped: 'playwright-core is not installed' };
  }
  const exe = chromePath ?? CHROMES.find((p) => existsSync(p));
  if (!exe) return { ...report, skipped: 'no Chrome found' };

  const server = await serveStatic(root);
  const browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] });
  try {
    const open = async () => {
      const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
      const errors = [];
      let extra = 0; // dialogs and downloads count as "something happened"
      page.on('pageerror', (e) => errors.push(`Uncaught ${e.name}: ${e.message}${whereFrom(e.stack)}`));
      // Resource failures are reported once, by the response handler below.
      page.on('console', (m) => m.type() === 'error' && !m.text().startsWith('Failed to load resource') && errors.push(`console.error: ${m.text().slice(0, 300)}`));
      page.on('response', (r) => {
        const path = new URL(r.url()).pathname;
        if (r.status() >= 400 && !path.endsWith('/favicon.ico')) errors.push(`HTTP ${r.status()} for ${path}`);
      });
      page.on('dialog', (d) => {
        extra++;
        d.accept().catch(() => {});
      });
      page.on('download', () => extra++);
      await page.goto(server.url, { waitUntil: 'load', timeout: 20_000 });
      await page.waitForTimeout(400);
      return { page, errors, extras: () => extra };
    };

    const first = await open();
    report.loadErrors = [...new Set(first.errors)];
    const targets = (await first.page.evaluate(listTargets)).slice(0, MAX_TARGETS);
    await first.page.close();

    for (const t of targets) {
      const { page, errors, extras } = await open(); // fresh page: one click cannot hide the next
      errors.length = 0;
      const extraBefore = extras();
      const r = await page.evaluate(clickTarget, t.i).catch((e) => ({ failed: String(e) }));
      await page.waitForTimeout(150);
      report.checked++;
      const label = t.label || t.id || `button #${t.i + 1}`;
      if (errors.length) report.clickErrors.push({ label, errors: [...new Set(errors)].slice(0, 3) });
      else if (!r.missing && !r.failed && !r.navigated && r.mutations === 0 && extras() === extraBefore) report.deadButtons.push({ label, id: t.id });
      await page.close();
    }
  } finally {
    await browser.close();
    server.close();
  }
  return report;
}

/**
 * Runs in the page: design problems a person would notice, as plain lines.
 * Sideways scrolling, text too faint to read, tap targets too small on a
 * phone, buttons/inputs left in the browser's default look.
 */
export function designProblems(mobile) {
  const out = [];
  const W = window.innerWidth;
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && Number(cs.opacity) > 0.05;
  };
  const name = (el) => (el.id ? `#${el.id}` : typeof el.className === 'string' && el.className.trim() ? `${el.tagName.toLowerCase()}.${el.className.trim().split(/\s+/)[0]}` : el.tagName.toLowerCase());
  const label = (el) => `${name(el)}${el.textContent?.trim() ? ` "${el.textContent.trim().slice(0, 30)}"` : ''}`;
  const all = [...document.querySelectorAll('body *')].filter(visible);

  // Sideways scrolling (scrolling tables and boards are fine).
  const extra = document.documentElement.scrollWidth - W;
  if (extra > 1) {
    const wide = all.filter((el) => el.getBoundingClientRect().right > W + 1 && getComputedStyle(el).position !== 'fixed' && !el.closest('.table-wrap, .board'));
    const roots = wide.filter((el) => !wide.includes(el.parentElement)).slice(0, 3).map(name);
    out.push(`At ${W} px wide the page scrolls sideways (${extra} px too wide)${roots.length ? `: ${roots.join(', ')} stick out` : ''}.`);
  }

  // Tap targets on a phone.
  if (mobile) {
    const small = all
      .filter((el) => el.matches('button, a, select, input:not([type=checkbox]):not([type=radio]):not([type=hidden]), [role=button]'))
      .filter((el) => {
        const r = el.getBoundingClientRect();
        return r.height < 32 || r.width < 32;
      });
    if (small.length) out.push(`On a phone these controls are smaller than 32 px, hard to tap: ${small.slice(0, 4).map(label).join(', ')}.`);
  }

  // Text contrast (WCAG: 4.5:1, 3:1 for large text).
  const rgb = (c) => {
    const m = String(c).match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const [r, g, b, a = 1] = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
    return { r, g, b, a };
  };
  const lum = ({ r, g, b }) => {
    const f = (v) => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const background = (el) => {
    for (let e = el; e; e = e.parentElement) {
      const c = rgb(getComputedStyle(e).backgroundColor);
      if (c && c.a > 0.5) return c;
    }
    // No background anywhere: the canvas, which is dark only if the page itself supports dark.
    const dark = matchMedia('(prefers-color-scheme: dark)').matches && /dark/.test(getComputedStyle(document.documentElement).colorScheme);
    return dark ? { r: 0, g: 0, b: 0 } : { r: 255, g: 255, b: 255 };
  };
  const faint = [];
  for (const el of all) {
    if (![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
    const cs = getComputedStyle(el);
    const fg = rgb(cs.color);
    if (!fg) continue;
    const bg = background(el);
    const [a, b] = [lum(fg), lum(bg)].sort((x, y) => y - x);
    const ratio = (a + 0.05) / (b + 0.05);
    const size = parseFloat(cs.fontSize);
    const large = size >= 24 || (size >= 18.6 && Number(cs.fontWeight) >= 700);
    if (ratio < (large ? 3 : 4.5)) faint.push(`${label(el)} (${ratio.toFixed(1)}:1)`);
  }
  if (faint.length) out.push(`Text too faint to read (contrast below 4.5:1)${mobile ? '' : ' in dark mode'}: ${faint.slice(0, 4).join(', ')}.`);

  // Controls left in the browser's default look.
  const plain = all.filter((el) => {
    const cs = getComputedStyle(el);
    if (el.matches('button, input[type=button], input[type=submit]')) return /outset/.test(cs.borderStyle) || cs.backgroundColor === 'rgb(239, 239, 239)' || cs.backgroundColor === 'rgb(240, 240, 240)';
    if (el.matches('input:not([type=checkbox]):not([type=radio]), select, textarea')) return /inset/.test(cs.borderStyle);
    return false;
  });
  if (plain.length) out.push(`These controls still have the browser's default look (give them kit classes like .btn / .input): ${plain.slice(0, 4).map(label).join(', ')}.`);
  return out;
}

/** Opens the app on a phone (light) and on a desktop (dark) and lists design problems. */
export async function designReview(root = '.', { chromePath = process.env.CHROME_PATH } = {}) {
  let chromium;
  try {
    ({ chromium } = await import('playwright-core'));
  } catch {
    return { skipped: 'playwright-core is not installed', problems: [] };
  }
  const exe = chromePath ?? CHROMES.find((p) => existsSync(p));
  if (!exe) return { skipped: 'no Chrome found', problems: [] };
  const server = await serveStatic(root);
  const browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] });
  const problems = [];
  try {
    for (const view of [
      { mobile: true, viewport: { width: 390, height: 844 }, colorScheme: 'light' },
      { mobile: false, viewport: { width: 1280, height: 900 }, colorScheme: 'dark' },
    ]) {
      // Not isMobile: mobile emulation zooms out to fit a too-wide page, which would hide the overflow.
      const page = await browser.newPage({ viewport: view.viewport, colorScheme: view.colorScheme });
      await page.goto(server.url, { waitUntil: 'load', timeout: 20_000 });
      await page.waitForTimeout(300);
      problems.push(...(await page.evaluate(designProblems, view.mobile)));
      await page.close();
    }
  } finally {
    await browser.close();
    server.close();
  }
  return { problems };
}

/** Human-readable problem lines for the model and for AppNar's UI. */
export function describeSmoke(report) {
  const lines = [];
  for (const e of report.loadErrors) lines.push(`On page load: ${e}`);
  for (const c of report.clickErrors) lines.push(`Clicking "${c.label}" throws: ${c.errors.join(' | ')}`);
  for (const d of report.deadButtons) lines.push(`Clicking "${d.label}"${d.id ? ` (#${d.id})` : ''} does nothing visible (no DOM change, dialog or download).`);
  return lines;
}
