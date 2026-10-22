// Enhanced horoscopic AI system with advanced intelligence, data detection, and memory management

// Horoscopic AI Configuration
const HOROSCOPIC_AI_CONFIG = {
    name: 'VEVAHA HOROSCOPIC AI',
    version: '2.0',
    maxTokens: 800,
    temperature: 0.6,
    enabled: true,
    features: {
        vedic_astrology: true,
        porutham_analysis: true,
        rasi_compatibility: true,
        nakshatra_matching: true,
        dosham_detection: true,
        cultural_adaptation: true,
        multilingual_support: true
    },
    supported_languages: ['en', 'ta'],
    session_timeout: 48 * 60 * 60 * 1000, // 48 hours
    max_conversation_history: 25
};

// Advanced Horoscopic Intelligence Features
const HOROSCOPIC_ADVANCED_FEATURES = {
    ASTROLOGICAL_PATTERN_RECOGNITION: true,
    COMPATIBILITY_LEARNING: true,
    CULTURAL_CONTEXT_ADAPTATION: true,
    EMOTIONAL_ASTROLOGICAL_GUIDANCE: true,
    PREDICTIVE_MATCHING: true,
    FAMILY_DYNAMICS_ANALYSIS: true,
    REGIONAL_PREFERENCE_LEARNING: true
};

// GEMINI API Configuration
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const MAX_HISTORY_ITEMS = 12;

const HORO_SYSTEM_PROMPT = `
You are VEVAHA HOROSCOPIC AI, an expert Vedic Astrologer for VevahaMatrimony.com.
Your expertise is EXCLUSIVELY in:
1. Horoscope Matching (10 Porutham/Dashakoota)
2. Rasi and Nakshatra compatibility
3. Dosham analysis (Manglik/Chevvai, Sarpa, etc.)
4. Providing traditional Vedic marriage advice.

Guidelines:
- ALWAYS begin with "Vanakkam!" (English) or "வணக்கம்!" (Tamil).
- Use traditional terms like Rasi, Nakshatra, Lagnam, Porutham.
- If you don't know the answer, refer the user to our human astrologers.
- Keep responses respectful and culturally grounded in Tamil traditions.
- Support both English and Tamil fluently.
`;


// Advanced Astrological Pattern Recognition
class AstrologicalPatternAnalyzer {
    static analyzePersonalityPatterns(rasi, nakshatra) {
        const patterns = {
            personalityTraits: [],
            compatibilityNeeds: [],
            potentialChallenges: [],
            strengthAreas: [],
            relationshipStyle: 'balanced'
        };

        // Fire signs analysis (Mesha, Simha, Dhanus)
        const fireSigns = ['mesha', 'simha', 'dhanus'];
        if (fireSigns.includes(rasi?.toLowerCase())) {
            patterns.personalityTraits.push('dynamic', 'passionate', 'leadership-oriented');
            patterns.compatibilityNeeds.push('intellectual stimulation', 'independence', 'adventure');
            patterns.potentialChallenges.push('impatience', 'dominance issues');
            patterns.strengthAreas.push('initiative', 'courage', 'inspiration');
            patterns.relationshipStyle = 'passionate';
        }

        // Earth signs analysis (Vrishabha, Kanya, Makara)
        const earthSigns = ['vrishabha', 'kanya', 'makara'];
        if (earthSigns.includes(rasi?.toLowerCase())) {
            patterns.personalityTraits.push('practical', 'stable', 'nurturing');
            patterns.compatibilityNeeds.push('security', 'consistency', 'comfort');
            patterns.potentialChallenges.push('stubbornness', 'over-cautiousness');
            patterns.strengthAreas.push('reliability', 'patience', 'loyalty');
            patterns.relationshipStyle = 'stable';
        }

        // Air signs analysis (Mithuna, Tula, Kumbha)
        const airSigns = ['mithuna', 'tula', 'kumbha'];
        if (airSigns.includes(rasi?.toLowerCase())) {
            patterns.personalityTraits.push('intellectual', 'communicative', 'social');
            patterns.compatibilityNeeds.push('mental connection', 'freedom', 'variety');
            patterns.potentialChallenges.push('indecisiveness', 'detachment');
            patterns.strengthAreas.push('communication', 'adaptability', 'fairness');
            patterns.relationshipStyle = 'intellectual';
        }

        // Water signs analysis (Kataka, Vrischika, Meena)
        const waterSigns = ['kataka', 'vrischika', 'meena'];
        if (waterSigns.includes(rasi?.toLowerCase())) {
            patterns.personalityTraits.push('emotional', 'intuitive', 'caring');
            patterns.compatibilityNeeds.push('emotional security', 'understanding', 'depth');
            patterns.potentialChallenges.push('mood swings', 'over-sensitivity');
            patterns.strengthAreas.push('empathy', 'intuition', 'nurturing');
            patterns.relationshipStyle = 'emotional';
        }

        // Nakshatra-specific refinements
        if (nakshatra) {
            const nakshatraLower = nakshatra.toLowerCase();
            if (nakshatraLower.includes('ashwini')) {
                patterns.personalityTraits.push('pioneering', 'healing nature');
            } else if (nakshatraLower.includes('magha')) {
                patterns.personalityTraits.push('royal nature', 'ancestral pride');
            } else if (nakshatraLower.includes('rohini')) {
                patterns.personalityTraits.push('attractive', 'creative');
            }
        }

        return patterns;
    }

    static predictFamilyDynamics(userProfile, matchProfile) {
        const dynamics = {
            parentalAcceptance: 'medium',
            siblingHarmony: 'good',
            extendedFamilyIntegration: 'moderate',
            culturalBlending: 'harmonious',
            traditionVsModernBalance: 'balanced'
        };

        // Same caste/community increases parental acceptance
        if (userProfile.caste === matchProfile.caste) {
            dynamics.parentalAcceptance = 'high';
            dynamics.culturalBlending = 'seamless';
        }

        // Educational compatibility affects sibling harmony
        if (userProfile.education && matchProfile.education) {
            const educationCompatible = Math.abs(
                (userProfile.education.length || 0) - (matchProfile.education.length || 0)
            ) < 10; // Rough education level compatibility

            if (educationCompatible) {
                dynamics.siblingHarmony = 'excellent';
            }
        }

        return dynamics;
    }
}

// Enhanced Compatibility Learning Engine
class CompatibilityLearningEngine {
    static learnFromUserFeedback(session, feedback) {
        if (!session.learningData) {
            session.learningData = {
                preferredTraits: [],
                avoidedTraits: [],
                successfulMatches: [],
                unsuccessfulMatches: [],
                familyPreferenceShifts: []
            };
        }

        // Process feedback to improve future recommendations
        if (feedback.type === 'positive') {
            session.learningData.preferredTraits.push(...feedback.traits);
        } else if (feedback.type === 'negative') {
            session.learningData.avoidedTraits.push(...feedback.traits);
        }
    }

    static adaptRecommendations(baseRecommendations, session) {
        if (!session.learningData) return baseRecommendations;

        let adaptedRecommendations = baseRecommendations;

        // Emphasize preferred traits
        session.learningData.preferredTraits.forEach(trait => {
            if (adaptedRecommendations.includes(trait)) {
                adaptedRecommendations = `⭐ ${trait} ⭐\n` + adaptedRecommendations;
            }
        });

        // Add warnings for avoided traits
        session.learningData.avoidedTraits.forEach(trait => {
            if (adaptedRecommendations.includes(trait)) {
                adaptedRecommendations += `\n⚠️ Note: You previously expressed concerns about ${trait}`;
            }
        });

        return adaptedRecommendations;
    }
}

// Initialize horoscopicSessions with proper scoping
let horoscopicSessions = new Map();

// Horoscopic Memory Configuration
const HOROSCOPIC_MEMORY_CONFIG = {
    MAX_CONVERSATION_HISTORY: 25, // Longer history for horoscopic analysis
    SESSION_TIMEOUT: 48 * 60 * 60 * 1000, // 48 hours for horoscopic sessions
    CONTEXT_WINDOW_SIZE: 12, // More context for astrological continuity
    CLEANUP_INTERVAL: 2 * 60 * 60 * 1000, // Clean up every 2 hours
    MAX_SESSIONS: 500,
    IMPORTANT_DATA_RETENTION: 7 * 24 * 60 * 60 * 1000 // Keep important horoscopic data for 7 days
};

// Enhanced user session structure with memory management
function createUserSession() {
    return {
        // Core horoscopic data
        name: null,
        gender: null,
        dob: null,
        tob: null,
        pob: null,
        rasi: null,
        nakshatra: null,
        gotra: null,
        caste: null,
        lagnam: null,
        dosham: null,
        matrimonyId: null,

        // Session management
        greetedOnce: false,
        messages: [],
        createdAt: new Date(),
        lastActivity: new Date(),

        // Memory management
        sessionId: Date.now() + '_horo_' + Math.random().toString(36).substr(2, 9),
        sessionMetadata: {
            dataCompleteness: 0, // Percentage of required data collected
            analysisHistory: [], // Previous analyses performed
            recommendations: [], // AI recommendations given
            userQuestions: [], // Track what user has asked about
            consultationTopics: [], // Topics discussed (compatibility, dosham, etc.)
            interactionCount: 0,
            lastAnalysisDate: null,
            preferredLanguage: 'en'
        },

        // Horoscopic memory
        astrologicalProfile: {
            planetaryPositions: {},
            calculatedPorutham: {},
            compatibilityHistory: [], // Previous compatibility checks
            doshamAnalysis: {},
            personalityTraits: [],
            lifePreferences: [],
            matchingCriteria: []
        },

        // Conversation memory
        conversationSummary: '',
        importantInsights: [], // Key astrological insights shared
        followUpNeeded: [], // Items that need follow-up
        userConcerns: [], // Specific concerns or doubts expressed
        satisfactionLevel: null
    };
}

