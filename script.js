class UrlShortener {
    constructor() {
        this.storageKey = 'slink_history';
        this.maxHistoryItems = 50;
        
        this.initializeElements();
        this.bindEvents();
        this.loadHistory();
    }

    initializeElements() {
        // Form elements
        this.form = document.getElementById('shortenForm');
        this.urlInput = document.getElementById('urlInput');
        this.shortenBtn = document.getElementById('shortenBtn');
        this.btnText = this.shortenBtn.querySelector('.btn-text');
        this.btnSpinner = this.shortenBtn.querySelector('.spinner-border');
        this.btnLoadingText = this.shortenBtn.querySelector('.loading-text');

        // Result elements
        this.resultSection = document.getElementById('resultSection');
        this.shortUrlInput = document.getElementById('shortUrl');
        this.copyBtn = document.getElementById('copyBtn');
        this.clickCount = document.getElementById('clickCount');
        this.clickCountValue = document.getElementById('clickCountValue');

        // Error elements
        this.urlError = document.getElementById('urlError');
        this.errorAlert = document.getElementById('errorAlert');
        this.errorMessage = document.getElementById('errorMessage');

        // History elements
        this.historyContainer = document.getElementById('historyContainer');
        this.emptyHistory = document.getElementById('emptyHistory');
        this.clearHistoryBtn = document.getElementById('clearHistoryBtn');

        // Toast elements
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
        
        if (!this.validateUrl(url)) {
            return;
        }

        this.setLoading(true);
        this.clearErrors();
        this.hideResult();

        try {
            const result = await this.shortenUrl(url);
            this.displayResult(result, url);
            this.saveToHistory(result, url);
            this.loadHistory(); // Refresh history display
        } catch (error) {
            console.error('URL shortening error:', error);
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
        // Generate a simple hash-based short code for demonstration
        const shortCode = this.generateShortCode(url);
        const shortUrl = `https://slink.to/${shortCode}`;
        
        // Simulate API delay for better UX
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        return {
            full_short_link: shortUrl,
            short_link: shortUrl,
            code: shortCode,
            total_clicks: Math.floor(Math.random() * 100) // Random click count for demo
        };
    }

    generateShortCode(url) {
        // Simple hash function for demonstration
        let hash = 0;
        for (let i = 0; i < url.length; i++) {
            const char = url.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        
        // Convert to base 36 and take first 6 characters
        const shortCode = Math.abs(hash).toString(36).substring(0, 6);
        return shortCode || 'abc123'; // Fallback
    }

    displayResult(result, originalUrl) {
        this.shortUrlInput.value = result.full_short_link;
        this.resultSection.classList.remove('d-none');

        // Show click count if available
        if (result.total_clicks !== undefined) {
            this.clickCountValue.textContent = result.total_clicks;
            this.clickCount.classList.remove('d-none');
        } else {
            this.clickCount.classList.add('d-none');
        }

        // Scroll to result
        this.resultSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    async copyToClipboard() {
        try {
            await navigator.clipboard.writeText(this.shortUrlInput.value);
            this.copyToast.show();
            
            // Update button feedback
            const originalIcon = this.copyBtn.innerHTML;
            this.copyBtn.innerHTML = '<i data-feather="check" class="feather-sm me-1"></i>Copied!';
            feather.replace();
            
            setTimeout(() => {
                this.copyBtn.innerHTML = originalIcon;
                feather.replace();
            }, 2000);
        } catch (error) {
            // Fallback for browsers that don't support clipboard API
            this.shortUrlInput.select();
            document.execCommand('copy');
            this.copyToast.show();
        }
    }

    saveToHistory(result, originalUrl) {
        const history = this.getHistory();
        const newEntry = {
            id: Date.now(),
            original: originalUrl,
            short: result.full_short_link,
            code: result.code,
            created: new Date().toISOString(),
            clicks: result.total_clicks || 0
        };

        // Add to beginning and limit history size
        history.unshift(newEntry);
        const limitedHistory = history.slice(0, this.maxHistoryItems);
        
        localStorage.setItem(this.storageKey, JSON.stringify(limitedHistory));
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
        
        if (history.length === 0) {
            this.historyContainer.innerHTML = '<div id="emptyHistory" class="text-center text-muted py-5"><i data-feather="inbox" class="feather-lg mb-3"></i><p>No shortened links yet. Create your first one above!</p></div>';
        } else {
            this.historyContainer.innerHTML = history.map(entry => this.createHistoryItem(entry)).join('');
        }
        
        feather.replace();
        this.bindHistoryEvents();
    }

    createHistoryItem(entry) {
        const date = new Date(entry.created).toLocaleDateString();
        const time = new Date(entry.created).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        return `
            <div class="card mb-3">
                <div class="card-body">
                    <div class="row align-items-center">
                        <div class="col-md-8">
                            <div class="mb-2">
                                <small class="text-muted">${date} at ${time}</small>
                            </div>
                            <div class="mb-2">
                                <strong class="text-primary">${entry.short}</strong>
                            </div>
                            <div class="text-muted small text-truncate" title="${entry.original}">
                                <i data-feather="arrow-up-right" class="feather-sm me-1"></i>
                                ${entry.original}
                            </div>
                        </div>
                        <div class="col-md-4 text-md-end">
                            <div class="d-flex flex-column flex-md-row gap-2 justify-content-md-end">
                                <button class="btn btn-outline-secondary btn-sm copy-history-btn" data-url="${entry.short}">
                                    <i data-feather="copy" class="feather-sm"></i>
                                </button>
                                <button class="btn btn-outline-danger btn-sm delete-history-btn" data-id="${entry.id}">
                                    <i data-feather="trash-2" class="feather-sm"></i>
                                </button>
                            </div>
                            ${entry.clicks > 0 ? `<small class="text-muted mt-2 d-block"><i data-feather="bar-chart-2" class="feather-sm me-1"></i>${entry.clicks} clicks</small>` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    bindHistoryEvents() {
        // Copy buttons
        document.querySelectorAll('.copy-history-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const url = e.currentTarget.dataset.url;
                try {
                    await navigator.clipboard.writeText(url);
                    this.copyToast.show();
                    
                    const originalIcon = e.currentTarget.innerHTML;
                    e.currentTarget.innerHTML = '<i data-feather="check" class="feather-sm"></i>';
                    feather.replace();
                    
                    setTimeout(() => {
                        e.currentTarget.innerHTML = originalIcon;
                        feather.replace();
                    }, 2000);
                } catch (error) {
                    console.error('Copy failed:', error);
                }
            });
        });

        // Delete buttons
        document.querySelectorAll('.delete-history-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.currentTarget.dataset.id);
                this.deleteHistoryItem(id);
            });
        });
    }

    deleteHistoryItem(id) {
        const history = this.getHistory();
        const updatedHistory = history.filter(item => item.id !== id);
        localStorage.setItem(this.storageKey, JSON.stringify(updatedHistory));
        this.loadHistory();
    }

    clearHistory() {
        if (confirm('Are you sure you want to clear all history? This action cannot be undone.')) {
            localStorage.removeItem(this.storageKey);
            this.loadHistory();
        }
    }

    setLoading(loading) {
        if (loading) {
            this.shortenBtn.disabled = true;
            this.btnText.classList.add('d-none');
            this.btnSpinner.classList.remove('d-none');
            this.btnLoadingText.classList.remove('d-none');
        } else {
            this.shortenBtn.disabled = false;
            this.btnText.classList.remove('d-none');
            this.btnSpinner.classList.add('d-none');
            this.btnLoadingText.classList.add('d-none');
        }
    }

    showUrlError(message) {
        this.urlError.textContent = message;
        this.urlError.classList.remove('d-none');
        this.urlInput.classList.add('is-invalid');
    }

    showError(message) {
        this.errorMessage.textContent = message;
        this.errorAlert.classList.remove('d-none');
        
        // Scroll to error
        this.errorAlert.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new UrlShortener();
});        this.copyBtn.addEventListener('click', () => this.copyToClipboard());
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
