(function() {
    'use strict';

    const INTENTS = {
        HOROSCOPE_MATCH: 'horoscope_match',
        PORUTHAM_CHECK: 'porutham_check',
        RIGHT_MATCH: 'right_match'
    };

    const DEFAULT_RESTRICTED_MESSAGE = '⚠️ I can assist only with horoscope-based matchmaking (Rasi, Nakshatra, Porutham). Please ask a related question.';

    const PARTNER_MARKERS = ['partner', 'fiance', 'bride', 'groom', 'his', 'her', 'boy', 'girl'];

    const SESSION_BLUEPRINT = {
        core: ['name', 'gender', 'rasi', 'nakshatra'],
        extended: ['lagnam', 'dosham', 'gotra'],
        partnerCore: ['partnerName', 'partnerGender', 'partnerRasi', 'partnerNakshatra'],
        partnerExtended: ['partnerLagnam', 'partnerDosham', 'partnerGotra'],
        optional: ['dob', 'tob', 'matrimonyId']
    };

    const HOROSCOPE_KEYWORDS = [
        'rasi',
        'raasi',
        'nakshatra',
        'porutham',
        'horoscope',
        'gotra',
        'gotram',
        'gothram',
        'lagnam',
        'lagna',
        'dosham',
        'compatibility',
        'match',
        'bride',
        'groom',
        'matrimony',
        'vm'
    ];

    const DATE_PATTERN = /\b(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})\b/;
    const TIME_PATTERN = /\b(\d{1,2}:\d{2}\s*(?:am|pm))\b/i;
    const GOTRA_PATTERN = /(?:gotra|gothram|கோத்ரம்)\s*(?:is|:)?\s*([a-zA-Z\s]{2,40})/gi;
    const LAGNAM_PATTERN = /(?:lagnam|lagna|லக்னம்)\s*(?:is|:)?\s*([a-zA-Z\s]{3,30})/gi;
    const DOSHAM_PATTERN = /(?:dosham|dhosham|தோஷம்)\s*(?:is|:)?\s*([a-zA-Z\s]{3,40})/gi;

    const QUICK_QUESTIONS = {
        find_match: {
            trigger: 'find my horoscope match',
            labels: {
                en: 'Find my horoscope match',
                ta: 'என் ஜாதக பொருத்தத்தைக் கண்டறியவும்'
            }
        },
        check_porutham: {
            trigger: 'check 10 porutham',
            labels: {
                en: 'Check 10 Porutham',
                ta: '10 பொருத்தம் சரிபார்க்கவும்'
            }
        },
        partner_suggestion: {
            trigger: 'bride & groom horoscope match',
            labels: {
                en: 'Bride & Groom Horoscope Match',
                ta: 'மணமகள் & மணமகன் ஜாதக பொருத்தம்'
            }
        }
    };

    const LANGUAGE_PACK = {
        en: {
            restrictedMessage: '⚠️ I can assist only with horoscope-based matchmaking (Rasi, Nakshatra, Porutham). Please ask a related question.',
            ackHeader: 'Thank you. I recorded these details:',
            ackFooter: 'Ask me to find matches or run a 10 Porutham check whenever you are ready.',
            missingIntro: 'I still need these details before I can analyse:',
            partnerMissingIntro: 'To check 10 Porutham I also need the partner details:',
            stepIntro: 'I still need these horoscope details:',
            partnerStepIntro: 'For compatibility I also need:',
            readyPrompt: 'All core horoscope fields are captured. Ask me to find matches or run a 10 Porutham check anytime.',
            askAfterMissing: 'Share them and I will continue the guidance.',
            detailLabels: {
                name: 'Name',
                gender: 'Gender',
                rasi: 'Rasi',
                nakshatra: 'Nakshatra',
                lagnam: 'Lagnam',
                dosham: 'Dosham',
                dob: 'Date of Birth',
                tob: 'Time of Birth',
                gotra: 'Gotra',
                partnerName: 'Partner Name',
                partnerGender: 'Partner Gender',
                partnerRasi: 'Partner Rasi',
                partnerNakshatra: 'Partner Nakshatra',
                partnerLagnam: 'Partner Lagnam',
                partnerDosham: 'Partner Dosham',
                partnerGotra: 'Partner Gotra',
                matrimonyId: 'Matrimony ID'
            },
            genderNames: {
                male: 'Male',
                female: 'Female'
            },
            listConjunction: 'and',
            horoscopeMatchHeading: 'Horoscope compatibility summary',
            horoscopeMatchText: ({ seekerRasi, seekerNak, matches, genderText, caution }) =>
                `Based on ${seekerRasi}${seekerNak ? ' and the ' + seekerNak + ' nakshatra' : ''}, I recommend partners who balance ${genderText || 'your'} energy. Compatible Rasi groups: ${matches}. ${caution}`,
            poruthamHeading: '10 Porutham result',
            poruthamSummary: ({ seekerRasi, partnerRasi, score, verdictLabel }) =>
                `10 Porutham score for ${seekerRasi} & ${partnerRasi}: ${score}/10 – ${verdictLabel}.`,
            poruthamVerdict: {
                suitable: 'Suitable',
                notRecommended: 'Not recommended'
            },
            poruthamNextStepSuitable: 'This pair carries auspicious alignment. Proceed with family discussions.',
            poruthamNextStepNot: 'Consider professional guidance or alternative matches for better alignment.',
            rightMatchHeading: 'Right match insight',
            rightMatchSummary: ({ seekerRasi, seekerNak, matches, nakAdvice }) =>
                `Your ${seekerRasi} nature pairs best with ${matches}. ${seekerNak ? seekerNak + ' nakshatra prefers companions who ' + nakAdvice : 'Share your Nakshatra for refined advice.'}`,
            dataPrompt: 'Share your Rasi, Nakshatra, gender or Matrimony ID anytime.',
            partnerPrompt: 'Please tell me your partner’s Rasi and Nakshatra too.',
            clearConfirmation: 'Chat cleared. I am ready with a fresh horoscope session.'
        },
        ta: {
            restrictedMessage: '⚠️ ராசி, நட்சத்திரம், 10 பொருத்தம் போன்ற ஜாதக அடிப்படையிலான கேள்விகளுக்கு மட்டுமே நான் உதவுவேன். தயவுசெய்து தொடர்புடைய கேள்வியை கேளுங்கள்.',
            ackHeader: 'நன்றி. கீழ்க்கண்ட தகவல்களை பதிவு செய்துள்ளேன்:',
            ackFooter: 'பொருத்தம் கண்டறிய அல்லது 10 பொருத்தம் பார்க்க எப்போது வேண்டுமானாலும் கேளுங்கள்.',
            missingIntro: 'பகுப்பாய்வை தொடர இந்த விவரங்கள் தேவை:',
            partnerMissingIntro: '10 பொருத்தம் சரிபார்க்க, துணை விவரங்களும் தேவையாகும்:',
            stepIntro: 'இந்த ஜாதக விவரங்களை இன்னும் தெரிந்து கொள்ள வேண்டும்:',
            partnerStepIntro: 'பொருத்தத்தை அமைக்க இந்த துணை விவரங்களும் தேவை:',
            readyPrompt: 'அனைத்து முக்கிய ஜாதக விவரங்களும் பதிவு செய்யப்பட்டது. பொருத்தம் காண அல்லது 10 பொருத்தம் நடத்த சொல்லுங்கள்.',
            askAfterMissing: 'இவற்றை பகிர்ந்தவுடன் வழிகாட்டுவேன்.',
            detailLabels: {
                name: 'பெயர்',
                gender: 'பாலினம்',
                rasi: 'ராசி',
                nakshatra: 'நட்சத்திரம்',
                lagnam: 'லக்னம்',
                dosham: 'தோஷம்',
                dob: 'பிறந்த தேதி',
                tob: 'பிறந்த நேரம்',
                gotra: 'கோத்ரம்',
                partnerName: 'துணை பெயர்',
                partnerGender: 'துணை பாலினம்',
                partnerRasi: 'துணை ராசி',
                partnerNakshatra: 'துணை நட்சத்திரம்',
                partnerLagnam: 'துணை லக்னம்',
                partnerDosham: 'துணை தோஷம்',
                partnerGotra: 'துணை கோத்ரம்',
                matrimonyId: 'மெட்ரிமனி ID'
            },
            genderNames: {
                male: 'ஆண்',
                female: 'பெண்'
            },
            listConjunction: 'மற்றும்',
            horoscopeMatchHeading: 'ஜாதக பொருத்த சுருக்கம்',
            horoscopeMatchText: ({ seekerRasi, seekerNak, matches, genderText, caution }) =>
                `${seekerRasi}${seekerNak ? ' மற்றும் ' + seekerNak + ' நட்சத்திரம்' : ''} அடிப்படையில் ${genderText || 'உங்கள்'} ஆற்றலுக்கு ஏற்ற துணைகள்: ${matches}. ${caution}`,
            poruthamHeading: '10 பொருத்த முடிவு',
            poruthamSummary: ({ seekerRasi, partnerRasi, score, verdictLabel }) =>
                `${seekerRasi} & ${partnerRasi} ஜோடிக்கு 10 பொருத்த மதிப்பெண்: ${score}/10 – ${verdictLabel}.`,
            poruthamVerdict: {
                suitable: 'சாதகமான பொருத்தம்',
                notRecommended: 'பரிந்துரைக்கப்படவில்லை'
            },
            poruthamNextStepSuitable: 'இந்த இணைப்பு சுபமாயுள்ளது. குடும்ப ஆலோசனையுடன் முன்னேறலாம்.',
            poruthamNextStepNot: 'மாற்று பொருத்தங்களை ஆராய்ந்து பார்க்கவும் அல்லது நிபுணர் ஆலோசனை பெறவும்.',
            rightMatchHeading: 'சரியான துணை வழிகாட்டல்',
            rightMatchSummary: ({ seekerRasi, seekerNak, matches, nakAdvice }) =>
                `உங்கள் ${seekerRasi} இயல்பிற்கு ஏற்ற ராசிகள்: ${matches}. ${seekerNak ? seekerNak + ' நட்சத்திரம் ' + nakAdvice : 'மேலும் வழிகாட்ட உங்கள் நட்சத்திரத்தை பகிரவும்.'}`,
            dataPrompt: 'உங்கள் ராசி, நட்சத்திரம், பாலினம் அல்லது மெட்ரிமனி ID ஐ பகிரலாம்.',
            partnerPrompt: 'துணையின் ராசி மற்றும் நட்சத்திரத்தையும் தெரிவிக்கவும்.',
            clearConfirmation: 'சாட் அழிக்கப்பட்டது. புதிய ஜோதிட அமர்விற்கு தயார்.'
        }
    };

    const FIELD_PROMPTS = {
        name: {
            en: 'Please share your name. For example: "My name is Arjun".',
            ta: 'உங்கள் பெயரை பகிரவும். உதாரணம்: "என் பெயர் அர்ஜுன்".'
        },
        gender: {
            en: 'Mention if you are male or female so I can guide correctly.',
            ta: 'நீங்கள் ஆண் அல்லது பெண் என்பதை தெரிவிக்கவும்.'
        },
        rasi: {
            en: 'Tell me your Rasi (e.g., Mesha, Simha, Kanya).',
            ta: 'உங்கள் ராசியை குறிப்பிடவும் (மேஷம், சிம்மம், கன்னி போன்றவை).'
        },
        nakshatra: {
            en: 'Share your Nakshatra (e.g., Rohini, Magha, Swathi).',
            ta: 'உங்கள் நட்சத்திரத்தை கூறவும் (ரோஹிணி, மகம், ஸ்வாதி போன்றவை).'
        },
        lagnam: {
            en: 'Share your Lagnam (ascendant) such as Mesha, Simha or Kanya.',
            ta: 'உங்கள் லக்னத்தை (மேஷம், சிம்மம், கன்னி போன்றவை) பகிரவும்.'
        },
        dosham: {
            en: 'Mention your Dosham status. Example: No Dosham / Sevvai Dosham.',
            ta: 'உங்களுக்கு உள்ள தோஷத்தை கூறவும். எ.கா., தோஷம் இல்லை / செவ்வாய் தோஷம்.'
        },
        dob: {
            en: 'Optionally add your birth date (DD-MM-YYYY).',
            ta: 'விருப்பமாக உங்கள் பிறந்த தேதியை (DD-MM-YYYY) பகிரலாம்.'
        },
        tob: {
            en: 'If available, mention your birth time (e.g., 06:45 AM).',
            ta: 'இருந்தால் உங்கள் பிறந்த நேரத்தை (எ.கா., 06:45 AM) பகிரவும்.'
        },
        gotra: {
            en: 'Tell me your Gotra / Gothram if you know it.',
            ta: 'உங்கள் கோத்ரம் தெரிந்தால் பகிரவும்.'
        },
        matrimonyId: {
            en: 'Share your Matrimony ID (example: VM12345678).',
            ta: 'உங்கள் மெட்ரிமனி ID (உதாரணம்: VM12345678) பகிரவும்.'
        },
        partnerName: {
            en: 'Let me know your partner name if you want couple analysis.',
            ta: 'இருவருக்குமான பகுப்பாய்வு வேண்டுமானால் துணை பெயரையும் தெரிவிக்கவும்.'
        },
        partnerGender: {
            en: 'Mention partner gender (bride/groom).',
            ta: 'துணையின் பாலினத்தையும் குறிப்பிடவும் (மணமகன் / மணமகள்).'
        },
        partnerRasi: {
            en: 'Share partner Rasi for Porutham check.',
            ta: '10 பொருத்தம் பார்க்க துணை ராசியையும் பகிரவும்.'
        },
        partnerNakshatra: {
            en: 'Share partner Nakshatra to complete the Porutham.',
            ta: '10 பொருத்தம் முடிக்க துணை நட்சத்திரத்தையும் தெரிவிக்கவும்.'
        },
        partnerGotra: {
            en: 'Tell me your partner’s Gotram / Gothram.',
            ta: 'துணையின் கோத்ரம் / கோத்திரத்தையும் தெரிவிக்கவும்.'
        },
        partnerLagnam: {
            en: 'Share partner Lagnam (ascendant) for accurate porutham.',
            ta: 'துல்லியமான பொருத்தத்திற்காக துணை லக்னத்தையும் கூறவும்.'
        },
        partnerDosham: {
            en: 'Mention partner’s Dosham status such as No Dosham / Sevvai.',
            ta: 'துணைக்கு உள்ள தோஷ நிலையை (தோஷம் இல்லை / செவ்வாய் போன்றவை) கூறவும்.'
        }
    };

    const INTENT_KEYWORDS = {
        [INTENTS.HOROSCOPE_MATCH]: ['find my horoscope match', 'horoscope match', 'match for me', 'suitable partner', 'rasi match', 'match me', 'match finder'],
        [INTENTS.PORUTHAM_CHECK]: ['10 porutham', 'porutham check', 'marriage porutham', 'porutham score', 'check porutham', 'bride & groom horoscope match', 'bride and groom horoscope match'],
        [INTENTS.RIGHT_MATCH]: ['who is right match', 'right partner', 'best match for me', 'suggest partner', 'ideal partner']
    };

    const RASI_DATA = {
        mesha: {
            display: { en: 'Mesha (Aries)', ta: 'மேஷம்' },
            element: 'fire',
            matches: ['simha', 'dhanus', 'mithuna'],
            caution: {
                en: 'Stay patient with Vrishabha or Kanya alliances.',
                ta: 'விருசபம் அல்லது கன்னி இணைப்புகளில் பொறுமை தேவை.'
            },
            trait: { en: 'courageous fire sign', ta: 'ஆற்றல்மிக்க தீ ராசி' },
            aliases: ['mesha', 'aries', 'மேஷ', 'மேஷம்']
        },
        vrishabha: {
            display: { en: 'Vrishabha (Taurus)', ta: 'ரிஷபம்' },
            element: 'earth',
            matches: ['kanya', 'makara', 'kataka'],
            caution: {
                en: 'Avoid impulsive partners from Mithuna group.',
                ta: 'மிதுனம் போன்ற திடீர் இயல்புள்ள ராசிகளை தவிர்க்கவும்.'
            },
            trait: { en: 'grounded earth sign', ta: 'நிலைத்த நில ராசி' },
            aliases: ['vrishabha', 'rishaba', 'taurus', 'ரிஷபம்']
        },
        mithuna: {
            display: { en: 'Mithuna (Gemini)', ta: 'மிதுனம்' },
            element: 'air',
            matches: ['tula', 'kumbha', 'simha'],
            caution: {
                en: 'Needs steady partners to balance thought flow.',
                ta: 'நிலையான துணை சிந்தனை ஓட்டத்தைக் கட்டுப்படுத்த உதவும்.'
            },
            trait: { en: 'adaptable air sign', ta: 'மாறுபடும் வாயு ராசி' },
            aliases: ['mithuna', 'gemini', 'மிதுனம்']
        },
        kataka: {
            display: { en: 'Kataka (Cancer)', ta: 'கடகம்' },
            element: 'water',
            matches: ['vrischika', 'meena', 'vrishabha'],
            caution: {
                en: 'Needs emotional assurance from fire signs.',
                ta: 'தீ ராசிகளில் உணர்ச்சி பாதுகாப்பு தேவை.'
            },
            trait: { en: 'nurturing water sign', ta: 'அனைத்தும் அளிக்கும் நீர் ராசி' },
            aliases: ['kataka', 'cancer', 'kadaga', 'கடகம்']
        },
        simha: {
            display: { en: 'Simha (Leo)', ta: 'சிம்மம்' },
            element: 'fire',
            matches: ['mesha', 'dhanus', 'mithuna'],
            caution: {
                en: 'Respectful dialogue keeps harmony with Kumbha.',
                ta: 'கும்ப ராசியுடன் மரியாதையான உரையாடல் அவசியம்.'
            },
            trait: { en: 'radiant leader', ta: 'வெம்மையூட்டும் தலைவரான ராசி' },
            aliases: ['simha', 'leo', 'சிம்மம்']
        },
        kanya: {
            display: { en: 'Kanya (Virgo)', ta: 'கன்னி' },
            element: 'earth',
            matches: ['vrishabha', 'makara', 'vrischika'],
            caution: {
                en: 'Be mindful of overthinking with Mithuna partners.',
                ta: 'மிதுன ராசியுடன் அதிக சிந்தனையைத் தவிர்க்கவும்.'
            },
            trait: { en: 'analytical earth sign', ta: 'ஆழ்ந்த பகுப்பாய்வு செய்யும் ராசி' },
            aliases: ['kanya', 'virgo', 'கன்னி']
        },
        tula: {
            display: { en: 'Tula (Libra)', ta: 'துலாம்' },
            element: 'air',
            matches: ['mithuna', 'kumbha', 'dhanus'],
            caution: {
                en: 'Balance decisions swiftly when paired with Makara.',
                ta: 'மகர ராசியுடன் விரைவான முடிவுகள் அவசியம்.'
            },
            trait: { en: 'harmonising air sign', ta: 'இணக்கத்தை தேடும் ராசி' },
            aliases: ['tula', 'libra', 'துலாம்']
        },
        vrischika: {
            display: { en: 'Vrischika (Scorpio)', ta: 'விருச்சிகம்' },
            element: 'water',
            matches: ['kataka', 'meena', 'kanya'],
            caution: {
                en: 'Share feelings openly with Mithuna alliances.',
                ta: 'மிதுன இணைப்பில் உணர்வுகளை திறந்தவையாக பகிரவும்.'
            },
            trait: { en: 'intuitive water sign', ta: 'உள்ளுணர்வு மிகுந்த ராசி' },
            aliases: ['vrischika', 'scorpio', 'விருச்சிகம்']
        },
        dhanus: {
            display: { en: 'Dhanus (Sagittarius)', ta: 'தனுசு' },
            element: 'fire',
            matches: ['mesha', 'simha', 'tula'],
            caution: {
                en: 'Ground ambitions when paired with Kanya.',
                ta: 'கன்னி ராசியுடன் கனவுகளை நிலைப்படுத்தவும்.'
            },
            trait: { en: 'visionary fire sign', ta: 'தூரநோக்கு கொண்ட தீ ராசி' },
            aliases: ['dhanus', 'sagittarius', 'தனுசு', 'dhanusu']
        },
        makara: {
            display: { en: 'Makara (Capricorn)', ta: 'மகரம்' },
            element: 'earth',
            matches: ['vrishabha', 'kanya', 'vrischika'],
            caution: {
                en: 'Needs warmth from water signs to soften routine.',
                ta: 'நீர் ராசிகளின் பாசம் தேவை.'
            },
            trait: { en: 'disciplined earth sign', ta: 'ஒழுக்கம் கொண்ட நில ராசி' },
            aliases: ['makara', 'capricorn', 'மகரம்']
        },
        kumbha: {
            display: { en: 'Kumbha (Aquarius)', ta: 'கும்பம்' },
            element: 'air',
            matches: ['mithuna', 'tula', 'dhanus'],
            caution: {
                en: 'Share emotions consciously with Kataka partners.',
                ta: 'கடக இணைப்பில் உணர்ச்சிகளை தெளிவாக பகிரவும்.'
            },
            trait: { en: 'innovative air sign', ta: 'புதுமை நாடும் ராசி' },
            aliases: ['kumbha', 'aquarius', 'கும்பம்']
        },
        meena: {
            display: { en: 'Meena (Pisces)', ta: 'மீனம்' },
            element: 'water',
            matches: ['kataka', 'vrischika', 'makara'],
            caution: {
                en: 'Set realistic plans when paired with Simha.',
                ta: 'சிம்ம இணைப்பில் நடைமுறைத் திட்டங்கள் அவசியம்.'
            },
            trait: { en: 'empathetic water sign', ta: 'கருணையூட்டும் நீர் ராசி' },
            aliases: ['meena', 'pisces', 'மீனம்']
        }
    };

    const NAKSHATRA_DATA = {
        ashwini: { display: { en: 'Ashwini', ta: 'அஷ்வினி' }, group: 'deva', aliases: ['ashwini', 'aswini', 'அஷ்வினி'] },
        bharani: { display: { en: 'Bharani', ta: 'பரணி' }, group: 'manushya', aliases: ['bharani', 'பரணி'] },
        krittika: { display: { en: 'Krittika', ta: 'கிருத்திகை' }, group: 'rakshasa', aliases: ['krittika', 'krithigai', 'கிருத்திகை'] },
        rohini: { display: { en: 'Rohini', ta: 'ரோகிணி' }, group: 'manushya', aliases: ['rohini', 'ரோகிணி'] },
        mrigashirsha: { display: { en: 'Mrigashirsha', ta: 'மிருகசீரிஷம்' }, group: 'deva', aliases: ['mrigashirsha', 'mrigasirisa', 'மிருகசீரிஷம்'] },
        ardra: { display: { en: 'Ardra', ta: 'ஆர்த்திரா' }, group: 'rakshasa', aliases: ['ardra', 'aarudra', 'ஆர்த்திரா'] },
        punarvasu: { display: { en: 'Punarvasu', ta: 'புனர்பூசம்' }, group: 'deva', aliases: ['punarvasu', 'punarpoosam', 'புனர்பூசம்'] },
        pushya: { display: { en: 'Pushya', ta: 'பூசம்' }, group: 'deva', aliases: ['pushya', 'poosam', 'பூசம்'] },
        ashlesha: { display: { en: 'Ashlesha', ta: 'ஆயில்யம்' }, group: 'rakshasa', aliases: ['ashlesha', 'ayilyam', 'ஆயில்யம்'] },
        magha: { display: { en: 'Magha', ta: 'மகம்' }, group: 'rakshasa', aliases: ['magha', 'மகம்'] },
        purva_phalguni: { display: { en: 'Purva Phalguni', ta: 'பூர்வ பல்குனி' }, group: 'manushya', aliases: ['purva phalguni', 'pooram', 'பூரம்'] },
        uttara_phalguni: { display: { en: 'Uttara Phalguni', ta: 'உத்திர பல்குனி' }, group: 'manushya', aliases: ['uttara phalguni', 'uthiram', 'உத்திரம்'] },
        hasta: { display: { en: 'Hasta', ta: 'ஹஸ்தம்' }, group: 'deva', aliases: ['hasta', 'hastham', 'ஹஸ்தம்'] },
        chitra: { display: { en: 'Chitra', ta: 'சித்திரை' }, group: 'rakshasa', aliases: ['chitra', 'chithirai', 'சித்திரை'] },
        swati: { display: { en: 'Swati', ta: 'ஸ்வாதி' }, group: 'deva', aliases: ['swati', 'swathi', 'ஸ்வாதி'] },
        vishakha: { display: { en: 'Vishakha', ta: 'விசாகம்' }, group: 'rakshasa', aliases: ['vishakha', 'visakam', 'விசாகம்'] },
        anuradha: { display: { en: 'Anuradha', ta: 'அனுராதா' }, group: 'deva', aliases: ['anuradha', 'anusham', 'அனுஷம்'] },
        jyeshtha: { display: { en: 'Jyeshtha', ta: 'கேட்டை' }, group: 'rakshasa', aliases: ['jyeshtha', 'kettai', 'கேட்டை'] },
        mula: { display: { en: 'Mula', ta: 'மூலம்' }, group: 'rakshasa', aliases: ['mula', 'moolam', 'மூலம்'] },
        purva_ashadha: { display: { en: 'Purva Ashadha', ta: 'பூராடம்' }, group: 'manushya', aliases: ['purva ashadha', 'pooradam', 'பூராடம்'] },
        uttara_ashadha: { display: { en: 'Uttara Ashadha', ta: 'உத்திராடம்' }, group: 'manushya', aliases: ['uttara ashadha', 'uthiradam', 'உத்திராடம்'] },
        shravana: { display: { en: 'Shravana', ta: 'திருவோணம்' }, group: 'deva', aliases: ['shravana', 'thiruvonam', 'திருவோணம்'] },
        dhanishta: { display: { en: 'Dhanishta', ta: 'அவிட்டம்' }, group: 'rakshasa', aliases: ['dhanishta', 'avittam', 'அவிட்டம்'] },
        shatabhisha: { display: { en: 'Shatabhisha', ta: 'சதயம்' }, group: 'rakshasa', aliases: ['shatabhisha', 'sadayam', 'சதயம்'] },
        purva_bhadrapada: { display: { en: 'Purva Bhadrapada', ta: 'பூரட்டாதி' }, group: 'manushya', aliases: ['purva bhadrapada', 'purattadhi', 'பூரட்டாதி'] },
        uttara_bhadrapada: { display: { en: 'Uttara Bhadrapada', ta: 'உத்திரட்டாதி' }, group: 'manushya', aliases: ['uttara bhadrapada', 'uthirattadhi', 'உத்திரட்டாதி'] },
        revati: { display: { en: 'Revati', ta: 'ரேவதி' }, group: 'deva', aliases: ['revati', 'revathi', 'ரேவதி'] }
    };

    const NAK_GROUP_ADVICE = {
        deva: {
            en: 'value spiritual outlook and gentle communication.',
            ta: 'ஆன்மீக நோக்கு மற்றும் மிருதுவான உரையாடலை விரும்புகிறது.'
        },
        manushya: {
            en: 'seek practical partners who support daily progress.',
            ta: 'நேர்த்தியான நாளாந்த முன்னேற்றத்தை ஆதரிக்கும் துணையை நாடுகிறது.'
        },
        rakshasa: {
            en: 'need strong-willed companions who respect intensity.',
            ta: 'உறுதியான மனப்பாங்கு கொண்ட, உங்கள் தீவிரத்தை மதிக்கும் துணையை நாடுகிறது.'
        }
    };

    const PORUTHAM_MATRIX = {
        fire: { fire: 8, earth: 7, air: 7, water: 6 },
        earth: { fire: 7, earth: 8, air: 6, water: 7 },
        air: { fire: 7, earth: 6, air: 8, water: 7 },
        water: { fire: 6, earth: 7, air: 7, water: 8 }
    };

    const PORUTHAM_LINES = [
        {
            key: 'dina',
            en: { label: 'Dina Porutham', positive: 'Day-to-day harmony remains steady.', negative: 'Daily rhythm needs adjustment.' },
            ta: { label: 'தின பொருத்தம்', positive: 'நாள்தோறும் ஒத்திசைவு உள்ளது.', negative: 'நாள் ஒழுங்கில் கவனம் தேவை.' }
        },
        {
            key: 'gana',
            en: { label: 'Gana Porutham', positive: 'Temperaments complement each other.', negative: 'Temperaments require extra understanding.' },
            ta: { label: 'கண பொருத்தம்', positive: 'மனநிலை ஒன்று மற்றொன்றை பூர்த்தி செய்கிறது.', negative: 'மனோபாவம் கூடுதல் புரிதல் தேவை.' }
        },
        {
            key: 'mahendra',
            en: { label: 'Mahendra Porutham', positive: 'Blessings for prosperity indicated.', negative: 'Prosperity blessing appears weaker right now.' },
            ta: { label: 'மகேந்திர பொருத்தம்', positive: 'செழிப்பு ஆசீர்வாதங்கள் தெரிகின்றன.', negative: 'செழிப்பிற்கு கூடுதல் சாதகம் தேவை.' }
        },
        {
            key: 'stree-deergha',
            en: { label: 'Stree Deergha', positive: 'Longevity and wellbeing align.', negative: 'Longevity aspects need guidance.' },
            ta: { label: 'ஸ்த்ரீ தீர்க்கம்', positive: 'நீண்ட ஆயுள் மற்றும் நலன் இணைகிறது.', negative: 'நீடிப்பு ஆலோசனை தேவை.' }
        },
        {
            key: 'yoni',
            en: { label: 'Yoni Porutham', positive: 'Comfort level between partners is warm.', negative: 'Comfort level dips; patience is needed.' },
            ta: { label: 'யோனி பொருத்தம்', positive: 'இணையரின் நெருக்கம் இனிமையாகும்.', negative: 'இணக்கம் குறைகிறது, பொறுமை தேவை.' }
        },
        {
            key: 'veda',
            en: { label: 'Veda Porutham', positive: 'Spiritual alignment is stable.', negative: 'Spiritual alignment feels imbalanced.' },
            ta: { label: 'ரஜ்ஜு பொருத்தம்', positive: 'வாழ்க்கைப் பாதை பாதுகாப்பாக உள்ளது.', negative: 'வாழ்க்கைப் பாதையில் கவனம் அவசியம்.' }
        },
        {
            key: 'veda',
            en: { label: 'Vasya Porutham', positive: 'Mutual attraction and respect balanced.', negative: 'Mutual attraction needs to be rebuilt.' },
            ta: { label: 'வேத பொருத்தம்', positive: 'ஆன்மீக ஒத்திசைவு நிலைப்படுகிறது.', negative: 'ஆன்மீக இணக்கம் குறைகிறது.' }
        },
        {
            key: 'vasya',
            en: { label: 'Rasyadhipathi', positive: 'Planetary lords cooperate.', negative: 'Planetary lords show differing agendas.' },
            ta: { label: 'வஸ்ய பொருத்தம்', positive: 'பரஸ்பர ஈர்ப்பு மற்றும் மரியாதை நிலைபெற்றது.', negative: 'பரஸ்பர ஈர்ப்பு மீண்டும் அமைக்க வேண்டும்.' }
        },
        {
            key: 'rasyadhipati',
            en: { label: 'Rasyadhipathi', positive: 'Planetary lords cooperate.', negative: 'கிரக அதிபதிகள் வேறுபாட்டைக் காட்டுகின்றனர்.' },
            ta: { label: 'ராச்யாதிபதி', positive: 'கிரக அதிபதிகள் ஒத்துழைக்கின்றனர்.', negative: 'கிரக அதிபதிகள் வேறுபாடு காட்டுகின்றனர்.' }
        },
        {
            key: 'nadi',
            en: { label: 'Nadi Porutham', positive: 'Vital energy flow is balanced.', negative: 'உடல் ஆற்றலுக்கு சமநிலை இல்லை.' },
            ta: { label: 'நாடி பொருத்தம்', positive: 'உடல் ஆற்றல் சமநிலை உள்ளது.', negative: 'உடல் ஆற்றல் சமநிலை இல்லை.' }
        }
    ];

    const normalizeLanguage = lang => (lang === 'ta' ? 'ta' : 'en');

    const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

    const formatList = (items, language) => {
        const filtered = items.filter(Boolean);
        if (filtered.length <= 1) {
            return filtered.join('');
        }
        const last = filtered.pop();
        const conj = LANGUAGE_PACK[language].listConjunction;
        return `${filtered.join(', ')} ${conj} ${last}`;
    };

    const toTitle = value => value ? value.charAt(0).toUpperCase() + value.slice(1) : value;

    class HoroscopeEngine {
        constructor() {
            this.language = 'en';
            this.reset();
        }

        reset() {
            this.state = {
                seeker: {
                    name: null,
                    gender: null,
                    rasi: null,
                    nakshatra: null,
                    lagnam: null,
                    dosham: null,
                    dob: null,
                    tob: null,
                    gotra: null
                },
                partner: {
                    name: null,
                    gender: null,
                    rasi: null,
                    nakshatra: null,
                    lagnam: null,
                    dosham: null,
                    gotra: null
                },
                matrimonyId: null,
                pendingIntent: null,
                meta: {
                    collectedOrder: [],
                    lastPrompt: null
                }
            };
        }

        setLanguage(lang) {
            this.language = normalizeLanguage(lang);
        }

        getRestrictedMessage() {
            return LANGUAGE_PACK[this.language].restrictedMessage || DEFAULT_RESTRICTED_MESSAGE;
        }

        isHoroscopeContext(text) {
            const lower = text.toLowerCase();
            return HOROSCOPE_KEYWORDS.some(keyword => lower.includes(keyword));
        }

        getPendingFields(intent) {
            const baseFields = SESSION_BLUEPRINT.core.filter(field => !this.getFieldValue(field));
            const required = [...baseFields];
            if (intent === INTENTS.PORUTHAM_CHECK) {
                const extended = SESSION_BLUEPRINT.extended.filter(field => !this.getFieldValue(field));
                required.push(...extended);
            }

            const partner = intent === INTENTS.PORUTHAM_CHECK
                ? [...SESSION_BLUEPRINT.partnerCore, ...SESSION_BLUEPRINT.partnerExtended]
                    .filter(field => !this.getFieldValue(field))
                : [];
            return { required, partner };
        }

        buildStepPrompt(pending) {
            const langPack = LANGUAGE_PACK[this.language];
            const lines = [];

            if (pending.required.length) {
                lines.push(langPack.stepIntro);
                pending.required.forEach(field => {
                    lines.push(`• ${this.getFieldPrompt(field)}`);
                });
            }

            if (pending.partner.length) {
                lines.push(langPack.partnerStepIntro);
                pending.partner.forEach(field => {
                    lines.push(`• ${this.getFieldPrompt(field)}`);
                });
            }

            lines.push('', langPack.askAfterMissing);
            return lines.join('\n').trim();
        }

        getFieldPrompt(field) {
            const prompt = FIELD_PROMPTS[field]?.[this.language];
            if (prompt) {
                return prompt;
            }
            const labels = LANGUAGE_PACK[this.language].detailLabels;
            return labels[field] ? `${labels[field]}?` : field;
        }

        getFieldValue(field) {
            switch (field) {
                case 'name':
                    return this.state.seeker.name;
                case 'gender':
                    return this.state.seeker.gender;
                case 'rasi':
                    return this.state.seeker.rasi;
                case 'nakshatra':
                    return this.state.seeker.nakshatra;
                case 'lagnam':
                    return this.state.seeker.lagnam;
                case 'dosham':
                    return this.state.seeker.dosham;
                case 'dob':
                    return this.state.seeker.dob;
                case 'tob':
                    return this.state.seeker.tob;
                case 'gotra':
                    return this.state.seeker.gotra;
                case 'matrimonyId':
                    return this.state.matrimonyId;
                case 'partnerName':
                    return this.state.partner.name;
                case 'partnerGender':
                    return this.state.partner.gender;
                case 'partnerRasi':
                    return this.state.partner.rasi;
                case 'partnerNakshatra':
                    return this.state.partner.nakshatra;
                case 'partnerLagnam':
                    return this.state.partner.lagnam;
                case 'partnerDosham':
                    return this.state.partner.dosham;
                case 'partnerGotra':
                    return this.state.partner.gotra;
                default:
                    return null;
            }
        }

        getFieldValueForDisplay(field) {
            const langPack = LANGUAGE_PACK[this.language];
            switch (field) {
                case 'name':
                    return this.state.seeker.name;
                case 'gender':
                    return this.state.seeker.gender ? langPack.genderNames[this.state.seeker.gender] : null;
                case 'rasi':
                    return this.formatRasi(this.state.seeker.rasi);
                case 'nakshatra':
                    return this.formatNakshatra(this.state.seeker.nakshatra);
                case 'lagnam':
                    return this.formatRasi(this.state.seeker.lagnam);
                case 'dosham':
                    return this.formatDosham(this.state.seeker.dosham);
                case 'dob':
                    return this.state.seeker.dob;
                case 'tob':
                    return this.state.seeker.tob;
                case 'gotra':
                    return this.state.seeker.gotra;
                case 'matrimonyId':
                    return this.state.matrimonyId;
                case 'partnerName':
                    return this.state.partner.name;
                case 'partnerGender':
                    return this.state.partner.gender ? langPack.genderNames[this.state.partner.gender] : null;
                case 'partnerRasi':
                    return this.formatRasi(this.state.partner.rasi);
                case 'partnerNakshatra':
                    return this.formatNakshatra(this.state.partner.nakshatra);
                case 'partnerLagnam':
                    return this.formatRasi(this.state.partner.lagnam);
                case 'partnerDosham':
                    return this.formatDosham(this.state.partner.dosham);
                case 'partnerGotra':
                    return this.state.partner.gotra ? toTitle(this.state.partner.gotra) : null;
                default:
                    return null;
            }
        }

        describeField(field) {
            if (!field) return '';
            return field
                .replace(/([A-Z])/g, ' $1')
                .replace(/^./, char => char.toUpperCase())
                .trim();
        }

        buildReadyMessage() {
            return LANGUAGE_PACK[this.language].readyPrompt;
        }

        buildAcknowledgement(fields = []) {
            if (!fields.length) {
                return '';
            }
            const langPack = LANGUAGE_PACK[this.language];
            const labels = langPack.detailLabels;
            const lines = fields.map(field => {
                const value = this.getFieldValueForDisplay(field);
                if (!value) return null;
                const label = labels[field] || this.describeField(field);
                return `${label}: ${value}`;
            }).filter(Boolean);

            if (!lines.length) {
                return '';
            }

            return `${langPack.ackHeader}\n${lines.join('\n')}\n\n${langPack.ackFooter}`;
        }

        detectIntent(text) {
            const lower = text.toLowerCase();
            for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS)) {
                if (keywords.some(keyword => lower.includes(keyword))) {
                    return intent;
                }
            }
            return null;
        }

        handleMessage(rawText) {
            if (!rawText) {
                return this.getRestrictedMessage();
            }

            const text = rawText.trim();
            if (!text) {
                return this.getRestrictedMessage();
            }

            const updates = this.extractDetails(text);
            const capturedFields = this.applyUpdates(updates);
            const hasNewData = capturedFields.length > 0;

            let intent = this.detectIntent(text);
            if (intent) {
                this.state.pendingIntent = intent;
            }

            const relevant = hasNewData || this.state.pendingIntent || this.isHoroscopeContext(text);
            if (!relevant) {
                return this.getRestrictedMessage();
            }

            const responses = [];
            if (hasNewData) {
                const acknowledgment = this.buildAcknowledgement(capturedFields);
                if (acknowledgment) {
                    responses.push(acknowledgment);
                }
            }

            const pending = this.getPendingFields(this.state.pendingIntent);
            if (pending.required.length || pending.partner.length) {
                responses.push(this.buildStepPrompt(pending));
                this.state.meta.lastPrompt = Date.now();
                return responses.join('\n\n');
            }

            if (this.state.pendingIntent) {
                const response = this.respondByIntent(this.state.pendingIntent);
                if (response.fulfilled) {
                    this.state.pendingIntent = null;
                }
                responses.push(response.text);
                return responses.join('\n\n');
            }

            if (hasNewData) {
                responses.push(this.buildReadyMessage());
                return responses.join('\n\n');
            }

            return this.getRestrictedMessage();
        }

        respondByIntent(intent) {
            switch (intent) {
                case INTENTS.HOROSCOPE_MATCH:
                    return this.respondHoroscopeMatch();
                case INTENTS.PORUTHAM_CHECK:
                    return this.respondPorutham();
                case INTENTS.RIGHT_MATCH:
                    return this.respondRightMatch();
                default:
                    return { text: this.getRestrictedMessage(), fulfilled: true };
            }
        }

        respondHoroscopeMatch() {
            const seeker = this.state.seeker;
            const missing = [];
            if (!seeker.rasi) missing.push('rasi');
            if (!seeker.nakshatra) missing.push('nakshatra');
            if (!seeker.gender) missing.push('gender');

            if (missing.length) {
                return {
                    text: this.buildMissingMessage(missing),
                    fulfilled: false
                };
            }

            const langPack = LANGUAGE_PACK[this.language];
            const rasiInfo = RASI_DATA[seeker.rasi];
            const seekerRasi = this.formatRasi(seeker.rasi);
            const seekerNak = this.formatNakshatra(seeker.nakshatra);
            const matches = rasiInfo.matches.map(rasi => this.formatRasi(rasi));
            const caution = rasiInfo.caution[this.language];
            const genderText = seeker.gender ? langPack.genderNames[seeker.gender] : null;

            const isTamil = this.language === 'ta';
            const heading = isTamil ? 'தற்காலிக ஜாதக பார்வை' : 'Preliminary Horoscope Insight';
            const natureLabel = isTamil ? 'ராசி பண்பியல்' : 'Rasi temperament';
            const nakLabel = isTamil ? 'நட்சத்திர அதிர்வு' : 'Nakshatram pulse';
            const partnerLabel = isTamil ? 'சரியான துணை வழிகாட்டல்' : 'Ideal partner outline';
            const adviceLabel = isTamil ? 'வழிகாட்டல்' : 'Guidance';
            const closing = isTamil
                ? 'முழு 10 பொருத்த தீர்ப்பிற்காக மணமகன் / மணமகள் விவரங்களை பின்னர் பகிருங்கள்.'
                : 'Share the bride or groom horoscope when you are ready for the full 10 Porutham verdict.';

            const nakGroup = this.getNakshatraGroup(seeker.nakshatra);
            const nakAdvice = (NAK_GROUP_ADVICE[nakGroup] && NAK_GROUP_ADVICE[nakGroup][this.language])
                || (isTamil ? 'நட்சத்திர விவரங்கள் நிறைவாக உள்ளன.' : 'Nakshatram details captured.');
            const lagnamLine = seeker.lagnam
                ? `${isTamil ? 'லக்னம்' : 'Lagnam'}: ${this.formatRasi(seeker.lagnam)}`
                : null;

            const partnerLine = isTamil
                ? `${formatList(matches, this.language)} போன்ற ராசி-நட்சத்திரங்கள் ${genderText || 'உங்கள்'} ஆற்றலை சமநிலைப்படுத்தும்.`
                : `${formatList(matches, this.language)} Rasi alliances steady ${genderText || 'your'} nature.`;

            const lines = [
                heading,
                `${natureLabel}: ${seekerRasi}${rasiInfo?.trait ? ' – ' + rasiInfo.trait[this.language] : ''}`,
                `${nakLabel}: ${seekerNak}${nakAdvice ? ' – ' + nakAdvice : ''}`,
                lagnamLine,
                `${partnerLabel}: ${partnerLine}`,
                `${adviceLabel}: ${caution}`,
                closing
            ].filter(Boolean);

            return { text: lines.join('\n'), fulfilled: true };
        }

        respondPorutham() {
            const seeker = this.state.seeker;
            const partner = this.state.partner;
            const missing = [];
            const seekerFields = ['name', 'gender', 'rasi', 'nakshatra', 'lagnam', 'dosham', 'gotra'];
            const partnerFields = ['partnerName', 'partnerGender', 'partnerRasi', 'partnerNakshatra', 'partnerLagnam', 'partnerDosham', 'partnerGotra'];

            seekerFields.forEach(field => {
                if (!this.getFieldValue(field)) missing.push(field);
            });
            partnerFields.forEach(field => {
                if (!this.getFieldValue(field)) missing.push(field);
            });

            if (missing.length) {
                return {
                    text: this.buildMissingMessage(missing),
                    fulfilled: false
                };
            }

            const score = this.calculatePoruthamScore();
            const isTamil = this.language === 'ta';
            const compatibilityPercent = Math.min(100, Math.max(0, Math.round((score / 10) * 100)));
            const poruthamDetails = this.buildPoruthamDetails(score);
            const heading = isTamil ? 'மணமகள் & மணமகன் ஜாதக பொருத்தம்' : 'Bride & Groom Horoscope Match';

            const rasiAnalysis = this.describeRasiCompatibility(seeker.rasi, partner.rasi);
            const nakAnalysis = this.describeNakshatraCompatibility(seeker.nakshatra, partner.nakshatra);
            const lagnamAnalysis = this.describeLagnamAlignment(seeker.lagnam, partner.lagnam);
            const doshamAnalysis = this.describeDoshamInteraction(seeker.dosham, partner.dosham);
            const gotraAnalysis = this.describeGotraValidation(seeker.gotra, partner.gotra);
            const analyses = [
                { label: isTamil ? 'ராசி ↔ ராசி' : 'Rasi ↔ Rasi', data: rasiAnalysis },
                { label: isTamil ? 'நட்சத்திரம் ↔ நட்சத்திரம்' : 'Nakshatram ↔ Nakshatram', data: nakAnalysis },
                { label: isTamil ? 'லக்னம் ஒத்திசைவு' : 'Lagnam harmony', data: lagnamAnalysis },
                { label: isTamil ? 'தோஷம் விளக்கம்' : 'Dosham interaction', data: doshamAnalysis },
                { label: isTamil ? 'கோத்ர சரிபார்ப்பு' : 'Gotram validation', data: gotraAnalysis }
            ];
            const tones = analyses.map(item => item.data.tone);

            const roleSummary = this.buildProfileSections(seeker, partner);
            const analysisHeading = isTamil ? 'ஒப்பீட்டு ஆய்வு:' : 'Comparative Assessment:';
            const analysisText = [analysisHeading]
                .concat(analyses.map(item => ` • ${item.label}: ${item.data.text}`))
                .join('\n');

            const statusLabel = isTamil ? '10 பொருத்த நிலை' : '10 Porutham Result';
            const statusValue = score >= 8 ? (isTamil ? 'தேர்ச்சி' : 'Passed') : (isTamil ? 'தேர்ச்சியில்லை' : 'Failed');
            const totalLabel = isTamil ? 'மொத்த மதிப்பெண்' : 'Total Score';
            const compatLabel = isTamil ? 'பொருத்த சதவீதம்' : 'Compatibility Percentage';
            const breakdownHeading = isTamil ? 'பொருத்த விரிவாக்கம்:' : 'Porutham Breakdown:';

            const verdict = this.determineVerdict(score, tones);
            const verdictLabel = isTamil ? 'இறுதி தீர்ப்பு' : 'Final Verdict';

            const sections = [
                heading,
                roleSummary,
                analysisText,
                `${statusLabel}: ${statusValue}`,
                `${totalLabel}: ${score}/10`,
                `${compatLabel}: ${compatibilityPercent}%`,
                `${breakdownHeading}\n${poruthamDetails}`,
                `${verdictLabel}: ${verdict.label}`,
                verdict.note
            ];

            return { text: sections.filter(Boolean).join('\n\n'), fulfilled: true };
        }

        respondRightMatch() {
            const seeker = this.state.seeker;
            const missing = [];
            if (!seeker.rasi) missing.push('rasi');
            if (!seeker.nakshatra) missing.push('nakshatra');

            if (missing.length) {
                return {
                    text: this.buildMissingMessage(missing),
                    fulfilled: false
                };
            }

            const langPack = LANGUAGE_PACK[this.language];
            const rasiInfo = RASI_DATA[seeker.rasi];
            const groupAdvice = NAK_GROUP_ADVICE[this.getNakshatraGroup(seeker.nakshatra)] || {
                en: 'stay emotionally open.',
                ta: 'உணர்ச்சியை தெளிவாக பகிரவும்.'
            };

            const text = `${langPack.rightMatchHeading}\n${langPack.rightMatchSummary({
                seekerRasi: `${this.formatRasi(seeker.rasi)} – ${rasiInfo.trait[this.language]}`,
                seekerNak: this.formatNakshatra(seeker.nakshatra),
                matches: formatList(rasiInfo.matches.map(r => this.formatRasi(r)), this.language),
                nakAdvice: groupAdvice[this.language]
            })}`;

            return { text, fulfilled: true };
        }

        buildMissingMessage(missingKeys) {
            const pending = { required: [], partner: [] };
            missingKeys.forEach(key => {
                if (key.startsWith('partner')) {
                    pending.partner.push(key);
                } else {
                    pending.required.push(key);
                }
            });
            return this.buildStepPrompt(pending);
        }

        buildPoruthamDetails(score) {
            const lang = this.language;
            const favorableCount = Math.round(clamp(score, 0, 10));
            return PORUTHAM_LINES.map((line, index) => {
                const positive = index < favorableCount;
                const copy = line[lang];
                return `${positive ? '✔️' : '⚠️'} ${copy.label} – ${positive ? copy.positive : copy.negative}`;
            }).join('\n');
        }

        calculatePoruthamScore() {
            const seeker = this.state.seeker;
            const partner = this.state.partner;
            const seekerElement = RASI_DATA[seeker.rasi].element;
            const partnerElement = RASI_DATA[partner.rasi].element;
            let score = PORUTHAM_MATRIX[seekerElement][partnerElement];

            const seekerGroup = this.getNakshatraGroup(seeker.nakshatra);
            const partnerGroup = this.getNakshatraGroup(partner.nakshatra);
            if (seekerGroup && partnerGroup) {
                if (seekerGroup !== partnerGroup) {
                    score += 1;
                } else {
                    score -= 1;
                }
            }

            const seekerLagElement = this.getElementForRasiKey(seeker.lagnam);
            const partnerLagElement = this.getElementForRasiKey(partner.lagnam);
            if (seekerLagElement && partnerLagElement) {
                if (seekerLagElement === partnerLagElement) {
                    score += 1;
                } else if (this.isElementOpposed(seekerLagElement, partnerLagElement)) {
                    score -= 1;
                }
            }

            const seekerClean = this.isDoshamFree(seeker.dosham);
            const partnerClean = this.isDoshamFree(partner.dosham);
            if (seekerClean && partnerClean) {
                score += 1;
            } else if (this.hasSevereDosham(seeker.dosham) || this.hasSevereDosham(partner.dosham)) {
                score -= 1;
            }

            if (this.sameGotra(seeker.gotra, partner.gotra)) {
                score -= 1;
            }

            return clamp(score, 3, 10);
        }

        applyUpdates(updates = {}) {
            const captured = [];
            const seeker = updates.seeker || {};
            const partner = updates.partner || {};

            Object.entries(seeker).forEach(([key, value]) => {
                if (value && this.state.seeker[key] !== value) {
                    this.state.seeker[key] = value;
                    captured.push(key);
                }
            });

            Object.entries(partner).forEach(([key, value]) => {
                if (value && this.state.partner[key] !== value) {
                    this.state.partner[key] = value;
                    const normalized = `partner${key.charAt(0).toUpperCase()}${key.slice(1)}`;
                    captured.push(normalized);
                }
            });

            if (updates.matrimonyId) {
                const incoming = updates.matrimonyId.toUpperCase();
                if (incoming !== this.state.matrimonyId) {
                    this.state.matrimonyId = incoming;
                    captured.push('matrimonyId');
                }
            }

            const unique = Array.from(new Set(captured));
            unique.forEach(field => {
                if (!this.state.meta.collectedOrder.includes(field)) {
                    this.state.meta.collectedOrder.push(field);
                }
            });

            return unique;
        }

        extractDetails(text) {
            const seeker = {};
            const partner = {};
            let matrimonyId = null;
            let hasData = false;
            const lower = text.toLowerCase();

            const nameMatch = text.match(/(?:my name is|this is|i am|call me)\s+([a-zA-Z\s]{2,40})/i);
            if (nameMatch) {
                seeker.name = toTitle(nameMatch[1].trim());
                hasData = true;
            }

            const partnerNameMatch = text.match(/partner name is\s+([a-zA-Z\s]{2,40})/i);
            if (partnerNameMatch) {
                partner.name = toTitle(partnerNameMatch[1].trim());
                hasData = true;
            }

            const genderMatch = lower.match(/\b(male|female|groom|bride|boy|girl)\b/);
            if (genderMatch) {
                const genderWord = genderMatch[1];
                if (['male', 'groom', 'boy'].includes(genderWord)) {
                    seeker.gender = 'male';
                } else if (['female', 'bride', 'girl'].includes(genderWord)) {
                    seeker.gender = 'female';
                }
                hasData = true;
            }

            const dobMatch = text.match(DATE_PATTERN);
            if (dobMatch) {
                seeker.dob = dobMatch[1];
                hasData = true;
            }

            const timeMatch = text.match(TIME_PATTERN);
            if (timeMatch) {
                seeker.tob = timeMatch[1];
                hasData = true;
            }

            const assignAttribute = (pattern, setter) => {
                if (!pattern) return false;
                pattern.lastIndex = 0;
                let matched = false;
                let match;
                while ((match = pattern.exec(text))) {
                    const rawValue = (match[1] || '').trim();
                    if (!rawValue) continue;
                    const snippet = lower.slice(Math.max(0, match.index - 25), match.index);
                    const isPartner = PARTNER_MARKERS.some(marker => snippet.includes(marker));
                    setter(isPartner ? 'partner' : 'seeker', rawValue);
                    matched = true;
                }
                return matched;
            };

            if (assignAttribute(GOTRA_PATTERN, (target, value) => {
                const formatted = toTitle(value);
                if (target === 'partner') {
                    if (!partner.gotra) partner.gotra = formatted;
                } else if (!seeker.gotra) {
                    seeker.gotra = formatted;
                }
            })) {
                hasData = true;
            }

            if (assignAttribute(LAGNAM_PATTERN, (target, value) => {
                const normalized = this.resolveRasiKey(value);
                if (!normalized) return;
                if (target === 'partner') {
                    if (!partner.lagnam) partner.lagnam = normalized;
                } else if (!seeker.lagnam) {
                    seeker.lagnam = normalized;
                }
            })) {
                hasData = true;
            }

            if (assignAttribute(DOSHAM_PATTERN, (target, value) => {
                const formatted = this.formatDosham(value);
                if (!formatted) return;
                if (target === 'partner') {
                    if (!partner.dosham) partner.dosham = formatted;
                } else if (!seeker.dosham) {
                    seeker.dosham = formatted;
                }
            })) {
                hasData = true;
            }

            const partnerGenderMatch = lower.match(/partner\s+(?:is\s+)?(male|female|groom|bride)/);
            if (partnerGenderMatch) {
                partner.gender = ['male', 'groom'].includes(partnerGenderMatch[1]) ? 'male' : 'female';
                hasData = true;
            }

            const idMatch = text.match(/(vm\d{4,12})/i);
            if (idMatch) {
                matrimonyId = idMatch[1];
                hasData = true;
            }

            const rasiMentions = this.matchDictionary(lower, RASI_DATA, PARTNER_MARKERS);
            if (rasiMentions.partner) {
                partner.rasi = rasiMentions.partner;
                hasData = true;
            }
            if (rasiMentions.seeker) {
                seeker.rasi = rasiMentions.seeker;
                hasData = true;
            }

            const nakMentions = this.matchDictionary(lower, NAKSHATRA_DATA, PARTNER_MARKERS);
            if (nakMentions.partner) {
                partner.nakshatra = nakMentions.partner;
                hasData = true;
            }
            if (nakMentions.seeker) {
                seeker.nakshatra = nakMentions.seeker;
                hasData = true;
            }

            return { seeker, partner, matrimonyId, hasData };
        }

        matchDictionary(text, dictionary, partnerMarkers) {
            const result = { seeker: null, partner: null };
            for (const [key, value] of Object.entries(dictionary)) {
                for (const alias of value.aliases) {
                    const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    const regex = new RegExp(`\\b${escaped}\\b`, 'gi');
                    let match;
                    while ((match = regex.exec(text))) {
                        const windowStart = Math.max(0, match.index - 20);
                        const snippet = text.slice(windowStart, match.index);
                        const isPartner = partnerMarkers.some(marker => snippet.includes(marker));
                        if (isPartner && !result.partner) {
                            result.partner = key;
                        } else if (!isPartner && !result.seeker) {
                            result.seeker = key;
                        }
                    }
                }
            }
            return result;
        }

        formatRasi(key) {
            if (!key || !RASI_DATA[key]) {
                return key || '';
            }
            return RASI_DATA[key].display[this.language];
        }

        formatNakshatra(key) {
            if (!key || !NAKSHATRA_DATA[key]) {
                return key ? toTitle(key) : '';
            }
            return NAKSHATRA_DATA[key].display[this.language];
        }

        getNakshatraGroup(key) {
            return key && NAKSHATRA_DATA[key] ? NAKSHATRA_DATA[key].group : null;
        }

        formatDosham(value) {
            if (!value) return null;
            const trimmed = value.replace(/\s+/g, ' ').trim();
            return trimmed || null;
        }

        resolveRasiKey(value) {
            if (!value) return null;
            const normalized = value.toLowerCase().trim();
            for (const [key, data] of Object.entries(RASI_DATA)) {
                if (data.aliases.some(alias => alias.toLowerCase() === normalized)) {
                    return key;
                }
            }
            const compact = normalized.replace(/\s+/g, '');
            return compact || null;
        }

        getElementForRasiKey(key) {
            return key && RASI_DATA[key] ? RASI_DATA[key].element : null;
        }

        isElementOpposed(a, b) {
            if (!a || !b) return false;
            const opposed = { fire: 'water', water: 'fire', earth: 'air', air: 'earth' };
            return opposed[a] === b;
        }

        isDoshamFree(value) {
            if (!value) return false;
            const text = value.toLowerCase();
            return text.includes('no') || text.includes('illai') || text.includes('free') || text.includes('இல்லை');
        }

        hasSevereDosham(value) {
            if (!value) return false;
            const text = value.toLowerCase();
            const tokens = ['sevvai', 'chevvai', 'rahu', 'ketu', 'sarpa', 'naga', 'kalathra', 'kalasarpa', 'angaraka', 'shani', 'sani'];
            return tokens.some(token => text.includes(token));
        }

        hasAnyDosham(value) {
            if (!value) return false;
            const text = value.toLowerCase();
            return text.includes('dosham') || text.includes('தோஷ');
        }

        sameGotra(a, b) {
            if (!a || !b) return false;
            return a.trim().toLowerCase() === b.trim().toLowerCase();
        }

        resolveRoleLabel(gender) {
            const isTamil = this.language === 'ta';
            if (gender === 'female') {
                return { key: 'bride', label: isTamil ? 'மணமகள்' : 'Bride', priority: 0 };
            }
            if (gender === 'male') {
                return { key: 'groom', label: isTamil ? 'மணமகன்' : 'Groom', priority: 1 };
            }
            return { key: 'member', label: isTamil ? 'உறுப்பினர்' : 'Member', priority: 2 };
        }

        buildProfileSections(seeker, partner) {
            const profiles = [
                { role: this.resolveRoleLabel(seeker.gender), person: seeker },
                { role: this.resolveRoleLabel(partner.gender), person: partner }
            ].sort((a, b) => a.role.priority - b.role.priority);
            return profiles
                .map(profile => this.buildProfileBlock(profile.role.label, profile.person))
                .join('\n\n');
        }

        buildProfileBlock(roleLabel, person) {
            const isTamil = this.language === 'ta';
            const header = isTamil ? `${roleLabel} விவரம்` : `${roleLabel} Profile`;
            const rows = [
                { key: isTamil ? 'பெயர்' : 'Name', value: person.name ? toTitle(person.name) : (isTamil ? 'பகிரப்படவில்லை' : 'Not shared') },
                { key: 'Gender', value: null }
            ];
            rows[1].key = isTamil ? 'பாலினம்' : 'Gender';
            rows[1].value = person.gender ? LANGUAGE_PACK[this.language].genderNames[person.gender] : (isTamil ? '—' : '—');
            rows.push(
                { key: isTamil ? 'ராசி' : 'Rasi', value: this.formatRasi(person.rasi) || (isTamil ? '—' : '—') },
                { key: isTamil ? 'நட்சத்திரம்' : 'Nakshatram', value: this.formatNakshatra(person.nakshatra) || (isTamil ? '—' : '—') },
                { key: isTamil ? 'லக்னம்' : 'Lagnam', value: this.formatRasi(person.lagnam) || (isTamil ? '—' : '—') },
                { key: isTamil ? 'தோஷம்' : 'Dosham', value: this.formatDosham(person.dosham) || (isTamil ? '—' : '—') },
                { key: isTamil ? 'கோத்ரம்' : 'Gotram', value: person.gotra ? toTitle(person.gotra) : (isTamil ? '—' : '—') }
            );
            return `${header}:\n${rows.map(row => ` • ${row.key}: ${row.value}`).join('\n')}`;
        }

        describeRasiCompatibility(seekerKey, partnerKey) {
            const seekerName = this.formatRasi(seekerKey);
            const partnerName = this.formatRasi(partnerKey);
            const seekerMatches = (RASI_DATA[seekerKey]?.matches) || [];
            const partnerMatches = (RASI_DATA[partnerKey]?.matches) || [];
            const mutual = seekerMatches.includes(partnerKey) && partnerMatches.includes(seekerKey);
            const supported = mutual ? false : (seekerMatches.includes(partnerKey) || partnerMatches.includes(seekerKey));
            const isTamil = this.language === 'ta';
            if (mutual) {
                return {
                    tone: 'positive',
                    text: isTamil
                        ? `${seekerName} – ${partnerName} ராசிகள் ஒருவரின் கடமையை மற்றொருவர் தூக்கும்.`
                        : `${seekerName} and ${partnerName} Rasis lift each other’s dharmic duties.`
                };
            }
            if (supported) {
                return {
                    tone: 'neutral',
                    text: isTamil
                        ? `${seekerName} – ${partnerName} இணைப்பு இயங்கும், ஆனால் தினசரி பொறுமை அவசியம்.`
                        : `${seekerName} with ${partnerName} can function with steady patience and shared routines.`
                };
            }
            return {
                tone: 'caution',
                text: isTamil
                    ? `${seekerName} மற்றும் ${partnerName} ராசிகள் விரோத சக்தி தரும்; மூத்தோர் வழிகாட்டலை பின்பற்றவும்.`
                    : `${seekerName} with ${partnerName} forms a delicate bridge; involve elders for every milestone.`
            };
        }

        describeNakshatraCompatibility(seekerKey, partnerKey) {
            const seekerGroup = this.getNakshatraGroup(seekerKey);
            const partnerGroup = this.getNakshatraGroup(partnerKey);
            const isTamil = this.language === 'ta';
            if (!seekerGroup || !partnerGroup) {
                return {
                    tone: 'neutral',
                    text: isTamil ? 'நட்சத்திர விவரங்கள் முழுமையில்லை; பகிர்ந்தால் மேலும் ஊக்கம் தருவேன்.' : 'Share both Nakshatram groups for a sharper reading.'
                };
            }

            if (seekerGroup !== partnerGroup && !(seekerGroup === 'rakshasa' && partnerGroup === 'rakshasa')) {
                return {
                    tone: 'positive',
                    text: isTamil
                        ? `${this.formatNakshatra(seekerKey)} & ${this.formatNakshatra(partnerKey)} சேர்க்கை உணர்ச்சி மற்றும் செயல் சமநிலையைக் கொண்டுவருகிறது.`
                        : `${this.formatNakshatra(seekerKey)} with ${this.formatNakshatra(partnerKey)} balances emotion and execution.`
                };
            }

            if (seekerGroup === partnerGroup) {
                return {
                    tone: 'neutral',
                    text: isTamil
                        ? 'இருவரும் ஒரே குணத்தில் இருப்பதால் முடிவுகள் மெதுவாக அமையும்; திறந்த உரையாடல் அவசியம்.'
                        : 'Both belong to the same nakshatra temperament; keep dialogue soft to avoid ego clashes.'
                };
            }

            return {
                tone: 'caution',
                text: isTamil
                    ? 'ரக்ஷச / மனித குழு கலப்பு இருப்பதால் பாரம்பரிய பரிகாரம் செய்து முன்னேறவும்.'
                    : 'This nakshatra mix demands pariharam and elder blessings before commitments.'
            };
        }

        describeLagnamAlignment(seekerLag, partnerLag) {
            const seekerElement = this.getElementForRasiKey(seekerLag);
            const partnerElement = this.getElementForRasiKey(partnerLag);
            const isTamil = this.language === 'ta';
            if (!seekerElement || !partnerElement) {
                return {
                    tone: 'neutral',
                    text: isTamil ? 'லக்னம் எதுவென்பது முழுமையாக இல்லை; பகிர்ந்தால் வாழ்வியல் தரம் தெளிவாகும்.' : 'Share both Lagnams to firm up the lifestyle reading.'
                };
            }

            if (seekerElement === partnerElement) {
                return {
                    tone: 'positive',
                    text: isTamil
                        ? 'இரு லக்னங்களும் ஒரே தத்துவம் என்பதால் வாழ்க்கை முறை ஒத்திசைவு அதிகம்.'
                        : 'Both Lagnams flow on the same element, keeping lifestyle choices aligned.'
                };
            }

            if (this.isElementOpposed(seekerElement, partnerElement)) {
                return {
                    tone: 'caution',
                    text: isTamil
                        ? 'லக்ன தத்துவங்கள் நேரே எதிர் திசை; ஆலோசனைகளை பின்பற்றினால் மட்டுமே சமநிலை கிடைக்கும்.'
                        : 'The Lagnam elements oppose each other; disciplined guidance is essential to hold harmony.'
                };
            }

            return {
                tone: 'neutral',
                text: isTamil
                    ? 'லக்னங்கள் வேறுபட்டாலும் ஒப்பந்தங்கள் மூலம் சமநிலை கொள்ளலாம்.'
                    : 'Different Lagnam elements can complement with conscious scheduling and shared vows.'
            };
        }

        describeDoshamInteraction(seekerDosham, partnerDosham) {
            const seekerClean = this.isDoshamFree(seekerDosham);
            const partnerClean = this.isDoshamFree(partnerDosham);
            const seekerSevere = this.hasSevereDosham(seekerDosham);
            const partnerSevere = this.hasSevereDosham(partnerDosham);
            const anyDosham = this.hasAnyDosham(seekerDosham) || this.hasAnyDosham(partnerDosham);
            const isTamil = this.language === 'ta';

            if (seekerClean && partnerClean) {
                return {
                    tone: 'positive',
                    text: isTamil ? 'இரு ஜாதகங்களும் தோஷம் விடுபட்டவை; கல்யாண சடங்குகள் வழக்கமாக நடைபெறும்.' : 'Both charts are free of noted Dosham; ceremonies proceed in the standard manner.'
                };
            }

            if (seekerSevere || partnerSevere) {
                return {
                    tone: 'caution',
                    text: isTamil
                        ? 'செவ்வாய் / ராகு போன்ற கடுமையான தோஷம் காணப்படுகிறது; பரிகாரம், ஸ்தல பயணம் அவசியம்.'
                        : 'Sevvai / Rahu class afflictions appear; plan proper pariharam with elders before fixing muhurtham.'
                };
            }

            if (anyDosham) {
                return {
                    tone: 'neutral',
                    text: isTamil
                        ? 'சிறிய தோஷங்கள் உள்ளதால் ஜபம் / ஹோமம் செய்து முன்னேறலாம்.'
                        : 'Minor Dosham exists; simple japam or homam will balance the charts.'
                };
            }

            return {
                tone: 'neutral',
                text: isTamil ? 'தோஷ விவரங்கள் தெளிவாக இல்லை; பகிர்ந்தால் வழிகாட்டுவேன்.' : 'Dosham notes are incomplete; share specifics for exact remedies.'
            };
        }

        describeGotraValidation(seekerGotra, partnerGotra) {
            const isTamil = this.language === 'ta';
            if (!seekerGotra || !partnerGotra) {
                return {
                    tone: 'neutral',
                    text: isTamil ? 'கோத்ரம் இருவரும் சொல்ல வேண்டும்; சமய அனுமதி அதன்மேல் சார்ந்தது.' : 'Both Gotrams are needed because family consent depends on them.'
                };
            }

            if (this.sameGotra(seekerGotra, partnerGotra)) {
                return {
                    tone: 'caution',
                    text: isTamil ? 'இருவரும் ஒரே கோத்ரம்; ஆச்சாரப்படி தடை, குடும்ப மூத்தோர் முடிவை பெறவும்.' : 'Same Gotram detected; tradition treats this as restricted, so obtain elder consent.'
                };
            }

            return {
                tone: 'positive',
                text: isTamil ? 'கோத்ரங்கள் வேறுபடும்; வழிபாடு மாற்றமின்றி முன்னேறலாம்.' : 'Distinct Gotrams keep lineage guidelines intact; rituals continue smoothly.'
            };
        }

        determineVerdict(score, tones) {
            const cautionCount = tones.filter(tone => tone === 'caution').length;
            const isTamil = this.language === 'ta';
            if (score >= 9 && cautionCount === 0) {
                return {
                    label: isTamil ? 'திருமணத்திற்கு மிகவும் ஏற்ற இணை' : 'Highly Suitable for Marriage',
                    note: isTamil
                        ? 'பெரும்பாலான பொருத்தங்கள் சாதகமாக உள்ளதால் குடும்ப ஆலோசனையுடன் திருமணத்தை முடிவுறுத்தலாம்.'
                        : 'Poruthams hold strongly; families can proceed confidently with the marriage formalities.'
                };
            }

            if (score >= 7 && cautionCount <= 2) {
                return {
                    label: isTamil ? 'சிறிய மாற்றங்களுடன் ஏற்ற இணை' : 'Suitable with Minor Adjustments',
                    note: isTamil
                        ? 'குறிப்பிட்ட பகுதிகளில் பரிகாரம் மற்றும் ஆலோசனை மேற்கொண்டு திருமண திட்டத்தை முன்னேற்றுங்கள்.'
                        : 'Arrange the suggested pariharam and guided discussions to keep the match steady.'
                };
            }

            return {
                label: isTamil ? 'சம்பிரதாயப்படி பரிந்துரைக்கப்படவில்லை' : 'Not Traditionally Recommended',
                note: isTamil
                    ? 'பல எச்சரிக்கைகள் இருப்பதால் மாற்று பொருத்தங்களை பார்க்கவும் அல்லது விஷய நிபுணரிடம் மேலதிக ஆலோசனை பெறவும்.'
                    : 'Multiple cautions surface; explore alternate matches or seek deeper counsel before proceeding.'
            };
        }
    }

    class HoroscopeChatController {
        constructor() {
            this.engine = new HoroscopeEngine();
            this.language = normalizeLanguage(document.documentElement.getAttribute('data-lang') || 'en');
            this.engine.setLanguage(this.language);
            this.typingIndicator = null;
            this.chatMessages = document.getElementById('chat-messages');
            this.messageInput = document.getElementById('message-input');
            this.sendButton = document.getElementById('send-button');
            this.charCount = document.getElementById('char-count');
            this.clearButton = document.getElementById('clear-chat-btn');
            this.exitButton = document.getElementById('exit-btn');
            this.defaultMessages = this.chatMessages ? this.chatMessages.innerHTML : '';
            this.isProcessing = false;
            this.registerEvents();
            this.setupLanguageObserver();
            this.updateCharCount();
        }

        registerEvents() {
            if (this.messageInput) {
                this.messageInput.addEventListener('input', () => this.updateCharCount());
                this.messageInput.addEventListener('keydown', event => {
                    if (event.key !== 'Enter') return;
                    if (event.shiftKey) return;
                    event.preventDefault();
                    this.sendMessage();
                });
            }
            if (this.sendButton) {
                this.sendButton.addEventListener('click', () => this.sendMessage());
            }
            if (this.clearButton) {
                this.clearButton.addEventListener('click', () => this.resetChat());
            }
            if (this.exitButton) {
                this.exitButton.addEventListener('click', () => {
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

        setupLanguageObserver() {
            const observer = new MutationObserver(mutations => {
                mutations.forEach(mutation => {
                    if (mutation.attributeName === 'data-lang') {
                        this.language = normalizeLanguage(document.documentElement.getAttribute('data-lang'));
                        this.engine.setLanguage(this.language);
                    }
                });
            });
            observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-lang'] });
        }

        updateCharCount() {
            if (!this.messageInput || !this.charCount) return;
            const value = this.messageInput.value || '';
            this.charCount.textContent = value.length;
            if (this.sendButton) {
                this.sendButton.disabled = !value.trim() || this.isProcessing;
            }
        }

        sendMessage(forcedText = null, options = {}) {
            if (this.isProcessing) return;
            const textSource = forcedText !== null ? forcedText : (this.messageInput ? this.messageInput.value : '');
            const trimmed = textSource.trim();
            if (!trimmed) {
                this.updateCharCount();
                return;
            }

            const displayText = options.displayText || trimmed;
            this.appendMessage('user', displayText);

            if (!forcedText && this.messageInput) {
                this.messageInput.value = '';
                this.updateCharCount();
            }

            this.isProcessing = true;
            if (this.sendButton) this.sendButton.disabled = true;
            this.showTypingIndicator();

            setTimeout(() => {
                const response = this.engine.handleMessage(trimmed) || this.engine.getRestrictedMessage();
                this.hideTypingIndicator();
                this.appendMessage('engine', response);
                this.isProcessing = false;
                this.updateCharCount();
                if (this.messageInput) this.messageInput.focus();
            }, 350);
        }

        handleQuickQuestion(type) {
            const config = QUICK_QUESTIONS[type];
            if (!config) return;
            const displayLabel = config.labels[this.language] || config.trigger;
            this.sendMessage(config.trigger, { displayText: displayLabel });
        }

        resetChat() {
            this.engine.reset();
            if (this.chatMessages) {
                this.chatMessages.innerHTML = this.defaultMessages;
                this.scrollToBottom();
            }
            const confirmation = LANGUAGE_PACK[this.language].clearConfirmation;
            this.appendMessage('engine', confirmation);
            if (this.messageInput) {
                this.messageInput.value = '';
                this.updateCharCount();
                this.messageInput.focus();
            }
        }

        showTypingIndicator() {
            if (!this.chatMessages) return;
            this.hideTypingIndicator();
            const wrapper = document.createElement('div');
            wrapper.className = 'flex items-start space-x-3 message-animation';
            wrapper.id = 'horoscopeTypingIndicator';

            const avatar = this.createAvatar();
            const bubble = document.createElement('div');
            bubble.className = 'bg-indigo-50 border border-indigo-100 rounded-2xl rounded-tl-md px-4 py-2 text-sm text-indigo-700';
            bubble.textContent = '...';

            wrapper.appendChild(avatar);
            wrapper.appendChild(bubble);
            this.chatMessages.appendChild(wrapper);
            this.scrollToBottom();
            this.typingIndicator = wrapper;
        }

        hideTypingIndicator() {
            if (this.typingIndicator && this.typingIndicator.parentNode) {
                this.typingIndicator.parentNode.removeChild(this.typingIndicator);
            }
            this.typingIndicator = null;
        }

        appendMessage(type, text) {
            if (!this.chatMessages || !text) return;
            const wrapper = document.createElement('div');
            wrapper.className = type === 'engine'
                ? 'flex items-start space-x-3 message-animation'
                : 'flex justify-end message-animation';

            if (type === 'engine') {
                const avatar = this.createAvatar();
                wrapper.appendChild(avatar);
            }

            const bubble = document.createElement('div');
            bubble.className = type === 'engine'
                ? 'bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-100 rounded-2xl rounded-tl-md p-4 max-w-2xl'
                : 'bg-pink-600 text-white rounded-2xl rounded-tr-md p-4 max-w-2xl shadow';

            const paragraph = document.createElement('p');
            paragraph.className = 'whitespace-pre-line leading-relaxed text-sm';
            paragraph.textContent = text;
            bubble.appendChild(paragraph);

            wrapper.appendChild(bubble);
            this.chatMessages.appendChild(wrapper);
            this.scrollToBottom();
        }

        createAvatar() {
            const avatar = document.createElement('div');
            avatar.className = 'w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center text-white flex-shrink-0';
            avatar.innerHTML = '<i class="fas fa-sun"></i>';
            return avatar;
        }

        scrollToBottom() {
            if (!this.chatMessages) return;
            this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        const controller = new HoroscopeChatController();
        window.horoscopeChatController = controller;
        window.sendMessage = (text, options) => controller.sendMessage(text, options);
        window.sendQuickQuestion = type => controller.handleQuickQuestion(type);
        window.updateCharCount = () => controller.updateCharCount();
    });
})();