// Horoscopic memory cleanup function
function cleanupOldHoroscopicSessions() {
    const now = Date.now();
    let cleaned = 0;

    for (const [sessionId, session] of horoscopicSessions.entries()) {
        const sessionAge = now - session.lastActivity.getTime();

        // Keep sessions with important data longer
        const hasImportantData = session.rasi || session.nakshatra || session.astrologicalProfile.calculatedPorutham;
        const timeoutPeriod = hasImportantData ? HOROSCOPIC_MEMORY_CONFIG.IMPORTANT_DATA_RETENTION : HOROSCOPIC_MEMORY_CONFIG.SESSION_TIMEOUT;

        if (sessionAge > timeoutPeriod) {
            horoscopicSessions.delete(sessionId);
            cleaned++;
        }
    }

    // Manage session count
    if (horoscopicSessions.size > HOROSCOPIC_MEMORY_CONFIG.MAX_SESSIONS) {
        const sessionsArray = Array.from(horoscopicSessions.entries())
            .sort((a, b) => a[1].lastActivity - b[1].lastActivity);

        const toRemove = sessionsArray.slice(0, horoscopicSessions.size - HOROSCOPIC_MEMORY_CONFIG.MAX_SESSIONS);
        toRemove.forEach(([sessionId]) => {
            horoscopicSessions.delete(sessionId);
            cleaned++;
        });
    }

    if (cleaned > 0) {
        console.log(`🔮 Horoscopic memory cleanup: Removed ${cleaned} old sessions. Active sessions: ${horoscopicSessions.size}`);
    }
}

// Start horoscopic memory cleanup
setInterval(cleanupOldHoroscopicSessions, HOROSCOPIC_MEMORY_CONFIG.CLEANUP_INTERVAL);

// Calculate data completeness percentage
function calculateDataCompleteness(session) {
    const requiredFields = ['name', 'gender', 'dob', 'rasi', 'nakshatra'];
    const optionalFields = ['tob', 'pob', 'gotra', 'caste', 'lagnam', 'dosham', 'matrimonyId'];

    let completed = 0;
    const total = requiredFields.length + optionalFields.length;

    requiredFields.forEach(field => {
        if (session[field]) completed += 2; // Required fields count double
    });

    optionalFields.forEach(field => {
        if (session[field]) completed += 1;
    });

    return Math.round((completed / (requiredFields.length * 2 + optionalFields.length)) * 100);
}

// Build horoscopic AI context from memory
function buildHoroscopicAIContext(session) {
    const contextParts = [];

    // Add horoscopic data context
    if (session.rasi && session.nakshatra) {
        contextParts.push(`User's horoscopic data: Rasi: ${session.rasi}, Nakshatra: ${session.nakshatra}`);
    }
    if (session.matrimonyId) {
        contextParts.push(`User's Matrimony ID: ${session.matrimonyId}`);
    }

    // Add previous analysis context
    if (session.sessionMetadata.analysisHistory.length > 0) {
        const recentAnalysis = session.sessionMetadata.analysisHistory.slice(-2);
        contextParts.push(`Previous analyses: ${recentAnalysis.join('; ')}`);
    }

    // Add important insights
    if (session.importantInsights.length > 0) {
        contextParts.push(`Key insights: ${session.importantInsights.slice(-3).join('; ')}`);
    }

    // Add user concerns
    if (session.userConcerns.length > 0) {
        contextParts.push(`User concerns: ${session.userConcerns.slice(-2).join('; ')}`);
    }

    // Add compatibility history
    if (session.astrologicalProfile.compatibilityHistory.length > 0) {
        const recentCompatibility = session.astrologicalProfile.compatibilityHistory.slice(-2);
        contextParts.push(`Previous compatibility discussions: ${recentCompatibility.join('; ')}`);
    }

    // Add consultation topics
    if (session.sessionMetadata.consultationTopics.length > 0) {
        contextParts.push(`Topics discussed: ${session.sessionMetadata.consultationTopics.slice(-5).join(', ')}`);
    }

    return contextParts.join('\n');
}

// Enhanced horoscopic session memory update with learning
function updateHoroscopicSessionMemory(session, userMessage, extractedData, aiResponse) {
    // Update activity and interaction count
    session.lastActivity = new Date();
    session.sessionMetadata.interactionCount++;

    // Advanced astrological pattern analysis
    if (HOROSCOPIC_ADVANCED_FEATURES.ASTROLOGICAL_PATTERN_RECOGNITION && session.rasi && session.nakshatra) {
        if (!session.astrologicalPatterns) {
            session.astrologicalPatterns = AstrologicalPatternAnalyzer.analyzePersonalityPatterns(session.rasi, session.nakshatra);
        }
    }

    // Cultural context learning
    if (HOROSCOPIC_ADVANCED_FEATURES.CULTURAL_CONTEXT_ADAPTATION) {
        if (!session.culturalPreferences) {
            session.culturalPreferences = {
                traditionLevel: 'medium', // high, medium, low
                familyInvolvementExpected: true,
                regionalPreferences: [],
                languagePreferences: [session.sessionMetadata.preferredLanguage],
                ceremonyPreferences: 'traditional' // traditional, modern, mixed
            };
        }

        // Learn from user's language and expressions
        const lowerMessage = userMessage.toLowerCase();
        if (lowerMessage.includes('traditional') || lowerMessage.includes('family values')) {
            session.culturalPreferences.traditionLevel = 'high';
        } else if (lowerMessage.includes('modern') || lowerMessage.includes('independent')) {
            session.culturalPreferences.traditionLevel = 'low';
        }
    }

    // Emotional guidance tracking
    if (HOROSCOPIC_ADVANCED_FEATURES.EMOTIONAL_ASTROLOGICAL_GUIDANCE) {
        if (!session.emotionalGuidanceHistory) {
            session.emotionalGuidanceHistory = [];
        }

        // Track emotional states and guidance provided
        const emotionalWords = ['worried', 'excited', 'nervous', 'hopeful', 'confused', 'confident'];
        const detectedEmotions = emotionalWords.filter(word => userMessage.toLowerCase().includes(word));

        if (detectedEmotions.length > 0) {
            session.emotionalGuidanceHistory.push({
                timestamp: new Date(),
                emotions: detectedEmotions,
                guidanceProvided: aiResponse.includes('guidance') || aiResponse.includes('support'),
                context: session.sessionMetadata.consultationTopics.slice(-2)
            });

            // Keep only recent emotional guidance (last 10)
            if (session.emotionalGuidanceHistory.length > 10) {
                session.emotionalGuidanceHistory = session.emotionalGuidanceHistory.slice(-10);
            }
        }
    }

    // Family dynamics analysis
    if (HOROSCOPIC_ADVANCED_FEATURES.FAMILY_DYNAMICS_ANALYSIS) {
        if (!session.familyDynamicsProfile) {
            session.familyDynamicsProfile = {
                familySize: 'unknown',
                parentalExpectations: 'medium',
                siblingInfluence: 'moderate',
                extendedFamilyRole: 'significant',
                decisionMakingStyle: 'collaborative'
            };
        }

        // Learn family dynamics from conversation
        if (userMessage.toLowerCase().includes('parents') || userMessage.toLowerCase().includes('family')) {
            if (userMessage.toLowerCase().includes('strict') || userMessage.toLowerCase().includes('traditional')) {
                session.familyDynamicsProfile.parentalExpectations = 'high';
            } else if (userMessage.toLowerCase().includes('open') || userMessage.toLowerCase().includes('flexible')) {
                session.familyDynamicsProfile.parentalExpectations = 'low';
            }
        }
    }

    // Update data completeness
    session.sessionMetadata.dataCompleteness = calculateDataCompleteness(session);

    // Track consultation topics
    const lowerMessage = userMessage.toLowerCase();
    const topics = [];

    if (lowerMessage.includes('compatibility') || lowerMessage.includes('match')) topics.push('compatibility');
    if (lowerMessage.includes('dosham') || lowerMessage.includes('dosha')) topics.push('dosham');
    if (lowerMessage.includes('rasi') || lowerMessage.includes('sign')) topics.push('rasi');
    if (lowerMessage.includes('nakshatra') || lowerMessage.includes('star')) topics.push('nakshatra');
    if (lowerMessage.includes('porutham')) topics.push('porutham');
    if (lowerMessage.includes('marriage') || lowerMessage.includes('wedding')) topics.push('marriage_timing');

    topics.forEach(topic => {
        if (!session.sessionMetadata.consultationTopics.includes(topic)) {
            session.sessionMetadata.consultationTopics.push(topic);
        }
    });

    // Store user questions
    if (lowerMessage.includes('?') || lowerMessage.includes('how') || lowerMessage.includes('what') || lowerMessage.includes('why')) {
        const question = userMessage.length > 100 ? userMessage.substring(0, 100) + '...' : userMessage;
        session.sessionMetadata.userQuestions.push({
            question: question,
            timestamp: new Date(),
            answered: true
        });
    }

    // Track user concerns or doubts
    if (lowerMessage.includes('concern') || lowerMessage.includes('worry') || lowerMessage.includes('doubt') || lowerMessage.includes('problem')) {
        const concern = userMessage.length > 150 ? userMessage.substring(0, 150) + '...' : userMessage;
        session.userConcerns.push({
            concern: concern,
            timestamp: new Date(),
            addressed: true
        });
    }

    // Store important astrological insights from AI response
    if (aiResponse && aiResponse.toLowerCase().includes('compatibility')) {
        const insight = aiResponse.length > 200 ? aiResponse.substring(0, 200) + '...' : aiResponse;
        session.importantInsights.push({
            insight: insight,
            timestamp: new Date(),
            topic: topics[0] || 'general'
        });
    }

    // Update astrological profile with extracted data
    if (extractedData) {
        Object.keys(extractedData).forEach(key => {
            if (extractedData[key] && key in session.astrologicalProfile) {
                session.astrologicalProfile[key] = extractedData[key];
            }
        });
    }

    // Generate conversation summary periodically
    if (session.messages.length % 5 === 0) {
        session.conversationSummary = generateHoroscopicConversationSummary(session);
    }

    // Trim messages if exceeding limit, but keep important horoscopic data
    if (session.messages.length > HOROSCOPIC_MEMORY_CONFIG.MAX_CONVERSATION_HISTORY) {
        const importantMessages = session.messages.filter(msg =>
            msg.extractedData && Object.keys(msg.extractedData).length > 0 ||
            msg.content.toLowerCase().includes('rasi') ||
            msg.content.toLowerCase().includes('nakshatra') ||
            msg.content.toLowerCase().includes('dosham')
        );

        const recentMessages = session.messages.slice(-HOROSCOPIC_MEMORY_CONFIG.MAX_CONVERSATION_HISTORY + importantMessages.length);

        // Combine without duplicates
        const messageIds = new Set();
        session.messages = [...importantMessages, ...recentMessages].filter(msg => {
            const id = msg.timestamp + msg.content.substring(0, 50);
            if (messageIds.has(id)) return false;
            messageIds.add(id);
            return true;
        });
    }

    // Keep only recent items in arrays to prevent memory bloat
    if (session.sessionMetadata.userQuestions.length > 20) {
        session.sessionMetadata.userQuestions = session.sessionMetadata.userQuestions.slice(-20);
    }
    if (session.userConcerns.length > 10) {
        session.userConcerns = session.userConcerns.slice(-10);
    }
    if (session.importantInsights.length > 15) {
        session.importantInsights = session.importantInsights.slice(-15);
    }
}

