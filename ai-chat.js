const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY;
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const DEFAULT_LANGUAGE = 'en';
const MAX_HISTORY_ITEMS = 6;

const SITE_KNOWLEDGE = `VevahaMatrimony quick facts:
- Official website: https://vevahamatrimony.com
- Business Hours: 10:00 AM to 06:00 PM (Monday to Saturday).
- Support: +91 9487161672 | support@vevahamatrimony.com
- Key Pages: /membership.html, /active-members.html, /horoscopic-chatbot.html, /register.html.
- Trust: Manual verification of all profiles, photo watermarking, secure data storage.`;

const STATIC_RESPONSES = [
    {
        id: 'plans',
        triggers: ['membership', 'plan', 'upgrade', 'pricing', 'silver', 'gold', 'diamond', 'vip', 'cost', 'payment', 'price', 'money', 'subscribe'],
        replies: {
            en: 'Vanakkam! We offer four Premium tiers (prices include 18% GST):\n\n1. **Silver** (₹1,179, 1 Month) - 15 Contacts\n2. **Gold** (₹2,359, 3 Months) - 30 Contacts\n3. **Diamond** (₹4,719, 6 Months) - 50 Contacts\n4. **VIP** (₹58,999, 12 Months) - Unlimited matching & concierge help.\n\nAll plans include verified profile access and messaging.',
            ta: 'வணக்கம்! எங்களிடம் நான்கு பிரீமியம் திட்டங்கள் உள்ளன (18% GST உட்பட):\n\n1. **சில்வர்** (₹1,179, 1 மாதம்) - 15 தொடர்புகள்\n2. **கோல்ட்** (₹2,359, 3 மாதங்கள்) - 30 தொடர்புகள்\n3. **டைமண்ட்** (₹4,719, 6 மாதங்கள்) - 50 தொடர்புகள்\n4. **விஐபி** (₹58,999, 12 மாதங்கள்) - வரம்பற்ற பொருத்தங்கள் மற்றும் கன்சியர்ஜ் உதவி.\n\nஅனைத்து திட்டங்களிலும் சரிபார்க்கப்பட்ட சுயவிவர அணுகல் மற்றும் செய்தி அனுப்புதல் சேர்க்கப்பட்டுள்ளது.'
        },
        linkLabel: 'View Plans',
        linkUrl: 'https://vevahamatrimony.com/membership.html'
    },
    {
        id: 'safety',
        triggers: ['safety', 'secure', 'fake', 'verify', 'blocked', 'report', 'photo', 'privacy', 'download', 'safe', 'protection', 'scam'],
        replies: {
            en: 'Vanakkam! Your safety is our priority. We use:\n- **Manual Verification**: Every profile is checked by our team.\n- **Photo Watermarking**: Prevents photo misuse/downloads.\n- **Privacy Control**: You decide who sees your contact info.\n- **OTP Secure**: Every login is verified via mobile.',
            ta: 'வணக்கம்! உங்கள் பாதுகாப்பே எங்கள் முன்னுரிமை. நாங்கள் பயன்படுத்துவது:\n- **நேரடி சரிபார்ப்பு**: ஒவ்வொரு சுயவிவரமும் எங்கள் குழுவால் சரிபார்க்கப்படுகிறது.\n- **புகைப்பட வாட்டர்மார்க்கிங்**: புகைப்படங்கள் தவறாகப் பயன்படுத்தப்படுவதைத் தடுக்கிறது.\n- **தனியுரிமை கட்டுப்பாடு**: உங்கள் தொடர்புத் தகவலை யார் பார்க்கலாம் என்பதை நீங்களே தீர்மானிக்கலாம்.'
        },
        linkLabel: 'Safety Tips',
        linkUrl: 'https://vevahamatrimony.com/safety-tips.html'
    },
    {
        id: 'contact',
        triggers: ['contact', 'phone', 'support', 'reach you', 'help', 'address', 'location', 'office', 'whatsapp', 'call', 'number', 'hours', 'time'],
        replies: {
            en: 'Vanakkam! We are here to help during our business hours (10:00 AM - 06:00 PM):\n\n- **Call/Support**: +91 9487161672\n- **WhatsApp**: +91 73974 49549\n- **Email**: support@vevahamatrimony.com',
            ta: 'வணக்கம்! எங்கள் அலுவலக நேரத்தில் (காலை 10 - மாலை 6) நாங்கள் உதவத் தயாராக உள்ளோம்:\n\n- **தொலைபேசி**: +91 9487161672\n- **வாட்ஸ்அப்**: +91 73974 49549\n- **மின்னஞ்சல்**: support@vevahamatrimony.com'
        },
        linkLabel: 'Contact Us',
        linkUrl: 'https://vevahamatrimony.com/contact.html'
    },
    {
        id: 'register',
        triggers: ['register', 'sign up', 'create account', 'join', 'start', 'how to register', 'account', 'profile creation'],
        replies: {
            en: 'Vanakkam! Registering is easy:\n1. Click "Register" on the home page.\n2. Fill in your basic details and upload 1-2 photos.\n3. Verify your mobile via OTP.\n4. Our team will approve your profile within 24 hours after verification.',
            ta: 'வணக்கம்! பதிவு செய்வது எளிது:\n1. முகப்பு பக்கத்தில் "பதிவு" (Register) என்பதைக் கிளிக் செய்யவும்.\n2. அடிப்படை விவரங்களைப் பூர்த்தி செய்து 1-2 புகைப்படங்களைப் பதிவேற்றவும்.\n3. உங்கள் மொபைலை OTP மூலம் சரிபார்க்கவும்.'
        },
        linkLabel: 'Register Now',
        linkUrl: 'https://vevahamatrimony.com/register.html'
    },
    {
        id: 'horoscope',
        triggers: ['horoscope', 'matching', 'porutham', 'rasi', 'nakshatram', 'jathagam', 'astro', 'astrology', 'star', 'compatibility'],
        replies: {
            en: 'Vanakkam! For professional horoscope matching, we have a dedicated **Astro AI** tool that checks for 10 Poruthams and Rasi-Nakshatra compatibility based on Vedic principles.',
            ta: 'வணக்கம்! ஜாதகப் பொருத்தத்திற்கு (Porutham), எங்களின் ஆஸ்ட்ரோ AI கருவியைப் பயன்படுத்தவும். இது வேத ஜோதிடத்தின் அடிப்படையில் 10 பொருத்தங்களைச் சரிபார்க்கிறது.'
        },
        linkLabel: 'Go to Astro AI',
        linkUrl: 'https://vevahamatrimony.com/horoscopic-chatbot.html'
    },
    {
        id: 'isFree',
        triggers: ['is it free', 'free account', 'charges', 'do I have to pay', 'payment needed', 'without money'],
        replies: {
            en: 'Vanakkam! Registration and basic profile creation are **100% Free**. To view full contact details or start unlimited conversations, you can upgrade to any of our affordable Premium plans.',
            ta: 'வணக்கம்! பதிவு மற்றும் அடிப்படை சுயவிவர உருவாக்கம் **100% இலவசம்**. முழு தொடர்பு விவரங்களைப் பார்க்க அல்லது வரம்பற்ற உரையாடல்களைத் தொடங்க, எங்களின் பிரீமியம் திட்டங்களுக்கு மாறலாம்.'
        },
        linkLabel: 'Compare Plans',
        linkUrl: 'https://vevahamatrimony.com/membership.html'
    },
    {
        id: 'activeMembers',
        triggers: ['profiles', 'browse', 'find matches', 'active members', 'search', 'how to find', 'groom', 'bride'],
        replies: {
            en: 'Vanakkam! You can browse our "Active Members" section to see verified profiles. Use the Advanced Search to filter by Caste, Education, Job, and Location to find the perfect match.',
            ta: 'வணக்கம்! சரிபார்க்கப்பட்ட சுயவிவரங்களைக் காண "செயலில் உள்ள உறுப்பினர்கள்" பகுதியை அணுகவும். மேம்பட்ட தேடலைப் பயன்படுத்தி உங்கள் விருப்பப்படி வரன்களைத் தேடலாம்.'
        },
        linkLabel: 'Browse Members',
        linkUrl: 'https://vevahamatrimony.com/active-members.html'
    },
    {
        id: 'deleteAccount',
        triggers: ['delete', 'remove profile', 'deactivate', 'cancel', 'close account', 'stop'],
        replies: {
            en: 'Vanakkam! If you want to take a break, you can "Self-Lock" your profile from the settings. To permanently delete your account, please contact our support at support@vevahamatrimony.com and we will process it in 24-48 hours.',
            ta: 'வணக்கம்! உங்கள் சுயவிவரத்தைத் தற்காலிகமாக மறைக்க "Self-Lock" வசதியைப் பயன்படுத்தலாம். முழுமையாக நீக்க விரும்பினால், support@vevahamatrimony.com மின்னஞ்சல் செய்யவும்.'
        },
        linkLabel: 'Contact Support',
        linkUrl: 'https://vevahamatrimony.com/contact.html'
    }
];

