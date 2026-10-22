(() => {
    const STORAGE_KEY = 'vevahaHoroscopeProfile';
    const REQUIRED_FIELDS = ['name', 'gender', 'rasi', 'nakshatra', 'gotra', 'lagnam', 'dosham', 'dob', 'tob'];

    const RASI_OPTIONS = [
        'Mesha', 'Vrishabha', 'Mithuna', 'Kataka', 'Simha', 'Kanya',
        'Tula', 'Vrischika', 'Dhanus', 'Makara', 'Kumbha', 'Meena'
    ];

    const NAKSHATRA_OPTIONS = [
        'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashirsha', 'Ardra',
        'Punarvasu', 'Pushya', 'Ashlesha', 'Magha', 'Purva Phalguni', 'Uttara Phalguni',
        'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha', 'Mula',
        'Purva Ashadha', 'Uttara Ashadha', 'Shravana', 'Dhanishta', 'Shatabhisha',
        'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati'
    ];

    const LAGNAM_OPTIONS = [
        'Mesha', 'Vrishabha', 'Mithuna', 'Kataka', 'Simha', 'Kanya',
        'Tula', 'Vrischika', 'Dhanus', 'Makara', 'Kumbha', 'Meena'
    ];

    const FORM_I18N = {
        en: {
            fillButtonLabel: '📝 Fill in the Blanks',
            formTitle: '📝 Fill in the Blanks Horoscope Form',
            formIntro: 'Complete every field to unlock in-depth horoscope analysis.',
            nameLabel: 'Name',
            namePlaceholder: 'Enter full name',
            genderLabel: 'Gender',
            genderMale: 'Male',
            genderFemale: 'Female',
            rasiLabel: 'Rasi',
            nakshatraLabel: 'Nakshatram',
            gotraLabel: 'Gotra',
            gotraPlaceholder: 'Enter your Gothram',
            lagnamLabel: 'Lagnam',
            doshamLabel: 'Dosham',
            doshamPlaceholder: 'e.g., No Dosham / Sevvai',
            dobLabel: 'Date of Birth',
            tobLabel: 'Time of Birth',
            formHint: 'Tip: Save once to lock your horoscope details. Use Erase to edit later.',
            saveButton: '💾 Save Details',
            resultButton: '🔍 Get Horoscope Result',
            resetButton: '♻ Reset',
            eraseButton: '🗑 Erase Permanently',
            lockedLabel: 'Profile locked',
            saveSuccess: 'Profile saved successfully. Fields locked.',
            saveError: 'Please fill all mandatory fields before saving.',
            resultMissing: 'Complete the form before requesting results.',
            formProceed: '📝 Please complete the Fill in the Blanks form to proceed with horoscope analysis.',
            domainLock: '⚠️ I can assist only with horoscope-based matchmaking.'
        },
        ta: {
            fillButtonLabel: '📝 விவரங்களை நிரப்பவும்',
            formTitle: '📝 ஜாதக விவரங்கள் படிவம்',
            formIntro: 'ஒவ்வொரு தகவலையும் நிரப்பினால் ஆழமான ஜாதக பகுப்பாய்வு கிடைக்கும்.',
            nameLabel: 'பெயர்',
            namePlaceholder: 'முழுப் பெயரை எழுதவும்',
            genderLabel: 'பாலினம்',
            genderMale: 'ஆண்',
            genderFemale: 'பெண்',
            rasiLabel: 'ராசி',
            nakshatraLabel: 'நட்சத்திரம்',
            gotraLabel: 'கோத்ரம்',
            gotraPlaceholder: 'உங்கள் கோத்ரம்/கோத்திரம் குறிப்பிடவும்',
            lagnamLabel: 'லக்னம்',
            doshamLabel: 'தோஷம்',
            doshamPlaceholder: 'எ.கா., தோஷம் இல்லை / செவ்வாய்',
            dobLabel: 'பிறந்த தேதி',
            tobLabel: 'பிறந்த நேரம்',
            formHint: 'குறிப்பு: சேமித்த பிறகு தகவல்கள் பூட்டப்படும். மாற்ற Erase பயன்படுத்தவும்.',
            saveButton: '💾 சேமிக்கவும்',
            resultButton: '🔍 ஜாதக முடிவு',
            resetButton: '♻ மீட்டமை',
            eraseButton: '🗑 முழுமையாக அழிக்கவும்',
            lockedLabel: 'சுயவிவரம் பூட்டப்பட்டது',
            saveSuccess: 'சுயவிவரம் சேமிக்கப்பட்டது. புலங்கள் பூட்டப்பட்டன.',
            saveError: 'அனைத்து கட்டாய புலங்களையும் நிரப்பவும்.',
            resultMissing: 'முடிவைப் பெற படிவத்தை நிரப்பவும்.',
            formProceed: '📝 ஜாதக பகுப்பாய்வுக்கு முன் படிவத்தை நிரப்பவும்.',
            domainLock: '⚠️ நான் ஜாதக அடிப்படையிலான பொருத்தங்களை மட்டுமே உதவுவேன்.'
        }
    };

    const HOROSCOPE_HINTS = {
        suitability: {
            fire: 'Your fiery nature thrives with balanced, patient partners.',
            earth: 'Grounded energy favors dependable alliances with steady communication.',
            air: 'Intellectual air signs blend best with honest communicators and free thinkers.',
            water: 'Emotional depth flourishes when empathy and loyalty are mutual.'
        },
        dosham: {
            default: 'No significant dosham detected. Traditional approvals look positive.',
            caution: 'Dosham signals present. Consult trusted elders for pariharam guidance.'
        }
    };

    const elements = {
        mesha: 'fire', vrishabha: 'earth', mithuna: 'air', kataka: 'water',
        simha: 'fire', kanya: 'earth', tula: 'air', vrischika: 'water',
        dhanus: 'fire', makara: 'earth', kumbha: 'air', meena: 'water'
    };

    let currentLanguage = document.documentElement.getAttribute('data-lang') === 'ta' ? 'ta' : 'en';
    let formPanel;
    let formElement;
    let alertBox;
    let lockBadge;
    let formVisible = false;

    const init = () => {
        formPanel = document.getElementById('horoscope-form-panel');
        formElement = document.getElementById('horoscope-profile-form');
        alertBox = document.getElementById('horoscope-form-alert');
        lockBadge = document.getElementById('horoscope-lock-state');

        if (!formPanel || !formElement) return;

        populateSelects();
        wireActions();
        hydrateFromStorage();
        attachLanguageObserver();
        attachChatGuards();
    };

    const populateSelects = () => {
        const selectRasi = formElement.querySelector('[data-field="rasi"]');
        const selectNak = formElement.querySelector('[data-field="nakshatra"]');
        const selectLagnam = formElement.querySelector('[data-field="lagnam"]');

        if (selectRasi) {
            selectRasi.innerHTML = ['<option value="">--</option>', ...RASI_OPTIONS.map(opt => `<option value="${opt.toLowerCase()}">${opt}</option>`)].join('');
        }
        if (selectNak) {
            selectNak.innerHTML = ['<option value="">--</option>', ...NAKSHATRA_OPTIONS.map(opt => `<option value="${opt.toLowerCase().replace(/\s+/g, '_')}">${opt}</option>`)].join('');
        }
        if (selectLagnam) {
            selectLagnam.innerHTML = ['<option value="">--</option>', ...LAGNAM_OPTIONS.map(opt => `<option value="${opt.toLowerCase()}">${opt}</option>`)].join('');
        }
    };

    const wireActions = () => {
        const fillButton = document.getElementById('fill-blanks-btn');
        if (fillButton) {
            fillButton.addEventListener('click', () => toggleFormVisibility());
        }

        formElement.addEventListener('click', event => {
            const action = event.target.closest('[data-action]');
            if (!action) return;
            const type = action.getAttribute('data-action');
            switch (type) {
                case 'save':
                    handleSave();
                    break;
                case 'result':
                    handleResult();
                    break;
                case 'reset':
                    handleReset(false);
                    break;
                case 'erase':
                    handleReset(true);
                    break;
                default:
                    break;
            }
        });
    };

    const toggleFormVisibility = () => {
        formVisible = !formVisible;
        formPanel.classList.toggle('hidden', !formVisible);
        if (formVisible) {
            formPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    const gatherValues = () => {
        const data = {};
        const inputs = formElement.querySelectorAll('[data-field]');
        inputs.forEach(input => {
            const field = input.getAttribute('data-field');
            if (input.type === 'radio') {
                if (input.checked) {
                    data[field] = input.value;
                }
            } else {
                data[field] = input.value.trim();
            }
        });
        return data;
    };

    const hydrateFromStorage = () => {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) {
            applyLanguage();
            return;
        }
        try {
            const data = JSON.parse(raw);
            setFormValues(data);
            lockForm(true);
            showLockBadge(true);
        } catch (error) {
            console.error('Failed to parse horoscope profile from storage', error);
            localStorage.removeItem(STORAGE_KEY);
        }
        applyLanguage();
    };

    const setFormValues = data => {
        const inputs = formElement.querySelectorAll('[data-field]');
        inputs.forEach(input => {
            const field = input.getAttribute('data-field');
            if (!(field in data)) return;
            if (input.type === 'radio') {
                input.checked = data[field] === input.value;
            } else {
                input.value = data[field] || '';
            }
        });
    };

    const lockForm = shouldLock => {
        const inputs = formElement.querySelectorAll('[data-field]');
        inputs.forEach(input => {
            input.disabled = shouldLock;
            input.classList.toggle('opacity-60', shouldLock);
        });
    };

    const handleSave = () => {
        const values = gatherValues();
        if (!validate(values, true)) {
            showAlert(FORM_I18N[currentLanguage].saveError, 'error');
            return;
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(values));
        lockForm(true);
        showLockBadge(true);
        showAlert(FORM_I18N[currentLanguage].saveSuccess, 'success');
    };

    const handleReset = erase => {
        if (erase) {
            localStorage.removeItem(STORAGE_KEY);
        }
        formElement.reset();
        lockForm(false);
        showLockBadge(false);
        hideAlert();
    };

    const handleResult = () => {
        const values = gatherValues();
        if (!validate(values, false)) {
            showAlert(FORM_I18N[currentLanguage].resultMissing, 'error');
            return;
        }
        const message = buildResultMessage(values);
        appendEngineMessage(message);
        if (typeof window.horoscopeChatController?.engine?.applyUpdates === 'function') {
            window.horoscopeChatController.engine.applyUpdates({
                seeker: {
                    name: values.name,
                    gender: values.gender,
                    rasi: values.rasi,
                    nakshatra: values.nakshatra,
                    gotra: values.gotra,
                    lagnam: values.lagnam,
                    dosham: values.dosham,
                    dob: values.dob,
                    tob: values.tob
                }
            });
        }
    };

    const validate = (values, strict) => {
        return REQUIRED_FIELDS.every(field => !strict && field === 'gotra' ? true : Boolean(values[field]));
    };

    const showAlert = (message, type) => {
        if (!alertBox) return;
        alertBox.textContent = message;
        alertBox.classList.remove('hidden');
        alertBox.classList.toggle('border-green-200', type === 'success');
        alertBox.classList.toggle('bg-green-50', type === 'success');
        alertBox.classList.toggle('text-green-700', type === 'success');
        alertBox.classList.toggle('border-red-200', type !== 'success');
        alertBox.classList.toggle('bg-red-50', type !== 'success');
        alertBox.classList.toggle('text-red-700', type !== 'success');
    };

    const hideAlert = () => {
        if (!alertBox) return;
        alertBox.classList.add('hidden');
    };

    const showLockBadge = show => {
        if (lockBadge) {
            lockBadge.classList.toggle('hidden', !show);
        }
    };

    const buildResultMessage = values => {
        const language = currentLanguage;
        const rasiKey = (values.rasi || '').toLowerCase();
        const element = elements[rasiKey] || 'air';
        const suitabilityText = HOROSCOPE_HINTS.suitability[element];
        const doshamText = values.dosham && values.dosham.toLowerCase().includes('no')
            ? HOROSCOPE_HINTS.dosham.default
            : HOROSCOPE_HINTS.dosham.caution;

        const matches = suggestMatches(rasiKey, values.nakshatra);
        const header = language === 'ta'
            ? '🔍 ஜாதக பகுப்பாய்வு முடிவு'
            : '🔍 Horoscope Result';

        return `${header}
${language === 'ta' ? 'பெயர்' : 'Name'}: ${values.name}
${language === 'ta' ? 'ராசி' : 'Rasi'}: ${values.rasi}
${language === 'ta' ? 'நட்சத்திரம்' : 'Nakshatra'}: ${values.nakshatra}
${language === 'ta' ? 'லக்னம்' : 'Lagnam'}: ${values.lagnam}
${language === 'ta' ? 'தோஷம்' : 'Dosham'}: ${values.dosham}

${language === 'ta' ? '✨ ஜாதக பொருத்தம்:' : '✨ Suitability:'}
${suitabilityText}

${language === 'ta' ? '🌟 சிறந்த 3 பொருத்தங்கள்:' : '🌟 Top 3 Matches:'}
${matches.join('\n')}

${language === 'ta' ? '⚠️ தோஷ எச்சரிக்கை:' : '⚠️ Dosham Warning:'}
${doshamText}`;
    };

    const appendEngineMessage = text => {
        if (!text) return;
        window.horoscopeChatController?.appendMessage('engine', text);
    };

    const suggestMatches = (rasi, nakshatra) => {
        const rasiLower = rasi.toLowerCase();
        const pool = {
            mesha: ['Simha – Rohini', 'Dhanus – Magha', 'Mithuna – Revati'],
            vrishabha: ['Kanya – Uttara', 'Makara – Shravana', 'Kataka – Hasta'],
            mithuna: ['Tula – Swati', 'Kumbha – Purva Bhadra', 'Simha – Magha'],
            kataka: ['Vrischika – Anuradha', 'Meena – Revati', 'Vrishabha – Rohini'],
            simha: ['Mesha – Ashwini', 'Dhanus – Mula', 'Mithuna – Ardra'],
            kanya: ['Vrishabha – Rohini', 'Makara – Uttara Ashadha', 'Vrischika – Jyeshtha'],
            tula: ['Mithuna – Swati', 'Kumbha – Shatabhisha', 'Dhanus – Purva Ashadha'],
            vrischika: ['Kataka – Pushya', 'Meena – Revati', 'Kanya – Hasta'],
            dhanus: ['Mesha – Ashwini', 'Simha – Purva Phalguni', 'Tula – Swati'],
            makara: ['Vrishabha – Krittika', 'Kanya – Chitra', 'Vrischika – Anuradha'],
            kumbha: ['Mithuna – Ardra', 'Tula – Vishakha', 'Dhanus – Mula'],
            meena: ['Kataka – Pushya', 'Vrischika – Jyeshtha', 'Makara – Uttara Ashadha']
        };
        return (pool[rasiLower] || ['Simha – Magha', 'Kanya – Hasta', 'Meena – Revati']).map(
            (entry, idx) => `${idx + 1}. ${entry}`
        );
    };

    const attachLanguageObserver = () => {
        const observer = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                if (mutation.attributeName === 'data-lang') {
                    currentLanguage = document.documentElement.getAttribute('data-lang') === 'ta' ? 'ta' : 'en';
                    applyLanguage();
                }
            });
        });
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-lang'] });
        applyLanguage();
    };

    const applyLanguage = () => {
        const dict = FORM_I18N[currentLanguage];
        document.querySelectorAll('[data-i18n]').forEach(node => {
            const key = node.getAttribute('data-i18n');
            if (dict[key]) {
                node.textContent = dict[key];
            }
        });
        document.querySelectorAll('[data-placeholder]').forEach(input => {
            const key = input.getAttribute('data-placeholder');
            if (dict[key]) {
                input.setAttribute('placeholder', dict[key]);
            }
        });
    };

    const attachChatGuards = () => {
        const input = document.getElementById('message-input');
        if (!input) return;
        input.addEventListener('keydown', evt => {
            if (evt.key === 'Enter' && !evt.shiftKey) {
                const raw = input.value.trim();
                if (!raw) return;
                if (!profileCompleted()) {
                    evt.preventDefault();
                    appendEngineMessage(FORM_I18N[currentLanguage].formProceed);
                    return;
                }
                if (!isHoroscopeQuestion(raw)) {
                    evt.preventDefault();
                    appendEngineMessage(FORM_I18N[currentLanguage].domainLock);
                }
            }
        });
    };

    const profileCompleted = () => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return false;
        try {
            const data = JSON.parse(stored);
            return REQUIRED_FIELDS.every(field => Boolean(data[field]));
        } catch (error) {
            return false;
        }
    };

    const isHoroscopeQuestion = text => {
        const keywords = ['rasi', 'nakshatra', 'porutham', 'horoscope', 'match', 'dosham', 'lagnam'];
        const lower = text.toLowerCase();
        return keywords.some(keyword => lower.includes(keyword));
    };

    document.addEventListener('DOMContentLoaded', init);
})();