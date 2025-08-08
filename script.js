class UrlShortener {
    constructor() {
        this.storageKey = 'slink_history';
        this.maxHistoryItems = 50;
        
        this.initializeElements();
        this.bindEvents();
        this.loadHistory();
    }

    initializeElements() {
        this.form = document.getElementById('shortenForm');
        this.urlInput = document.getElementById('urlInput');
        this.shortenBtn = document.getElementById('shortenBtn');
        this.btnText = this.shortenBtn.querySelector('.btn-text');
        this.btnSpinner = this.shortenBtn.querySelector('.spinner-border');
        this.btnLoadingText = this.shortenBtn.querySelector('.loading-text');

        this.resultSection = document.getElementById('resultSection');
        this.shortUrlInput = document.getElementById('shortUrl');
        this.copyBtn = document.getElementById('copyBtn');
        this.clickCount = document.getElementById('clickCount');
        this.clickCountValue = document.getElementById('clickCountValue');

        this.urlError = document.getElementById('urlError');
        this.errorAlert = document.getElementById('errorAlert');
        this.errorMessage = document.getElementById('errorMessage');

        this.historyContainer = document.getElementById('historyContainer');
        this.clearHistoryBtn = document.getElementById('clearHistoryBtn');

        this.copyToast = new bootstrap.Toast(document.getElementById('copyToast'));
    }

    bindEvents() {
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        this.copyBtn.addEventListener('click', () => this.copyToClipboard());
        this.clearHistoryBtn.addEventListener('click', () => this.clearHistory());
        this.urlInput.addEventListener('input', () => this.clearErrors());
    }

    async handleSubmit(e) {
        e.preventDefault();
        
        const url = this.urlInput.value.trim();
        
        if (!this.validateUrl(url)) return;

        this.setLoading(true);
        this.clearErrors();
        this.hideResult();

        try {
            const result = await this.shortenUrl(url);
            this.displayResult(result, url);
            this.saveToHistory(result, url);
            this.loadHistory();
        } catch (error) {
            this.showError(error.message || 'Failed to shorten URL. Please try again.');
        } finally {
            this.setLoading(false);
        }
    }

    validateUrl(url) {
        if (!url) {
            this.showUrlError('Please enter a URL');
            return false;
        }
        try {
            const urlObj = new URL(url);
            if (!['http:', 'https:'].includes(urlObj.protocol)) {
                this.showUrlError('URL must start with http:// or https://');
                return false;
            }
            return true;
        } catch {
            this.showUrlError('Please enter a valid URL');
            return false;
        }
    }

    async shortenUrl(url) {
        const shortCode = this.generateShortCode(url);
        const shortUrl = `https://slink.to/${shortCode}`;
        await new Promise(resolve => setTimeout(resolve, 1000));
        return {
            full_short_link: shortUrl,
            code: shortCode,
            total_clicks: Math.floor(Math.random() * 100)
        };
    }

    generateShortCode(url) {
        let hash = 0;
        for (let i = 0; i < url.length; i++) {
            hash = ((hash << 5) - hash) + url.charCodeAt(i);
            hash = hash & hash;
        }
        return Math.abs(hash).toString(36).substring(0, 6) || 'abc123';
    }

    displayResult(result) {
        this.shortUrlInput.value = result.full_short_link;
        this.resultSection.classList.remove('d-none');
        this.clickCountValue.textContent = result.total_clicks;
        this.clickCount.classList.remove('d-none');
        this.resultSection.scrollIntoView({ behavior: 'smooth' });
    }

    async copyToClipboard() {
        try {
            await navigator.clipboard.writeText(this.shortUrlInput.value);
            this.copyToast.show();
        } catch {
            this.shortUrlInput.select();
            document.execCommand('copy');
            this.copyToast.show();
        }
    }

    saveToHistory(result, originalUrl) {
        const history = this.getHistory();
        history.unshift({
            id: Date.now(),
            original: originalUrl,
            short: result.full_short_link,
            code: result.code,
            created: new Date().toISOString(),
            clicks: result.total_clicks || 0
        });
        localStorage.setItem(this.storageKey, JSON.stringify(history.slice(0, this.maxHistoryItems)));
    }

    getHistory() {
        try {
            return JSON.parse(localStorage.getItem(this.storageKey) || '[]');
        } catch {
            return [];
        }
    }

    loadHistory() {
        const history = this.getHistory();
        this.historyContainer.innerHTML = history.length
            ? history.map(entry => this.createHistoryItem(entry)).join('')
            : '<div id="emptyHistory" class="text-center text-muted py-5"><i data-feather="inbox" class="feather-lg mb-3"></i><p>No shortened links yet. Create your first one above!</p></div>';
        feather.replace();
        this.bindHistoryEvents();
    }

    createHistoryItem(entry) {
        const date = new Date(entry.created).toLocaleString();
        return `
            <div class="card mb-3">
                <div class="card-body">
                    <div class="mb-2"><small class="text-muted">${date}</small></div>
                    <div><strong class="text-primary">${entry.short}</strong></div>
                    <div class="text-muted small text-truncate">${entry.original}</div>
                </div>
            </div>
        `;
    }

    bindHistoryEvents() {}
    deleteHistoryItem(id) {
        const updatedHistory = this.getHistory().filter(item => item.id !== id);
        localStorage.setItem(this.storageKey, JSON.stringify(updatedHistory));
        this.loadHistory();
    }

    clearHistory() {
        if (confirm('Clear all history?')) {
            localStorage.removeItem(this.storageKey);
            this.loadHistory();
        }
    }

    setLoading(loading) {
        this.shortenBtn.disabled = loading;
        this.btnText.classList.toggle('d-none', loading);
        this.btnSpinner.classList.toggle('d-none', !loading);
        this.btnLoadingText.classList.toggle('d-none', !loading);
    }

    showUrlError(message) {
        this.urlError.textContent = message;
        this.urlError.classList.remove('d-none');
        this.urlInput.classList.add('is-invalid');
    }

    showError(message) {
        this.errorMessage.textContent = message;
        this.errorAlert.classList.remove('d-none');
    }

    clearErrors() {
        this.urlError.classList.add('d-none');
        this.urlInput.classList.remove('is-invalid');
        this.errorAlert.classList.add('d-none');
    }

    hideResult() {
        this.resultSection.classList.add('d-none');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new UrlShortener();
    feather.replace();
});
