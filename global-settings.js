
/**
 * Global Settings Manager for VevahaMatrimony Website
 * Handles language switching and theme management across all pages
 */

class VevahaGlobalSettings {
    constructor() {
        this.currentLanguage = 'en';
        this.currentTheme = 'light';
        this.init();
    }

    init() {
        this.loadSettings();
        this.applySettings();
        this.setupEventListeners();
        this.setupStorageListener();
    }

    loadSettings() {
        // Load saved preferences
        this.currentLanguage = localStorage.getItem('preferred_language') || 'en';
        this.currentTheme = localStorage.getItem('theme_preference') || 'light';
    }

    applySettings() {
        this.applyLanguage(this.currentLanguage);
        this.applyTheme(this.currentTheme);
    }

    applyLanguage(language) {
        this.currentLanguage = language;
        localStorage.setItem('preferred_language', language);
        document.documentElement.setAttribute('data-lang', language);

        // Show/hide language-specific elements
        const englishElements = document.querySelectorAll('.lang-en');
        const tamilElements = document.querySelectorAll('.lang-ta');

        if (language === 'ta') {
            englishElements.forEach(el => {
                el.style.display = 'none';
                el.classList.add('hidden');
            });
            tamilElements.forEach(el => {
                el.style.display = 'block';
                el.classList.remove('hidden');
            });
            document.body.classList.add('lang-tamil');
        } else {
            englishElements.forEach(el => {
                el.style.display = 'block';
                el.classList.remove('hidden');
            });
            tamilElements.forEach(el => {
                el.style.display = 'none';
                el.classList.add('hidden');
            });
            document.body.classList.remove('lang-tamil');
        }

        // Update page title based on language
        this.updatePageTitle(language);

        // Update language buttons if they exist
        this.updateLanguageButtons(language);

        // Update form placeholders and labels
        this.updateFormElements(language);

        // Broadcast change to other tabs
        this.broadcastChange('language', language);
    }

    updatePageTitle(language) {
        const pageTitleMap = {
            'index.html': {
                en: 'vevahamatrimony - Find Your Perfect Life Partner',
                ta: 'வேவாகாமேட்ரிமோனி - உங்கள் சரியான வாழ்க்கை துணையைக் கண்டறியுங்கள்'
            },
            'about.html': {
                en: 'About Us - vevahamatrimony',
                ta: 'எங்களைப் பற்றி - வேவாகாமேட்ரிமோனி'
            },
            'contact.html': {
                en: 'Contact Us - vevahamatrimony',
                ta: 'எங்களைத் தொடர்பு கொள்ளுங்கள் - வேவாகாமேட்ரிமோனி'
            },
            'membership.html': {
                en: 'Membership Plans - vevahamatrimony',
                ta: 'உறுப்பினர் திட்டங்கள் - வேவாகாமேட்ரிமோனி'
            },
            'settings.html': {
                en: 'Your Settings - vevahamatrimony',
                ta: 'உங்கள் அமைப்புகள் - வேவாகாமேட்ரிமோனி'
            },
            'faq.html': {
                en: 'Frequently Asked Questions - vevahamatrimony',
                ta: 'அடிக்கடி கேட்கப்படும் கேள்விகள் - வேவாகாமேட்ரிமோனி'
            },
            'register.html': {
                en: 'Register - vevahamatrimony',
                ta: 'பதிவு செய்யுங்கள் - வேவாகாமேட்ரிமோனி'
            },
            'terms.html': {
                en: 'Terms & Conditions - vevahamatrimony',
                ta: 'விதிமுறைகள் மற்றும் நிபந்தனைகள் - வேவாகாமேட்ரிமோனி'
            },
            'privacy-policy.html': {
                en: 'Privacy Policy - vevahamatrimony',
                ta: 'தனியுரிமைக் கொள்கை - வேவாகாமேட்ரிமோனி'
            },
            'help-center.html': {
                en: 'Help Center - vevahamatrimony',
                ta: 'உதவி மையம் - வேவாகாமேட்ரிமோனி'
            },
            'safety-tips.html': {
                en: 'Safety Tips - vevahamatrimony',
                ta: 'பாதுகாப்பு குறிப்புகள் - வேவாகாமேட்ரிமோனி'
            },
            'active-members.html': {
                en: 'Active Members - vevahamatrimony',
                ta: 'செயலில் உள்ள உறுப்பினர்கள் - வேவாகாமேட்ரிமோனி'
            }
        };

        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        const titleConfig = pageTitleMap[currentPage];
        
        if (titleConfig) {
            document.title = titleConfig[language] || titleConfig.en;
        }
    }

    updateFormElements(language) {
        const placeholders = {
            en: {
                'search': 'Search...',
                'email': 'Enter your email',
                'password': 'Enter your password',
                'name': 'Enter your name',
                'phone': 'Enter your phone number',
                'message': 'Enter your message',
                'subject': 'Enter subject'
            },
            ta: {
                'search': 'தேடுங்கள்...',
                'email': 'உங்கள் மின்னஞ்சலை உள்ளிடவும்',
                'password': 'உங்கள் கடவுச்சொல்லை உள்ளிடவும்',
                'name': 'உங்கள் பெயரை உள்ளிடவும்',
                'phone': 'உங்கள் தொலைபேசி எண்ணை உள்ளிடவும்',
                'message': 'உங்கள் செய்தியை உள்ளிடவும்',
                'subject': 'விषயத்தை உள்ளிடவும்'
            }
        };

        // Update search input placeholders
        const searchInputs = document.querySelectorAll('#searchInput, #mobileSearchInput');
        searchInputs.forEach(input => {
            input.placeholder = placeholders[language].search;
        });

        // Update other form placeholders
        const emailInputs = document.querySelectorAll('input[type="email"]');
        emailInputs.forEach(input => {
            if (input.placeholder && input.placeholder.toLowerCase().includes('email')) {
                input.placeholder = placeholders[language].email;
            }
        });

        const passwordInputs = document.querySelectorAll('input[type="password"]');
        passwordInputs.forEach(input => {
            if (input.placeholder && input.placeholder.toLowerCase().includes('password')) {
                input.placeholder = placeholders[language].password;
            }
        });
    }

