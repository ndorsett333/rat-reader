// Rat Reader - Frontend JavaScript
class RatReader {
    constructor() {
        this.apiUrl = window.location.origin;
        
        // Environment detection for the correct path
        const isProduction = window.location.hostname === 'hellodevrat.com';
        this.basePath = isProduction ? '/ratReader' : '';
        
        this.currentUser = null;
        this.authToken = localStorage.getItem('ratreader_token');
        
        this.init();
    }
    
    async init() {
        this.checkAuth();
        this.setupEventListeners();
        // Sync settings UI (theme toggle) with current body class
        const themeToggle = document.getElementById('settings-dark-toggle');
        if (themeToggle) {
            themeToggle.checked = document.body.classList.contains('darkmode');
        }
        
        if (this.authToken) {
            await this.loadUserFeeds(); // Load feeds first
            this.loadLiveArticles();
        }
    }
    
    setupEventListeners() {
        // Modal controls
        document.getElementById('login-btn').addEventListener('click', () => this.showAuthModal('login'));
        document.getElementById('register-btn').addEventListener('click', () => this.showAuthModal('register'));
        document.querySelector('.close').addEventListener('click', () => this.hideAuthModal());
        document.getElementById('show-register').addEventListener('click', (e) => {
            e.preventDefault();
            this.showAuthModal('register');
        });
        document.getElementById('show-login').addEventListener('click', (e) => {
            e.preventDefault();
            this.showAuthModal('login');
        });
        
        // Form submissions
        document.getElementById('login-form').querySelector('form').addEventListener('submit', (e) => this.handleLogin(e));
        document.getElementById('register-form').querySelector('form').addEventListener('submit', (e) => this.handleRegister(e));
        
        // Logout
        document.getElementById('logout-btn').addEventListener('click', () => this.handleLogout());
        
        // Hamburger menu and sidebar
        document.getElementById('hamburger-menu').addEventListener('click', () => this.toggleSidebar());
        document.getElementById('close-sidebar').addEventListener('click', () => this.closeSidebar());
        document.getElementById('add-feed-btn').addEventListener('click', () => this.showAddFeedModal());
        document.getElementById('close-feed-modal').addEventListener('click', () => this.hideAddFeedModal());
        document.getElementById('cancel-add-feed').addEventListener('click', () => this.hideAddFeedModal());
        document.getElementById('add-feed-form').addEventListener('submit', (e) => this.handleAddFeed(e));
        // Manage Feeds
        const manageBtn = document.getElementById('manage-feeds-btn');
        if (manageBtn) manageBtn.addEventListener('click', () => this.showManageFeedsModal());
        const closeManageModalBtn = document.getElementById('close-manage-feeds-modal');
        if (closeManageModalBtn) closeManageModalBtn.addEventListener('click', () => this.hideManageFeedsModal());
        const closeManageFooterBtn = document.getElementById('close-manage-feeds');
        if (closeManageFooterBtn) closeManageFooterBtn.addEventListener('click', () => this.hideManageFeedsModal());
        const addNewFromManageBtn = document.getElementById('add-new-feed-from-manage');
        if (addNewFromManageBtn) addNewFromManageBtn.addEventListener('click', () => {
            // Close manage modal and open add feed modal
            this.hideManageFeedsModal();
            // Small timeout to ensure DOM updates don't clash
            setTimeout(() => this.showAddFeedModal(), 100);
        });
        // Settings modal handlers
        const settingsBtn = document.getElementById('settings-btn');
        if (settingsBtn) settingsBtn.addEventListener('click', () => this.showSettingsModal());
        const closeSettingsModalBtn = document.getElementById('close-settings-modal');
        if (closeSettingsModalBtn) closeSettingsModalBtn.addEventListener('click', () => this.hideSettingsModal());
        const closeSettingsFooterBtn = document.getElementById('close-settings');
        if (closeSettingsFooterBtn) closeSettingsFooterBtn.addEventListener('click', () => this.hideSettingsModal());
        const themeToggle = document.getElementById('settings-dark-toggle');
        if (themeToggle) themeToggle.addEventListener('change', (e) => {
            if (e.target.checked) {
                document.body.classList.add('darkmode');
                this.showSuccess('Dark mode enabled');
            } else {
                document.body.classList.remove('darkmode');
                this.showSuccess('Light mode enabled');
            }
        });
        
        // Refresh functionality
        document.getElementById('refresh-feeds').addEventListener('click', () => this.loadLiveArticles());
        
        // Feed filter functionality
        document.getElementById('feed-filter').addEventListener('change', (e) => this.handleFeedFilter(e));
        
        // Close modal when clicking outside
        document.getElementById('auth-modal').addEventListener('click', (e) => {
            if (e.target.id === 'auth-modal') {
                this.hideAuthModal();
            }
        });
        
        document.getElementById('add-feed-modal').addEventListener('click', (e) => {
            if (e.target.id === 'add-feed-modal') {
                this.hideAddFeedModal();
            }
        });
    }
    