const DEFAULT_LINK = {
    label: 'Visit VevahaMatrimony.com',
    url: 'https://vevahamatrimony.com',
};

const QUICK_LINKS = [
    {
        triggers: ['terms', 'conditions', 'policy', 'policies'],
        url: 'https://vevahamatrimony.com/privacy.html',
        label: 'Terms & Conditions',
    },
    {
        triggers: ['privacy'],
        url: 'https://vevahamatrimony.com/privacy-policy.html',
        label: 'Privacy Policy',
    },
    {
        triggers: ['membership', 'plan', 'pricing', 'price'],
        url: 'https://vevahamatrimony.com/membership.html',
        label: 'Membership Plans',
    },
    {
        triggers: ['contact', 'support', 'phone', 'call'],
        url: 'https://vevahamatrimony.com/contact.html',
        label: 'Contact Support',
    },
    {
        triggers: ['faq', 'help center', 'helpcentre'],
        url: 'https://vevahamatrimony.com/faq.html',
        label: 'Help Center',
    },
    {
        triggers: ['safety', 'secure', 'report'],
        url: 'https://vevahamatrimony.com/safety-tips.html',
        label: 'Safety & Reporting',
    },
];

const VEVAHA_SYSTEM_CONTEXT = `You are VEVAHA AI, the official virtual assistant of VevahaMatrimony, a South Indian matchmaking platform for Tamil families.

Mission:
- Guide brides, grooms, and parents through registration, profile curation, match discovery, and respectful communication.
- Explain the four membership tiers (Silver, Gold, Diamond, VIP) including messaging restrictions, concierge benefits, and upgrade paths.
- Reference culture-specific workflows: horoscope (Rasi, Nakshatram, Porutham) is handled by a dedicated Horoscopic AI, whereas Vevaha AI covers general matrimony questions.
- Maintain the tone of a respectful astrologer-family counselor: traditional, empathetic, and precise.
- Emphasize verified profiles, privacy, security, and family-first etiquette.

House rules:
- Default to concise answers (1-3 sentences). Only switch to a full paragraph when the user explicitly requests "detail", "explain fully", "paragraph", or similar.
- After answering, suggest the most relevant vevahamatrimony.com page as a CTA link when the topic matches the site knowledge base.
- Reference the following internal knowledge when needed:
${SITE_KNOWLEDGE}
- Never invent links; use only the confirmed URLs above.
- Mention when a topic is handled by another tool (e.g., Horoscopic AI) instead of improvising.

Response directives:
1. Begin each fresh response with "Vanakkam!" (or "வணக்கம்!" in Tamil) unless mid-sentence continuation is requested.
2. When language = Tamil, answer primarily in Tamil, optionally clarifying unique feature names in English.
3. Offer step-by-step help for "how" or "what" queries, highlighting relevant features (Bride & Groom profiles, Porutham calculator, membership perks, concierge).
4. Never improvise horoscope judgments—redirect such questions to the Horoscopic AI or astrologer team.
`;

