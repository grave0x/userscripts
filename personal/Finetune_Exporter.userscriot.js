// ==UserScript==
// @name         Finetune Exporter - Exporter Universel (LHS Modified v5)
// @namespace    http://tampermonkey.net/
// @version      5.0.0-LHS
// @license      CC BY-NC-SA 4.0
// @description  Export conversations from ChatGPT, Gemini, DeepSeek, Grok, Claude, Copilot, Cohere, Mistral, Kimi, DeepInfra, DeepAI, Meta AI, Qwen, Perplexity, LinkedIn. Formats: JSON, JSONL, ShareGPT, Alpaca, Markdown, TXT, CSV, HTML. Added submenu for formats.
// @author       Thibaut LOMBARD (@lombardweb) + grave0x (@grave0x)
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
// @grant        GM_download
// @downloadURL https://github.com/grave0x/userscripts/raw/refs/heads/main/personal/Finetune_Exporter.userscriot.js
// @updateURL https://github.com/grave0x/userscripts/raw/refs/heads/main/personal/Finetune_Exporter.userscriot.js
// ==/UserScript==

(function() {
    'use strict';

    // ==================== 1. TRADUCTIONS ====================
    const LANGUAGE_LIST = ['en', 'fr', 'es', 'de', 'zh', 'ja', 'ko', 'pt', 'ru', 'it', 'nl', 'pl', 'tr', 'ar', 'hi', 'th', 'vi', 'id', 'sv', 'da', 'fi', 'no'];

    const translations = {
        en: {
            export: 'Export',
            quickMD: 'Quick MD',
            exportSuccess: 'Export successful',
            exportFailed: 'Export failed',
            markdown: 'Markdown',
            json: 'JSON',
            jsonl: 'JSONL',
            sharegpt: 'ShareGPT',
            alpaca: 'Alpaca',
            txt: 'TXT',
            csv: 'CSV',
            html: 'HTML',
            copy: 'Copy to Clipboard',
            history: 'Export History',
            settings: 'Settings',
            language: 'Language',
            close: 'Close',
            noConversation: 'No conversation found on this page',
            filename: 'Filename',
            format: 'Format',
            source: 'Source',
            date: 'Date',
            clearHistory: 'Clear History',
            exportAs: 'Export as'
        },
        fr: {
            export: 'Exporter',
            quickMD: 'MD Rapide',
            exportSuccess: 'Export réussi',
            exportFailed: 'Échec de l\'export',
            markdown: 'Markdown',
            json: 'JSON',
            jsonl: 'JSONL',
            sharegpt: 'ShareGPT',
            alpaca: 'Alpaca',
            txt: 'TXT',
            csv: 'CSV',
            html: 'HTML',
            copy: 'Copier dans le presse-papiers',
            history: 'Historique des exports',
            settings: 'Paramètres',
            language: 'Langue',
            close: 'Fermer',
            noConversation: 'Aucune conversation trouvée sur cette page',
            filename: 'Nom du fichier',
            format: 'Format',
            source: 'Source',
            date: 'Date',
            clearHistory: 'Effacer l\'historique',
            exportAs: 'Exporter en'
        }
    };

    const getStoredLanguage = () => {
        try {
            return GM_getValue('ai_export_lang', 'en');
        } catch (e) {
            return 'en';
        }
    };

    let currentLang = getStoredLanguage();

    const t = (key) => {
        return translations[currentLang]?.[key] || translations['en'][key] || key;
    };

    const setLanguage = (langCode) => {
        if (LANGUAGE_LIST.includes(langCode)) {
            currentLang = langCode;
            try { GM_setValue('ai_export_lang', langCode); } catch(e){}
            if (window.__floatingButton) {
                window.__floatingButton.recreateMenu();
                window.__floatingButton.labelEl.textContent = t('export');
            }
        }
    };

    

    // ==================== 2. UTILITAIRES DOM ====================
    const dom = {
        createElement: (tag, props = {}) => {
            const el = document.createElement(tag);
            if (props.className) el.className = props.className;
            if (props.id) el.id = props.id;
            if (props.innerHTML) el.innerHTML = props.innerHTML;
            if (props.textContent) el.textContent = props.textContent;
            if (props.style) Object.assign(el.style, props.style);
            if (props.title) el.title = props.title;
            if (props.type) el.type = props.type;

            Object.keys(props).forEach(key => {
                if (!['className', 'id', 'innerHTML', 'textContent', 'style', 'title', 'type'].includes(key)) {
                    el.setAttribute(key, props[key]);
                }
            });
            return el;
        },

        qs: (selector, parent = document) => parent.querySelector(selector),
        qsa: (selector, parent = document) => Array.from(parent.querySelectorAll(selector)),

        getCleanText: (el) => {
            if (!el) return '';
            return el.innerText || el.textContent || '';
        }
    };

    // ==================== 3. HTML -> MARKDOWN ====================
    const markdown = {
        escape: (text) => text.replace(/\\/g, '\\\\').replace(/\*/g, '\\*').replace(/_/g, '\\_').replace(/`/g, '\\`').replace(/#/g, '\\#').replace(/\|/g, '\\|'),

        convertMessage: (role, content) => {
            const roleLabel = role === 'user' ? '**User:**' : '**Assistant:**';
            let md = `${roleLabel}\n\n`;
            let processed = content
                .replace(/<code[^>]*>(.*?)<\/code>/gs, '`$1`')
                .replace(/<pre[^>]*>(.*?)<\/pre>/gs, '```\n$1\n```')
                .replace(/<strong[^>]*>(.*?)<\/strong>/gs, '**$1**')
                .replace(/<em[^>]*>(.*?)<\/em>/gs, '*$1*')
                .replace(/<br\s*\/?>/gi, '\n')
                .replace(/<p[^>]*>(.*?)<\/p>/gs, '$1\n\n')
                .replace(/<li[^>]*>(.*?)<\/li>/gs, '- $1\n')
                .replace(/<ul[^>]*>(.*?)<\/ul>/gs, '$1\n')
                .replace(/<ol[^>]*>(.*?)<\/ol>/gs, '$1\n')
                .replace(/<[^>]+>/g, '');
            md += processed.trim() + '\n\n---\n\n';
            return md;
        },

        generate: (conversation, meta) => {
            let md = `# ${meta.titre || 'Conversation'}\n\n**Source:** ${meta.source}\n**Exported:** ${meta.exportedAt}\n\n---\n\n`;
            conversation.forEach(msg => {
                md += markdown.convertMessage(msg.role, msg.content);
            });
            return md;
        }
    };

    // ==================== 4. DÉTECTION PLATEFORME & SIDEBAR ====================
    function detectPlatform() {
        const host = location.hostname;
        if (host.includes('chatgpt.com')) return 'chatgpt';
        if (host.includes('gemini.google.com')) return 'gemini';
        if (host.includes('claude.ai')) return 'claude';
        if (host.includes('grok.com') || host.includes('x.com')) return 'grok';
        if (host.includes('perplexity.ai')) return 'perplexity';
        if (host.includes('kimi')) return 'kimi';
        if (host.includes('mistral.ai')) return 'mistral';
        if (host.includes('meta.ai')) return 'meta';
        if (host.includes('qwen.ai')) return 'qwen';
        if (host.includes('deepseek.com')) return 'deepseek';
        if (host.includes('copilot.microsoft.com')) return 'copilot';
        if (host.includes('linkedin.com')) return 'linkedin';
        if (host.includes('cohere.com')) return 'cohere';
        if (host.includes('deepinfra.com')) return 'deepinfra';
        if (host.includes('deepai.org')) return 'deepai';
        return 'generic';
    }

    const sidebarSelectors = {
        chatgpt: '[data-testid="sidebar"], nav, .flex-1 .flex-col .flex-1 .overflow-y-auto:first-child',
        gemini: '[data-testid="sidebar"], .sidebar, [role="navigation"]',
        claude: '[data-testid="sidebar"], .sidebar, [role="navigation"]',
        grok: '[data-testid="sidebar"], .sidebar, [role="navigation"]',
        perplexity: '[data-testid="sidebar"], .sidebar, [role="navigation"]',
        kimi: '.sidebar, .navigation, [class*="sidebar"]',
        mistral: '[data-testid="sidebar"], .sidebar, [role="navigation"]',
        meta: '[data-testid="sidebar"], .sidebar, [role="navigation"]',
        qwen: '.sidebar, .navigation, [class*="sidebar"]',
        deepseek: '.sidebar, .navigation, [class*="sidebar"]',
        copilot: '[data-testid="sidebar"], .sidebar, [role="navigation"]',
        linkedin: '.scaffold-layout__list, .left-rail, .profile-rail',
        cohere: '[data-testid="sidebar"], .sidebar, [role="navigation"]',
        deepinfra: '[data-testid="sidebar"], .sidebar, [role="navigation"]',
        deepai: '[data-testid="sidebar"], .sidebar, [role="navigation"]',
        generic: 'aside, .sidebar, [role="navigation"]'
    };

    function getSidebarWidth(platform) {
        const selector = sidebarSelectors[platform] || sidebarSelectors.generic;
        const selectors = selector.split(',').map(s => s.trim());
        for (let sel of selectors) {
            const el = dom.qs(sel);
            if (el && el.getBoundingClientRect().width > 0) {
                return el.getBoundingClientRect().width;
            }
        }
        return 0;
    }

    // ==================== SIDEBAR-AWARE POSITIONING (NEW) ====================
    function getSidebarOffset() {
        const root = document.documentElement;
        const sidebar = document.querySelector('[data-variant="sidebar"]') || 
                        document.querySelector('.group.peer[data-side="left"]');
        
        if (!sidebar) return '16px';
        
        const state = sidebar.getAttribute('data-state');
        const isExpanded = state === 'expanded' || state === '';
        
        let width = getComputedStyle(root).getPropertyValue('--sidebar-width').trim();
        if (!width || width === '0px') {
            width = isExpanded ? '16rem' : '3.5rem';
        }
        
        return `calc(${width} + 16px)`;
    }
    
    function positionExportUI() {
        const container = document.querySelector('.ai-export-container');
        if (!container) return;
        
        container.style.position = 'fixed';
        container.style.left = getSidebarOffset();
        container.style.bottom = '24px';
        container.style.zIndex = '99999';
    }
    
    function initSidebarAwarePositioning() {
        positionExportUI();
        
        const sidebar = document.querySelector('[data-variant="sidebar"]');
        if (sidebar) {
            const observer = new MutationObserver(() => positionExportUI());
            observer.observe(sidebar, { attributes: true, attributeFilter: ['data-state', 'class'] });
        }
        
        const root = document.documentElement;
        const varObserver = new MutationObserver(() => positionExportUI());
        varObserver.observe(root, { attributes: true, attributeFilter: ['style'] });
        
        window.addEventListener('resize', () => positionExportUI(), { passive: true });
    }

    function getContentArea(platform) {
        const selectors = {
            grok: '#grok-content-area, [data-testid*="conversation"], [data-testid="chat-messages"], .chat-history, main[role="main"], .overflow-y-auto[role="main"], main',
            chatgpt: 'main[role="main"], [role="main"] .flex-1.overflow-y-auto, #__next main',
            gemini: 'main[role="main"], .chat-history, [data-testid="chat-history"]',
            claude: 'main[role="main"], .chat-history, [data-testid="chat-history"]',
            generic: 'main[role="main"], [role="main"], .chat-container, .messages-container, body'
        };
        const sel = selectors[platform] || selectors.generic;
            for (let s of sel.split(',').map(x => x.trim())) {
                const el = dom.qs(s);
                if (el && el.getBoundingClientRect().height > 100) return el;
            }
        return document.body;
    }

    // ==================== 5. GESTIONNAIRES DE PLATEFORMES (Extracteurs) ====================
    const platformHandlers = {
        chatgpt: {
            async getConversation() {
                const messages = [];
                const nodes = dom.qsa('[data-message-author-role]');
                if (nodes.length === 0) {
                    const fallback = dom.qsa('.group\\/conversation-turn, [class*="message"]');
                    fallback.forEach(el => {
                        const role = el.getAttribute('data-message-author-role') || (el.innerText.toLowerCase().includes('you') ? 'user' : 'assistant');
                        const contentEl = el.querySelector('.markdown, [class*="message-content"]') || el;
                        messages.push({ role, content: dom.getCleanText(contentEl) });
                    });
                } else {
                    nodes.forEach(node => {
                        const role = node.getAttribute('data-message-author-role');
                        const contentEl = node.querySelector('.markdown') || node;
                        messages.push({ role, content: dom.getCleanText(contentEl) });
                    });
                }
                const titleEl = dom.qs('title') || dom.qs('h1');
                const titre = titleEl ? titleEl.textContent.replace(' | ChatGPT', '').trim() : 'ChatGPT Conversation';
                return { nomSite: 'ChatGPT', titre, titreBrut: titre, conversation: messages };
            }
        },
        grok: {
            async getConversation() {
                const messages = [];
                let nodes = dom.qsa('[data-testid*="message"], .message, [class*="Message"], [class*="chat-message"]');
                if (nodes.length === 0) nodes = dom.qsa('div[role="article"], .prose, [class*="prose"]');
                nodes.forEach((node, index) => {
                    let role = index % 2 === 0 ? 'user' : 'assistant';
                    if (node.getAttribute('data-user') || node.className.includes('user')) role = 'user';
                    if (node.getAttribute('data-assistant') || node.className.includes('assistant')) role = 'assistant';
                    const content = dom.getCleanText(node);
                    if (content.length > 5) messages.push({ role, content });
                });
                const titleEl = dom.qs('title') || dom.qs('h1') || dom.qs('[class*="title"]');
                const titre = titleEl ? titleEl.textContent.replace('Grok', '').trim() : 'Grok Conversation';
                return { nomSite: 'Grok', titre, titreBrut: titre, conversation: messages.length ? messages : [{ role: 'assistant', content: 'No messages extracted.' }] };
            }
        },
        claude: {
            async getConversation() {
                const messages = [];
                const nodes = dom.qsa('[data-is-streaming], .HumanMessage, .AssistantMessage, [class*="message"]');
                nodes.forEach(node => {
                    const isHuman = node.className.includes('Human') || node.getAttribute('data-is-streaming') === 'false';
                    const role = isHuman ? 'user' : 'assistant';
                    messages.push({ role, content: dom.getCleanText(node) });
                });
                const titre = (dom.qs('title') || {}).textContent || 'Claude Conversation';
                return { nomSite: 'Claude', titre, titreBrut: titre, conversation: messages };
            }
        },
        gemini: {
            async getConversation() {
                const messages = [];
                const nodes = dom.qsa('.user-query, .model-response, [class*="query"], [class*="response"]');
                nodes.forEach((node, i) => {
                    const role = node.className.includes('user') || i % 2 === 0 ? 'user' : 'assistant';
                    messages.push({ role, content: dom.getCleanText(node) });
                });
                const titre = (dom.qs('title') || {}).textContent || 'Gemini Conversation';
                return { nomSite: 'Gemini', titre, titreBrut: titre, conversation: messages };
            }
        },
        generic: {
            async getConversation() {
                const allText = document.body.innerText;
                const lines = allText.split('\n').filter(l => l.trim().length > 20);
                const messages = lines.slice(0, 30).map((line, i) => ({ role: i % 2 === 0 ? 'user' : 'assistant', content: line.trim() }));
                return { nomSite: location.hostname, titre: document.title, titreBrut: document.title, conversation: messages };
            }
        }
    };

    // ==================== 6. EXPORTEUR ====================
    const exporter = {
        async getConversation() {
            const platform = detectPlatform();
            const handler = platformHandlers[platform] || platformHandlers.generic;
            const data = await handler.getConversation();
            if (!data.conversation || data.conversation.length === 0) throw new Error(t('noConversation'));
            return data;
        },
        generateId() { return Date.now().toString(36) + Math.random().toString(36).substr(2, 5); },
        nowISO() { return new Date().toISOString(); },
        formatFilename(site, format, title, id) {
            const safeTitle = (title || 'conversation').replace(/[^a-z0-9]/gi, '_').toLowerCase().slice(0, 40);
            const date = new Date().toISOString().slice(0, 10);
            return `${site.toLowerCase()}_${safeTitle}_${date}_${id}.${format.toLowerCase()}`;
        },
        async exportMarkdown(conversation, meta, filename) {
            const content = markdown.generate(conversation, meta);
            this.downloadFile(content, filename, 'text/markdown');
        },
        async exportJSON(conversation, meta, filename) {
            this.downloadFile(JSON.stringify({ meta, conversation }, null, 2), filename, 'application/json');
        },
        async exportJSONL(conversation, meta, filename) {
            let content = '';
            conversation.forEach(msg => {
                content += JSON.stringify({ ...meta, role: msg.role, content: msg.content }) + '\n';
            });
            this.downloadFile(content, filename, 'application/jsonl');
        },
        async exportShareGPT(conversation, meta, filename) {
            const sharegpt = {
                id: meta.id,
                title: meta.titre,
                create_time: meta.exportedAt,
                modify_time: meta.exportedAt,
                conversation: conversation.map(m => ({ role: m.role === 'user' ? 'human' : 'gpt', value: m.content }))
            };
            this.downloadFile(JSON.stringify(sharegpt, null, 2), filename, 'application/json');
        },
        async exportAlpaca(conversation, meta, filename) {
            const alpacaData = [];
            for (let i = 0; i < conversation.length; i += 2) {
                const userMsg = conversation[i];
                const assistantMsg = conversation[i + 1] || { content: '' };
                if (userMsg && userMsg.role === 'user') {
                    alpacaData.push({ instruction: userMsg.content, input: '', output: assistantMsg.content });
                }
            }
            this.downloadFile(JSON.stringify(alpacaData, null, 2), filename, 'application/json');
        },
        async exportTXT(conversation, meta, filename) {
            let content = `${meta.titre}\nSource: ${meta.source}\nExported: ${meta.exportedAt}\n\n`;
            conversation.forEach(msg => {
                content += `${msg.role.toUpperCase()}:\n${msg.content}\n\n`;
            });
            this.downloadFile(content, filename, 'text/plain');
        },
        async exportCSV(conversation, meta, filename) {
            let csv = 'role,content\n';
            conversation.forEach(msg => {
                const clean = msg.content.replace(/"/g, '""').replace(/\n/g, ' ');
                csv += `"${msg.role}","${clean}"\n`;
            });
            this.downloadFile(csv, filename, 'text/csv');
        },
        async exportHTML(conversation, meta, filename) {
            let html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${meta.titre}</title>
                <style>body{font-family:system-ui;max-width:800px;margin:40px auto;padding:20px;line-height:1.6}
                .msg{margin-bottom:30px} .role{font-weight:bold;color:#555} .content{white-space:pre-wrap}</style></head><body>`;
            html += `<h1>${meta.titre}</h1><p><strong>Source:</strong> ${meta.source} | <strong>Date:</strong> ${meta.exportedAt}</p><hr>`;
            conversation.forEach(msg => {
                html += `<div class="msg"><div class="role">${msg.role}</div><div class="content">${msg.content.replace(/</g,'<')}</div></div>`;
            });
            html += '</body></html>';
            this.downloadFile(html, filename, 'text/html');
        },
        downloadFile(content, filename, mime) {
            const blob = new Blob([content], { type: mime });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        },
        getHistory() {
            try { return JSON.parse(GM_getValue('ai_export_history', '[]')); } catch (e) { return []; }
        },
        addHistoryItem(item) {
            const history = this.getHistory();
            history.unshift(item);
            if (history.length > 50) history.pop();
            try { GM_setValue('ai_export_history', JSON.stringify(history)); } catch(e){}
        },
        clearHistory() {
            try { GM_setValue('ai_export_history', '[]'); } catch(e){}
        }
    };

    // ==================== 7. SVG BOUTON ====================
    const createExportSVGElement = () => {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', '18');
        svg.setAttribute('height', '18');
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('fill', 'none');
        svg.setAttribute('stroke', 'currentColor');
        svg.setAttribute('stroke-width', '2.25');
        svg.setAttribute('stroke-linecap', 'round');
        svg.setAttribute('stroke-linejoin', 'round');
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3');
        svg.appendChild(path);
        return svg;
    };

    // ==================== 8. TOAST ====================
    function showToast(message, isError = false) {
        const toast = dom.createElement('div', {
            className: 'ai-export-toast',
            textContent: message
        });
        Object.assign(toast.style, {
            position: 'fixed',
            bottom: '80px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: isError ? '#ef4444' : '#22c55e',
            color: 'white',
            padding: '12px 24px',
            borderRadius: '9999px',
            fontSize: '14px',
            fontWeight: '500',
            boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
            zIndex: '2147483647',
            opacity: '0',
            transition: 'all 0.2s ease'
        });
        document.body.appendChild(toast);
        requestAnimationFrame(() => {
            toast.style.opacity = '1';
            toast.style.bottom = '90px';
        });
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 200);
        }, 2800);
    }

    // ==================== 9. CSS ====================
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
            border-radius: 9999px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 14px;
            font-weight: 600;
            padding: 10px 20px;
            cursor: pointer;
            user-select: none;
            border: none;
            box-shadow: 0 4px 15px rgba(0,0,0,0.25);
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            white-space: nowrap;
            display: flex;
            align-items: center;
            gap: 8px;
            touch-action: none;
            letter-spacing: -.2px;
            line-height: 1.2;
        }

        .ai-export-drag-box:hover, .ai-export-md-btn:hover {
            transform: translateY(-3px) scale(1.02);
            box-shadow: 0 10px 25px rgba(102, 126, 234, 0.4);
        }

        .ai-export-md-btn {
            background: linear-gradient(135deg, #4ade80 0%, #16a34a 100%);
            font-size: 13.5px;
            padding: 10px 16px;
            font-weight: 700;
        }
        .ai-export-md-btn:hover {
            box-shadow: 0 10px 25px rgba(74, 222, 128, 0.4);
        }

        .ai-export-spinner {
            margin-left: 6px;
            font-size: 13px;
            animation: ai-spin 1s linear infinite;
        }
        @keyframes ai-spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }

        .ai-export-menu-panel {
            position: absolute;
            bottom: calc(100% + 12px);
            left: 0;
            min-width: 260px;
            background: rgba(255,255,255,0.95);
            backdrop-filter: blur(20px);
            border-radius: 16px;
            box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
            border: 1px solid rgba(0,0,0,0.08);
            padding: 8px;
            display: none;
            z-index: 2147483647;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        .ai-export-menu-panel.dark {
            background: rgba(30, 30, 35, 0.95);
            color: #eee;
            border-color: rgba(255,255,255,0.1);
        }

        .ai-export-menu-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
            padding: 10px 14px;
            border-radius: 10px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            color: #333;
            transition: background 0.1s ease;
            position: relative;
        }
        .ai-export-menu-item:hover {
            background: rgba(102, 126, 234, 0.1);
        }
        .ai-export-menu-item.dark:hover {
            background: rgba(255,255,255,0.08);
        }

        .ai-export-menu-section {
            padding: 6px 8px 4px;
            font-size: 11px;
            font-weight: 700;
            color: #888;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        /* Submenu */
        .ai-export-submenu {
            display: none;
            position: absolute;
            left: 100%;
            top: 0;
            min-width: 180px;
            background: rgba(255,255,255,0.95);
            backdrop-filter: blur(20px);
            border-radius: 12px;
            box-shadow: 0 12px 20px -8px rgba(0,0,0,0.15);
            border: 1px solid rgba(0,0,0,0.08);
            padding: 6px 0;
            z-index: 2147483647;
        }
        .ai-export-submenu.dark {
            background: rgba(30, 30, 35, 0.95);
            color: #eee;
            border-color: rgba(255,255,255,0.1);
        }
        .ai-export-menu-item:hover > .ai-export-submenu {
            display: block;
        }
        .ai-export-submenu .ai-export-menu-item {
            padding: 8px 16px;
            white-space: nowrap;
            justify-content: flex-start;
        }
    `);

    // ==================== 10. CLASSE FLOATINGBUTTON ====================
    class FloatingButton {
        constructor() {
            this.isExporting = false;
            this.menuOpen = false;

            this.container = dom.createElement('div', { className: 'ai-export-container' });
            
            const target = getContentArea(detectPlatform());
            if (target !== document.body) {
                target.style.position = target.style.position || 'relative';
            }
            target.appendChild(this.container);
            
            this.container.style.position = 'absolute';
            this.container.style.bottom = '24px';
            this.container.style.right = '24px';
            this.container.style.zIndex = '9999';

            // Quick MD Button
            this.mdBtn = dom.createElement('button', { 
                className: 'ai-export-md-btn',
                title: t('quickMD') + ' - Export current conversation as Markdown instantly'
            });
            this.mdBtn.innerHTML = `📝 <span style="font-weight:700">MD</span>`;
            this.mdBtn.addEventListener('click', async (e) => {
                e.stopImmediatePropagation();
                await this.quickMDExport();
            });
            this.container.appendChild(this.mdBtn);

            // Main Export Button
            this.box = dom.createElement('div', { className: 'ai-export-drag-box' });
            this.iconEl = createExportSVGElement();
            this.labelEl = document.createElement('span');
            this.labelEl.textContent = t('export');
            this.labelEl.style.fontWeight = '600';
            this.spinnerEl = document.createElement('span');
            this.spinnerEl.className = 'ai-export-spinner';
            this.spinnerEl.style.display = 'none';
            this.spinnerEl.innerHTML = '⟳';
            this.box.appendChild(this.iconEl);
            this.box.appendChild(this.labelEl);
            this.box.appendChild(this.spinnerEl);

            // Menu
            this.menu = dom.createElement('div', { className: 'ai-export-menu-panel' });
            this.createMenu();
            this.box.appendChild(this.menu);
            this.container.appendChild(this.box);

            this.updatePosition();
            window.addEventListener('resize', () => this.updatePosition());
            if (window.MutationObserver) {
                const observer = new MutationObserver(() => this.updatePosition());
                observer.observe(document.body, { attributes: true, childList: true, subtree: true, attributeFilter: ['class', 'style'] });
                this.observer = observer;
            }

            this.setupEvents();

            if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                this.menu.classList.add('dark');
            }

            window.__floatingButton = this;

            // NEW: Initialize sidebar-aware positioning
            initSidebarAwarePositioning();
        }

        updatePosition() {
            const platform = detectPlatform();
            const sidebarWidth = getSidebarWidth(platform);
            this.container.style.left = (sidebarWidth + 16) + 'px';
        }

        async quickMDExport() {
            if (this.isExporting) return;
            this.setExporting(true, this.mdBtn);
            try {
                const data = await exporter.getConversation();
                const exportId = exporter.generateId();
                const exportedAt = exporter.nowISO();
                const meta = { id: exportId, titre: data.titreBrut || data.titre || 'Untitled', source: data.nomSite, exportedAt };
                const filename = exporter.formatFilename(data.nomSite, 'md', data.titre, exportId);
                await exporter.exportMarkdown(data.conversation, meta, filename);
                exporter.addHistoryItem({ id: exportId, titre: meta.titre, source: meta.source, exportedAt, format: 'Markdown', filename });
                showToast(`✓ ${t('exportSuccess')} (Markdown)`);
            } catch (err) {
                showToast(`✗ ${t('exportFailed')}: ${err.message}`, true);
                console.error('[Finetune Exporter] quickMDExport error:', err);
            } finally {
                this.setExporting(false, this.mdBtn);
            }
        }

        setExporting(isExporting, targetBtn = this.box) {
            this.isExporting = isExporting;
            const spinner = targetBtn === this.mdBtn ? null : this.spinnerEl;
            if (spinner) spinner.style.display = isExporting ? 'inline' : 'none';
            if (targetBtn) {
                targetBtn.style.opacity = isExporting ? '0.7' : '1';
                targetBtn.style.pointerEvents = isExporting ? 'none' : 'auto';
            }
        }

        recreateMenu() {
            if (this.menu) {
                this.menu.innerHTML = '';
                this.createMenu();
            }
        }

        createMenu() {
            const menu = this.menu;
            menu.innerHTML = '';

            const parentItem = dom.createElement('div', { className: 'ai-export-menu-item' });
            parentItem.innerHTML = `<span>📤 ${t('exportAs')}</span><span style="font-size:12px;color:#888;">▶</span>`;

            const submenu = dom.createElement('div', { className: 'ai-export-submenu' });
            if (this.menu.classList.contains('dark')) submenu.classList.add('dark');

            const formats = [
                { key: 'markdown', label: t('markdown'), icon: '📝', fn: 'exportMarkdown' },
                { key: 'json', label: t('json'), icon: '📦', fn: 'exportJSON' },
                { key: 'jsonl', label: t('jsonl'), icon: '📋', fn: 'exportJSONL' },
                { key: 'sharegpt', label: t('sharegpt'), icon: '🔄', fn: 'exportShareGPT' },
                { key: 'alpaca', label: t('alpaca'), icon: '🦙', fn: 'exportAlpaca' },
                { key: 'txt', label: t('txt'), icon: '📄', fn: 'exportTXT' },
                { key: 'csv', label: t('csv'), icon: '📊', fn: 'exportCSV' },
                { key: 'html', label: t('html'), icon: '🌐', fn: 'exportHTML' }
            ];

            formats.forEach(fmt => {
                const item = dom.createElement('div', { className: 'ai-export-menu-item' });
                item.innerHTML = `${fmt.icon} ${fmt.label}`;
                item.addEventListener('click', async (e) => {
                    e.stopImmediatePropagation();
                    menu.style.display = 'none';
                    this.menuOpen = false;
                    if (this.isExporting) return;
                    this.setExporting(true);
                    try {
                        const data = await exporter.getConversation();
                        const exportId = exporter.generateId();
                        const exportedAt = exporter.nowISO();
                        const meta = { id: exportId, titre: data.titreBrut || 'Untitled Conversation', source: data.nomSite, exportedAt };
                        const filename = exporter.formatFilename(data.nomSite, fmt.key === 'markdown' ? 'md' : fmt.key, data.titre, exportId);
                        await exporter[fmt.fn](data.conversation, meta, filename);
                        exporter.addHistoryItem({ id: exportId, titre: meta.titre, source: meta.source, exportedAt, format: fmt.label, filename });
                        showToast(`✓ ${t('exportSuccess')} (${fmt.label})`);
                    } catch (err) {
                        showToast(`✗ ${t('exportFailed')}: ${err.message}`, true);
                        console.error(err);
                    } finally {
                        this.setExporting(false);
                    }
                });
                submenu.appendChild(item);
            });

            parentItem.appendChild(submenu);
            menu.appendChild(parentItem);

            const divider = dom.createElement('div', { style: { height: '1px', background: 'rgba(0,0,0,0.1)', margin: '8px 0' } });
            menu.appendChild(divider);

            const histHeader = dom.createElement('div', { className: 'ai-export-menu-section', textContent: t('history') });
            menu.appendChild(histHeader);

            const historyBtn = dom.createElement('div', { className: 'ai-export-menu-item' });
            historyBtn.innerHTML = `🕒 <span>${t('history')}</span>`;
            historyBtn.addEventListener('click', () => {
                menu.style.display = 'none';
                this.showHistoryModal();
            });
            menu.appendChild(historyBtn);

            const langItem = dom.createElement('div', { className: 'ai-export-menu-item' });
            langItem.innerHTML = `🌍 <span>${t('language')}</span>`;
            langItem.addEventListener('click', () => {
                const newLang = currentLang === 'en' ? 'fr' : 'en';
                setLanguage(newLang);
                showToast(`Language: ${newLang.toUpperCase()}`);
                menu.style.display = 'none';
            });
            menu.appendChild(langItem);

            const clearBtn = dom.createElement('div', { className: 'ai-export-menu-item', style: { color: '#ef4444', fontSize: '13px' } });
            clearBtn.innerHTML = `🗑️ <span>${t('clearHistory')}</span>`;
            clearBtn.addEventListener('click', () => {
                if (confirm('Clear all export history?')) {
                    exporter.clearHistory();
                    showToast('History cleared');
                }
                menu.style.display = 'none';
            });
            menu.appendChild(clearBtn);
        }

        showHistoryModal() {
            const history = exporter.getHistory();
            const modal = dom.createElement('div', {
                style: {
                    position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
                    background: 'rgba(0,0,0,0.6)', zIndex: '2147483647', display: 'flex',
                    alignItems: 'center', justifyContent: 'center'
                }
            });

            const content = dom.createElement('div', {
                style: {
                    background: 'white', borderRadius: '16px', width: 'min(620px, 92vw)',
                    maxHeight: '80vh', overflow: 'auto', padding: '24px', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.25)'
                }
            });

            content.innerHTML = `
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
                    <h2 style="margin:0;font-size:20px;font-weight:700">📜 ${t('history')}</h2>
                    <button id="close-hist" style="background:none;border:none;font-size:22px;cursor:pointer;color:#666">&times;</button>
                </div>
            `;

            if (history.length === 0) {
                content.innerHTML += `<p style="color:#666;text-align:center;padding:40px 0">No exports yet. Use the buttons to export conversations.</p>`;
            } else {
                const list = dom.createElement('div');
                history.forEach(item => {
                    const row = dom.createElement('div', {
                        style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #eee' }
                    });
                    row.innerHTML = `
                        <div>
                            <div style="font-weight:600">${item.titre}</div>
                            <div style="font-size:12px;color:#666">${item.source} • ${new Date(item.exportedAt).toLocaleString()} • ${item.format}</div>
                        </div>
                        <div style="display:flex;gap:6px">
                            <button class="hist-dl" data-file="${item.filename}" style="padding:4px 10px;border-radius:6px;border:1px solid #ddd;background:white;cursor:pointer;font-size:12px">Download</button>
                        </div>
                    `;
                    list.appendChild(row);
                });
                content.appendChild(list);
            }

            modal.appendChild(content);
            document.body.appendChild(modal);

            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.remove();
            });
            content.querySelector('#close-hist').addEventListener('click', () => modal.remove());

            content.querySelectorAll('.hist-dl').forEach(btn => {
                btn.addEventListener('click', () => {
                    showToast('Re-downloading original file... (feature stores metadata only)');
                    modal.remove();
                });
            });
        }

        setupEvents() {
            const toggleMenu = (e) => {
                if (e.target.closest('.ai-export-menu-panel')) return;
                this.menuOpen = !this.menuOpen;
                this.menu.style.display = this.menuOpen ? 'block' : 'none';
            };
            this.box.addEventListener('click', toggleMenu);

            document.addEventListener('click', (e) => {
                if (!this.container.contains(e.target)) {
                    this.menu.style.display = 'none';
                    this.menuOpen = false;
                }
            });

            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && this.menuOpen) {
                    this.menu.style.display = 'none';
                    this.menuOpen = false;
                }
            });
        }
    }

    // ==================== 11. INITIALISATION ====================
    function initialize() {
        if (window.__aiExportInitialized) return;
        window.__aiExportInitialized = true;

        setTimeout(() => {
            new FloatingButton();
            console.log('%c[Finetune Exporter] v5 (with submenu + sidebar sync) initialized on ' + detectPlatform(), 'color:#667eea');
        }, 800);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
})();