    showAuthModal(type) {
        const modal = document.getElementById('auth-modal');
        const loginForm = document.getElementById('login-form');
        const registerForm = document.getElementById('register-form');
        
        if (type === 'login') {
            loginForm.classList.remove('hidden');
            registerForm.classList.add('hidden');
        } else {
            loginForm.classList.add('hidden');
            registerForm.classList.remove('hidden');
        }
        
        modal.classList.remove('hidden');
    }
    
    hideAuthModal() {
        document.getElementById('auth-modal').classList.add('hidden');
        // Clear form fields
        document.getElementById('login-form').querySelector('form').reset();
        document.getElementById('register-form').querySelector('form').reset();
    }
    
    async handleRegister(e) {
        e.preventDefault();
        
        const username = document.getElementById('register-username').value;
        const password = document.getElementById('register-password').value;
        const confirmPassword = document.getElementById('register-confirm').value;
        
        // Validate passwords match
        if (password !== confirmPassword) {
            this.showError('Passwords do not match');
            return;
        }
        
        // Validate password length
        if (password.length < 6) {
            this.showError('Password must be at least 6 characters long');
            return;
        }
        
        try {
            this.showLoading(true);
            
            console.log('Making registration request to:', `${this.apiUrl}${this.basePath}/api.php?action=register`);
            console.log('Request data:', { username, password: '***' });
            
            const response = await fetch(`${this.apiUrl}${this.basePath}/api.php?action=register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username: username,
                    password: password
                })
            });
            
            console.log('Response status:', response.status);
            console.log('Response ok:', response.ok);
            
            const data = await response.json();
            console.log('Response data:', data);
            
            if (data.success) {
                this.authToken = data.token;
                this.currentUser = data.user;
                localStorage.setItem('ratreader_token', this.authToken);
                
                this.hideAuthModal();
                this.updateUIForLoggedInUser();
                this.showSuccess(`Welcome, ${data.user.username}! Account created successfully.`);
            } else {
                this.showError(data.error || 'Registration failed');
            }
        } catch (error) {
            console.error('Registration error:', error);
            this.showError('Network error. Please try again.');
        } finally {
            this.showLoading(false);
        }
    }
    
    async handleLogin(e) {
        e.preventDefault();
        
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;
        
        try {
            this.showLoading(true);
            
            const response = await fetch(`${this.apiUrl}${this.basePath}/api.php?action=login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username: username,
                    password: password
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.authToken = data.token;
                this.currentUser = data.user;
                localStorage.setItem('ratreader_token', this.authToken);
                
                this.hideAuthModal();
                this.updateUIForLoggedInUser();
                this.showSuccess(`Welcome back, ${data.user.username}!`);
            } else {
                this.showError(data.error || 'Login failed');
            }
        } catch (error) {
            this.showError('Network error. Please try again.');
        } finally {
            this.showLoading(false);
        }
    }
    