const SAFETY_FALLBACK = {
    en: '🙏 Vanakkam! I am facing a technical issue. Please try again shortly or call +91 9487161672 for immediate assistance.',
    ta: '🙏 வணக்கம்! தற்போது தொழில்நுட்ப சிக்கல் உள்ளது. தயவுசெய்து மீண்டும் முயற்சிக்கவும் அல்லது +91 9487161672 என்ற எண்ணிற்கு அழைக்கவும்.'
};

function ensureApiKey() {
    if (!GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY is not configured');
    }
}

function buildSystemPrompt(language) {
    if (language === 'ta') {
        return `${VEVAHA_SYSTEM_CONTEXT}\n\nUser prefers Tamil. Respond primarily in Tamil with respectful matrimonial phrasing.`;
    }
    return VEVAHA_SYSTEM_CONTEXT;
}

function normalizeHistory(history = []) {
    if (!Array.isArray(history)) return [];
    return history
        .slice(-MAX_HISTORY_ITEMS)
        .map((entry) => {
            if (!entry || typeof entry.text !== 'string') return null;
            const role = entry.role === 'model' ? 'model' : 'user';
            const text = entry.text.trim();
            if (!text) return null;
            return { role, parts: [{ text }] };
        })
        .filter(Boolean);
}

function enforceGreeting(reply, language) {
    if (!reply) return reply;
    const normalized = reply.trim();
    const lower = normalized.toLowerCase();
    if (lower.startsWith('vanakkam') || lower.startsWith('🙏 vanakkam') || lower.startsWith('🙏 வணக்கம்') || lower.startsWith('வணக்கம்')) {
        return normalized;
    }
    const greeting = language === 'ta' ? 'வணக்கம்! ' : 'Vanakkam! ';
    return `${greeting}${normalized}`.trim();
}

