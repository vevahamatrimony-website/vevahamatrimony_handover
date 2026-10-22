/**
 * Find Best Match - VEVAHA HOROSCOPIC AI Integration
 * Connects with horoscopic-ai-chat.js and porutham-calculator.js
 */

// Global findBestMatch function for horoscopic matching
async function findBestMatch(matrimonyId) {
    console.log('🔮 findBestMatch called with:', matrimonyId);

    try {
        // Validate matrimony ID format
        if (!matrimonyId || typeof matrimonyId !== 'string') {
            return "🔮 Vanakkam! Please provide a valid Matrimony ID.";
        }

        const profileIdPattern = /^VM\d{8,12}$/i;
        if (!profileIdPattern.test(matrimonyId.trim())) {
            return "🔮 Vanakkam! Please provide a valid Matrimony ID format (e.g., VM1234567890).";
        }

        // Check if horoscopic AI integration is available
        if (window.horoscopicAI && window.horoscopicAI.initialized) {
            console.log('🔮 Using HoroscopicAIIntegration for findBestMatch');
            return await window.horoscopicAI.findBestMatch(matrimonyId);
        }

        // Fallback to direct API call
        console.log('🔮 Using direct API call for findBestMatch');

        const response = await fetch('/horoscopic-ai/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                message: `Find best horoscopic matches for ${matrimonyId}`,
                source: 'findBestMatch',
                language: 'en'
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        if (data.success && data.reply) {
            return data.reply;
        } else {
            return "🔮 Sorry, I couldn't analyze this profile at the moment. Please contact our astrology team for personalized consultation.";
        }

    } catch (error) {
        console.error('❌ Error in findBestMatch:', error);

        if (error.message.includes('Failed to fetch')) {
            return "🔮 Vanakkam! Network connectivity issue. Please check your connection and try again.";
        } else if (error.message.includes('not found')) {
            return `🔮 Profile ${matrimonyId} not found in our database. Please verify the Matrimony ID.`;
        } else {
            return "🔮 Technical difficulty in horoscopic analysis. Please try again or contact our astrology support team at +91 73974 49549.";
        }
    }
}

// Helper function to get API endpoint
function getHoroscopicAPIEndpoint() {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;

    // Production domain
    if (hostname === 'vevahamatrimony.com' || 
        hostname === 'www.vevahamatrimony.com' ||
        hostname.includes('vevahamatrimony.com')) {
        return `${protocol}//${hostname}`;
    }

    // Development/Replit
    return `${protocol}//${hostname}:3000`;
}

// Compatibility function for older integrations
async function processMatchmakingRequest(matrimonyId) {
    return await findBestMatch(matrimonyId);
}

// Make functions globally available
if (typeof window !== 'undefined') {
    window.findBestMatch = findBestMatch;
    window.processMatchmakingRequest = processMatchmakingRequest;
    console.log('✅ findBestMatch functions loaded globally');
}

// Export for Node.js if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        findBestMatch,
        processMatchmakingRequest
    };
}