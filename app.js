// Rat Reader - Frontend JavaScript
class RatReader {
    constructor() {
        this.apiUrl = window.location.origin;
        this.currentUser = null;
        this.authToken = localStorage.getItem('ratreader_token');
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.checkAuthStatus();
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
        
        // Close modal when clicking outside
        document.getElementById('auth-modal').addEventListener('click', (e) => {
            if (e.target.id === 'auth-modal') {
                this.hideAuthModal();
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
            
            console.log('Making registration request to:', `${this.apiUrl}/api.php/register`);
            console.log('Request data:', { username, password: '***' });
            
            const response = await fetch(`${this.apiUrl}/api.php/register`, {
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
            
            const response = await fetch(`${this.apiUrl}/api.php/login`, {
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
            await fetch(`${this.apiUrl}/api.php/logout`, {
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
        
        this.updateUIForLoggedOutUser();
        this.showSuccess('Logged out successfully');
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
    }
    
    updateUIForLoggedOutUser() {
        document.getElementById('welcome-screen').classList.remove('hidden');
        document.getElementById('dashboard').classList.add('hidden');
        document.getElementById('auth-buttons').classList.remove('hidden');
        document.getElementById('user-menu').classList.add('hidden');
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
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.ratReader = new RatReader();
});

// Global function for the welcome button
function showAuthModal(type) {
    window.ratReader.showAuthModal(type);
}