function wantsDetailedReply(message = '') {
    const detailKeywords = [
        'detail',
        'detailed',
        'long answer',
        'paragraph',
        'explain fully',
        'elaborate',
        'in depth',
        'full info',
    ];
    const lower = message.toLowerCase();
    return detailKeywords.some((keyword) => lower.includes(keyword));
}

function calculateMatchScore(message, triggers) {
    const lowerMessage = message.toLowerCase();
    let score = 0;
    triggers.forEach(trigger => {
        if (lowerMessage.includes(trigger)) {
            // Whole word match gets higher score
            const regex = new RegExp(`\\b${trigger}\\b`, 'i');
            if (regex.test(lowerMessage)) {
                score += 2;
            } else {
                score += 1;
            }
        }
    });
    return score;
}

function detectPersonalIntent(message, userData, language = 'en') {
    if (!userData || Object.keys(userData).length === 0) return null;
    
    const lower = message.toLowerCase();
    const isTa = language === 'ta';
    
    // Check for plan status
    if (lower.includes('my plan') || lower.includes('my membership') || lower.includes('expiry') || lower.includes('status') || 
        (isTa && (lower.includes('எனது திட்டம்') || lower.includes('காலாவதி')))) {
        
        const plan = (userData.plan_name || 'Free').toUpperCase();
        const expiry = userData.plan_expiry ? new Date(userData.plan_expiry).toLocaleDateString() : 'N/A';
        
        if (isTa) {
            return {
                reply: `வணக்கம்! உங்கள் தற்போதைய திட்டம்: **${plan}**. இது ${expiry} அன்று காலாவதியாகிறது. உங்கள் கணக்கு பாதுகாப்பாக உள்ளது.`,
                links: [{ label: 'திட்டத்தை மாற்றவும்', url: 'https://vevahamatrimony.com/membership.html' }]
            };
        }
        return {
            reply: `Vanakkam! Your current plan is **${plan}**. It is active until ${expiry}. You can upgrade anytime to access more features.`,
            links: [{ label: 'Upgrade Plan', url: 'https://vevahamatrimony.com/membership.html' }]
        };
    }
    
    // Check for profile info
    if (lower.includes('my profile') || lower.includes('who am i') || (isTa && lower.includes('எனது சுயவிவரம்'))) {
        const name = userData.full_name || 'Member';
        const id = userData.member_id || 'N/A';
        
        if (isTa) {
            return {
                reply: `வணக்கம் ${name}! உங்கள் உறுப்பினர் ஐடி: **${id}**. நீங்கள் ஒரு வரனைத் தேடுகிறீர்கள். உங்கள் சுயவிவரத்தை மாற்ற எடிட் பக்கத்திற்குச் செல்லவும்.`,
                links: [{ label: 'சுயவிவரத்தை மாற்ற', url: 'https://vevahamatrimony.com/account-settings.html' }]
            };
        }
        return {
            reply: `Vanakkam ${name}! Your Member ID is **${id}**. You are currently looking for matches. You can update your details in the edit profile section.`,
            links: [{ label: 'Edit Profile', url: 'https://vevahamatrimony.com/account-settings.html' }]
        };
    }
    
    return null;
}

