
// OpenRouter Configuration for VevahaMatrimony AI Assistant

// OpenRouter connection test
async function testOpenRouterConnection() {
    try {
        const apiKey = process.env.OPENROUTER_API_KEY || '';
        if (!apiKey) return false;
        const response = await fetch('https://openrouter.ai/api/v1/models', {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            console.log('✅ OpenRouter API connection successful');
            return true;
        } else {
            console.log('⚠️ OpenRouter API connection failed');
            return false;
        }
    } catch (error) {
        console.log('⚠️ OpenRouter API test error:', error.message);
        return false;
    }
}

const aiServices = {
    // Message suggestion service with OpenRouter API
    async generateMessageSuggestions(userProfile, recipientProfile) {
        try {
            const apiKey = process.env.OPENROUTER_API_KEY || '';
            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': 'https://vevahamatrimony.com',
                    'X-Title': 'VevahaMatrimony Message Assistant'
                },
                body: JSON.stringify({
                    model: 'google/gemma-3-12b-it:free',
                    messages: [
                        {
                            role: 'system',
                            content: 'Generate 3 respectful, cultural matrimony conversation starters based on user profiles. Keep them warm and family-oriented.'
                        },
                        {
                            role: 'user',
                            content: `Generate message suggestions for ${userProfile.full_name} to contact ${recipientProfile.full_name}. User: ${userProfile.profession}, ${userProfile.education}. Recipient: ${recipientProfile.profession}, ${recipientProfile.education}.`
                        }
                    ],
                    max_tokens: 200,
                    temperature: 0.8
                })
            });

            if (response.ok) {
                const data = await response.json();
                const suggestions = data.choices?.[0]?.message?.content
                    ?.split('\n')
                    ?.filter(s => s.trim())
                    ?.slice(0, 3) || [];

                return { success: true, suggestions };
            }
        } catch (error) {
            console.error('Message suggestion API error:', error);
        }

        // Fallback suggestions
        return { 
            success: true, 
            suggestions: [
                "Hello! I found your profile interesting and would like to know more about you.",
                "Namaste! I believe we share similar values and would love to connect.",
                "Hi! Your profile caught my attention. I'd be honored to start a conversation."
            ]
        };
    },

    // Privacy violation checker
    async checkPrivacyViolation(message) {
        try {
            // Quick regex checks first
            const phoneRegex = /(\+91|91)?[-.\s]?[6-9]\d{4}[-.\s]?\d{5}/g;
            const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
            const socialRegex = /(whatsapp|instagram|facebook|telegram|snapchat)/gi;

            const violations = [];
            if (phoneRegex.test(message)) violations.push('phone_number');
            if (emailRegex.test(message)) violations.push('email_address');
            if (socialRegex.test(message)) violations.push('social_media');

            return { success: true, violations, safe: violations.length === 0 };
        } catch (error) {
            console.error('Privacy Check Error:', error);
            return { success: false, violations: [], safe: true };
        }
    },

    // Compatibility insights with OpenRouter API
    async generateCompatibilityInsights(user1, user2) {
        try {
            const apiKey = process.env.OPENROUTER_API_KEY || '';
            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': 'https://vevahamatrimony.com',
                    'X-Title': 'VevahaMatrimony Compatibility Assistant'
                },
                body: JSON.stringify({
                    model: 'mistralai/mistral-small-3.2-24b-instruct:free',
                    messages: [
                        {
                            role: 'system',
                            content: 'Analyze matrimonial compatibility between two profiles. Provide score (1-100), insights, strengths, and considerations in JSON format.'
                        },
                        {
                            role: 'user',
                            content: `Analyze compatibility between:
User 1: Age ${user1.age}, ${user1.profession}, ${user1.education}, ${user1.caste}, ${user1.rasi}
User 2: Age ${user2.age}, ${user2.profession}, ${user2.education}, ${user2.caste}, ${user2.rasi}`
                        }
                    ],
                    max_tokens: 300,
                    temperature: 0.6
                })
            });

            if (response.ok) {
                const data = await response.json();
                const content = data.choices?.[0]?.message?.content;
                
                try {
                    const parsed = JSON.parse(content);
                    return { success: true, ...parsed };
                } catch {
                    // If not JSON, extract insights from text
                    return { 
                        success: true, 
                        score: 75,
                        insights: [content?.substring(0, 100) || "AI-powered compatibility analysis"],
                        strengths: ["Profile compatibility assessed"],
                        considerations: ["Further discussion recommended"]
                    };
                }
            }
        } catch (error) {
            console.error('Compatibility insights API error:', error);
        }

        // Fallback insights
        return { 
            success: true, 
            score: 78,
            insights: ["Both profiles show potential for compatibility based on shared values"],
            strengths: ["Similar educational background", "Compatible family values"],
            considerations: ["Consider discussing future goals and aspirations"]
        };
    }
};

// Test connection on startup
testOpenRouterConnection();

module.exports = { aiServices };