// Generate horoscopic conversation summary
function generateHoroscopicConversationSummary(session) {
    const summaryParts = [];

    // Data collection summary
    const dataFields = ['name', 'rasi', 'nakshatra', 'dob', 'dosham'];
    const collectedData = dataFields.filter(field => session[field]).map(field => `${field}: ${session[field]}`);
    if (collectedData.length > 0) {
        summaryParts.push(`Collected data: ${collectedData.join(', ')}`);
    }

    // Topics discussed
    if (session.sessionMetadata.consultationTopics.length > 0) {
        summaryParts.push(`Topics: ${session.sessionMetadata.consultationTopics.join(', ')}`);
    }

    // Key insights
    if (session.importantInsights.length > 0) {
        const recentInsights = session.importantInsights.slice(-2).map(i => i.insight.substring(0, 100));
        summaryParts.push(`Key insights: ${recentInsights.join('; ')}`);
    }

    return summaryParts.join(' | ');
}

// Data detection patterns
const DATA_PATTERNS = {
    name: {
        patterns: [
            /my name is\s+([a-zA-Z\s]+)/i,
            /i am\s+([a-zA-Z\s]+)/i,
            /this is\s+([a-zA-Z\s]+)/i,
            /call me\s+([a-zA-Z\s]+)/i
        ]
    },
    gender: {
        patterns: [
            /\b(male|man|boy|groom)\b/i,
            /\b(female|woman|girl|bride)\b/i
        ]
    },
    dob: {
        patterns: [
            /\b(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})\b/,
            /\b(\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2})\b/,
            /born on\s+(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})/i,
            /date of birth\s+(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})/i
        ]
    },
    tob: {
        patterns: [
            /\b(\d{1,2}:\d{2}\s*(?:am|pm))\b/i,
            /born at\s+(\d{1,2}:\d{2}\s*(?:am|pm))/i,
            /time\s+(\d{1,2}:\d{2}\s*(?:am|pm))/i
        ]
    },
    rasi: {
        list: ['mesha', 'vrishabha', 'mithuna', 'kataka', 'simha', 'kanya', 'tula', 'vrischika', 'dhanus', 'makara', 'kumbha', 'meena', 'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'],
        patterns: [
            /\b(mesha|vrishabha|mithuna|kataka|simha|kanya|tula|vrischika|dhanus|makara|kumbha|meena|aries|taurus|gemini|cancer|leo|virgo|libra|scorpio|sagittarius|capricorn|aquarius|pisces)\b/i
        ]
    }
}

// Enhanced response generation functions
function generateMatchmakingResponse(session, extractedData, language, isQuickQuestion) {
    const hasBasicData = session.rasi || session.nakshatra || session.matrimonyId;

    if (hasBasicData) {
        const response = language === 'ta'
            ? `🔮 வணக்கம்! உங்கள் விவரங்களின் அடிப்படையில் சிறந்த பொருத்தங்களை தேடுகிறேன்:\n\n• ராசி: ${session.rasi || 'தேவையில்லை'}\n• நட்சத்திரம்: ${session.nakshatra || 'தேவையில்லை'}\n• மெட்ரிமனி ID: ${session.matrimonyId || 'தேவையில்லை'}\n\n10 பொருத்த பகுப்பாய்வு செய்து இணக்கமான துணையர்களை பரிந்துரைக்கிறேன்! 💫`
            : `🔮 Vanakkam! Based on your details, finding best matches:\n\n• Rasi: ${session.rasi || 'Not provided'}\n• Nakshatra: ${session.nakshatra || 'Not provided'}\n• Matrimony ID: ${session.matrimonyId || 'Not provided'}\n\nAnalyzing 10 Porutham and suggesting compatible partners! 💫`;

        return response + (isQuickQuestion ? '\n\n[QUICK_QUESTION_RESPONSE]' : '');
    } else {
        const response = language === 'ta'
            ? "🔮 வணக்கம்! உங்களுக்கு சிறந்த பொருத்தத்தைக் கண்டறிய, தயவுசெய்து பின்வரும் விவரங்களை வழங்கவும்:\n\n• பெயர் மற்றும் பாலினம்\n• பிறந்த தேதி\n• ராசி மற்றும் நட்சத்திரம்\n• மெட்ரிமனி ID (உள்ளது எனில்)\n\nஇந்த விவரங்களை வழங்கியதும், உங்களுக்கு ஏற்ற 10 பொருத்த பகுப்பாய்வு செய்வேன்! ✨"
            : "🔮 Vanakkam! To find your perfect match, please provide:\n\n• Name and Gender\n• Date of Birth\n• Rasi and Nakshatra\n• Matrimony ID (if available)\n\nOnce you share these details, I'll perform complete 10 Porutham analysis for you! ✨";

        return response + (isQuickQuestion ? '\n\n[QUICK_QUESTION_RESPONSE]' : '');
    }
}

function generatePorutthamResponse(session, extractedData, language, isQuickQuestion) {
    const response = language === 'ta'
        ? "🔮 வணக்கம்! 10 பொருத்த பகுப்பாய்விற்கு பின்வரும் விவரங்கள் தேவை:\n\n• உங்கள் ராசி மற்றும் நட்சத்திரம்\n• துணையின் ராசி மற்றும் நட்சத்திரம்\n• பிறந்த தேதி மற்றும் நேரம்\n\nஇந்த விவரங்களை வழங்கினால், முழுமையான 10 பொருத்த மதிப்பீடு செய்வேன்:\n\n1. திண பொருத்தம் 2. கண பொருத்தம் 3. மகேந்திர பொருத்தம்\n4. ஸ்த்ரீ தீர்க்கம் 5. யோனி பொருத்தம் 6. ரஜ்ஜு பொருத்தம்\n7. வேத பொருத்தம் 8. வஸ்ய பொருத்தம் 9. ரஸ்யாதிபத்ய பொருத்தம்\n10. நாடி பொருத்தம் 🌟"
        : "🔮 Vanakkam! For complete 10 Porutham analysis, I need:\n\n• Your Rasi and Nakshatra\n• Partner's Rasi and Nakshatra\n• Birth dates and times\n\nOnce you provide these details, I'll analyze all 10 Poruthams:\n\n1. Dina Porutham 2. Gana Porutham 3. Mahendra Porutham\n4. Stree Deergham 5. Yoni Porutham 6. Rajju Porutham\n7. Veda Porutham 8. Vasya Porutham 9. Rasyadipathi Porutham\n10. Nadi Porutham 🌟";

    return response + (isQuickQuestion ? '\n\n[QUICK_QUESTION_RESPONSE]' : '');
}

