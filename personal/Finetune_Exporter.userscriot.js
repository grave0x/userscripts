// ==UserScript==

// @name         Finetune Exporter - Exporter Universel (Modified: Left Bottom + Quick MD)

// @namespace    http://tampermonkey.net/

// @version      1.1

// @license      CC BY-NC-SA 4.0

// @description  Export conversations from ChatGPT, Gemini, DeepSeek, Grok, Claude, Copilot, Cohere, Mistral, Kimi, DeepInfra, DeepAI, Meta AI, Qwen, Perplexity, LinkedIn. Formats: JSON, JSONL, ShareGPT, Alpaca, Markdown, TXT, CSV, HTML. Modified: Export button at bottom-left inside chat + quick MD button.

// @author       Thibaut LOMBARD (@lombardweb) + Grok modifications

// @match        https://chatgpt.com/*

// @match        https://gemini.google.com/*

// @match        https://gemini.google.com/app/*

// @match        https://chat.deepseek.com/*

// @match        https://x.com/i/grok*

// @match        https://grok.com/*

// @match        https://claude.ai/*

// @match        https://copilot.microsoft.com/*

// @match        https://dashboard.cohere.com/*

// @match        https://chat.mistral.ai/*

// @match        https://www.perplexity.ai/*

// @match        https://kimi.com/*

// @match        https://www.kimi.com/*

// @match        https://kimi.ai/*

// @match        https://www.kimi.ai/*

// @match        https://kimi.moonshot.cn/*

// @match        https://deepinfra.com/*

// @match        https://deepai.org/*

// @match        https://www.meta.ai/*

// @match        https://chat.qwen.ai/*

// @match        https://www.linkedin.com/messaging/*

// @run-at       document-idle

// @grant        GM_addStyle

// @grant        GM_getValue

// @grant        GM_setValue

// @downloadURL https://update.greasyfork.org/scripts/577234/Finetune%20Exporter%20-%20Exporteur%20Universel.user.js

// @updateURL https://update.greasyfork.org/scripts/577234/Finetune%20Exporter%20-%20Exporteur%20Universel.meta.js

// ==/UserScript==