    applyTheme(theme) {
        this.currentTheme = theme;
        localStorage.setItem('theme_preference', theme);

        const html = document.documentElement;
        const body = document.body;

        if (theme === 'dark') {
            html.classList.add('dark');
            body.classList.add('dark');
        } else {
            html.classList.remove('dark');
            body.classList.remove('dark');
        }

        // Update theme toggle if it exists
        this.updateThemeToggle(theme);

        // Broadcast change to other tabs
        this.broadcastChange('theme', theme);
    }

    updateLanguageButtons(language) {
        const langEnBtn = document.getElementById('langEnBtn');
        const langTaBtn = document.getElementById('langTaBtn');

        if (langEnBtn && langTaBtn) {
            if (language === 'en') {
                langEnBtn.className = 'px-4 py-2 rounded-lg bg-pink-600 text-white font-medium';
                langTaBtn.className = 'px-4 py-2 rounded-lg bg-gray-200 text-gray-700 font-medium';
            } else {
                langTaBtn.className = 'px-4 py-2 rounded-lg bg-pink-600 text-white font-medium';
                langEnBtn.className = 'px-4 py-2 rounded-lg bg-gray-200 text-gray-700 font-medium';
            }
        }
    }

    updateThemeToggle(theme) {
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.checked = theme === 'dark';
        }
    }

    broadcastChange(type, value) {
        // Use localStorage to communicate between tabs
        const message = {
            type: type,
            value: value,
            timestamp: Date.now()
        };
        localStorage.setItem('settings_broadcast', JSON.stringify(message));
        
        // Clear the broadcast message
        setTimeout(() => {
            localStorage.removeItem('settings_broadcast');
        }, 100);
    }

    setupStorageListener() {
        // Listen for changes from other tabs
        window.addEventListener('storage', (e) => {
            if (e.key === 'settings_broadcast' && e.newValue) {
                try {
                    const message = JSON.parse(e.newValue);
                    if (message.type === 'language') {
                        this.applyLanguage(message.value);
                    } else if (message.type === 'theme') {
                        this.applyTheme(message.value);
                    }
                } catch (error) {
                    console.error('Error parsing settings broadcast:', error);
                }
            }
        });
    }

    setupEventListeners() {
        // Setup global keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + Shift + L for language toggle
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'L') {
                e.preventDefault();
                this.toggleLanguage();
            }
            
            // Ctrl/Cmd + Shift + T for theme toggle
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'T') {
                e.preventDefault();
                this.toggleTheme();
            }
        });
    }

    toggleLanguage() {
        const newLanguage = this.currentLanguage === 'en' ? 'ta' : 'en';
        this.applyLanguage(newLanguage);
        this.showNotification(
            newLanguage === 'en' ? 'Language changed to English' : 'மொழி தமிழுக்கு மாற்றப்பட்டது',
            'success'
        );
    }

    toggleTheme() {
        const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.applyTheme(newTheme);
        this.showNotification(
            newTheme === 'dark' ? 'Dark theme enabled' : 'Light theme enabled',
            'success'
        );
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `fixed p-4 rounded-lg shadow-lg transition-all duration-300 ${
            type === 'success' ? 'bg-green-500 text-white' :
            type === 'error' ? 'bg-red-500 text-white' :
            'bg-blue-500 text-white'
        }`;
        notification.style.top = '80px';
        notification.style.right = '16px';
        notification.style.zIndex = '999999';
        notification.style.transform = 'translateX(120%)';
        notification.textContent = message;

        document.body.appendChild(notification);

        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 10);

        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.transform = 'translateX(120%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    // Public methods for external use
    setLanguage(language) {
        this.applyLanguage(language);
        this.showNotification(
            language === 'en' ? 'Language changed to English' : 'மொழி தமிழுக்கு மாற்றப்பட்டது',
            'success'
        );
    }

    setTheme(theme) {
        this.applyTheme(theme);
        this.showNotification(
            theme === 'dark' ? 'Dark theme enabled' : 'Light theme enabled',
            'success'
        );
    }

    getCurrentLanguage() {
        return this.currentLanguage;
    }

    getCurrentTheme() {
        return this.currentTheme;
    }
}

// Initialize global settings when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    window.vevahaSettings = new VevahaGlobalSettings();
});

// Make functions globally available for onclick handlers
window.showNotification = function(message, type = 'info') {
    if (window.vevahaSettings) {
        window.vevahaSettings.showNotification(message, type);
    } else {
        const notification = document.createElement('div');
        notification.className = `fixed p-4 rounded-lg shadow-lg transition-all duration-300 ${
            type === 'success' ? 'bg-green-500 text-white' :
            type === 'error' ? 'bg-red-500 text-white' :
            'bg-blue-500 text-white'
        }`;
        notification.style.top = '80px';
        notification.style.right = '16px';
        notification.style.zIndex = '999999';
        notification.textContent = message;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 3000);
    }
};

window.changeLanguage = function(lang) {
    if (window.vevahaSettings) {
        window.vevahaSettings.setLanguage(lang);
    }
};

window.toggleTheme = function() {
    if (window.vevahaSettings) {
        window.vevahaSettings.toggleTheme();
    }
};

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VevahaGlobalSettings;
}
