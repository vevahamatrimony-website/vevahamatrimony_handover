(function () {
    'use strict';

    const MAX_HISTORY_ITEMS = 10;
    const QUICK_QUESTION_PROMPTS = {
        how_to_find: 'How do I search profiles and use filters on VevahaMatrimony to find the right matches?',
        membership_plans: 'Can you explain the Silver, Gold, Diamond, and VIP membership plans with their messaging limits?',
        how_it_works: 'Walk me through how VevahaMatrimony works from registration to getting connected with families.'
    };

    const INTENTS = {
        REGISTRATION: {
            keywords: ['register', 'signup', 'sign up', 'creation', 'account', 'create profile', 'how to register', 'பதிவு', 'கணக்கு'],
            ta: 'வேவாகாமேட்ரிமோனியில் பதிவு செய்வது எளிதானது. பதிவு செய்ய, எங்கள் பதிவு பக்கத்திற்குச் சென்று உங்கள் அடிப்படை விவரங்கள், கல்வி மற்றும் தொழில் விவரங்களை நிரப்பவும். உங்கள் ஜாதகம் மற்றும் புகைப்படங்களையும் பதிவேற்றலாம். பதிவுப் பக்கத்திற்குச் சென்று உங்கள் கணக்கை உருவாக்கத் தொடங்குங்கள்.',
            en: 'VevahaMatrimony registration is quick and simple. To register, visit our registration page and fill in your basic details, background, education, and career details. You can also upload your horoscope and profile photos. Once completed, your profile goes live for matches to see. Please visit the Register page to begin.',
            links: [{ label: 'Register Page', url: 'register.html' }]
        },
        MEMBERSHIP: {
            keywords: ['membership', 'plan', 'silver', 'gold', 'diamond', 'vip', 'premium', 'cost', 'price', 'pay', 'gst', 'கட்டணம்', 'திட்டம்'],
            ta: 'நாங்கள் நான்கு பிரீமியம் திட்டங்களை வழங்குகிறோம். சில்வர் திட்டம் பதினைந்து சுயவிவரங்களை பார்க்கவும் செய்திகளை அனுப்பவும் அனுமதிக்கிறது. கோல்ட் திட்டம் முப்பது சுயவிவரங்களை அனுமதிக்கிறது. டைமண்ட் திட்டம் ஐம்பது சுயவிவரங்களை வழங்குகிறது. விஐபி திட்டம் பிரத்தியேக தனிப்பயனாக்கப்பட்ட சேவைகளை வழங்குகிறது. விவரங்களை எங்கள் பிரீமியம் திட்டங்கள் பக்கத்தில் பார்க்கவும்.',
            en: 'We offer four premium membership plans. The Silver plan lets you view up to fifteen profiles and send messages. The Gold plan allows viewing thirty profiles. The Diamond plan increases the limit to fifty profiles. The VIP plan provides fifty custom profiles and exclusive personalized matchmaking. To upgrade, please check our Premium Plans page.',
            links: [{ label: 'Premium Plans', url: 'membership.html' }]
        },
        HOROSCOPE: {
            keywords: ['horoscope', 'matching', 'porutham', 'star', 'rasi', 'natchathiram', 'ஜாதகம்', 'பொருத்தம்'],
            ta: 'ஜாதக பொருத்தம் எங்கள் சேவையின் முக்கிய அம்சமாகும். உங்கள் ராசி, நட்சத்திரம் மற்றும் கிரக நிலைகளை பகுப்பாய்வு செய்து திருமண பொருத்தத்தை எங்கள் தளம் கணக்கிடுகிறது. இது உங்களுக்கு சிறந்த பொருத்தமான இணையை கண்டறிய உதவும். உங்கள் ஜாதகத்தை ஒப்பிட, எங்கள் ஜாதக பொருத்தம் பக்கத்திற்குச் செல்லவும்.',
            en: 'Horoscope matching is a core feature of VevahaMatrimony. Our system automatically analyzes zodiac signs, stars, and planetary positions to calculate compatibility points for you. This helps you identify matches with high planetary and cultural harmony. To start matching your stars and planetary details, please visit the Horoscope Matching page.',
            links: [{ label: 'Horoscope Matching', url: 'horoscopic-chatbot.html' }]
        },
        SEARCH: {
            keywords: ['search', 'find', 'filter', 'photo', 'blur', 'hide', 'view', 'limits', 'matchmaking', 'தேடல்', 'சுயவிவரம்'],
            ta: 'எங்கள் தேடல் அம்சம் மூலம் நீங்கள் எளிதாக பொருத்தங்களை கண்டறியலாம். கல்வி, வயது, இருப்பிடம் மற்றும் பணி மூலம் தேடல்களை வடிக்கலாம். செயலில் உள்ள உறுப்பினர்கள் விரிவான சுயவிவரங்களைக் காணவும், புகைப்படங்களைக் கோரவும், நேரடி இணைப்பு கோரிக்கைகளை அனுப்பவும் முடியும். வரன்களைத் தேட எங்கள் செயலில் உள்ள உறுப்பினர்கள் பக்கத்தைப் பார்வையிடவும்.',
            en: 'Our matchmaking process allows you to find matches easily. You can filter profiles by community, education, age, location, and career. Active members can view detailed profiles, request photos, and send direct connection requests to compatible candidates. Please visit our Active Members page to browse verified profiles.',
            links: [{ label: 'Active Members', url: 'active-members-dash.html' }]
        },
        CONTACT: {
            keywords: ['support', 'contact', 'help', 'phone', 'number', 'address', 'whatsapp', 'உதவி', 'தொடர்பு'],
            ta: 'வேவாகாமேட்ரிமோனி சேவைகள் தொடர்பான உதவிக்கு, எங்கள் ஆதரவு குழுவைத் தொடர்பு கொள்ளலாம். எங்களை +91 90038 11739 என்ற எண்ணில் அழைக்கலாம் அல்லது வாட்ஸ்அப் மூலம் தொடர்பு கொள்ளலாம். எங்கள் குழு உங்களுக்கு உதவ எப்போதும் தயாராக உள்ளது. ஏதேனும் கேள்விகள் இருந்தால் எங்கள் தொடர்பு கொள்ளவும் பக்கத்தைப் பார்வையிடவும்.',
            en: 'For support and assistance with VevahaMatrimony services, you can reach out to our dedicated helpdesk. You can call or WhatsApp our official support number at +91 90038 11739. Our team is available to assist you with any questions. Please visit our Contact page to send us a direct message.',
            links: [{ label: 'Contact Us', url: 'contact.html' }]
        },
        PRIVACY: {
            keywords: ['privacy', 'policy', 'secure', 'data', 'safety', 'தனியுரிமை'],
            ta: 'வேவாகாமேட்ரிமோனி உங்கள் தனிப்பட்ட தரவு மற்றும் தனியுரிமையைப் பாதுகாக்க கடமைப்பட்டுள்ளது. உங்கள் புகைப்படங்கள், தொலைபேசி எண்கள் மற்றும் ஆவணங்களை நாங்கள் பாதுகாப்பாக வைத்திருக்கிறோம். உங்கள் சுயவிவரத்தை யார் பார்க்க வேண்டும் என்பதை நீங்களே தீர்மானிக்கலாம். எங்களின் முழுமையான தனியுரிமை கொள்கை பக்கத்தைப் பார்வையிடவும்.',
            en: 'VevahaMatrimony is committed to protecting your personal data and privacy. We secure your photos, phone numbers, and identity documents. You have full control over who can view your photo and profile details. Please visit our Privacy Policy page to review our complete data safety measures.',
            links: [{ label: 'Privacy Policy', url: 'privacy-policy.html' }]
        },
        TERMS: {
            keywords: ['terms', 'conditions', 'agreement', 'rules', 'விதிமுறைகள்'],
            ta: 'வேவாகாமேட்ரிமோனி சேவைகளைப் பயன்படுத்துவதன் மூலம், எங்கள் விதிமுறைகளை நீங்கள் ஒப்புக்கொள்கிறீர்கள். பயனர்கள் தங்கள் சுயவிவரங்களைச் சரிபார்த்து துல்லியமான தகவல்களை வழங்க வேண்டும். தளத்தின் தவறான பயன்பாடு கண்டிப்பாக தடைசெய்யப்பட்டுள்ளது. எங்களின் விதிமுறைகள் மற்றும் நிபந்தனைகள் பக்கத்தைப் பார்வையிடவும்.',
            en: 'By using VevahaMatrimony services, you agree to our standard terms and user guidelines. Users must verify their profiles and provide accurate registration details. Misuse of the platform or falsification of details is strictly prohibited. Please visit our Terms and Conditions page to review the full agreement.',
            links: [{ label: 'Terms & Conditions', url: 'terms.html' }]
        }
    };

    const conversationHistory = [];
    let chatMessagesEl;
    let messageInputEl;
    let sendButtonEl;
    let charCountEl;
    let typingIndicatorEl = null;
    let defaultChatMarkup = '';
    let currentLanguage = 'en';

    function init() {
        chatMessagesEl = document.getElementById('chat-messages');
        messageInputEl = document.getElementById('message-input');
        sendButtonEl = document.getElementById('send-button');
        charCountEl = document.getElementById('char-count');

        if (!chatMessagesEl || !messageInputEl || !sendButtonEl || !charCountEl) {
            console.error('VevahaAI: Missing core DOM nodes.');
            return;
        }

        defaultChatMarkup = chatMessagesEl.innerHTML;

        attachEventListeners();
        hydrateLanguageFromStorage();
        updateCharCount();
        messageInputEl.focus();
        console.log('✅ VevahaAI front-end initialized.');
    }

    function attachEventListeners() {
        sendButtonEl.addEventListener('click', () => {
            logAction('send_button_clicked');
            sendMessage();
        });

        messageInputEl.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                logAction('enter_key_send');
                sendMessage();
            }
        });

        messageInputEl.addEventListener('input', updateCharCount);

        const quickButtons = document.querySelectorAll('[data-question]');
        quickButtons.forEach((button) => {
            button.addEventListener('click', () => {
                const key = button.getAttribute('data-question');
                logAction('quick_question_clicked', { key });
                sendQuickQuestion(key);
            });
        });

        const langButtons = document.querySelectorAll('[data-lang]');
        langButtons.forEach((button) => {
            button.addEventListener('click', () => {
                const langCode = button.getAttribute('data-lang');
                logAction('language_toggle', { langCode });
                changeLanguage(langCode);
            });
        });

        const clearChatBtn = document.getElementById('clear-chat-btn');
        if (clearChatBtn) {
            clearChatBtn.addEventListener('click', () => {
                logAction('clear_chat_clicked');
                clearChat();
            });
        }

        const exitBtn = document.getElementById('exit-btn');
        if (exitBtn) {
            exitBtn.addEventListener('click', () => {
                logAction('exit_clicked');
                if (document.referrer && (document.referrer.includes(window.location.hostname) || document.referrer.startsWith('/') || document.referrer.includes('localhost') || document.referrer.includes('127.0.0.1'))) {
                    window.location.href = document.referrer;
                } else if (window.history.length > 1) {
                    window.history.back();
                } else {
                    window.location.href = 'home.html';
                }
            });
        }
    }

    function hydrateLanguageFromStorage() {
        const storedLanguage = localStorage.getItem('vevahaAI_language');
        changeLanguage(storedLanguage || 'en', { silent: true });
    }

    function changeLanguage(languageCode, options = {}) {
        currentLanguage = languageCode === 'ta' ? 'ta' : 'en';
        document.documentElement.setAttribute('data-lang', currentLanguage);
        localStorage.setItem('vevahaAI_language', currentLanguage);

        highlightActiveLanguageButton();

        // Dynamically update input placeholder
        const messageInput = document.getElementById('message-input');
        if (messageInput) {
            messageInput.placeholder = currentLanguage === 'ta' 
                ? 'சேவைகள், திட்டங்கள், அம்சங்கள் பற்றி கேட்கவும்...' 
                : 'Ask about services, plans, features...';
        }

        if (!options.silent) {
            console.log(`🌐 Language switched to ${currentLanguage}`);
        }
    }

    function highlightActiveLanguageButton() {
        const langButtons = document.querySelectorAll('[data-lang]');
        langButtons.forEach((button) => {
            const isActive = button.getAttribute('data-lang') === currentLanguage;
            button.classList.toggle('bg-white', isActive);
            button.classList.toggle('bg-opacity-30', isActive);
            button.classList.toggle('text-white', isActive);
            button.classList.toggle('text-pink-200', !isActive);
        });
    }

    function updateCharCount() {
        if (!charCountEl || !messageInputEl) return;
        charCountEl.textContent = messageInputEl.value.length.toString();
    }

    function sendQuickQuestion(key) {
        const prompt = QUICK_QUESTION_PROMPTS[key];
        if (!prompt) {
            console.warn('Unknown quick question key:', key);
            return;
        }
        messageInputEl.value = prompt;
        updateCharCount();
        sendMessage();
    }

    function sendMessage() {
        const rawMessage = messageInputEl.value.trim();
        if (!rawMessage) {
            showInlineNotification('Please enter a question for VevahaAI.');
            return;
        }

        appendMessage('user', rawMessage);
        pushToHistory('user', rawMessage);
        messageInputEl.value = '';
        updateCharCount();

        processOfflineReply(rawMessage);
    }

    function pushToHistory(role, text) {
        conversationHistory.push({ role, text });
        if (conversationHistory.length > MAX_HISTORY_ITEMS) {
            conversationHistory.splice(0, conversationHistory.length - MAX_HISTORY_ITEMS);
        }
    }

    // ── Offline Rule-based AI Engine ──────────────────────────────────────
    function processOfflineReply(userMessage) {
        setLoadingState(true);
        showTypingIndicator();

        // Typing indicator simulation (600ms) for premium conversational feel
        setTimeout(() => {
            hideTypingIndicator();

            const msg = userMessage.toLowerCase().trim();
            const userHasEmoji = /[\uD800-\uDFFF\u2600-\u27BF]/.test(userMessage);

            // 1. Out-of-domain checker
            const unrelatedKeywords = [
                'code', 'python', 'java', 'javascript', 'html', 'css', 'programming', 'science', 'math', 
                'politics', 'president', 'prime minister', 'weather', 'recipe', 'cook', 'history', 'geography',
                'physics', 'chemistry', 'biology', 'formula'
            ];
            const isUnrelated = unrelatedKeywords.some(kw => msg.includes(kw));
            if (isUnrelated) {
                const replyText = currentLanguage === 'ta'
                    ? 'நான் வேவாகாமேட்ரிமோனி சேவைகளில் மட்டுமே உதவ முடியும். பிற தலைப்புகளுக்கு, பொதுவான AI உதவியாளரைப் பயன்படுத்தவும்.'
                    : 'I specialize in assisting with VevahaMatrimony services. For other topics, please use a general AI assistant.';
                appendMessage('ai', replyText);
                pushToHistory('model', replyText);
                setLoadingState(false);
                return;
            }

            // 2. Greeting intent & once-per-session control
            const isGreeting = /\b(hi|hello|hey|vanakkam|வணக்கம்|நலம்)\b/.test(msg);
            const hasBeenGreeted = sessionStorage.getItem('vevaha_ai_greeted') === 'true';

            // Match other standard VevahaMatrimony intents
            const matchedIntents = [];
            for (const [intentKey, intentData] of Object.entries(INTENTS)) {
                const matchesKeyword = intentData.keywords.some(keyword => msg.includes(keyword));
                if (matchesKeyword) {
                    matchedIntents.push(intentKey);
                }
            }

            let replyText = '';
            let combinedLinks = [];

            if (matchedIntents.length > 0) {
                // Combine answers for multiple matched questions (Rule 8)
                const answers = [];
                matchedIntents.forEach(key => {
                    answers.push(currentLanguage === 'ta' ? INTENTS[key].ta : INTENTS[key].en);
                    combinedLinks = combinedLinks.concat(INTENTS[key].links);
                });
                replyText = answers.join('\n\n');
            } else if (isGreeting) {
                if (!hasBeenGreeted) {
                    sessionStorage.setItem('vevaha_ai_greeted', 'true');
                    replyText = currentLanguage === 'ta'
                        ? 'வணக்கம்! வேவாகாமேட்ரிமோனி சேவைகளில் இன்று நான் உங்களுக்கு எவ்வாறு உதவ முடியும்?'
                        : 'Hello! How can I assist you with VevahaMatrimony services today?';
                } else {
                    replyText = currentLanguage === 'ta'
                        ? 'வேவாகாமேட்ரிமோனி சேவைகளில் நான் உங்களுக்கு எவ்வாறு உதவ முடியும்?'
                        : 'How can I assist you with VevahaMatrimony services today?';
                }
            } else {
                // Rule 7 Fallback
                replyText = currentLanguage === 'ta'
                    ? 'எங்களால் துல்லியமான பதிலை கண்டறிய முடியவில்லை. தயவுசெய்து எங்கள் ஆதரவு குழுவைத் தொடர்பு கொள்ளவும்.'
                    : "I couldn't find an exact answer. Please contact our support team.";
                combinedLinks = [{ label: currentLanguage === 'ta' ? 'தொடர்பு கொள்ளவும்' : 'Contact Us', url: 'contact.html' }];
            }

            // Apply emoji condition: Never use emojis unless the user uses them first (Rule 5)
            if (userHasEmoji) {
                replyText += currentLanguage === 'ta' ? ' 🙏' : ' 😊';
            }

            appendMessage('ai', replyText, combinedLinks);
            pushToHistory('model', replyText);
            setLoadingState(false);
        }, 600);
    }

    function appendMessage(author, text, links = []) {
        if (!chatMessagesEl) return;

        const wrapper = document.createElement('div');
        wrapper.className = `message-animation ${author === 'user' ? 'text-right' : ''}`;

        const bubble = document.createElement('div');
        bubble.className = author === 'user'
            ? 'inline-block bg-pink-600 text-white rounded-2xl rounded-br-md px-4 py-3 max-w-xl shadow text-left'
            : 'flex items-start space-x-3';

        if (author === 'user') {
            bubble.innerHTML = `<p class="font-medium">${escapeHtml(text)}</p>`;
            wrapper.appendChild(bubble);
        } else {
            let linksHtml = '';
            if (links && links.length > 0) {
                linksHtml = `<div class="mt-3 flex flex-wrap gap-2">
                    ${links.map(link => `
                        <a href="${link.url}" class="inline-flex items-center px-3 py-1.5 bg-white text-pink-600 border border-pink-200 rounded-lg text-xs font-bold hover:bg-pink-50 transition-colors shadow-sm">
                            <i class="fas fa-external-link-alt mr-1.5"></i> ${escapeHtml(link.label)}
                        </a>
                    `).join('')}
                </div>`;
            }

            bubble.innerHTML = `
                <div class="w-10 h-10 bg-gradient-to-br from-pink-500 to-pink-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg class="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <circle cx="12" cy="8" r="4" opacity="0.9"></circle>
                        <path d="M12 14c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" opacity="0.8"></path>
                    </svg>
                </div>
                <div class="bg-gradient-to-br from-pink-50 to-pink-50 rounded-2xl rounded-tl-md p-4 max-w-2xl border border-pink-200">
                    <p class="text-gray-800 whitespace-pre-line leading-relaxed font-medium">${escapeHtml(text)}</p>
                    ${linksHtml}
                </div>`;
            bubble.style.textAlign = 'left';
            wrapper.appendChild(bubble);
        }

        chatMessagesEl.appendChild(wrapper);
        chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
    }

    function setLoadingState(isLoading) {
        if (!sendButtonEl || !messageInputEl) return;
        sendButtonEl.disabled = isLoading;
        messageInputEl.disabled = isLoading;
        if (!isLoading) {
            setTimeout(() => messageInputEl.focus(), 100);
        }
    }

    function showTypingIndicator() {
        if (!chatMessagesEl || typingIndicatorEl) return;

        const wrapper = document.createElement('div');
        wrapper.className = 'message-animation flex items-start space-x-3 typing-indicator-wrapper';
        wrapper.innerHTML = `
            <div class="w-10 h-10 bg-gradient-to-br from-pink-500 to-pink-600 rounded-full flex items-center justify-center flex-shrink-0">
                <svg class="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="8" r="4" opacity="0.9"></circle>
                    <path d="M12 14c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" opacity="0.8"></path>
                </svg>
            </div>
            <div class="bg-gray-100 rounded-2xl rounded-tl-md p-4 shadow-sm border border-gray-200">
                <div class="flex space-x-1.5">
                    <div class="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style="animation-delay: 0s"></div>
                    <div class="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
                    <div class="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style="animation-delay: 0.4s"></div>
                </div>
            </div>`;
        
        chatMessagesEl.appendChild(wrapper);
        chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
        typingIndicatorEl = wrapper;
    }

    function hideTypingIndicator() {
        if (typingIndicatorEl && typingIndicatorEl.parentNode) {
            typingIndicatorEl.parentNode.removeChild(typingIndicatorEl);
        }
        typingIndicatorEl = null;
    }

    function clearChat() {
        conversationHistory.length = 0;
        if (chatMessagesEl) {
            chatMessagesEl.innerHTML = defaultChatMarkup;
        }
        messageInputEl.value = '';
        updateCharCount();
        messageInputEl.focus();
        showInlineNotification('Chat cleared. Ask your next question!');
    }

    function showInlineNotification(message) {
        if (typeof showNotification === 'function') {
            showNotification(message, 'info');
        } else {
            alert(message);
        }
    }

    function escapeHtml(str) {
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function logAction(eventName, payload) {
        console.log(`[VevahaAI] ${eventName}`, payload || '');
    }

    window.changeLanguage = changeLanguage;
    window.sendMessage = sendMessage;
    window.sendQuickQuestion = sendQuickQuestion;
    window.updateCharCount = updateCharCount;

    document.addEventListener('DOMContentLoaded', init);
})();
