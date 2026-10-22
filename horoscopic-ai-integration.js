
// VEVAHA HOROSCOPIC AI Integration
// Handles client-side horoscopic AI functionality

class HoroscopicAIIntegration {
    constructor() {
        this.initialized = false;
        this.apiEndpoint = this.detectAPIEndpoint();
        this.currentLanguage = 'en';
        this.init();
    }

    detectAPIEndpoint() {
        const hostname = window.location.hostname;
        const protocol = window.location.protocol;

        console.log(`🔮 Detecting Horoscopic API endpoint - Hostname: ${hostname}`);

        // Production domain (Hostinger)
        if (hostname === 'vevahamatrimony.com' ||
            hostname === 'www.vevahamatrimony.com' ||
            hostname.includes('vevahamatrimony.com')) {
            return `${protocol}//${hostname}`;
        }

        // Replit environment
        if (hostname.includes('replit.app') ||
            hostname.includes('repl.co') ||
            hostname.includes('replit.dev')) {
            return `${protocol}//${hostname}:3000`;
        }

        // Default to current origin
        return `${protocol}//${hostname}`;
    }

    async init() {
        try {
            console.log('🔮 Initializing VEVAHA HOROSCOPIC AI Integration...');
            console.log('📡 API Endpoint:', this.apiEndpoint);

            // Test connectivity
            const isConnected = await this.testConnection();
            if (isConnected) {
                this.initialized = true;
                console.log('✅ VEVAHA HOROSCOPIC AI Integration initialized successfully');
            } else {
                console.warn('⚠️ Horoscopic AI connection test failed, but continuing...');
                this.initialized = true; // Allow to continue with fallback
            }
        } catch (error) {
            console.error('❌ Failed to initialize Horoscopic AI Integration:', error);
            this.initialized = false;
        }
    }

    async testConnection() {
        try {
            const response = await fetch(`${this.apiEndpoint}/horoscopic-ai/health`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                console.log('✅ Horoscopic AI health check passed:', data);
                return true;
            } else {
                console.warn('⚠️ Horoscopic AI health check failed:', response.status);
                return false;
            }
        } catch (error) {
            console.warn('⚠️ Horoscopic AI health check error:', error.message);
            return false;
        }
    }

    validateMatrimonyId(matrimonyId) {
        if (!matrimonyId || typeof matrimonyId !== 'string') {
            return false;
        }
        
        // VM followed by 8-12 digits
        const pattern = /^VM\d{8,12}$/i;
        return pattern.test(matrimonyId.trim());
    }

    async findBestMatch(matrimonyId) {
        if (!this.validateMatrimonyId(matrimonyId)) {
            return "🔮 Vanakkam! Please provide a valid Matrimony ID format (e.g., VM1234567890).";
        }

        try {
            console.log('🔮 Finding best match for:', matrimonyId);
            
            const response = await fetch(`${this.apiEndpoint}/horoscopic-ai/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    message: `Find matches for ${matrimonyId}`,
                    language: this.currentLanguage,
                    source: 'findBestMatch'
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            
            if (data.success && data.reply) {
                return data.reply;
            } else {
                console.warn('Horoscopic AI response missing reply field:', data);
                return "🔮 Vanakkam! Sorry, I couldn't find matching profiles at this time. Please contact our astrology team for personalized assistance.";
            }

        } catch (error) {
            console.error('Error finding best match:', error);
            return "🔮 Technical difficulty in accessing horoscopic database. Please try again or contact support.";
        }
    }

    async sendMessage(message, email = null, language = 'en') {
        if (!this.initialized) {
            return {
                success: false,
                reply: "🔮 Horoscopic AI system is still initializing. Please wait a moment."
            };
        }

        try {
            const response = await fetch(`${this.apiEndpoint}/horoscopic-ai/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    message: message,
                    email: email,
                    language: language,
                    source: 'integration'
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            
            // Validate response has required fields
            if (!data.reply) {
                console.warn('Horoscopic AI response missing reply field:', data);
                data.reply = "🔮 Vanakkam! I'm experiencing technical difficulties. Please try again.";
            }
            
            return data;

        } catch (error) {
            console.error('Error sending message to Horoscopic AI:', error);
            return {
                success: false,
                reply: "🔮 Technical difficulty. Please try again or contact support."
            };
        }
    }
}

// Make globally available
if (typeof window !== 'undefined') {
    window.HoroscopicAIIntegration = HoroscopicAIIntegration;
    window.horoscopicAI = new HoroscopicAIIntegration();
}

// Export for Node.js if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = HoroscopicAIIntegration;
}
