// VevahaAI Production Configuration
// This file ensures consistent AI behavior across Replit and live website (vevahamatrimony.com)

console.log('🤖 VevahaAI Configuration Loading...');

// Enhanced domain detection for AI services
const VEVAHA_AI_CONFIG = {
    // Detect environment and configure accordingly
    getEnvironment() {
        const hostname = window.location.hostname;

        if (hostname === 'vevahamatrimony.com' || hostname === 'www.vevahamatrimony.com') {
            return 'production';
        } else if (hostname.includes('replit')) {
            return 'replit';
        } else {
            return 'development';
        }
    },

    // Get API base URL for current environment
    getAPIBaseURL() {
        const hostname = window.location.hostname;
        const protocol = window.location.protocol;

        console.log('🔍 VevahaAI Config - Detecting domain:', hostname);

        // Production custom domain - use relative paths
        if (hostname === 'vevahamatrimony.com' || hostname === 'www.vevahamatrimony.com') {
            console.log('✅ Production domain verified - using relative paths');
            return '';
        }
        // Replit or other environments - use relative paths
        else {
            console.log('🔧 Development environment - using relative paths');
            return '';
        }
    },

    // AI endpoints configuration
    endpoints: {
        chat: '/ai/chat',
        horoscopicChat: '/horoscopic-ai/chat',
        health: '/ai/health',
        starters: '/ai/conversation-starters',
        clear: '/ai/clear-session'
    },

    // Enhanced request method with domain awareness
    async makeRequest(endpoint, data = {}) {
        const baseURL = this.getAPIBaseURL();
        const url = `${baseURL}${endpoint}`;
        const environment = this.getEnvironment();

        console.log(`🤖 VevahaAI Request (${environment}): ${url}`);

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Cache-Control': 'no-cache',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                credentials: 'include',
                mode: 'cors',
                body: JSON.stringify({
                    ...data,
                    environment: environment,
                    domain: hostname,
                    timestamp: new Date().toISOString()
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            console.log(`✅ VevahaAI Response (${environment}): Success`);

            return result;

        } catch (error) {
            console.error(`❌ VevahaAI Error (${environment}):`, error);

            // Fallback response for better UX
            return {
                success: false,
                reply: `I apologize, but I'm experiencing technical difficulties. Please contact support at +91 73974 49549 for immediate assistance.`,
                error: error.message,
                environment: environment
            };
        }
    },

    // Test connectivity for current domain
    async testConnectivity() {
        try {
            const response = await fetch(`${this.getAPIBaseURL()}/ai/health`, {
                method: 'GET',
                headers: { 'Accept': 'application/json' },
                credentials: 'include',
                mode: 'cors'
            });

            if (response.ok) {
                const data = await response.json();
                console.log('✅ VevahaAI Connectivity Test: PASSED', data);
                return true;
            } else {
                console.warn('⚠️ VevahaAI Connectivity Test: FAILED', response.status);
                return false;
            }
        } catch (error) {
            console.error('❌ VevahaAI Connectivity Test: ERROR', error);
            return false;
        }
    }
};

// Make globally available
window.VEVAHA_AI_CONFIG = VEVAHA_AI_CONFIG;

// Auto-test on load
document.addEventListener('DOMContentLoaded', async () => {
    const environment = VEVAHA_AI_CONFIG.getEnvironment();
    const baseURL = VEVAHA_AI_CONFIG.getAPIBaseURL();

    console.log(`🎯 VevahaAI Initialized for ${environment} environment`);
    console.log(`🌐 VevahaAI Base URL: ${baseURL}`);

    // Test connectivity
    const isConnected = await VEVAHA_AI_CONFIG.testConnectivity();
    if (isConnected) {
        console.log('🚀 VevahaAI: All systems ready for your domain!');
    } else {
        console.warn('⚠️ VevahaAI: Connectivity issues detected, but fallback systems active');
    }
});

const VevahaAIConfig = {
    // API Configuration
    apiEndpoints: {
        development: '/ai/chat',
        production: 'https://vevahamatrimony.com/ai/chat',
        replit: '/ai/chat'
    },

    // Horoscopic AI endpoints
    horoscopicApiEndpoints: {
        development: '/ai/horoscopic-chat',
        production: 'https://vevahamatrimony.com/ai/horoscopic-chat',
        replit: '/ai/horoscopic-chat'
    },

    // Advanced Training enforcement settings
    trainingEnforcement: {
        greetingRule: 'Vanakkam', // MUST be used in every response
        strictMode: true, // Enforce training rules strictly
        fallbackBehavior: 'force_correction', // Force correction of responses
        languagePreference: 'auto_detect', // Auto-detect Tamil/English
        validateEveryResponse: true, // Validate all AI responses
        rejectNonCompliant: true, // Reject responses that don't follow training

        // Advanced features
        sentimentAdaptation: true, // Adapt responses based on user sentiment
        personalityMatching: true, // Match AI personality to user style
        contextualLearning: true, // Learn from conversation context
        proactiveSuggestions: true, // Provide proactive suggestions
        emotionalIntelligence: true, // Apply emotional intelligence
        culturalSensitivity: 'enhanced', // Enhanced cultural awareness
        responseOptimization: true, // Optimize responses for user preferences
        spellTolerance: true // Enable spell tolerance for both languages
    },

    // Spell Tolerance Configuration
    spellTolerance: {
        enabled: true,
        englishThreshold: 0.7, // Similarity threshold for English spell correction
        tamilThreshold: 0.6, // Similarity threshold for Tamil spell correction
        logCorrections: true, // Log spell corrections for debugging
        autoCorrect: true, // Automatically apply spell corrections
        showCorrectionToUser: false, // Whether to inform user about corrections
        preserveOriginal: true // Keep original message for reference
    },

    // Language Configuration
    languages: {
        english: {
            code: 'en',
            name: 'English',
            flag: '🇬🇧',
            greetings: ['Vanakkam!', 'Vanakkam! 😊', 'Vanakkam, I\'m here to support you ❤️'],
            placeholder: 'Ask VevahaAI about matrimony, matches, profiles...'
        },
        tamil: {
            code: 'ta',
            name: 'Tamil',
            flag: '🇮🇳',
            greetings: ['வணக்கம்! 😊', 'வணக்கம்!', 'உங்களுக்கு உதவ நான் இங்கே இருக்கிறேன் ❤️'],
            placeholder: 'வேவாஹாAI-யிடம் மணம், பொருத்தம், சுயவிவரங்கள் பற்றி கேளுங்கள்...'
        }
    },

    // Enhanced System Prompts
    systemPrompts: {
        vevahaAI: `You are VEVAHA AI – the official virtual assistant for https://vevahamatrimony.com, India's premium Tamil Hindu matchmaking platform.

Always start responses with "Vanakkam" and be warm, respectful, professional, and helpful. Provide detailed, comprehensive responses.

Your expertise covers: registration, profiles, membership plans, safety, searching, communication, Tamil matrimony culture, family expectations, and general matrimonial guidance.

For horoscopic matching or Vedic astrology questions, refer users to our specialized astrology services.

Always end responses warmly with contact info and offer additional help.`,

        horoscopicAI: `You are VEVAHA HOROSCOPIC AI – a dedicated Vedic astrologer and expert horoscopic matchmaker for VevahaMatrimony.com.

Always start responses with "Vanakkam" as a traditional Tamil astrologer.

I specialize in finding astrologically matched life partners using Vedic horoscope matching logic (10 Poruthams, Rasi, Nakshatra, Gotra compatibility).

For non-horoscopic matrimony questions, I refer users to VEVAHA AI or our support team.`
    },

    // Quick Action Messages
    quickActions: {
        english: [
            'How can I create an attractive profile?',
            'What are the membership benefits?',
            'How do I search for matches?',
            'Tell me about safety features',
            'What is Rasi compatibility?',
            'How does profile verification work?',
            'Show me membership plans',
            'Help with horoscope matching'
        ],
        tamil: [
            'எப்படி கவர்ச்சிகரமான சுயவிவரம் உருவாக்குவது?',
            'உறுப்பினர் திட்டங்கள் என்ன?',
            'பொருத்தங்களை எப்படி தேடுவது?',
            'பாதுகாப்பு அம்சங்கள் பற்றி சொல்லுங்கள்',
            'ராசி பொருத்தம் என்றால் என்ன?',
            'சுயவிவர சரிபார்ப்பு எப்படி செயல்படுகிறது?',
            'உறுப்பினர் திட்டங்களைக் காட்டுங்கள்',
            'ஜாதக பொருத்தத்திற்கு உதவுங்கள்'
        ]
    },

    // Error Messages
    errorMessages: {
        english: {
            networkError: 'Vanakkam! I\'m experiencing technical difficulties. Please try again in a moment or contact our support team through the website. 📞',
            rateLimit: 'Vanakkam! Too many requests. Please wait a moment and try again. ⏰',
            serviceUnavailable: 'Vanakkam! AI service temporarily unavailable. Please try again later. 🔧',
            generalError: 'Vanakkam! Something went wrong. Please refresh the page and try again. 🔄',
            trainingViolation: 'Vanakkam! I need to stay focused on matrimonial assistance. How can I help you with your matrimony journey? 💕'
        },
        tamil: {
            networkError: 'வணக்கம்! தொழில்நுட்ப சிக்கல். விரைவில் மீண்டும் முயற்சிக்கவும் அல்லது எங்கள் ஆதரவு குழுவை இணையதளத்தின் மூலம் தொடர்பு கொள்ளுங்கள். 📞',
            rateLimit: 'வணக்கம்! அதிக கோரிக்கைகள். சில நொடிகள் காத்திருந்து மீண்டும் முயற்சிக்கவும். ⏰',
            serviceUnavailable: 'வணக்கம்! AI சேவை தற்காலிகமாக கிடைக்கவில்லை. பின்னர் முயற்சிக்கவும். 🔧',
            generalError: 'வணக்கம்! ஏதோ தவறு நடந்தது. பக்கத்தை புதுப்பித்து மீண்டும் முயற்சிக்கவும். 🔄',
            trainingViolation: 'வணக்கம்! எனக்கு மணமக்கள் உதவியில் கவனம் செலுத்த வேண்டும். உங்கள் மணமக்கள் பயணத்தில் எப்படி உதவ முடியும்? 💕'
        }
    },

    // Enhanced Environment Detection for Hostinger and Replit
    detectEnvironment() {
        const hostname = window.location.hostname;

        if (hostname.includes('vevahamatrimony.com')) {
            return 'production';
        } else if (hostname.includes('replit')) {
            return 'replit';
        } else {
            return 'development';
        }
    },

    // Get API Base URL - always use relative paths for better domain compatibility
    getAPIBaseURL() {
        return ''; // Always use relative paths
    },
    getEnvironment() {
        if (typeof window === 'undefined') return 'development';

        const hostname = window.location.hostname;
        const port = window.location.port;
        const protocol = window.location.protocol;

        console.log(`🌐 Detecting environment: hostname=${hostname}, port=${port}, protocol=${protocol}`);

        // Production domain detection
        if (hostname === 'vevahamatrimony.com' || hostname === 'www.vevahamatrimony.com') {
            console.log('✅ Detected: Production domain');
            return 'production';
        } 
        // Replit environment detection
        else if (hostname.includes('replit.app') || hostname.includes('repl.co') ||
                 hostname.includes('replit.dev') || hostname.includes('replit.io') ||
                 hostname.includes('replitusercontent.com')) {
            console.log('✅ Detected: Replit environment');
            return 'replit';
        }
        // Default: development or other environment
        else {
            console.log('🔧 Detected: Development/Other environment');
            return 'development';
        }
    },

    // Enhanced API Endpoint Detection - Works in both environments
    getApiEndpoint() {
        const env = this.getEnvironment();
        let endpoint = '/ai/chat'; // Always use relative path for same-origin requests

        // Additional validation for endpoint availability
        if (typeof window !== 'undefined') {
            // Store the full URL for debugging
            const fullUrl = window.location.origin + endpoint;
            console.log(`🔗 VEVAHA AI Full URL: ${fullUrl}`);
            console.log(`🔗 VEVAHA AI Endpoint: ${endpoint} (Environment: ${env})`);
            console.log(`🌐 Current domain: ${window.location.hostname}`);

            // Test endpoint availability (non-blocking)
            this.testEndpointAvailability(endpoint, 'VevahaAI');
        }

        return endpoint;
    },

    // Enhanced Horoscopic API Endpoint Detection - Works in both environments
    getHoroscopicApiEndpoint() {
        const env = this.getEnvironment();
        let endpoint = '/horoscopic-ai/chat'; // Always use relative path for same-origin requests

        // Additional validation for endpoint availability
        if (typeof window !== 'undefined') {
            // Store the full URL for debugging
            const fullUrl = window.location.origin + endpoint;
            console.log(`🔗 VEVAHA HOROSCOPIC AI Full URL: ${fullUrl}`);
            console.log(`🔗 VEVAHA HOROSCOPIC AI Endpoint: ${endpoint} (Environment: ${env})`);
            console.log(`🌐 Current domain: ${window.location.hostname}`);

            // Test endpoint availability (non-blocking)
            this.testEndpointAvailability(endpoint, 'VevahaHoroscopicAI');
        }

        return endpoint;
    },

    // Test endpoint availability (non-blocking)
    async testEndpointAvailability(endpoint, aiType) {
        try {
            // Quick HEAD request to test if endpoint exists
            const testResponse = await fetch(endpoint, { 
                method: 'HEAD',
                timeout: 2000 
            });
            console.log(`✅ ${aiType} endpoint test: ${testResponse.status === 405 || testResponse.status === 200 ? 'Available' : 'May have issues'}`);
        } catch (error) {
            // Don't log errors as this is just a non-blocking test
            console.log(`⚠️ ${aiType} endpoint test: Unable to verify (${error.message})`);
        }
    },

    // Language Management
    setLanguage(languageCode) {
        localStorage.setItem('vevahaAI_language', languageCode);
        localStorage.setItem('vevahaAI_language_timestamp', Date.now().toString());
        console.log(`🔤 Language set to: ${languageCode}`);
    },

    getLanguage() {
        const stored = localStorage.getItem('vevahaAI_language');
        return stored === 'ta' ? 'ta' : 'en';
    },

    getLanguageConfig(languageCode = null) {
        const lang = languageCode || this.getLanguage();
        return lang === 'ta' ? this.languages.tamil : this.languages.english;
    },

    // Advanced Training Enforcement with Comprehensive Error Checking
    enforceTraining(response, aiType = 'general') {
        if (!response || typeof response !== 'string') {
            console.error('❌ Invalid response for training enforcement');
            return this.generateFallbackResponse(aiType);
        }

        let fixedResponse = response.trim();
        let errorCount = 0;
        const errors = [];

        // Error Check 1: Proper greeting validation
        if (aiType === 'horoscopic') {
            if (!fixedResponse.includes('🔮 Vanakkam') && !fixedResponse.includes('🔮 வணக்கம்')) {
                const lang = this.getLanguage();
                const prefix = lang === 'ta' ? '🔮 வணக்கம்! ' : '🔮 Vanakkam! ';
                fixedResponse = prefix + fixedResponse.replace(/^(vanakkam|வணக்கம்)[!.,\s]*/i, '');
                errorCount++;
                errors.push('Fixed missing horoscopic greeting');
            }
        } else {
            const startsWithVanakkam = fixedResponse.toLowerCase().startsWith('வணக்கம்') || 
                                     fixedResponse.toLowerCase().startsWith('vanakkam');
            if (!startsWithVanakkam) {
                const lang = this.getLanguage();
                const prefix = lang === 'ta' ? 'வணக்கம்! ' : 'Vanakkam! ';
                fixedResponse = prefix + fixedResponse;
                errorCount++;
                errors.push('Fixed missing Vanakkam greeting');
            }
        }

        // Error Check 2: Remove prohibited greetings
        const prohibitedGreetings = ['hello', 'hi there', 'welcome', 'namaste', 'greetings', 'good morning', 'good evening'];
        prohibitedGreetings.forEach(greeting => {
            if (fixedResponse.toLowerCase().includes(greeting) && !fixedResponse.toLowerCase().includes('vanakkam')) {
                fixedResponse = fixedResponse.replace(new RegExp(greeting, 'gi'), '');
                errorCount++;
                errors.push(`Removed prohibited greeting: ${greeting}`);
            }
        });

        // Error Check 3: Fix duplicate Vanakkam
        const vanakkamCount = (fixedResponse.match(/vanakkam/gi) || []).length + 
                             (fixedResponse.match(/வணக்கம்/g) || []).length;
        if (vanakkamCount > 2) {
            // Keep only the first Vanakkam occurrence
            let firstVanakkamFound = false;
            fixedResponse = fixedResponse.replace(/vanakkam/gi, match => {
                if (!firstVanakkamFound) {
                    firstVanakkamFound = true;
                    return match;
                }
                return '';
            });
            errorCount++;
            errors.push('Fixed duplicate Vanakkam greetings');
        }

        // Error Check 4: Fix sentence structure issues
        if (fixedResponse.includes('  ')) {
            fixedResponse = fixedResponse.replace(/\s+/g, ' ');
            errorCount++;
            errors.push('Fixed spacing issues');
        }

        // Error Check 5: Ensure proper punctuation
        if (!fixedResponse.match(/[.!?]$/) && fixedResponse.length > 50) {
            fixedResponse += '.';
            errorCount++;
            errors.push('Added missing punctuation');
        }

        // Log enforcement results
        if (errorCount > 0) {
            console.warn(`⚠️ Training enforcement: Fixed ${errorCount} errors in AI response`);
            errors.forEach(error => console.warn(`🔧 ${error}`));
        }

        return fixedResponse.trim();
    },

    // Advanced Response Validation with Detailed Error Checking
    validateResponse(response, aiType = 'general') {
        if (!response || typeof response !== 'string') {
            console.error('❌ Invalid response type');
            return { isValid: false, errors: ['Invalid response type'] };
        }

        const errors = [];
        const lowerResponse = response.toLowerCase();

        // Validation 1: Check for prohibited greetings
        const prohibitedGreetings = ['hello', 'hi there', 'welcome', 'namaste', 'greetings', 'good morning', 'good evening'];
        const foundProhibited = prohibitedGreetings.filter(greeting => 
            lowerResponse.includes(greeting) && !lowerResponse.includes('vanakkam')
        );
        if (foundProhibited.length > 0) {
            errors.push(`Contains prohibited greetings: ${foundProhibited.join(', ')}`);
        }

        // Validation 2: Check for proper greeting based on AI type
        if (aiType === 'horoscopic') {
            const hasProperHoroscopicGreeting = response.includes('🔮 vanakkam') || response.includes('🔮 வணக்கம்');
            if (!hasProperHoroscopicGreeting) {
                errors.push('Missing required 🔮 Vanakkam horoscopic greeting');
            }
        } else {
            const hasVanakkam = lowerResponse.includes('vanakkam') || lowerResponse.includes('வணக்கம்');
            if (!hasVanakkam) {
                errors.push('Missing required Vanakkam greeting');
            }
        }

        // Validation 3: Check for duplicate greetings
        const vanakkamCount = (response.match(/vanakkam/gi) || []).length + 
                             (response.match(/வணக்கம்/g) || []).length;
        if (vanakkamCount > 2) {
            errors.push(`Too many Vanakkam greetings: ${vanakkamCount} (max 2 allowed)`);
        }

        // Validation 4: Check for AI identity issues
        if (response.includes('ChatGPT') || response.includes('Claude') || response.includes('I am an AI assistant')) {
            errors.push('Contains references to other AI systems');
        }

        // Validation 5: Check context appropriateness
        if (response.length > 200) {
            if (aiType === 'horoscopic') {
                const horoscopicTerms = ['rasi', 'nakshatra', 'porutham', 'vedic', 'astrol'];
                const hasHoroscopicContext = horoscopicTerms.some(term => lowerResponse.includes(term));
                if (!hasHoroscopicContext) {
                    errors.push('Missing horoscopic context in detailed response');
                }
            } else {
                const matrimonialTerms = ['matrimon', 'marriage', 'match', 'profile', 'vevaha'];
                const hasMatrimonialContext = matrimonialTerms.some(term => lowerResponse.includes(term));
                if (!hasMatrimonialContext) {
                    errors.push('Missing matrimonial context in detailed response');
                }
            }
        }

        const isValid = errors.length === 0;

        if (!isValid) {
            console.warn(`⚠️ Response validation failed with ${errors.length} errors:`, errors);
        }

        return { isValid, errors };
    },

    // Generate fallback response for error cases
    generateFallbackResponse(aiType = 'general') {
        const lang = this.getLanguage();

        if (aiType === 'horoscopic') {
            return lang === 'ta' ?
                '🔮 வணக்கம்! நான் வேவாஹா ஜாதக AI. உங்கள் ஜாதக பொருத்தத்தில் எப்படி உதவ முடியும்?' :
                '🔮 Vanakkam! I am VEVAHA HOROSCOPIC AI. How can I help with your horoscopic compatibility?';
        } else {
            return lang === 'ta' ?
                'வணக்கம்! நான் வேவாஹா AI, உங்கள் மணமக்கல் உதவியாளர். எப்படி உதவ முடியும்?' :
                'Vanakkam! I am VevahaAI, your matrimonial assistant. How can I help you?';
        }
    },

    // Error Handling
    getErrorMessage(errorType, languageCode = null) {
        const lang = languageCode || this.getLanguage();
        const messages = lang === 'ta' ? this.errorMessages.tamil : this.errorMessages.english;
        return messages[errorType] || messages.generalError;
    },

    // Quick Actions
    getQuickActions(languageCode = null) {
        const lang = languageCode || this.getLanguage();
        return lang === 'ta' ? this.quickActions.tamil : this.quickActions.english;
    },

    // Debug Information
    getDebugInfo() {
        return {
            environment: this.getEnvironment(),
            apiEndpoint: this.getApiEndpoint(),
            horoscopicApiEndpoint: this.getHoroscopicApiEndpoint(),
            language: this.getLanguage(),
            trainingEnforcement: this.trainingEnforcement,
            hostname: window.location.hostname,
            timestamp: new Date().toISOString()
        };
    },

    // Initialize configuration
    init() {
        console.log('🚀 VevahaAI Configuration initialized');
        console.log('Environment:', this.getEnvironment());
        console.log('Language:', this.getLanguage());
        console.log('Training enforcement:', this.trainingEnforcement.strictMode ? 'ENABLED' : 'DISABLED');

        // Set up global error handling for AI responses
        if (typeof window !== 'undefined') {
            window.addEventListener('vevahaai-response', (event) => {
                const { response, aiType } = event.detail;
                if (!this.validateResponse(response, aiType)) {
                    console.warn('⚠️ AI response failed validation, applying training enforcement');
                    const correctedResponse = this.enforceTraining(response);
                    event.detail.response = correctedResponse;
                }
            });
        }
    }
};

// Make globally available
if (typeof window !== 'undefined') {
    window.VevahaAIConfig = VevahaAIConfig;
    // Initialize on load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => VevahaAIConfig.init());
    } else {
        VevahaAIConfig.init();
    }
}

// Export for Node.js if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VevahaAIConfig;
}

console.log('✅ VevahaAI Enhanced Configuration loaded with training enforcement');