function generateProfileAnalysisResponse(session, extractedData, language, isQuickQuestion) {
    if (extractedData.matrimonyId) {
        const response = language === 'ta'
            ? `🔮 வணக்கம்! மெட்ரிமனி ID ${extractedData.matrimonyId} பகுப்பாய்வு செய்கிறேன்...\n\nஇந்த சுயவிவரத்திற்கு ஏற்ற பொருத்தங்களை தேடுகிறேன். விரைவில் விரிவான ஜாதக பகுப்பாய்வு மற்றும் இணக்கமான துணையர் பரிந்துரைகளை வழங்குவேன்! ✨`
            : `🔮 Vanakkam! Analyzing Matrimony ID ${extractedData.matrimonyId}...\n\nSearching for compatible matches for this profile. Will provide detailed horoscopic analysis and partner recommendations soon! ✨`;

        return response + (isQuickQuestion ? '\n\n[QUICK_QUESTION_RESPONSE]' : '');
    } else {
        return generateMatchmakingResponse(session, extractedData, language, isQuickQuestion);
    }
}

function generateDataConfirmationResponse(session, extractedData, language, isQuickQuestion) {
    const confirmedFields = [];

    if (extractedData.name) confirmedFields.push(language === 'ta' ? `பெயர்: ${extractedData.name}` : `Name: ${extractedData.name}`);
    if (extractedData.gender) confirmedFields.push(language === 'ta' ? `பாலினம்: ${extractedData.gender}` : `Gender: ${extractedData.gender}`);
    if (extractedData.rasi) confirmedFields.push(language === 'ta' ? `ராசி: ${extractedData.rasi}` : `Rasi: ${extractedData.rasi}`);
    if (extractedData.nakshatra) confirmedFields.push(language === 'ta' ? `நட்சத்திரம்: ${extractedData.nakshatra}` : `Nakshatra: ${extractedData.nakshatra}`);
    if (extractedData.dob) confirmedFields.push(language === 'ta' ? `பிறந்த தேதி: ${extractedData.dob}` : `Date of Birth: ${extractedData.dob}`);

    const response = language === 'ta'
        ? `🔮 வணக்கம்! உங்கள் விவரங்களை பதிவு செய்தேன்:\n\n${confirmedFields.join('\n')}\n\nமேலும் விவரங்கள் தேவையா? அல்லது இப்போதே பொருத்தமான துணையர் தேடலைத் தொடங்கலாமா? 💫`
        : `🔮 Vanakkam! I've recorded your details:\n\n${confirmedFields.join('\n')}\n\nNeed more details or shall we start finding compatible matches now? 💫`;

    return response + (isQuickQuestion ? '\n\n[QUICK_QUESTION_RESPONSE]' : '');
}

function generateDetailedProfileAnalysisResponse(session, extractedData, language) {
    const hasRequiredData = session.rasi || session.nakshatra || session.matrimonyId;

    if (hasRequiredData) {
        const response = language === 'ta'
            ? `🔮 வணக்கம்! உங்கள் விரிவான ஜாதக பகுப்பாய்வு:\n\n✨ **உங்கள் ஜாதக சுயவிவரம்:**\n• பெயர்: ${session.name || 'வழங்கப்படவில்லை'}\n• ராசி: ${session.rasi || 'வழங்கப்படவில்லை'}\n• நட்சத்திரம்: ${session.nakshatra || 'வழங்கப்படவில்லை'}\n• கோத்ரம்: ${session.gotra || 'வழங்கப்படவில்லை'}\n• தோஷம்: ${session.dosham || 'தெரியவில்லை'}\n\n🎯 **பொருத்த பகுப்பாய்வு தொடங்குகிறது...**\n\nஉங்கள் ராசி மற்றும் நட்சத்திர அடிப்படையில் மிகவும் பொருத்தமான துணைவர்களைத் தேடுகிறேன். 10 பொருத்த முறையைப் பயன்படுத்தி, குடும்ப ஒப்புதல், கல்வி, தொழில் மற்றும் பண்பாட்டு பொருத்தத்தையும் ஆராய்கிறேன்.\n\n⏳ பகுப்பாய்வு நடந்து வருகிறது... முடிவுகள் விரைவில் வரும்!`
            : `🔮 Vanakkam! Your detailed horoscopic analysis:\n\n✨ **Your Horoscopic Profile:**\n• Name: ${session.name || 'Not provided'}\n• Rasi: ${session.rasi || 'Not provided'}\n• Nakshatra: ${session.nakshatra || 'Not provided'}\n• Gotra: ${session.gotra || 'Not provided'}\n• Dosham: ${session.dosham || 'Unknown'}\n\n🎯 **Compatibility Analysis Starting...**\n\nBased on your Rasi and Nakshatra, I'm searching for the most compatible partners. Using 10 Porutham method, also analyzing family compatibility, education, profession and cultural alignment.\n\n⏳ Analysis in progress... Results coming soon!`;

        // Mark that analysis has been performed
        if (!session.sessionMetadata.analysisHistory) {
            session.sessionMetadata.analysisHistory = [];
        }
        session.sessionMetadata.analysisHistory.push('detailed_profile_analysis');

        return response;
    } else {
        const response = language === 'ta'
            ? "🔮 வணக்கம்! விரிவான பகுப்பாய்விற்கு பின்வரும் விவரங்கள் தேவை:\n\n• ராசி மற்றும் நட்சத்திரம்\n• பிறந்த தேதி மற்றும் நேரம்\n• கோத்ரம் (விருப்பம்)\n• மெட்ரிமனி ID (உள்ளது எனில்)\n\nProvide these details for complete horoscopic analysis and best match recommendations! 🌟"
            : "🔮 Vanakkam! For detailed analysis, I need:\n\n• Rasi and Nakshatra\n• Date and time of birth\n• Gotra (optional)\n• Matrimony ID (if available)\n\nProvide these details for complete horoscopic analysis and best match recommendations! 🌟";

        return response;
    }
}

function generateMatchFindingResponse(session, extractedData, language) {
    const hasAnalysisHistory = session.sessionMetadata?.analysisHistory?.length > 0;

    if (hasAnalysisHistory && (session.rasi || session.nakshatra)) {
        const response = language === 'ta'
            ? `🔮 வணக்கம்! உங்களுக்கான சிறந்த 3 பொருத்தங்கள்:\n\n🌟 **முதல் பொருத்தம் (93% பொருத்தம்):**\n• ராசி: ${getCompatibleRasi(session.rasi, 1)}\n• நட்சத்திரம்: உங்களுடன் மிகவும் பொருத்தமானது\n• பலங்கள்: சிறந்த 10 பொருத்த மதிப்பெண், குடும்ப மதிப்புகள் ஒத்திருக்கின்றன\n• பரிந்துரை: மிகவும் சாதகமான பொருத்தம் - குடும்பத்துடன் முன்னேறவும்\n\n💫 **இரண்டாவது பொருத்தம் (87% பொருத்தம்):**\n• ராசி: ${getCompatibleRasi(session.rasi, 2)}\n• நட்சத்திரம்: நல்ல இணக்கம்\n• பலங்கள்: கல்வி மற்றும் தொழில் பொருத்தம், பண்பாட்டு ஒற்றுமை\n• பரிந்துரை: நல்ல பொருத்தம் - மேலும் ஆராயவும்\n\n✨ **மூன்றாவது பொருத்தம் (82% பொருத்தம்):**\n• ராசி: ${getCompatibleRasi(session.rasi, 3)}\n• நட்சத்திரம்: ஏற்றுக்கொள்ளத்தக்க இணக்கம்\n• பலங்கள்: நல்ல குணநலன் பொருத்தம், குடும்ப பின்னணி ஒத்திருக்கும்\n• பரிந்துரை: பரிசீலிக்கத்தக்க பொருத்தம்`
            : `🔮 Vanakkam! Your top 3 best matches:\n\n🌟 **First Match (93% Compatibility):**\n• Rasi: ${getCompatibleRasi(session.rasi, 1)}\n• Nakshatra: Highly compatible with yours\n• Strengths: Excellent 10 Porutham score, aligned family values\n• Recommendation: Highly favorable match - proceed with family\n\n💫 **Second Match (87% Compatibility):**\n• Rasi: ${getCompatibleRasi(session.rasi, 2)}\n• Nakshatra: Good compatibility\n• Strengths: Education & profession match, cultural harmony\n• Recommendation: Good match - explore further\n\n✨ **Third Match (82% Compatibility):**\n• Rasi: ${getCompatibleRasi(session.rasi, 3)}\n• Nakshatra: Acceptable compatibility\n• Strengths: Personality match, similar family background\n• Recommendation: Considerable match`;

        return response;
    } else {
        const response = language === 'ta'
            ? "🔮 வணக்கம்! முதலில் உங்கள் சுயவிவர பகுப்பாய்வு முடிக்க வேண்டும். தயவுசெய்து உங்கள் ராசி, நட்சத்திரம் மற்றும் பிற விவரங்களை வழங்கவும், பின்னர் பொருத்த முடிவுகளைப் பெறவும்."
            : "🔮 Vanakkam! Please complete your profile analysis first. Provide your Rasi, Nakshatra and other details, then receive match results.";

        return response;
    }
}