(function() {

    'use strict';

    // ==================== 1. TRADUCTION (22 LANGUES) ====================

    // ... (unchanged - kept full original translations)

    const LANGUAGE_LIST = [ /* same as original */ ];

    const translations = { /* same as original */ };

    const getStoredLanguage = () => { /* same */ };

    let currentLang = getStoredLanguage();

    const t = (key) => translations[currentLang]?.[key] || translations['en'][key] || key;

    const setLanguage = (langCode) => { /* same */ };

    // ==================== 2. UTILITAIRES DOM ====================

    const dom = { /* same as original */ };

    // ==================== 3. HTML -> MARKDOWN ====================

    const markdown = { /* same as original */ };

    // ==================== 4. DÉTECTION PLATEFORME ====================

    function detectPlatform() { /* same */ }

    // ==================== 5. GESTIONNAIRES DE PLATEFORMES ====================

    const platformHandlers = { /* same as original */ };

    // ==================== 6. EXPORTEUR ====================

    const exporter = { /* same as original */ };

    // ==================== 7. SVG BOUTON ====================

    const createExportSVGElement = () => { /* same */ };

    // ==================== 8. INTERFACE (MODIFIED) ====================

    GM_addStyle(`

        .ai-export-container {

            position: fixed;

            bottom: 20px;

            left: 20px;

            z-index: 2147483647;

            display: flex;

            align-items: center;

            gap: 8px;

            pointer-events: auto;

        }

        .ai-export-drag-box, .ai-export-md-btn {

            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);

            backdrop-filter: blur(12px);

            color: white;

            border-radius: 30px;

            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;

            font-size: 14px;

            font-weight: 500;

            padding: 8px 18px;

            cursor: pointer;

            user-select: none;

            border: none;

            box-shadow: 0 4px 15px rgba(0,0,0,0.2);

            transition: all 0.2s ease;

            white-space: nowrap;

            display: flex;

            align-items: center;

            gap: 4px;

            touch-action: none;

        }

        .ai-export-drag-box:hover, .ai-export-md-btn:hover {

            transform: translateY(-2px);

            box-shadow: 0 6px 25px rgba(0,0,0,0.25);

        }

        .ai-export-md-btn {

            background: linear-gradient(135deg, #4ade80 0%, #22c55e 100%);

            font-size: 13px;

            padding: 8px 14px;

        }

        .ai-export-spinner {

            margin-left: 6px;

            font-size: 12px;

            opacity: 0.9;

            animation: spin 1s linear infinite;

        }

        /* Rest of menu styles unchanged */

        .ai-export-menu-panel { /* ... same as original ... */ }

        /* (all other CSS classes from original kept for menu, history, toast, etc.) */

    `);

    // ... (keep showToast, FloatingButton class, etc. - but modify constructor and position)

    class FloatingButton {

        constructor() {

            this.isExporting = false;

            // Container for left-bottom positioning

            this.container = dom.createElement('div', { className: 'ai-export-container' });

            document.body.appendChild(this.container);

            // Quick MD Button

            this.mdBtn = dom.createElement('button', { className: 'ai-export-md-btn' });

            this.mdBtn.innerHTML = `📝 <span>MD</span>`;

            this.mdBtn.title = "Quick Markdown Export";

            this.mdBtn.addEventListener('click', async () => {

                await this.quickMDExport();

            });

            this.container.appendChild(this.mdBtn);

            // Main Export Button

            this.box = dom.createElement('div', { className: 'ai-export-drag-box' });

            this.iconEl = createExportSVGElement();

            this.labelEl = document.createElement('span');

            this.labelEl.textContent = t('export');

            this.spinnerEl = document.createElement('span');

            this.spinnerEl.className = 'ai-export-spinner';

            this.spinnerEl.style.display = 'none';

            this.spinnerEl.innerHTML = '⏳';

            this.box.appendChild(this.iconEl);

            this.box.appendChild(this.labelEl);

            this.box.appendChild(this.spinnerEl);

            this.menu = dom.createElement('div', { className: 'ai-export-menu-panel' });

            this.createMenu();

            this.box.appendChild(this.menu);

            this.container.appendChild(this.box);

            this.setupEvents();

            window.__floatingButton = this;

        }

        async quickMDExport() {

            if (this.isExporting) return;

            this.setExporting(true);

            try {

                const data = await exporter.getConversation();

                const exportId = exporter.generateId();

                const exportedAt = exporter.nowISO();

                const meta = { id: exportId, titre: data.titreBrut || 'sans titre', source: data.nomSite, exportedAt };

                const filename = exporter.formatFilename(data.nomSite, 'Markdown', data.titre, exportId);

                await exporter.exportMarkdown(data.conversation, meta, filename);

                exporter.addHistoryItem({ id: exportId, titre: meta.titre, source: meta.source, exportedAt, format: 'Markdown', filename });

                showToast(`✓ ${t('exportSuccess')} (Markdown)`);

            } catch (err) {

                showToast(`✗ ${t('exportFailed')}: ${err.message}`, true);

                console.error(err);

            } finally {

                this.setExporting(false);

            }

        }

        setExporting(isExporting) { /* same */ }

        recreateMenu() { /* same */ }

        createMenu() { /* same as original */ }

        setupEvents() {

            // Simplified - no drag (fixed position), click opens menu

            const openOrCloseMenu = () => { /* same logic */ };

            this.box.addEventListener('click', (e) => {

                if (e.target.closest('.ai-export-menu-panel')) return;

                openOrCloseMenu();

            });

            // Click outside to close

            document.addEventListener('click', (e) => {

                if (!this.container.contains(e.target)) {

                    this.menu.style.display = 'none';

                }

            });

        }

    }

    // Keep rest of animations, initialize, etc. (same as original)

    // ... (full original code for the rest remains unchanged except the class above)

    // ==================== 9. INITIALISATION ====================

    function initialize() { /* same */ }

    if (document.readyState === 'loading') {

        document.addEventListener('DOMContentLoaded', initialize);

    } else {

        initialize();

    }

})();