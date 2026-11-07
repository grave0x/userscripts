// ==UserScript==
// @name         EH-Congiurator
// @namespace    https://github.com/grave0x/userscripts
// @version      1.0.0
// @description  Infinite scroll reader + ZIP/CBZ downloader with ComicInfo.xml metadata for E-Hentai / ExHentai image pages
// @author       grave0x
// @match        https://e-hentai.org/s/*
// @match        https://exhentai.org/s/*
// @require      https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
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
    preferJapaneseTitle: false
  };

  const config = {
    get(key) {
      return GM_getValue(key, DEFAULTS[key]);
    },
    set(key, value) {
      GM_setValue(key, value);
    },
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
      background: #1a1a1a; color: #eee; border: 1px solid #444; border-radius: 8px;
      padding: 16px; z-index: 10000; min-width: 320px; font: 14px system-ui, sans-serif;
      box-shadow: 0 8px 32px rgba(0,0,0,0.6); display: none;
    `;
    panel.innerHTML = `
      <h3 style="margin:0 0 12px; font-size:16px;">EH-Congiurator Config</h3>
      <label style="display:block; margin:8px 0;"><input type="checkbox" id="cfg-infinite"> Infinite Scroll</label>
      <label style="display:block; margin:8px 0;">Preload margin (px): <input type="number" id="cfg-margin" style="width:80px; background:#222; color:#eee; border:1px solid #555; padding:2px 4px;"></label>
      <label style="display:block; margin:8px 0;">Default download: 
        <select id="cfg-format" style="background:#222; color:#eee; border:1px solid #555; padding:2px 4px;">
          <option value="cbz">CBZ (with ComicInfo.xml)</option>
          <option value="zip">ZIP</option>
        </select>
      </label>
      <label style="display:block; margin:8px 0;"><input type="checkbox" id="cfg-comicinfo"> Embed ComicInfo.xml</label>
      <label style="display:block; margin:8px 0;">Concurrent downloads: <input type="number" id="cfg-concurrent" min="1" max="8" style="width:60px; background:#222; color:#eee; border:1px solid #555; padding:2px 4px;"></label>
      <label style="display:block; margin:8px 0;"><input type="checkbox" id="cfg-jpn"> Prefer Japanese title</label>
      <div style="margin-top:14px; text-align:right;">
        <button id="cfg-save" style="background:#4a9eff; color:#fff; border:none; padding:6px 14px; border-radius:4px; cursor:pointer;">Save</button>
        <button id="cfg-close" style="background:#555; color:#fff; border:none; padding:6px 14px; border-radius:4px; cursor:pointer; margin-left:6px;">Close</button>
      </div>
    `;
    document.body.appendChild(panel);

    const c = config.all();
    panel.querySelector('#cfg-infinite').checked = c.infiniteScroll;
    panel.querySelector('#cfg-margin').value = c.preloadMargin;
    panel.querySelector('#cfg-format').value = c.downloadFormat;
    panel.querySelector('#cfg-comicinfo').checked = c.includeComicInfo;
    panel.querySelector('#cfg-concurrent').value = c.concurrentDownloads;
    panel.querySelector('#cfg-jpn').checked = c.preferJapaneseTitle;

    panel.querySelector('#cfg-save').onclick = () => {
      config.set('infiniteScroll', panel.querySelector('#cfg-infinite').checked);
      config.set('preloadMargin', parseInt(panel.querySelector('#cfg-margin').value, 10) || 800);
      config.set('downloadFormat', panel.querySelector('#cfg-format').value);
      config.set('includeComicInfo', panel.querySelector('#cfg-comicinfo').checked);
      config.set('concurrentDownloads', parseInt(panel.querySelector('#cfg-concurrent').value, 10) || 3);
      config.set('preferJapaneseTitle', panel.querySelector('#cfg-jpn').checked);
      panel.style.display = 'none';
      alert('Config saved. Reload the page for infinite-scroll changes to take full effect.');
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
  const cfgBtn = document.createElement('button');
  cfgBtn.textContent = '⚙ Config';
  cfgBtn.style.cssText = 'background:#333; color:#fff; border:1px solid #555; padding:8px 12px; border-radius:6px; cursor:pointer; font:13px system-ui;';
  cfgBtn.onclick = () => configPanel.style.display = configPanel.style.display === 'none' ? 'block' : 'none';

  const dlBtn = document.createElement('button');
  dlBtn.textContent = '⬇ Download';
  dlBtn.style.cssText = 'background:#2a7; color:#fff; border:none; padding:8px 12px; border-radius:6px; cursor:pointer; font:13px system-ui;';
  dlBtn.onclick = () => startDownload();

  btnBar.appendChild(cfgBtn);
  btnBar.appendChild(dlBtn);
  document.body.appendChild(btnBar);

  if (config.get('infiniteScroll')) {
    initInfiniteScroll();
  }

  function initInfiniteScroll() {
    const container = document.getElementById('i1') || document.body;
    const originalImg = document.getElementById('img');
    if (!originalImg) return;

    const stack = document.createElement('div');
    stack.id = 'eh-infinite-stack';
    stack.style.cssText = 'display:flex; flex-direction:column; align-items:center; gap:8px; margin:0 auto; max-width:100%;';

    const originalWrapper = originalImg.closest('a') || originalImg;
    originalWrapper.style.display = 'block';
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

    const counter = document.createElement('div');
    counter.style.cssText = `
      position: fixed; bottom: 12px; left: 12px;
      background: rgba(0,0,0,0.75); color: #fff; padding: 6px 12px;
      border-radius: 6px; font: 13px system-ui, sans-serif; z-index: 9999; pointer-events: none;
    `;
    document.body.appendChild(counter);

    function updateCounter() {
      counter.textContent = totalPages ? `${currentPage} / ${totalPages}` : `Page ${currentPage}`;
    }
    updateCounter();

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
        const newImg = tmp.querySelector('#img') || tmp.querySelector('img');
        if (!newImg) throw new Error('Could not find image');

        newImg.removeAttribute('id');
        newImg.style.maxWidth = '100%';
        newImg.style.height = 'auto';
        newImg.style.display = 'block';

        const wrapper = document.createElement('div');
        wrapper.style.cssText = 'width:100%; display:flex; justify-content:center;';
        wrapper.appendChild(newImg);
        stack.appendChild(wrapper);

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
  }

  async function startDownload() {
    const format = config.get('downloadFormat');
    const includeMeta = config.get('includeComicInfo');
    dlBtn.disabled = true;
    dlBtn.textContent = 'Preparing…';

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
        body: JSON.stringify({
          method: 'gdata',
          gidlist: [[gid, token]],
          namespace: 1
        })
      });
      const metaJson = await metaRes.json();
      const meta = metaJson.gmetadata?.[0];
      if (!meta) throw new Error('No gallery metadata');

      const title = config.get('preferJapaneseTitle') && meta.title_jpn ? meta.title_jpn : meta.title;
      const filecount = parseInt(meta.filecount, 10) || 0;
      if (!filecount) throw new Error('No pages found');

      dlBtn.textContent = `0 / ${filecount}`;

      let currentKey = location.pathname.split('/')[2];

      const images = [];
      for (let p = 1; p <= filecount; p++) {
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

        const tmp = document.createElement('div');
        tmp.innerHTML = pageData.i3;
        const img = tmp.querySelector('img');
        if (!img?.src) throw new Error(`No src for page ${p}`);

        images.push({ page: p, url: img.src, name: `${String(p).padStart(3, '0')}.${(img.src.match(/\.(\w+)(?:\?|$)/) || ['','jpg'])[1]}` });

        const navTmp = document.createElement('div');
        navTmp.innerHTML = pageData.n || '';
        const nextLink = navTmp.querySelector('#next');
        if (nextLink) {
          const km = (nextLink.getAttribute('onclick') || '').match(/load_image\(\d+,\s*['"]([0-9a-f]+)['"]\)/);
          if (km) currentKey = km[1];
        }
        dlBtn.textContent = `${p} / ${filecount} (meta)`;
        await new Promise(r => setTimeout(r, 150));
      }

      dlBtn.textContent = 'Downloading images…';
      const zip = new JSZip();
      const folder = zip.folder(sanitize(title)) || zip;

      const conc = config.get('concurrentDownloads');
      let done = 0;
      const queue = [...images];
      const workers = Array.from({ length: Math.min(conc, queue.length) }, async () => {
        while (queue.length) {
          const item = queue.shift();
          if (!item) break;
          try {
            const r = await fetch(item.url, { credentials: 'omit' });
            if (!r.ok) throw new Error(r.status);
            const blob = await r.blob();
            folder.file(item.name, blob);
            done++;
            dlBtn.textContent = `${done} / ${filecount}`;
          } catch (e) {
            console.warn('Image download failed', item.page, e);
            folder.file(item.name + '.failed.txt', `Failed to download page ${item.page}: ${e}`);
          }
        }
      });
      await Promise.all(workers);

      if (includeMeta && (format === 'cbz' || config.get('includeComicInfo'))) {
        const xml = buildComicInfoXml(meta, title);
        folder.file('ComicInfo.xml', xml);
      }

      dlBtn.textContent = 'Packing…';
      const blob = await zip.generateAsync({ type: 'blob' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${sanitize(title)}.${format === 'cbz' ? 'cbz' : 'zip'}`;
      a.click();
      URL.revokeObjectURL(a.href);

      dlBtn.textContent = 'Done';
      setTimeout(() => { dlBtn.disabled = false; dlBtn.textContent = '⬇ Download'; }, 2000);
    } catch (err) {
      console.error(err);
      alert('Download failed: ' + err.message);
      dlBtn.disabled = false;
      dlBtn.textContent = '⬇ Download';
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
  <Notes>Generated by EH-Congiurator</Notes>
</ComicInfo>`;
  }

  function escapeXml(s) {
    return String(s).replace(/[<>&'"]/g, c => ({ '<': '<', '>': '>', '&': '&', "'": ''', '"': '"' }[c]));
  }

  console.log('[EH-Congiurator] Loaded.');
})();