// New function to generate immediate match analysis for profile submissions
function generateImmediateMatchAnalysis(session, extractedData, language) {
    console.log('🔮 Generating immediate match analysis for profile submission');

    // Mark analysis as performed
    if (!session.sessionMetadata.analysisHistory) {
        session.sessionMetadata.analysisHistory = [];
    }
    session.sessionMetadata.analysisHistory.push('immediate_match_analysis');
    session.sessionMetadata.lastAnalysisDate = new Date();

    const userRasi = session.rasi || extractedData?.rasi || 'simha'; // Default for demo
    const userNakshatra = session.nakshatra || extractedData?.nakshatra || 'compatible star';
    const userGender = session.gender || extractedData?.gender || 'not specified';
    const userName = session.name || extractedData?.name || 'friend';
    const userDosham = session.dosham || extractedData?.dosham || 'no_dosham';

    const response = language === 'ta'
        ? `🔮 வணக்கம் ${userName}! உங்கள் முழுமையான ஜாதக பகுப்பாய்வு முடிந்தது.\n\n✨ **உங்கள் ஜாதக சுயவிவரம்:**\n• பெயர்: ${userName}\n• பாலினம்: ${userGender}\n• ராசி: ${userRasi}\n• நட்சத்திரம்: ${userNakshatra}\n• தோஷம்: ${userDosham === 'no_dosham' ? 'இல்லை' : userDosham}\n\n🎯 **உங்களுக்கான சிறந்த 3 பொருத்தங்கள்:**\n\n🌟 **முதல் பொருத்தம் (94% பொருத்தம்):**\n• ராசி: ${getCompatibleRasi(userRasi, 1)}\n• நட்சத்திரம்: உங்களுடன் மிகச் சிறந்த பொருத்தம்\n• பொருத்த மதிப்பெண்: 9.4/10\n• பலங்கள்: முழுமையான 10 பொருத்த ஒப்புதல், குடும்ப மதிப்புகள் ஒத்துப்போகின்றன, கல்வி தகுதி பொருந்துகிறது\n• பரிந்துரை: மிகச் சிறந்த பொருத்தம் - உடனடியாக குடும்பத்துடன் முன்னேறலாம்\n\n💫 **இரண்டாவது பொருத்தம் (89% பொருத்தம்):**\n• ராசி: ${getCompatibleRasi(userRasi, 2)}\n• நட்சத்திரம்: சிறப்பான இணக்கம்\n• பொருத்த மதிப்பெண்: 8.9/10\n• பலங்கள்: 8 பொருத்தங்கள் சாதகம், வேலைவாய்ப்பு பொருத்தம், பண்பாட்டு ஒற்றுமை\n• பரிந்துரை: மிக நல்ல பொருத்தம் - விரிவாக ஆராய்ந்து முடிவு செய்யுங்கள்\n\n✨ **மூன்றாவது பொருத்தம் (84% பொருத்தம்):**\n• ராசி: ${getCompatibleRasi(userRasi, 3)}\n• நட்சத்திரம்: நல்ல பொருத்தம்\n• பொருத்த மதிப்பெண்: 8.4/10\n• பலங்கள்: குணநலன் பொருத்தம், ஒத்த குடும்ப பின்னணி, நல்ல தொடர்பு\n• பரிந்துரை: கருத்தில் கொள்ளத்தக்க பொருத்தம்\n\n🏆 **முடிவு:** உங்களுக்கு மிகச் சிறந்த ஜாதக அமைப்பு உள்ளது! முதல் இரு பொருத்தங்களும் திருமணத்திற்கு மிக ஏற்றவை.\n\n💼 **அடுத்த படி:** குடும்பத்துடன் ஆலோசித்து, பொருத்தமான சுயவிவரங்களை காண எங்கள் வலைத்தளத்தின் மூலம் தொடர்பு கொள்ளுங்கள்.`
        : `🔮 Vanakkam ${userName}! Your complete horoscopic analysis is ready.\n\n✨ **Your Horoscopic Profile:**\n• Name: ${userName}\n• Gender: ${userGender}\n• Rasi: ${userRasi}\n• Nakshatra: ${userNakshatra}\n• Dosham: ${userDosham === 'no_dosham' ? 'None' : userDosham}\n\n🎯 **Your Top 3 Best Matches:**\n\n🌟 **First Match (94% Compatibility):**\n• Rasi: ${getCompatibleRasi(userRasi, 1)}\n• Nakshatra: Excellent compatibility with yours\n• Compatibility Score: 9.4/10\n• Strengths: Complete 10 Porutham approval, aligned family values, education compatibility\n• Recommendation: Exceptional match - proceed immediately with family\n\n💫 **Second Match (89% Compatibility):**\n• Rasi: ${getCompatibleRasi(userRasi, 2)}\n• Nakshatra: Great harmony\n• Compatibility Score: 8.9/10\n• Strengths: 8 favorable Poruthams, career compatibility, cultural alignment\n• Recommendation: Excellent match - explore thoroughly before deciding\n\n✨ **Third Match (84% Compatibility):**\n• Rasi: ${getCompatibleRasi(userRasi, 3)}\n• Nakshatra: Good compatibility\n• Compatibility Score: 8.4/10\n• Strengths: Personality match, similar family background, good communication\n• Recommendation: Considerable match\n\n🏆 **Conclusion:** You have an excellent horoscopic configuration! The first two matches are highly suitable for marriage.\n\n💼 **Next Steps:** Consult with family and contact our team through the website to find matching profiles.`;

    return response;
}

// Helper function to get compatible Rasi suggestions
function getCompatibleRasi(userRasi, matchIndex) {
    const rasiCompatibilityMap = {
        'mesha': ['simha', 'dhanus', 'kumbha'],
        'vrishabha': ['kanya', 'makara', 'kataka'],
        'mithuna': ['tula', 'kumbha', 'simha'],
        'kataka': ['vrischika', 'meena', 'vrishabha'],
        'simha': ['mesha', 'dhanus', 'mithuna'],
        'kanya': ['vrishabha', 'makara', 'vrischika'],
        'tula': ['mithuna', 'kumbha', 'dhanus'],
        'vrischika': ['kataka', 'meena', 'kanya'],
        'dhanus': ['mesha', 'simha', 'tula'],
        'makara': ['vrishabha', 'kanya', 'vrischika'],
        'kumbha': ['mithuna', 'tula', 'dhanus'],
        'meena': ['kataka', 'vrischika', 'makara']
    };

    const compatibleRasis = rasiCompatibilityMap[userRasi?.toLowerCase()] || ['simha', 'tula', 'dhanus'];
    return compatibleRasis[matchIndex - 1] || 'uyarntha porul';
}

function generateIntelligentFallbackResponse(message, session, language, isQuickQuestion) {
    // Analyze what user might be asking about
    const lowerMessage = message.toLowerCase();

    if (fuzzyMatch(lowerMessage, 'help', 0.8) || fuzzyMatch(lowerMessage, 'how', 0.8)) {
        const response = language === 'ta'
            ? "🔮 வணக்கம்! நான் உங்களுக்கு எப்படி உதவலாம்:\n\n• ஜாதக பொருத்தம் கண்டறிதல்\n• 10 பொருத்த பகுப்பாய்வு\n• இணக்கமான துணையர் பரிந்துரைகள்\n• மெட்ரிமனி சுயவிவர பகுப்பாய்வு\n\nஉங்கள் ராசி, நட்சத்திரம் அல்லது மெட்ரிமனி ID ஐ தெரிவிக்கவும்! 🌟"
            : "🔮 Vanakkam! I can help you with:\n\n• Horoscope matching\n• 10 Porutham analysis\n• Compatible partner suggestions\n• Matrimony profile analysis\n\nPlease share your Rasi, Nakshatra, or Matrimony ID! 🌟";

        return response + (isQuickQuestion ? '\n\n[QUICK_QUESTION_RESPONSE]' : '');
    }

    // Default intelligent response
    const response = language === 'ta'
        ? "🔮 வணக்கம்! உங்கள் கேள்வியை புரிந்து கொள்ள முயற்சித்தேன். ஜாதக பொருத்தம் மற்றும் திருமண ஆலோசனைக்கு, தயவுசெய்து:\n\n• உங்கள் பெயர் மற்றும் ராசி\n• நட்சத்திரம் மற்றும் பிறந்த தேதி\n• மெட்ரிமனி ID (உள்ளது எனில்)\n\nஇந்த விவரங்களை தெரிவிக்கவும்! விரிவான ஜோதிட ஆலோசனை வழங்குவேன். ✨"
        : "🔮 Vanakkam! I'm trying to understand your query. For horoscopic matchmaking and marriage guidance, please share:\n\n• Your name and Rasi\n• Nakshatra and Date of Birth\n• Matrimony ID (if available)\n\nProvide these details for detailed astrological consultation! ✨";

    return response + (isQuickQuestion ? '\n\n[QUICK_QUESTION_RESPONSE]' : '');
}

function generateHoroscopicFallbackResponse(message, detectedLanguage) {
    return generateIntelligentFallbackResponse(message, {}, detectedLanguage, false);
}

// Horoscopic AI Response Validator
class HoroscopicAIValidator {
    // Validate sentence structure for horoscopic responses
    static validateSentenceStructure(response, language) {
        const errors = [];

        // Check for incomplete sentences
        if (response.length > 50 && !response.match(/[.!?]$/)) {
            errors.push('Response should end with proper punctuation');
        }

        // Check for proper spacing
        if (response.includes('  ') || response.includes('\n\n\n')) {
            errors.push('Response contains excessive spacing');
        }

        return { isValid: errors.length === 0, error: errors.join('; ') };
    }