    async handleLogout() {
        try {
            await fetch(`${this.apiUrl}${this.basePath}/api.php?action=logout`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.authToken}`
                }
            });
        } catch (error) {
            console.log('Logout request failed, but proceeding with local logout');
        }
        
        this.authToken = null;
        this.currentUser = null;
        localStorage.removeItem('ratreader_token');
        
        // Close sidebar when logging out
        this.closeSidebar();
        
        this.updateUIForLoggedOutUser();
        this.showSuccess('Logged out successfully');
    }
    
    checkAuth() {
        if (this.authToken) {
            this.updateUIForLoggedInUser();
        } else {
            this.updateUIForLoggedOutUser();
        }
    }
    
    checkAuthStatus() {
        if (this.authToken) {
            // TODO: Validate token with server
            this.updateUIForLoggedInUser();
        } else {
            this.updateUIForLoggedOutUser();
        }
    }
    
    updateUIForLoggedInUser() {
        document.getElementById('welcome-screen').classList.add('hidden');
        document.getElementById('dashboard').classList.remove('hidden');
        document.getElementById('auth-buttons').classList.add('hidden');
        document.getElementById('user-menu').classList.remove('hidden');
        
        if (this.currentUser) {
            document.getElementById('username').textContent = this.currentUser.username;
        }
        
        // Load feeds for the dropdown and then load articles
        this.loadUserFeeds().then(() => {
            this.loadLiveArticles();
        });
    }
    
    updateUIForLoggedOutUser() {
        document.getElementById('welcome-screen').classList.remove('hidden');
        document.getElementById('dashboard').classList.add('hidden');
        document.getElementById('auth-buttons').classList.remove('hidden');
        document.getElementById('user-menu').classList.add('hidden');
    }
    
    async loadLiveArticles() {
        try {
            this.showLoading(true);
            
            // Get selected feed filter
            const feedFilter = document.getElementById('feed-filter');
            const selectedFeedId = feedFilter.value;
            
            // Build URL with filter if selected
            let url = `${this.apiUrl}${this.basePath}/api.php?action=live-articles`;
            if (selectedFeedId && selectedFeedId !== 'all') {
                url += `&feed_id=${selectedFeedId}`;
            }
            
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${this.authToken}`
                }
            });
            
            const data = await response.json();
            
            if (data.articles) {
                this.displayArticles(data.articles);
            } else {
                this.showEmptyArticlesState();
            }
        } catch (error) {
            console.error('Error loading live articles:', error);
            this.showEmptyArticlesState();
        } finally {
            this.showLoading(false);
        }
    }

    async loadUserFeeds() {
        try {
            const response = await fetch(`${this.apiUrl}${this.basePath}/api.php?action=feeds`, {
                headers: {
                    'Authorization': `Bearer ${this.authToken}`
                }
            });
            
            const data = await response.json();
            
            if (data.success && data.feeds) {
                this.populateFeedFilter(data.feeds);
                this.userFeeds = data.feeds; // Store for later use
            } else {
                console.log('No feeds found or error loading feeds');
                this.populateFeedFilter([]);
            }
        } catch (error) {
            console.error('Error loading user feeds:', error);
            this.populateFeedFilter([]);
        }
    }

    populateFeedFilter(feeds) {
        const feedFilter = document.getElementById('feed-filter');
        
        // Clear existing options except "All feeds"
        feedFilter.innerHTML = '<option value="all">All feeds</option>';
        
        // Add each feed as an option
        feeds.forEach(feed => {
            const option = document.createElement('option');
            option.value = feed.id;
            option.textContent = feed.name || feed.url;
            feedFilter.appendChild(option);
        });
        
        // Show or hide the filter based on whether there are feeds
        const filterContainer = feedFilter.parentElement;
        if (feeds.length > 0) {
            filterContainer.style.display = 'block';
        } else {
            filterContainer.style.display = 'none';
        }
    }

    handleFeedFilter(e) {
        // When feed filter changes, reload articles with the new filter
        this.loadLiveArticles();
    }

    displayArticles(articles) {
        const articlesList = document.getElementById('articles-list');
        
        if (!articles || articles.length === 0) {
            this.showEmptyArticlesState();
            return;
        }
        
        articlesList.innerHTML = articles.map((article, index) => {
            const date = new Date(article.pub_date).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            
            // Clean the description for the card display too
            const cleanDescription = this.cleanArticleContent(article.description);
            
            return `
                <article class="article-item" data-index="${index}">
                    <div class="article-meta">
                        <span class="article-source">${this.escapeHtml(article.feed_name || 'Unknown Source')}</span>
                        <span class="article-date">${date}</span>
                    </div>
                    <h3 class="article-title">${this.escapeHtml(article.title)}</h3>
                    ${cleanDescription ? `<p class="article-description">${cleanDescription}</p>` : ''}
                    <div class="article-actions">
                        <button class="btn btn-primary article-read-btn" data-action="read-more" data-index="${index}">Read more</button>
                        <button class="btn btn-secondary article-link-btn" onclick="window.open('${article.link}', '_blank')">Go to article</button>
                    </div>
                </article>
            `;
        }).join('');
        
        // Store articles data for modal access
        this.currentArticles = articles;
        
        // Add event listeners to read more buttons
        document.querySelectorAll('[data-action="read-more"]').forEach(button => {
            button.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                const article = this.currentArticles[index];
                this.showArticleModal(article);
            });
        });
    }
    
    showEmptyArticlesState() {
        const articlesList = document.getElementById('articles-list');
        articlesList.innerHTML = `
            <div class="empty-state">
                <h3>No articles yet</h3>
                <p>Add some RSS feeds to start reading articles!</p>
                <button class="btn btn-primary" onclick="document.getElementById('hamburger-menu').click()">Add Your First Feed</button>
            </div>
        `;
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showLoading(show) {
        const loading = document.getElementById('loading');
        if (show) {
            loading.classList.remove('hidden');
        } else {
            loading.classList.add('hidden');
        }
    }
    
    showError(message) {
        this.showNotification(message, 'error');
    }
    
    showSuccess(message) {
        this.showNotification(message, 'success');
    }
    
    showNotification(message, type) {
        // Remove existing notifications
        const existingNotifications = document.querySelectorAll('.notification');
        existingNotifications.forEach(n => n.remove());
        
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        // Style the notification
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 5px;
            color: white;
            font-weight: bold;
            z-index: 9999;
            max-width: 300px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            background-color: ${type === 'error' ? '#f44336' : '#4caf50'};
        `;
        
        document.body.appendChild(notification);
        
        // Remove notification after 5 seconds
        setTimeout(() => {
            notification.remove();
        }, 5000);
    }

    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        const hamburger = document.getElementById('hamburger-menu');
        const overlay = this.getOrCreateSidebarOverlay();
        
        if (sidebar.classList.contains('open')) {
            this.closeSidebar();
        } else {
            sidebar.classList.add('open');
            hamburger.classList.add('active');
            overlay.classList.add('active');
            
            // Close sidebar when clicking overlay
            overlay.onclick = () => this.closeSidebar();
        }
    }
    
    closeSidebar() {
        const sidebar = document.getElementById('sidebar');
        const hamburger = document.getElementById('hamburger-menu');
        const overlay = document.querySelector('.sidebar-overlay');
        
        sidebar.classList.remove('open');
        hamburger.classList.remove('active');
        if (overlay) overlay.classList.remove('active');
    }
    
    getOrCreateSidebarOverlay() {
        let overlay = document.querySelector('.sidebar-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'sidebar-overlay';
            document.body.appendChild(overlay);
        }
        return overlay;
    }
    
    showAddFeedModal() {
        this.closeSidebar();
        document.getElementById('add-feed-modal').classList.remove('hidden');
    }
    
    hideAddFeedModal() {
        document.getElementById('add-feed-modal').classList.add('hidden');
        document.getElementById('add-feed-form').reset();
    }

    showManageFeedsModal() {
        this.closeSidebar();
        this.loadManageFeeds();
        const modal = document.getElementById('manage-feeds-modal');
        if (modal) {
            modal.classList.remove('hidden');
            modal.style.display = 'flex';
        }
    }

    hideManageFeedsModal() {
        const modal = document.getElementById('manage-feeds-modal');
        if (modal) {
            modal.classList.add('hidden');
            modal.style.display = '';
        }
    }

    showSettingsModal() {
        this.closeSidebar();
        const modal = document.getElementById('settings-modal');
        // Ensure toggle matches current mode
        const themeToggle = document.getElementById('settings-dark-toggle');
        if (themeToggle) themeToggle.checked = document.body.classList.contains('darkmode');
        if (modal) {
            modal.classList.remove('hidden');
            modal.style.display = 'flex';
        }
    }

    hideSettingsModal() {
        const modal = document.getElementById('settings-modal');
        if (modal) {
            modal.classList.add('hidden');
            modal.style.display = '';
        }
    }

    loadManageFeeds() {
        const list = document.getElementById('manage-feeds-list');

        if (!list) return;

        const feeds = this.userFeeds || [];

        if (feeds.length === 0) {
            list.innerHTML = `<div class="empty-state"><p>No feeds added yet. Add your first RSS feed!</p></div>`;
            return;
        }

        list.innerHTML = '';
        feeds.forEach(feed => {
            const item = document.createElement('div');
            item.className = 'feed-item';
            item.innerHTML = `
                <div class="feed-icon">
                    <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'%3E%3Cpath d='M4 11a9 9 0 0 1 9 9'/%3E%3Cpath d='M4 4a16 16 0 0 1 16 16'/%3E%3Ccircle cx='5' cy='19' r='1'/%3E%3C/svg%3E" alt="RSS Icon">
                </div>
                <div class="feed-info">
                    <h4 class="feed-title">${this.escapeHtml(feed.name || feed.url)}</h4>
                    <p class="feed-url">${this.escapeHtml(feed.url)}</p>
                    <div class="feed-meta">
                        <span class="feed-status ${feed.is_active ? 'active' : 'inactive'}">${feed.is_active ? 'Active' : 'Disabled'}</span>
                        <span class="feed-articles">— articles</span>
                        <span class="feed-updated">${feed.last_fetched ? 'Updated ' + feed.last_fetched : 'Never fetched'}</span>
                    </div>
                </div>
                <div class="feed-actions">
                    <button class="btn btn-secondary btn-small remove-feed-btn" data-feed-id="${feed.id}">Remove</button>
                </div>
            `;

            // Attach non-functional remove handler (for now)
            item.querySelectorAll('.remove-feed-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    console.log('Remove feed clicked for id:', btn.dataset.feedId);
                    this.showNotification('Remove not implemented yet', 'error');
                });
            });

            list.appendChild(item);
        });
    }
    
    async handleAddFeed(e) {
        e.preventDefault();
        
        const url = document.getElementById('feed-url').value;
        const name = document.getElementById('feed-name').value;
        
        try {
            this.showLoading(true);
            
            const response = await fetch(`${this.apiUrl}${this.basePath}/api.php?action=feeds`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.authToken}`
                },
                body: JSON.stringify({
                    url: url,
                    name: name || null
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.hideAddFeedModal();
                this.showSuccess('RSS feed added successfully!');
                this.loadLiveArticles(); // Refresh to show new feed articles
            } else {
                this.showError(data.error || 'Failed to add feed');
            }
        } catch (error) {
            this.showError('Network error. Please try again.');
        } finally {
            this.showLoading(false);
        }
    }

    showArticleModal(article) {
        const { title, description, link, feed_name: feedName, pub_date: pubDate } = article;
        const date = new Date(pubDate).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        // For the modal, show the full content without cleaning/truncating
        const fullDescription = description || 'No description available.';

        // Create modal if it doesn't exist
        let modal = document.getElementById('article-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'article-modal';
            modal.className = 'modal hidden';
            modal.innerHTML = `
                <div class="modal-content article-modal-content">
                    <span class="close" id="close-article-modal">&times;</span>
                    <div class="article-modal-header">
                        <div class="article-modal-meta">
                            <span class="article-modal-source"></span>
                            <span class="article-modal-date"></span>
                        </div>
                        <h2 class="article-modal-title"></h2>
                    </div>
                    <div class="article-modal-body">
                        <div class="article-modal-description"></div>
                        <div class="article-modal-actions">
                            <button class="btn btn-primary" id="article-modal-link">Go to full article</button>
                            <button class="btn btn-secondary" id="article-modal-close">Close</button>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            
            // Add event listeners that don't depend on the article link
            modal.querySelector('#close-article-modal').addEventListener('click', () => this.hideArticleModal());
            modal.querySelector('#article-modal-close').addEventListener('click', () => this.hideArticleModal());
            modal.addEventListener('click', (e) => {
                if (e.target.id === 'article-modal') {
                    this.hideArticleModal();
                }
            });
        }
        
        // Populate modal content
        modal.querySelector('.article-modal-source').textContent = feedName;
        modal.querySelector('.article-modal-date').textContent = date;
        modal.querySelector('.article-modal-title').textContent = title;
        modal.querySelector('.article-modal-description').innerHTML = fullDescription;
        
        // Update the link button with the correct article link each time
        const linkButton = modal.querySelector('#article-modal-link');
        linkButton.onclick = () => window.open(link, '_blank');
        
        // Show modal
        modal.classList.remove('hidden');
    }
    
    cleanArticleContent(content) {
        if (!content) return 'No description available.';
        
        // Create a temporary div to parse HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = content;
        
        // Remove unwanted elements (like the footer attribution)
        const unwantedSelectors = ['hr', 'small', '.wp-element-caption'];
        unwantedSelectors.forEach(selector => {
            const elements = tempDiv.querySelectorAll(selector);
            elements.forEach(el => el.remove());
        });
        
        // Get clean text content
        let cleanText = tempDiv.textContent || tempDiv.innerText || '';
        
        // Remove extra whitespace and line breaks
        cleanText = cleanText
            .replace(/\s+/g, ' ')  // Replace multiple spaces with single space
            .replace(/\n+/g, ' ')   // Replace line breaks with spaces
            .trim();
        
        // Remove common RSS footer text patterns
        cleanText = cleanText
            .replace(/originally published on.*?family\./gi, '')
            .replace(/You should get the newsletter\./gi, '')
            .replace(/\s+/g, ' ')
            .trim();
        
        // If the cleaned text is too short, return a fallback
        if (cleanText.length < 50) {
            return 'Click "Go to full article" to read the complete content.';
        }
        
        // Limit length and add ellipsis if needed
        if (cleanText.length > 500) {
            cleanText = cleanText.substring(0, 500).trim() + '...';
        }
        
        return cleanText;
    }

    hideArticleModal() {
        const modal = document.getElementById('article-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }

    // Back to top functionality
    initBackToTop() {
        const backToTopButton = document.getElementById('back-to-top');
        
        // Show/hide button based on scroll position
        const handleScroll = () => {
            if (window.scrollY > 300) {
                backToTopButton.classList.remove('hidden');
            } else {
                backToTopButton.classList.add('hidden');
            }
        };
        
        // Scroll to top when button is clicked
        const scrollToTop = () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        };
        
        // Add event listeners
        window.addEventListener('scroll', handleScroll);
        backToTopButton.addEventListener('click', scrollToTop);
        
        // Throttle scroll events for better performance
        let ticking = false;
        const throttledScroll = () => {
            if (!ticking) {
                requestAnimationFrame(() => {
                    handleScroll();
                    ticking = false;
                });
                ticking = true;
            }
        };
        
        window.removeEventListener('scroll', handleScroll);
        window.addEventListener('scroll', throttledScroll);
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.ratReader = new RatReader();
    // Initialize back to top button
    window.ratReader.initBackToTop();
});

// Global function for the welcome button
function showAuthModal(type) {
    window.ratReader.showAuthModal(type);
}