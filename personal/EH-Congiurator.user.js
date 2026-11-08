// ==UserScript==
// @name         EH-Congiurator
// @namespace    https://github.com/grave0x/userscripts
// @version      1.3.0
// @description  Infinite scroll reader + ZIP/CBZ downloader with ComicInfo.xml for E-Hentai / ExHentai. Click zones, fullscreen, page jump, preload, copy URL.
// @author       grave0x
// @match        https://e-hentai.org/s/*
// @match        https://exhentai.org/s/*
// @require      https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js
// @grant        GM_getValue
// @grant        GM_setValue
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  if (!window.showkey || !window.api_url) {
    console.warn('[EH-Congiurator] Required page variables missing.');
    return;
  }

  const DEFAULTS = {
    infiniteScroll: true,
    preloadMargin: 800,
    downloadFormat: 'cbz',
    includeComicInfo: true,
    concurrentDownloads: 3,
    preferJapaneseTitle: false,
    preferOriginal: true,
    saveProgress: true,
    keyboardNav: true,
    imageFit: 'width',
    showOverlay: true,
    downloadRange: 'full',
    clickZones: true,
    preloadNext: true
  };

  const config = {
    get(key) { return GM_getValue(key, DEFAULTS[key]); },
    set(key, value) { GM_setValue(key, value); },
    all() {
      const out = {};
      for (const k of Object.keys(DEFAULTS)) out[k] = this.get(k);
      return out;
    }
  };

  function createConfigPanel() {
    const panel = document.createElement('div');
    panel.id = 'eh-config-panel';
    panel.style.cssText = `
      position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
      background: #1a1a1a; color: #eee; border: 1px solid #444; border-radius: 10px;
      padding: 18px; z-index: 10000; width: 400px; max-height: 85vh; overflow-y: auto;
      font: 14px system-ui, sans-serif; box-shadow: 0 8px 32px rgba(0,0,0,0.6); display: none;
    `;
    panel.innerHTML = `
      <h3 style="margin:0 0 14px; font-size:17px;">EH-Congiurator Settings</h3>

      <div style="margin-bottom:12px; padding-bottom:8px; border-bottom:1px solid #333;">
        <strong>Reading</strong>
        <label style="display:block; margin:6px 0;"><input type="checkbox" id="cfg-infinite"> Continuous scroll (load next page automatically)</label>
        <label style="display:block; margin:6px 0;">How early to start loading the next page (px): <input type="number" id="cfg-margin" style="width:70px; background:#222; color:#eee; border:1px solid #555; padding:2px 4px;"></label>
        <label style="display:block; margin:6px 0;">Image size:
          <select id="cfg-fit" style="background:#222; color:#eee; border:1px solid #555; padding:2px 4px;">
            <option value="width">Fit to window width</option>
            <option value="contain">Fit inside window</option>
            <option value="original">Original size</option>
          </select>
        </label>
        <label style="display:block; margin:6px 0;"><input type="checkbox" id="cfg-keys"> Arrow keys / Space to advance</label>
        <label style="display:block; margin:6px 0;"><input type="checkbox" id="cfg-clickzones"> Click left/right half of image to go previous/next</label>
        <label style="display:block; margin:6px 0;"><input type="checkbox" id="cfg-preload"> Preload the next image</label>
        <label style="display:block; margin:6px 0;"><input type="checkbox" id="cfg-progress"> Remember where I left off</label>
        <label style="display:block; margin:6px 0;"><input type="checkbox" id="cfg-overlay"> Show title & tags at the top</label>
      </div>

      <div style="margin-bottom:12px; padding-bottom:8px; border-bottom:1px solid #333;">
        <strong>Download</strong>
        <label style="display:block; margin:6px 0;">File type:
          <select id="cfg-format" style="background:#222; color:#eee; border:1px solid #555; padding:2px 4px;">
            <option value="cbz">CBZ (comic format with metadata)</option>
            <option value="zip">ZIP</option>
          </select>
        </label>
        <label style="display:block; margin:6px 0;"><input type="checkbox" id="cfg-comicinfo"> Include ComicInfo.xml (so readers see title/tags)</label>
        <label style="display:block; margin:6px 0;"><input type="checkbox" id="cfg-original"> Prefer full-resolution originals when available</label>
        <label style="display:block; margin:6px 0;">How many images to download at once: <input type="number" id="cfg-concurrent" min="1" max="8" style="width:50px; background:#222; color:#eee; border:1px solid #555; padding:2px 4px;"></label>
        <label style="display:block; margin:6px 0;">Download range:
          <select id="cfg-range" style="background:#222; color:#eee; border:1px solid #555; padding:2px 4px;">
            <option value="full">Whole gallery</option>
            <option value="from-current">From current page to the end</option>
          </select>
        </label>
        <label style="display:block; margin:6px 0;"><input type="checkbox" id="cfg-jpn"> Prefer Japanese title when available</label>
      </div>

      <div style="text-align:right;">
        <button id="cfg-save" style="background:#4a9eff; color:#fff; border:none; padding:7px 16px; border-radius:4px; cursor:pointer;">Save</button>
        <button id="cfg-close" style="background:#555; color:#fff; border:none; padding:7px 16px; border-radius:4px; cursor:pointer; margin-left:6px;">Close</button>
      </div>
    `;
    document.body.appendChild(panel);

    const c = config.all();
    panel.querySelector('#cfg-infinite').checked = c.infiniteScroll;
    panel.querySelector('#cfg-margin').value = c.preloadMargin;
    panel.querySelector('#cfg-fit').value = c.imageFit;
    panel.querySelector('#cfg-keys').checked = c.keyboardNav;
    panel.querySelector('#cfg-clickzones').checked = c.clickZones;
    panel.querySelector('#cfg-preload').checked = c.preloadNext;
    panel.querySelector('#cfg-progress').checked = c.saveProgress;
    panel.querySelector('#cfg-overlay').checked = c.showOverlay;
    panel.querySelector('#cfg-format').value = c.downloadFormat;
    panel.querySelector('#cfg-comicinfo').checked = c.includeComicInfo;
    panel.querySelector('#cfg-original').checked = c.preferOriginal;
    panel.querySelector('#cfg-concurrent').value = c.concurrentDownloads;
    panel.querySelector('#cfg-range').value = c.downloadRange;
    panel.querySelector('#cfg-jpn').checked = c.preferJapaneseTitle;

    panel.querySelector('#cfg-save').onclick = () => {
      config.set('infiniteScroll', panel.querySelector('#cfg-infinite').checked);
      config.set('preloadMargin', parseInt(panel.querySelector('#cfg-margin').value, 10) || 800);
      config.set('imageFit', panel.querySelector('#cfg-fit').value);
      config.set('keyboardNav', panel.querySelector('#cfg-keys').checked);
      config.set('clickZones', panel.querySelector('#cfg-clickzones').checked);
      config.set('preloadNext', panel.querySelector('#cfg-preload').checked);
      config.set('saveProgress', panel.querySelector('#cfg-progress').checked);
      config.set('showOverlay', panel.querySelector('#cfg-overlay').checked);
      config.set('downloadFormat', panel.querySelector('#cfg-format').value);
      config.set('includeComicInfo', panel.querySelector('#cfg-comicinfo').checked);
      config.set('preferOriginal', panel.querySelector('#cfg-original').checked);
      config.set('concurrentDownloads', parseInt(panel.querySelector('#cfg-concurrent').value, 10) || 3);
      config.set('downloadRange', panel.querySelector('#cfg-range').value);
      config.set('preferJapaneseTitle', panel.querySelector('#cfg-jpn').checked);
      panel.style.display = 'none';
      alert('Settings saved. Reload the page for reading changes to take full effect.');
    };
    panel.querySelector('#cfg-close').onclick = () => panel.style.display = 'none';
    return panel;
  }

  const configPanel = createConfigPanel();

  const btnBar = document.createElement('div');
  btnBar.style.cssText = `
    position: fixed; bottom: 16px; right: 16px; z-index: 9999;
    display: flex; flex-direction: column; gap: 8px;
  `;

  function makeBtn(text, bg) {
    const b = document.createElement('button');
    b.textContent = text;
    b.style.cssText = `background:${bg}; color:#fff; border:none; padding:8px 12px; border-radius:6px; cursor:pointer; font:13px system-ui; min-width:130px;`;
    return b;
  }

  const cfgBtn = makeBtn('⚙ Settings', '#333');
  cfgBtn.onclick = () => configPanel.style.display = configPanel.style.display === 'none' ? 'block' : 'none';

  const jumpBtn = makeBtn('⇄ Jump to page', '#555');
  jumpBtn.onclick = () => doJump();

  const fsBtn = makeBtn('⛶ Fullscreen', '#444');
  fsBtn.onclick = () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
    else document.exitFullscreen();
  };

  const copyBtn = makeBtn('📋 Copy image URL', '#3a5');
  copyBtn.onclick = () => {
    const img = document.querySelector('#eh-infinite-stack img') || document.getElementById('img');
    if (img?.src) {
      navigator.clipboard.writeText(img.src).then(() => {
        copyBtn.textContent = 'Copied';
        setTimeout(() => copyBtn.textContent = '📋 Copy image URL', 1500);
      });
    }
  };

  const dlBtn = makeBtn('⬇ Download', '#2a7');
  dlBtn.onclick = () => startDownload();

  btnBar.appendChild(cfgBtn);
  btnBar.appendChild(jumpBtn);
  btnBar.appendChild(fsBtn);
  btnBar.appendChild(copyBtn);
  btnBar.appendChild(dlBtn);
  document.body.appendChild(btnBar);

  const jumpBar = document.createElement('div');
  jumpBar.style.cssText = `
    position: fixed; bottom: 12px; left: 50%; transform: translateX(-50%);
    background: rgba(0,0,0,0.75); color: #fff; padding: 6px 10px; border-radius: 6px;
    font: 13px system-ui; z-index: 9999; display: flex; align-items: center; gap: 6px;
  `;
  jumpBar.innerHTML = `
    <span>Page</span>
    <input id="eh-jump-input" type="number" min="1" style="width:60px; background:#222; color:#eee; border:1px solid #555; padding:2px 4px; border-radius:3px;">
    <button id="eh-jump-go" style="background:#4a9eff; color:#fff; border:none; padding:3px 8px; border-radius:3px; cursor:pointer;">Go</button>
  `;
  document.body.appendChild(jumpBar);
  document.getElementById('eh-jump-go').onclick = () => {
    const n = document.getElementById('eh-jump-input').value;
    if (n) doJump(n);
  };
  document.getElementById('eh-jump-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') doJump(e.target.value);
  });

  function doJump(n) {
    const page = parseInt(n || prompt('Jump to page number:'), 10);
    if (!page || page < 1) return;
    const parts = location.pathname.split('/');
    if (parts.length >= 4) {
      location.href = parts.slice(0, 3).join('/') + '-' + page + location.search;
    }
  }

  function progressKey() {
    const m = location.pathname.match(/\/s\/[^/]+\/(\d+)-/);
    return m ? 'eh-progress-' + m[1] : null;
  }
  function saveProgress(page) {
    if (!config.get('saveProgress')) return;
    const k = progressKey();
    if (k) GM_setValue(k, page);
  }
  function loadProgress() {
    if (!config.get('saveProgress')) return null;
    const k = progressKey();
    return k ? GM_getValue(k, null) : null;
  }

  function applyFit(img) {
    const mode = config.get('imageFit');
    img.style.display = 'block';
    if (mode === 'width') {
      img.style.maxWidth = '100%';
      img.style.height = 'auto';
      img.style.width = 'auto';
    } else if (mode === 'contain') {
      img.style.maxWidth = '100%';
      img.style.maxHeight = '100vh';
      img.style.height = 'auto';
      img.style.width = 'auto';
    } else {
      img.style.maxWidth = 'none';
      img.style.width = 'auto';
      img.style.height = 'auto';
    }
  }

  async function maybeShowOverlay() {
    if (!config.get('showOverlay')) return;
    const galleryLink = document.querySelector('#i5 a')?.href;
    if (!galleryLink) return;
    const m = galleryLink.match(/\/g\/(\d+)\/([a-z0-9]+)\//);
    if (!m) return;
    try {
      const res = await fetch(window.api_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ method: 'gdata', gidlist: [[parseInt(m[1],10), m[2]]], namespace: 1 })
      });
      const data = await res.json();
      const meta = data.gmetadata?.[0];
      if (!meta) return;
      const title = config.get('preferJapaneseTitle') && meta.title_jpn ? meta.title_jpn : meta.title;
      const tags = (meta.tags || []).slice(0, 12).join(' · ');
      const overlay = document.createElement('div');
      overlay.style.cssText = `
        position: fixed; top: 8px; left: 50%; transform: translateX(-50%);
        background: rgba(0,0,0,0.75); color: #eee; padding: 8px 14px; border-radius: 6px;
        font: 13px system-ui; z-index: 9998; max-width: 70%; text-align: center; pointer-events: none;
      `;
      overlay.innerHTML = `<div style="font-weight:600;">${escapeHtml(title)}</div><div style="font-size:11px; opacity:0.85; margin-top:2px;">${escapeHtml(tags)}</div>`;
      document.body.appendChild(overlay);
    } catch (e) { /* ignore */ }
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({'&':'&','<':'<','>':'>','"':'"',"'":'&#39;'}[c]));
  }

  if (config.get('infiniteScroll')) {
    initInfiniteScroll();
  }
  maybeShowOverlay();

  function initInfiniteScroll() {
    const container = document.getElementById('i1') || document.body;
    const originalImg = document.getElementById('img');
    if (!originalImg) return;

    const stack = document.createElement('div');
    stack.id = 'eh-infinite-stack';
    stack.style.cssText = 'display:flex; flex-direction:column; align-items:center; gap:8px; margin:0 auto; max-width:100%;';

    const originalWrapper = originalImg.closest('a') || originalImg;
    originalWrapper.style.display = 'block';
    applyFit(originalImg);
    stack.appendChild(originalWrapper);
    container.appendChild(stack);

    const i3 = document.getElementById('i3');
    if (i3) i3.style.display = 'none';

    let currentPage = window.startpage || parseInt(location.pathname.match(/-(\d+)$/)?.[1] || '1', 10);
    let totalPages = null;
    let nextImgKey = null;
    let nextPageNum = null;
    let isLoading = false;
    let finished = false;
    let lastLoadedImg = originalImg;

    function extractNext() {
      const nextEl = document.getElementById('next');
      if (!nextEl) return false;
      const match = (nextEl.getAttribute('onclick') || nextEl.href || '').match(/load_image\((\d+),\s*['"]([0-9a-f]+)['"]\)/);
      if (match) {
        nextPageNum = parseInt(match[1], 10);
        nextImgKey = match[2];
        return true;
      }
      return false;
    }

    function extractTotal() {
      const sn = document.querySelector('.sn');
      if (sn) {
        const m = sn.textContent.match(/(\d+)\s*\/\s*(\d+)/);
        if (m) {
          currentPage = parseInt(m[1], 10);
          totalPages = parseInt(m[2], 10);
        }
      }
    }

    extractNext();
    extractTotal();

    const saved = loadProgress();
    if (saved && saved !== currentPage && saved > 1) {
      if (confirm(`Resume at page ${saved}?`)) {
        const parts = location.pathname.split('/');
        if (parts.length >= 4) {
          location.href = parts.slice(0, 3).join('/') + '-' + saved + location.search;
          return;
        }
      }
    }

    const counter = document.createElement('div');
    counter.style.cssText = `
      position: fixed; bottom: 12px; left: 12px;
      background: rgba(0,0,0,0.75); color: #fff; padding: 6px 12px;
      border-radius: 6px; font: 13px system-ui, sans-serif; z-index: 9999; pointer-events: none;
    `;
    document.body.appendChild(counter);

    function updateCounter() {
      counter.textContent = totalPages ? `${currentPage} / ${totalPages}` : `Page ${currentPage}`;
      saveProgress(currentPage);
      const inp = document.getElementById('eh-jump-input');
      if (inp) inp.value = currentPage;
    }
    updateCounter();

    if (config.get('clickZones')) {
      document.addEventListener('click', (e) => {
        if (e.target.closest('#eh-config-panel, #eh-jump-input, button')) return;
        const img = e.target.closest('img');
        if (!img) return;
        const rect = img.getBoundingClientRect();
        const x = e.clientX - rect.left;
        if (x < rect.width * 0.3) history.back();
        else if (x > rect.width * 0.7) loadNext();
      });
    }

    async function loadNext() {
      if (isLoading || finished || !nextImgKey || !nextPageNum) return;
      if (totalPages && nextPageNum > totalPages) {
        finished = true;
        counter.textContent = 'End of gallery';
        return;
      }
      isLoading = true;
      counter.textContent = 'Loading…';

      const gid = parseInt(location.pathname.split('/')[3], 10);
      try {
        const res = await fetch(window.api_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            method: 'showpage',
            gid,
            page: nextPageNum,
            imgkey: nextImgKey,
            showkey: window.showkey
          })
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!data.i3) throw new Error('No image data');

        const tmp = document.createElement('div');
        tmp.innerHTML = data.i3;
        let newImg = tmp.querySelector('#img') || tmp.querySelector('img');
        if (!newImg) throw new Error('Could not find image');

        if (config.get('preferOriginal')) {
          const orig = extractOriginalUrl(data);
          if (orig) newImg.src = orig;
        }

        newImg.removeAttribute('id');
        applyFit(newImg);

        const wrapper = document.createElement('div');
        wrapper.style.cssText = 'width:100%; display:flex; justify-content:center;';
        wrapper.appendChild(newImg);
        stack.appendChild(wrapper);
        lastLoadedImg = newImg;

        if (config.get('preloadNext') && data.n) {
          const navTmp2 = document.createElement('div');
          navTmp2.innerHTML = data.n;
          const nextNext = navTmp2.querySelector('#next');
          if (nextNext) {
            const mm = (nextNext.getAttribute('onclick') || '').match(/load_image\((\d+),\s*['"]([0-9a-f]+)['"]\)/);
            if (mm) {
              fetch(window.api_url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                  method: 'showpage',
                  gid,
                  page: parseInt(mm[1], 10),
                  imgkey: mm[2],
                  showkey: window.showkey
                })
              }).catch(() => {});
            }
          }
        }

        currentPage = data.p || nextPageNum;
        const navTmp = document.createElement('div');
        navTmp.innerHTML = data.n || '';
        const nextLink = navTmp.querySelector('#next');
        if (nextLink) {
          const m = (nextLink.getAttribute('onclick') || '').match(/load_image\((\d+),\s*['"]([0-9a-f]+)['"]\)/);
          if (m) {
            nextPageNum = parseInt(m[1], 10);
            nextImgKey = m[2];
          } else finished = true;
        } else finished = true;

        const snMatch = (data.n || '').match(/(\d+)\s*\/\s*(\d+)/);
        if (snMatch) totalPages = parseInt(snMatch[2], 10);
        updateCounter();
      } catch (err) {
        console.error('[EH-Congiurator]', err);
        counter.textContent = 'Load failed — scroll again to retry';
      } finally {
        isLoading = false;
      }
    }

    const sentinel = document.createElement('div');
    sentinel.style.cssText = 'height:1px; width:100%;';
    stack.appendChild(sentinel);

    const margin = config.get('preloadMargin');
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoading && !finished) loadNext();
      },
      { rootMargin: `${margin}px` }
    );
    observer.observe(sentinel);

    if (config.get('keyboardNav')) {
      document.addEventListener('keydown', (e) => {
        if (e.target.matches('input, textarea')) return;
        if (e.key === 'ArrowRight' || e.key === ' ') {
          e.preventDefault();
          loadNext();
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          history.back();
        } else if (e.key === 'f' || e.key === 'F') {
          e.preventDefault();
          if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
          else document.exitFullscreen();
        } else if (e.key === 'c' || e.key === 'C') {
          const img = lastLoadedImg || document.getElementById('img');
          if (img?.src) navigator.clipboard.writeText(img.src);
        }
      });
    }
  }

  function extractOriginalUrl(data) {
    const html = (data.i7 || '') + (data.i6 || '');
    const m = html.match(/fullimg\.php[^"'<>]+/);
    if (m) {
      let url = m[0];
      if (url.startsWith('fullimg')) url = location.origin + '/' + url;
      else if (!url.startsWith('http')) url = location.origin + '/' + url.replace(/^\/+/, '');
      return url.replace(/&/g, '&');
    }
    return null;
  }

  let downloadAbort = false;

  async function startDownload() {
    if (dlBtn.textContent.includes('Cancel')) {
      downloadAbort = true;
      return;
    }
    downloadAbort = false;
    const format = config.get('downloadFormat');
    const includeMeta = config.get('includeComicInfo');
    const preferOrig = config.get('preferOriginal');
    const range = config.get('downloadRange');
    dlBtn.textContent = '✖ Cancel';

    let progBar = document.getElementById('eh-dl-prog');
    if (!progBar) {
      progBar = document.createElement('div');
      progBar.id = 'eh-dl-prog';
      progBar.style.cssText = `
        position: fixed; bottom: 70px; right: 16px; width: 200px; height: 6px;
        background: #333; border-radius: 3px; z-index: 9999; overflow: hidden;
      `;
      const fill = document.createElement('div');
      fill.id = 'eh-dl-fill';
      fill.style.cssText = 'height:100%; width:0%; background:#4a9eff; transition:width 0.2s;';
      progBar.appendChild(fill);
      document.body.appendChild(progBar);
    }
    const fill = document.getElementById('eh-dl-fill');

    try {
      const galleryLink = document.querySelector('#i5 a')?.href;
      if (!galleryLink) throw new Error('Could not find gallery link');
      const m = galleryLink.match(/\/g\/(\d+)\/([a-z0-9]+)\//);
      if (!m) throw new Error('Could not parse gallery id/token');
      const gid = parseInt(m[1], 10);
      const token = m[2];

      const metaRes = await fetch(window.api_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ method: 'gdata', gidlist: [[gid, token]], namespace: 1 })
      });
      const metaJson = await metaRes.json();
      const meta = metaJson.gmetadata?.[0];
      if (!meta) throw new Error('No gallery metadata');

      const title = config.get('preferJapaneseTitle') && meta.title_jpn ? meta.title_jpn : meta.title;
      const filecount = parseInt(meta.filecount, 10) || 0;
      if (!filecount) throw new Error('No pages found');

      const startPage = range === 'from-current'
        ? (window.startpage || parseInt(location.pathname.match(/-(\d+)$/)?.[1] || '1', 10))
        : 1;

      let currentKey = location.pathname.split('/')[2];
      const images = [];

      for (let p = 1; p <= filecount; p++) {
        if (downloadAbort) throw new Error('Cancelled');
        dlBtn.textContent = `Meta ${p}/${filecount}`;
        fill.style.width = `${(p / filecount) * 30}%`;
        const pageRes = await fetch(window.api_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            method: 'showpage',
            gid,
            page: p,
            imgkey: currentKey,
            showkey: window.showkey
          })
        });
        const pageData = await pageRes.json();
        if (!pageData.i3) throw new Error(`Failed page ${p}`);

        if (p >= startPage) {
          const tmp = document.createElement('div');
          tmp.innerHTML = pageData.i3;
          const img = tmp.querySelector('img');
          let url = img?.src;
          if (preferOrig) {
            const orig = extractOriginalUrl(pageData);
            if (orig) url = orig;
          }
          if (!url) throw new Error(`No src for page ${p}`);
          const ext = (url.match(/\.(\w+)(?:\?|$)/) || ['', 'jpg'])[1];
          images.push({ page: p, url, name: `${String(p).padStart(3, '0')}.${ext}` });
        }

        const navTmp = document.createElement('div');
        navTmp.innerHTML = pageData.n || '';
        const nextLink = navTmp.querySelector('#next');
        if (nextLink) {
          const km = (nextLink.getAttribute('onclick') || '').match(/load_image\(\d+,\s*['"]([0-9a-f]+)['"]\)/);
          if (km) currentKey = km[1];
        }
        await new Promise(r => setTimeout(r, 100));
      }

      dlBtn.textContent = 'Downloading…';
      const zip = new JSZip();
      const folder = zip.folder(sanitize(title)) || zip;

      const conc = config.get('concurrentDownloads');
      let done = 0;
      const queue = [...images];
      const workers = Array.from({ length: Math.min(conc, queue.length) }, async () => {
        while (queue.length && !downloadAbort) {
          const item = queue.shift();
          if (!item) break;
          try {
            const r = await fetch(item.url, { credentials: 'omit' });
            if (!r.ok) throw new Error(r.status);
            const blob = await r.blob();
            folder.file(item.name, blob);
            done++;
            dlBtn.textContent = `${done}/${images.length}`;
            fill.style.width = `${30 + (done / images.length) * 70}%`;
          } catch (e) {
            console.warn('Image download failed', item.page, e);
            folder.file(item.name + '.failed.txt', `Failed page ${item.page}: ${e}`);
          }
        }
      });
      await Promise.all(workers);
      if (downloadAbort) throw new Error('Cancelled');

      if (includeMeta && (format === 'cbz' || config.get('includeComicInfo'))) {
        folder.file('ComicInfo.xml', buildComicInfoXml(meta, title));
      }

      dlBtn.textContent = 'Packing…';
      fill.style.width = '100%';
      const blob = await zip.generateAsync({ type: 'blob' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${sanitize(title)}.${format === 'cbz' ? 'cbz' : 'zip'}`;
      a.click();
      URL.revokeObjectURL(a.href);

      dlBtn.textContent = 'Done';
      setTimeout(() => {
        dlBtn.textContent = '⬇ Download';
        if (progBar) progBar.remove();
      }, 2000);
    } catch (err) {
      console.error(err);
      if (err.message !== 'Cancelled') alert('Download failed: ' + err.message);
      dlBtn.textContent = '⬇ Download';
      if (progBar) progBar.remove();
    }
  }

  function sanitize(name) {
    return name.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').slice(0, 180);
  }

  function buildComicInfoXml(meta, title) {
    const tags = (meta.tags || []).join(', ');
    const date = meta.posted ? new Date(parseInt(meta.posted, 10) * 1000) : new Date();
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const d = String(date.getUTCDate()).padStart(2, '0');
    return `<?xml version="1.0" encoding="utf-8"?>
<ComicInfo xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
  <Title>${escapeXml(title)}</Title>
  <Series>${escapeXml(title)}</Series>
  <Number>1</Number>
  <Summary>${escapeXml(meta.title || '')}</Summary>
  <Writer>${escapeXml(meta.uploader || '')}</Writer>
  <Publisher>E-Hentai</Publisher>
  <Genre>${escapeXml(meta.category || '')}</Genre>
  <Tags>${escapeXml(tags)}</Tags>
  <PageCount>${meta.filecount || 0}</PageCount>
  <Year>${y}</Year>
  <Month>${m}</Month>
  <Day>${d}</Day>
  <LanguageISO>en</LanguageISO>
  <Notes>Generated by EH-Congiurator v1.3</Notes>
</ComicInfo>`;
  }

  function escapeXml(s) {
    return String(s).replace(/[<>&'"]/g, c => ({ '<': '<', '>': '>', '&': '&', "'": ''', '"': '"' }[c]));
  }

  console.log('[EH-Congiurator] v1.3 Loaded.');
})();