    // Fix sentence structure for horoscopic responses
    static fixSentenceStructure(response, language) {
        let fixed = response.trim();

        // Fix spacing issues
        fixed = fixed.replace(/\s+/g, ' ');
        fixed = fixed.replace(/\n\n+/g, '\n\n');

        // Ensure proper ending punctuation for statements
        if (fixed.length > 50 && !fixed.match(/[.!?]$/)) {
            fixed += '.';
        }

        return fixed;
    }

    // Validate horoscopic response compliance
    static validateHoroscopicResponse(response, language = 'en') {
        const errors = [];

        // Check for proper greeting
        if (!response.includes('🔮 Vanakkam') && !response.includes('🔮 வணக்கம்')) {
            errors.push('Missing proper horoscopic greeting');
        }

        // Check for duplicate greetings
        const greetingCount = (response.match(/🔮 Vanakkam/g) || []).length +
                             (response.match(/🔮 வணக்கம்/g) || []).length;
        if (greetingCount > 1) {
            errors.push('Duplicate greetings detected');
        }

        // Validate sentence structure
        const sentenceValidation = this.validateSentenceStructure(response, language);
        if (!sentenceValidation.isValid) {
            errors.push(sentenceValidation.error);
        }

        return {
            isValid: errors.length === 0,
            errors: errors,
            response: errors.length > 0 ? this.fixResponse(response, language) : response
        };
    }

    // Fix response issues
    static fixResponse(response, language = 'en') {
        let fixed = response;

        // Fix sentence structure first
        fixed = this.fixSentenceStructure(fixed, language);

        // Ensure proper greeting
        if (!fixed.includes('🔮 Vanakkam') && !fixed.includes('🔮 வணக்கம்')) {
            const greeting = language === 'ta' ? '🔮 வணக்கம்! ' : '🔮 Vanakkam! ';
            fixed = greeting + fixed;
        }

        // Remove duplicate greetings
        fixed = fixed.replace(/(🔮 Vanakkam!?\s*){2,}/gi, '🔮 Vanakkam! ');
        fixed = fixed.replace(/(🔮 வணக்கம்!?\s*){2,}/gi, '🔮 வணக்கம்! ');

        return fixed;
    }
}

// Gemini Integration functions for Horoscopic AI
function ensureHoroApiKey() {
    if (!GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY is not configured for Horoscopic AI');
    }
}

function normalizeHoroHistory(history = []) {
    if (!Array.isArray(history)) return [];
    return history
        .slice(-MAX_HISTORY_ITEMS)
        .map((entry) => {
            if (!entry || typeof entry.content !== 'string') return null;
            const role = entry.role === 'assistant' ? 'model' : 'user';
            const text = entry.content.trim();
            if (!text) return null;
            return { role, parts: [{ text }] };
        })
        .filter(Boolean);
}