function detectStaticResponse(message = '', language = 'en') {
    const lower = message.toLowerCase();
    let bestMatch = null;
    let highestScore = 0;

    for (const entry of STATIC_RESPONSES) {
        const score = calculateMatchScore(lower, entry.triggers);
        if (score > highestScore) {
            highestScore = score;
            bestMatch = entry;
        }
    }

    // Threshold for matching
    if (highestScore > 0) {
        const reply = bestMatch.replies[language === 'ta' ? 'ta' : 'en'];
        return {
            reply,
            links: [
                {
                    label: bestMatch.linkLabel,
                    url: bestMatch.linkUrl,
                },
            ],
        };
    }
    return null;
}

function collectLinkCtas(message = '') {
    const lower = message.toLowerCase();
    const results = [];
    QUICK_LINKS.forEach(({ triggers, url, label }) => {
        if (triggers.some((trigger) => lower.includes(trigger))) {
            results.push({ label, url });
        }
    });
    return results;
}

function splitIntoSentences(text) {
    if (!text) return [];
    const matches = text
        .replace(/\s+/g, ' ')
        .match(/[^.!?]+[.!?]+|[^.!?]+$/g);
    if (!matches) {
        return [text.trim()].filter(Boolean);
    }
    return matches.map((sentence) => sentence.trim()).filter(Boolean);
}

function trimForBrevity(reply, forceBrevity) {
    if (!forceBrevity || !reply) return reply;
    const sentences = splitIntoSentences(reply);
    if (sentences.length <= 3) {
        return reply.trim();
    }
    const trimmed = sentences.slice(0, 3).join(' ').trim();
    return `${trimmed}…`;
}

function ensureCompleteSentence(reply) {
    if (!reply) return reply;
    const trimmed = reply.trim();
    if (!trimmed) return trimmed;
    const endings = ['.', '!', '?', '…', '।', '！', '？'];
    if (endings.some((ending) => trimmed.endsWith(ending))) {
        return trimmed;
    }
    return `${trimmed}.`;
}

async function callGemini({ message, history, language, wantsDetailed }) {
    ensureApiKey();

    const contents = normalizeHistory(history);
    contents.push({ role: 'user', parts: [{ text: message }] });

    const payload = {
        system_instruction: {
            role: 'system',
            parts: [{ text: buildSystemPrompt(language) }]
        },
        contents,
        generationConfig: {
            temperature: 0.3,
            topK: 32,
            topP: 0.9,
            maxOutputTokens: wantsDetailed ? 1024 : 512
        }
    };

    const response = await fetch(`${GEMINI_ENDPOINT}?key=${encodeURIComponent(GEMINI_API_KEY)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
        const detail = result?.error?.message || `Gemini error (${response.status})`;
        throw new Error(detail);
    }

    const reply = result?.candidates?.[0]?.content?.parts
        ?.map((part) => part.text || '')
        .join('')
        .trim();

    if (!reply) {
        throw new Error('Gemini returned an empty response');
    }

    return {
        reply,
        metadata: {
            model: GEMINI_MODEL,
            usage: result?.usageMetadata || {},
            safetyRatings: result?.candidates?.[0]?.safetyRatings || []
        }
    };
}

async function handleAIChat(req, res) {
    const startedAt = Date.now();

    try {
        const { message, history = [], language = DEFAULT_LANGUAGE, userData = {} } = req.body || {};

        if (!message || typeof message !== 'string' || !message.trim()) {
            return res.status(400).json({
                success: false,
                error: 'A message is required.'
            });
        }

        const trimmedMessage = message.trim();
        
        // 1. Check for Personal Intent (Personalized)
        const personalResult = detectPersonalIntent(trimmedMessage, userData, language);
        
        // 2. Check for Static Knowledge (Experts System)
        const staticResult = !personalResult ? detectStaticResponse(trimmedMessage, language) : null;
        
        const wantsDetail = wantsDetailedReply(trimmedMessage);
        let links = personalResult?.links || staticResult?.links || [];
        let finalReply;
        let metadata = { model: GEMINI_MODEL, usage: {} };

        if (personalResult) {
            finalReply = enforceGreeting(personalResult.reply, language);
            metadata.model = 'persona_engine';
        } else if (staticResult) {
            finalReply = enforceGreeting(staticResult.reply, language);
            metadata.model = 'knowledge_engine';
        } else if (!GEMINI_API_KEY) {
            // Intelligent Fallback based on Site Knowledge
            const words = trimmedMessage.toLowerCase().split(/\s+/);
            const knowledgeMatch = SITE_KNOWLEDGE.split('\n').find(line => 
                words.some(word => word.length > 4 && line.toLowerCase().includes(word))
            );

            if (knowledgeMatch) {
                const info = knowledgeMatch.split(': ')[1] || knowledgeMatch;
                const prefix = language === 'ta' ? 'எங்களிடம் உள்ள தகவல்படி: ' : 'Based on our information: ';
                finalReply = enforceGreeting(`${prefix}${info}`, language);
            } else {
                const fallback = language === 'ta' 
                    ? "வணக்கம்! நீங்கள் கேட்பது எனக்குப் புரியவில்லை. உறுப்பினர் திட்டங்கள், பதிவு செய்தல், ஜாதகம் அல்லது பாதுகாப்பு பற்றி நீங்கள் கேட்கலாம். அல்லது எங்களைத் தொடர்பு கொள்ளவும்: +91 9487161672."
                    : "Vanakkam! I'm not sure about that specific query. You can ask about membership plans, registration, safety, or horoscope matching. For direct help, call +91 9487161672.";
                finalReply = enforceGreeting(fallback, language);
            }
            metadata.model = 'rule_based_engine';
        } else {
            // Real Gemini AI (if key exists)
            const geminiResult = await callGemini({
                message: trimmedMessage,
                history,
                language,
                wantsDetailed: wantsDetail
            });

            const conciseReply = trimForBrevity(geminiResult.reply, !wantsDetail);
            finalReply = enforceGreeting(conciseReply, language);
            metadata = geminiResult.metadata;
        }


        finalReply = ensureCompleteSentence(finalReply);

        if (!links.length) {
            links = collectLinkCtas(trimmedMessage);
        }

        if (!links.length) {
            links = [DEFAULT_LINK];
        }

        const responsePayload = {
            success: true,
            reply: finalReply,
            links,
            metadata: {
                ...metadata,
                latencyMs: Date.now() - startedAt
            }
        };

        res.status(200).json(responsePayload);
    } catch (error) {
        console.error('Gemini handler failure:', error);
        const language = (req && req.body && req.body.language === 'ta') ? 'ta' : 'en';
        res.status(500).json({
            success: false,
            reply: SAFETY_FALLBACK[language],
            error: error.message,
            metadata: {
                latencyMs: Date.now() - startedAt
            }
        });
    }
}

async function getConversationStarters(req, res) {
    res.json({
        success: true,
        starters: [
            'How do I create and verify a VevahaMatrimony profile?',
            'Explain the Silver, Gold, Diamond, and VIP memberships.',
            'How can parents shortlist and share profiles respectfully?',
            'What safety checks protect brides and grooms?',
            'How do I request horoscope matching support?'
        ]
    });
}

async function clearChatSession(req, res) {
    res.json({ success: true, message: 'Chat session cleared' });
}

class AIResponseValidator {
    static normalize(reply) {
        return typeof reply === 'string' ? reply.trim() : '';
    }
}

module.exports = {
    handleAIChat,
    getConversationStarters,
    clearChatSession,
    AIResponseValidator
};