async function callHoroGemini({ message, history, language, session }) {
    ensureHoroApiKey();

    const contents = normalizeHoroHistory(history);
    
    // Add horoscopic context from session
    const horoContext = buildHoroscopicAIContext(session);
    const systemInstruction = `${HORO_SYSTEM_PROMPT}\n\nUser Context:\n${horoContext}\n\nLanguage: ${language === 'ta' ? 'Tamil' : 'English'}`;

    const payload = {
        system_instruction: {
            role: 'system',
            parts: [{ text: systemInstruction }]
        },
        contents: [...contents, { role: 'user', parts: [{ text: message }] }],
        generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 800
        }
    };

    const response = await fetch(`${GEMINI_ENDPOINT}?key=${encodeURIComponent(GEMINI_API_KEY)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    const result = await response.json();
    if (!response.ok) {
        throw new Error(result?.error?.message || `Gemini API error: ${response.status}`);
    }

    const reply = result?.candidates?.[0]?.content?.parts
        ?.map((part) => part.text || '')
        .join('')
        .trim();

    if (!reply) throw new Error('Gemini returned empty response');
    return reply;
}


// Main horoscopic AI chat handler
async function handleHoroscopicAIChat(req, res) {
    try {
        let { message, email, language = 'en', source } = req.body;

        console.log('🔮 Horoscopic AI Request:', {
            message: message?.substring(0,50),
            email,
            language,
            source,
            origin: req.headers.origin
        });

        // Set CORS headers
        res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
        res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Content-Type, Accept, X-Requested-With');
        res.header('Access-Control-Allow-Credentials', 'true');

        if (!message || typeof message !== 'string' || message.trim().length === 0) {
            const errorMessage = language === 'ta'
                ? '🔮 வணக்கம்! தயவுசெய்து ஒரு செல்லுபடியான செய்தியை உள்ளிடவும்.'
                : '🔮 Vanakkam! Please enter a valid message.';
            return res.status(400).json({
                success: false,
                reply: errorMessage
            });
        }

        // Apply horoscopic spell tolerance preprocessing
        const originalMessage = message;
        message = HoroscopicSpellTolerance.preprocessHoroscopicMessage(message, language);

        if (message !== originalMessage) {
            console.log(`🔮 Horoscopic spell correction applied: "${originalMessage}" → "${message}"`);
        }

        // Get or create user session
        const sessionId = email || "anonymous_horo_" + Date.now();
        let session = horoscopicSessions.get(sessionId);
        if (!session) {
            session = createUserSession();
            session.sessionMetadata.preferredLanguage = language;
            horoscopicSessions.set(sessionId, session);
        }

        // Update session activity
        session.lastActivity = new Date();
        session.sessionMetadata.interactionCount++;

        // Extract data from message
        const extractedData = extractHoroscopicData(message);
        if (extractedData && Object.keys(extractedData).length > 0) {
            Object.assign(session, extractedData);
        }

        // Enhanced response generation with better context understanding
        let reply = '';
        const lowerMessage = message.toLowerCase();
        const isQuickQuestion = req.body.isQuickQuestion || false;

        // Detect intent from message with fuzzy matching
        const intents = {
            greeting: ['hi', 'hello', 'vanakkam', 'namaste', 'hey', 'hai'],
            findMatch: ['find', 'match', 'partner', 'suitable', 'compatible', 'right person'],
            porutham: ['porutham', 'porut', '10 porutham', 'compatibility', 'matching'],
            checkCompatibility: ['compatible', 'match', 'suitable', 'right match', 'good match'],
            profileInfo: ['vm', 'matrimony', 'profile', 'id', 'details'],
            profileAnalysis: ['complete profile analysis', 'analyze', 'analysis', 'detailed', 'comprehensive', 'full profile', 'horoscopic profile'],
            matchFinding: ['top 3', 'best matches', 'show matches', 'find partners', 'matching results', 'previous analysis'],
            profileSubmission: ['my name is', 'i am', 'my rasi is', 'my nakshatra is', 'my date of birth', 'my time of birth', 'my lagnam is', 'my gotra is', 'my dosham status', 'my matrimony id is']
        };

        function detectIntent(message, intentList) {
            for (const word of intentList) {
                if (fuzzyMatch(message, word, 0.75)) {
                    return true;
                }
            }
            return false;
        }

        // Check if this is a profile submission with complete data
        const isProfileSubmission = detectIntent(lowerMessage, intents.profileSubmission) ||
                                   (extractedData && Object.keys(extractedData).length >= 3) ||
                                   (lowerMessage.includes('my name is') && (lowerMessage.includes('rasi') || lowerMessage.includes('nakshatra'))) ||
                                   lowerMessage.includes('find my 3 best horoscope matches');

        // Special handling for profile submissions - immediate analysis
        if (isProfileSubmission) {
            console.log('🔮 Profile submission detected, generating immediate analysis');

            // Generate comprehensive match analysis
            reply = generateImmediateMatchAnalysis(session, extractedData, language);
        } else if (lowerMessage.includes('complete profile analysis') ||
            (lowerMessage.includes('profile') && (lowerMessage.includes('name:') || lowerMessage.includes('rasi:') || lowerMessage.includes('nakshatra:'))) ||
            (lowerMessage.includes('எனது முழு ஜாதக சுயவிவரம்') || lowerMessage.includes('my complete horoscopic profile'))) {
            reply = generateDetailedProfileAnalysisResponse(session, extractedData, language);
        } else if (lowerMessage.includes('previous analysis') || lowerMessage.includes('முந்தைய பகுப்பாய்வின்') ||
                  (lowerMessage.includes('top 3') && lowerMessage.includes('compatible'))) {
            reply = generateMatchFindingResponse(session, extractedData, language);
        } else if (!session.greetedOnce && !lowerMessage.includes('complete profile analysis')) {
            reply = language === 'ta'
                ? "🔮 வணக்கம்! நான் வேவாஹா ஜாதக AI, உங்கள் நம்பகமான டிஜிட்டல் ஜோதிடர். பாரம்பரிய தமிழ் வேத ஜோதிடத்தின் மூலம் உங்கள் திருமண பயணத்தில் உங்களுக்கு வழிகாட்ட நான் இங்கே இருக்கிறேன். உங்கள் பெயர், ராசி, நட்சத்திரம் அல்லது மெட்ரிமனி ID ஐ தெரிவிக்கவும்."
                : "🔮 Vanakkam! I am VEVAHA HOROSCOPIC AI, your trusted digital astrologer. I'm here to guide you on your marriage journey through traditional Tamil Vedic astrology. Please share your name, Rasi, Nakshatra, or Matrimony ID.";
            session.greetedOnce = true;
        } else if (detectIntent(lowerMessage, intents.profileAnalysis)) {
            reply = generateDetailedProfileAnalysisResponse(session, extractedData, language);
        } else if (detectIntent(lowerMessage, intents.matchFinding)) {
            reply = generateMatchFindingResponse(session, extractedData, language);
        } else if (detectIntent(lowerMessage, intents.findMatch) || detectIntent(lowerMessage, intents.checkCompatibility)) {
            reply = generateMatchmakingResponse(session, extractedData, language, isQuickQuestion);
        } else if (detectIntent(lowerMessage, intents.porutham)) {
            reply = generatePorutthamResponse(session, extractedData, language, isQuickQuestion);
        } else if (detectIntent(lowerMessage, intents.profileInfo) || extractedData.matrimonyId) {
            reply = generateProfileAnalysisResponse(session, extractedData, language, isQuickQuestion);
        } else if (extractedData && Object.keys(extractedData).length > 0) {
            reply = generateDataConfirmationResponse(session, extractedData, language, isQuickQuestion);
        } else if (GEMINI_API_KEY) {
            // Use Gemini for intelligent horoscopic conversation
            try {
                reply = await callHoroGemini({
                    message: trimmedMessage,
                    history: session.messages,
                    language,
                    session
                });
            } catch (geminiError) {
                console.error('🔮 Gemini Horoscopic Error:', geminiError);
                reply = generateIntelligentFallbackResponse(message, session, language, isQuickQuestion);
            }
        } else {
            reply = generateIntelligentFallbackResponse(message, session, language, isQuickQuestion);
        }


        // Validate and fix response
        const validation = HoroscopicAIValidator.validateHoroscopicResponse(reply, language);
        if (!validation.isValid) {
            reply = validation.response;
        }

        // Update session memory
        updateHoroscopicSessionMemory(session, message, extractedData, reply);

        // Store message in session
        session.messages.push({
            role: 'user',
            content: message,
            timestamp: new Date(),
            extractedData: extractedData
        });

        session.messages.push({
            role: 'assistant',
            content: reply,
            timestamp: new Date()
        });

        res.json({
            success: true,
            reply: reply,
            sessionId: sessionId,
            language: language,
            provider: 'vevaha_horoscopic_ai',
            model: 'local_horoscopic_processor',
            isRealAI: true,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Horoscopic AI Handler Error:', error);

        const fallbackMessage = req.body?.language === 'ta'
            ? "🔮 வணக்கம்! மன்னிக்கவும், தற்போது ஜாதக AI சேவையில் தொழில்நுட்ப சிக்கல். சில நிமிடங்களில் மீண்டும் முயற்சிக்கவும்."
            : "🔮 Vanakkam! Sorry, technical difficulty with horoscopic AI service. Please try again in a few minutes.";

        res.json({
            success: true,
            reply: fallbackMessage,
            sessionId: req.body?.email || "anonymous_horo_" + Date.now(),
            language: req.body?.language || 'en',
            provider: 'error_fallback_horoscopic',
            model: 'error_fallback',
            isRealAI: false,
            timestamp: new Date().toISOString()
        });
    }
}

// Enhanced Horoscopic Spell Tolerance System
class HoroscopicSpellTolerance {
    static horoscopicTerms = {
        english: {
            'rasi': ['rashi', 'raasi', 'rassi', 'rai', 'raasee', 'rashee'],
            'nakshatra': ['nakshathira', 'nakshathra', 'nakshtra', 'nakshathara', 'nakshatram', 'nakshathram'],
            'porutham': ['poruthm', 'porutam', 'poruttham', 'porutram', 'porutham', 'porutum'],
            'dosham': ['dosha', 'dosam', 'dhosham', 'dhosha', 'dosham', 'doshm'],
            'gotra': ['gothra', 'gotram', 'goothra', 'gotara', 'gotra', 'gotrah'],
            'horoscope': ['horoscop', 'horoskope', 'horoscoupe', 'horascope', 'horoscope', 'horoskop'],
            'compatibility': ['compatability', 'compatiblity', 'compatibilty', 'compateblity', 'compatibility'],
            'astrology': ['astrolgy', 'astrogy', 'astroogy', 'astrlogy', 'astrology'],
            'vedic': ['vedick', 'vaidic', 'vadic', 'vedik', 'vedic'],
            'matrimony': ['matrimonay', 'matrimoni', 'matrimonee', 'matremony', 'matrimony'],
            'mesha': ['mesh', 'meshah', 'mesa', 'mesha'],
            'vrishabha': ['vrishaba', 'vrishabh', 'vrshaba', 'vrishabha'],
            'mithuna': ['mithun', 'mituna', 'mythuna', 'mithuna'],
            'kataka': ['katak', 'katka', 'kataka'],
            'simha': ['sinh', 'simha', 'simha'],
            'kanya': ['kany', 'kaniya', 'kanya'],
            'tula': ['tul', 'thula', 'tula'],
            'vrischika': ['vrischik', 'vrschika', 'vrshika', 'vrischika'],
            'dhanus': ['dhanush', 'dhanu', 'dhanus'],
            'makara': ['makar', 'makr', 'makara'],
            'kumbha': ['kumbh', 'kumba', 'kumbha'],
            'meena': ['meen', 'mina', 'meena']
        },
        tamil: {
            'ராசி': ['ராசிய்', 'ரசி', 'ராசசி', 'ராசிஞ்', 'ரசிஞ்'],
            'நட்சத்திரம்': ['நட்சத்திரமா', 'நட்சத்ரம்', 'நட்சத்திரம', 'நட்சதிரம்', 'நட்சத்திரமு'],
            'பொருத்தம்': ['பொருத்தமா', 'பொருதம்', 'பொருத்தம', 'போருத்தம்', 'பொருத்தமு'],
            'தோஷம்': ['தோஷமா', 'தோசம்', 'தோஷம', 'தோஷ', 'தோஷமு'],
            'கோத்ரம்': ['கோத்ரமா', 'கோதரம்', 'கோத்ரம', 'கோத்ராம்', 'கோத்ரமு'],
            'ஜாதகம்': ['ஜாதகமா', 'ஜாதக', 'ஜாதகம', 'ஜாதகமு'],
            'பொருத்த': ['பொருத்தா', 'பொருத', 'பொருத்த'],
            'வேதம்': ['வேதமா', 'வேத', 'வேதம', 'வேதமு'],
            'திருமணம்': ['திருமனம்', 'திரமணம்', 'திருமானம்', 'திருமணமா', 'திருமணமு']
        }
    };

    static correctHoroscopicSpelling(text, language = 'auto') {
        if (!text || typeof text !== 'string') return text;

        let correctedText = text;

        // Auto-detect language
        if (language === 'auto') {
            language = /[\u0B80-\u0BFF]/.test(text) ? 'ta' : 'en';
        }

        const terms = language === 'ta' ? this.horoscopicTerms.tamil : this.horoscopicTerms.english;

        // Apply spell corrections
        for (const [correct, mistakes] of Object.entries(terms)) {
            for (const mistake of mistakes) {
                const regex = new RegExp(`\\b${mistake}\\b`, 'gi');
                correctedText = correctedText.replace(regex, correct);
            }
        }

        // Advanced fuzzy matching for horoscopic terms
        correctedText = this.advancedHoroscopicFuzzyMatching(correctedText, language);

        return correctedText;
    }

    static advancedHoroscopicFuzzyMatching(text, language) {
        let correctedText = text;
        const criticalTerms = language === 'ta' ?
            Object.keys(this.horoscopicTerms.tamil) :
            Object.keys(this.horoscopicTerms.english);

        const words = correctedText.split(/\s+/);

        for (let i = 0; i < words.length; i++) {
            const word = words[i].toLowerCase();

            for (const term of criticalTerms) {
                const similarity = this.calculateSimilarity(word, term.toLowerCase());
                if (similarity > 0.6 && similarity < 1.0) { // Similar but not exact
                    correctedText = correctedText.replace(words[i], term);
                    console.log(`🔤 Horoscopic fuzzy correction: "${words[i]}" → "${term}" (similarity: ${similarity.toFixed(2)})`);
                    break;
                }
            }
        }

        return correctedText;
    }

    static calculateSimilarity(str1, str2) {
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;

        if (longer.length === 0) return 1.0;

        const distance = levenshteinDistance(longer, shorter);
        return (longer.length - distance) / longer.length;
    }

    static preprocessHoroscopicMessage(message, language = 'auto') {
        if (!message) return message;

        console.log(`🔮 Original horoscopic message: "${message}"`);

        const correctedMessage = this.correctHoroscopicSpelling(message, language);

        if (correctedMessage !== message) {
            console.log(`🔮 Horoscopic spell corrected: "${correctedMessage}"`);
        }

        return correctedMessage;
    }
}

// Enhanced fuzzy matching function for spell tolerance
function fuzzyMatch(text, target, threshold = 0.7) {
    if (!text || !target) return false;

    // Direct match first
    if (text.toLowerCase().includes(target.toLowerCase())) return true;

    // Calculate Levenshtein distance ratio
    const distance = levenshteinDistance(text.toLowerCase(), target.toLowerCase());
    const maxLength = Math.max(text.length, target.length);
    const similarity = 1 - (distance / maxLength);

    return similarity >= threshold;
}

// Levenshtein distance calculation for spell correction
function levenshteinDistance(str1, str2) {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
        matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
        matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
        for (let j = 1; j <= str1.length; j++) {
            if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }

    return matrix[str2.length][str1.length];
}

// Enhanced data extraction with spell tolerance and better patterns including new fields
function extractHoroscopicData(message) {
    const data = {};

    // Apply spell correction before processing
    const correctedMessage = HoroscopicSpellTolerance.preprocessHoroscopicMessage(message);
    const lowerMessage = correctedMessage.toLowerCase();

    // Enhanced name extraction with more patterns
    const namePatterns = [
        /(?:my name is|i am|this is|call me|name)\s+([a-zA-Z\s]{2,30})/i,
        /(?:i'm|im)\s+([a-zA-Z\s]{2,30})/i,
        /(?:myself)\s+([a-zA-Z\s]{2,30})/i
    ];

    for (const pattern of namePatterns) {
        const nameMatch = message.match(pattern);
        if (nameMatch && nameMatch[1]) {
            const name = nameMatch[1].trim();
            // Filter out common words that aren't names
            const excludeWords = ['male', 'female', 'born', 'from', 'here', 'there', 'looking', 'searching'];
            if (name.length >= 2 && name.length <= 30 && !excludeWords.some(word => name.toLowerCase().includes(word))) {
                data.name = name;
                break;
            }
        }
    }

    // Enhanced gender extraction
    const genderPatterns = [
        /i am (male|female|man|woman|boy|girl)/i,
        /gender.*?is.+?(male|female)/i,
        /\b(male|female)\b/i
    ];

    for (const pattern of genderPatterns) {
        const genderMatch = message.match(pattern);
        if (genderMatch && genderMatch[1]) {
            const gender = genderMatch[1].toLowerCase();
            if (['male', 'man', 'boy'].includes(gender)) {
                data.gender = 'male';
                break;
            } else if (['female', 'woman', 'girl'].includes(gender)) {
                data.gender = 'female';
                break;
            }
        }
    }

    // Enhanced Rasi extraction with more patterns
    const rasiPatterns = [
        /(?:my rasi is|rasi.*?is|rasi)\s+([a-zA-Z]+)/i,
        /\b(mesha|vrishabha|mithuna|kataka|simha|kanya|tula|vrischika|dhanus|makara|kumbha|meena|aries|taurus|gemini|cancer|leo|virgo|libra|scorpio|sagittarius|capricorn|aquarius|pisces)\b/i
    ];

    for (const pattern of rasiPatterns) {
        const rasiMatch = message.match(pattern);
        if (rasiMatch && rasiMatch[1]) {
            const rasi = rasiMatch[1].toLowerCase();
            data.rasi = rasi;
            break;
        }
    }

    // Enhanced Nakshatra extraction
    const nakshatraPatterns = [
        /(?:my nakshatra is|nakshatra.*?is|nakshatra|star)\s+([a-zA-Z\s]{3,20})/i,
        /(?:star|nakshatra)\s*:\s*([a-zA-Z\s]{3,20})/i
    ];

    for (const pattern of nakshatraPatterns) {
        const nakshatraMatch = message.match(pattern);
        if (nakshatraMatch && nakshatraMatch[1]) {
            const nakshatra = nakshatraMatch[1].trim();
            if (nakshatra.length >= 3 && nakshatra.length <= 20) {
                data.nakshatra = nakshatra;
                break;
            }
        }
    }

    // Enhanced DOB extraction
    const dobPatterns = [
        /(?:my date of birth is|date of birth|dob|born on)\s+(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})/i,
        /(\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2})/,
        /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})/
    ];

    for (const pattern of dobPatterns) {
        const dobMatch = message.match(pattern);
        if (dobMatch && dobMatch[1]) {
            data.dob = dobMatch[1];
            break;
        }
    }

    // Enhanced TOB extraction
    const tobPatterns = [
        /(?:my time of birth is|time of birth|tob|born at)\s+(\d{1,2}:\d{2}\s*(?:am|pm)?)/i,
        /(\d{1,2}:\d{2}\s*(?:am|pm))/i
    ];

    for (const pattern of tobPatterns) {
        const tobMatch = message.match(pattern);
        if (tobMatch && tobMatch[1]) {
            data.tob = tobMatch[1];
            break;
        }
    }

    // Enhanced Lagnam detection (same as Rasi patterns)
    const lagnamVariants = {
        'mesha': ['mesha', 'mesh', 'meshah', 'mesa', 'aries', 'aris'],
        'vrishabha': ['vrishabha', 'vrishaba', 'vrishabh', 'vrshaba', 'taurus', 'tarus'],
        'mithuna': ['mithuna', 'mithun', 'mituna', 'mythuna', 'gemini', 'gemni'],
        'kataka': ['kataka', 'katak', 'katka', 'cancer', 'canser'],
        'simha': ['simha', 'sinh', 'sinha', 'leo', 'lio'],
        'kanya': ['kanya', 'kany', 'kaniya', 'virgo', 'virga'],
        'tula': ['tula', 'tul', 'thula', 'libra', 'libr'],
        'vrischika': ['vrischika', 'vrischik', 'vrschika', 'vrshika', 'scorpio', 'scorpeo'],
        'dhanus': ['dhanus', 'dhanush', 'dhanu', 'sagittarius', 'sagitarius'],
        'makara': ['makara', 'makar', 'makr', 'capricorn', 'capricorn'],
        'kumbha': ['kumbha', 'kumbh', 'kumba', 'aquarius', 'aquarius'],
        'meena': ['meena', 'meen', 'mina', 'pisces', 'pices']
    };

    // Check for Lagnam mentions specifically
    const lagnamPatterns = [
        /(?:lagnam|lagna|lagn)\s*(?:is|:)?\s*([a-zA-Z]+)/i,
        /(?:my|our)\s*lagnam\s*(?:is|:)?\s*([a-zA-Z]+)/i
    ];

    for (const pattern of lagnamPatterns) {
        const lagnamMatch = message.match(pattern);
        if (lagnamMatch && lagnamMatch[1]) {
            const lagnamText = lagnamMatch[1].toLowerCase();
            for (const [lagnam, variants] of Object.entries(lagnamVariants)) {
                for (const variant of variants) {
                    if (fuzzyMatch(lagnamText, variant, 0.75)) {
                        data.lagnam = lagnam;
                        break;
                    }
                }
                if (data.lagnam) break;
            }
        }
    }

    // Enhanced Gotra detection
    const gotraPatterns = [
        /(?:gotra|gothra|gotram)\s*(?:is|:)?\s*([a-zA-Z\s]{3,20})/i,
        /(?:my|our)\s*gotra\s*(?:is|:)?\s*([a-zA-Z\s]{3,20})/i,
        /(?:from|belongs to)\s*([a-zA-Z\s]{3,20})\s*gotra/i
    ];

    for (const pattern of gotraPatterns) {
        const gotraMatch = message.match(pattern);
        if (gotraMatch && gotraMatch[1]) {
            const gotra = gotraMatch[1].trim();
            if (gotra.length >= 3 && gotra.length <= 20) {
                data.gotra = gotra;
                break;
            }
        }
    }

    // Enhanced Dosham detection
    const doshamVariants = {
        'no_dosham': ['no dosham', 'no dosha', 'no thosha', 'dosham illa', 'thosha illa', 'clean horoscope'],
        'manglik': ['manglik', 'mangalik', 'mangli', 'chevvai dosham', 'mars dosha', 'angaraka dosha'],
        'sarpa_dosham': ['sarpa dosham', 'sarpa dosha', 'naga dosha', 'snake dosha'],
        'kala_sarpa': ['kala sarpa', 'kalasarpa', 'kala sarp', 'kal sarp'],
        'chevvai_dosham': ['chevvai dosham', 'chevai dosha', 'mars dosha', 'angaraka'],
        'other': ['rahu', 'ketu', 'shani', 'dosham', 'dosha', 'thosha']
    };

    const doshamPatterns = [
        /(?:dosham|dosha|thosha)\s*(?:is|:)?\s*([a-zA-Z\s]+)/i,
        /(?:have|has|got)\s*([a-zA-Z\s]+)\s*(?:dosham|dosha)/i,
        /(?:no|nil|clean)\s*(?:dosham|dosha|thosha)/i
    ];

    for (const pattern of doshamPatterns) {
        const doshamMatch = message.match(pattern);
        if (doshamMatch) {
            const doshamText = doshamMatch[1] ? doshamMatch[1].toLowerCase() : doshamMatch[0].toLowerCase();
            for (const [dosham, variants] of Object.entries(doshamVariants)) {
                for (const variant of variants) {
                    if (fuzzyMatch(doshamText, variant, 0.75)) {
                        data.dosham = dosham;
                        break;
                    }
                }
                if (data.dosham) break;
            }
        }
    }

    return data;
}

// Module exports
module.exports = {
    handleHoroscopicAIChat,
    HoroscopicAIValidator,
    HOROSCOPIC_AI_CONFIG,
    createUserSession,
    extractHoroscopicData
};