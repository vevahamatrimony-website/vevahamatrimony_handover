/**
 * routes/astro-match.js
 * Tamil 10 Porutham matching engine — deterministic, rule-based.
 * No AI, no LLM, no probabilistic scoring.
 * Reference: Tamil_Rasi_Nakshatra_Jodi_Matching_Technical_Documentation.docx
 * Ruleset version: tamil-standard-v1
 */

let router;
try {
    const express = require('express');
    router = express.Router();
} catch (_) {
    // Lightweight router shim for offline unit test execution without node_modules
    router = { get: () => {}, post: () => {}, use: () => {} };
}

let supabaseAdmin = null;
let requireAuth = (req, res, next) => next?.();
try {
    const sb = require('../lib/supabase');
    supabaseAdmin = sb.supabaseAdmin;
    const auth = require('../middleware/auth');
    requireAuth = auth.requireAuth;
} catch (_) {
    // Mocked for test environments
}

// ══════════════════════════════════════════════════════════════════════
// RULESET VERSION — bump when any lookup table changes
// ══════════════════════════════════════════════════════════════════════
const RULESET_VERSION = 'tamil-standard-v1';

// ══════════════════════════════════════════════════════════════════════
// 12 RASIS — canonical IDs, 1-based order
// ══════════════════════════════════════════════════════════════════════
const RASIS = [
    { id: 1,  code: 'MESHA',      name: 'Mesha (Aries)',       lord: 'Mars'    },
    { id: 2,  code: 'RISHABHA',   name: 'Rishabha (Taurus)',   lord: 'Venus'   },
    { id: 3,  code: 'MITHUNA',    name: 'Mithuna (Gemini)',    lord: 'Mercury' },
    { id: 4,  code: 'KATAKA',     name: 'Kataka (Cancer)',     lord: 'Moon'    },
    { id: 5,  code: 'SIMHA',      name: 'Simha (Leo)',         lord: 'Sun'     },
    { id: 6,  code: 'KANYA',      name: 'Kanya (Virgo)',       lord: 'Mercury' },
    { id: 7,  code: 'TULA',       name: 'Tula (Libra)',        lord: 'Venus'   },
    { id: 8,  code: 'VRISCHIKA',  name: 'Vrischika (Scorpio)', lord: 'Mars'    },
    { id: 9,  code: 'DHANUS',     name: 'Dhanus (Sagittarius)',lord: 'Jupiter' },
    { id: 10, code: 'MAKARA',     name: 'Makara (Capricorn)',  lord: 'Saturn'  },
    { id: 11, code: 'KUMBHA',     name: 'Kumbha (Aquarius)',   lord: 'Saturn'  },
    { id: 12, code: 'MEENA',      name: 'Meena (Pisces)',      lord: 'Jupiter' }
];

// ══════════════════════════════════════════════════════════════════════
// 27 NAKSHATRAS — 1-based index, includes gana, yoni, rajju group
// ══════════════════════════════════════════════════════════════════════
const NAKSHATRAS = [
    { id: 1,  code: 'ASHWINI',          name: 'Ashwini',          rasis: [1],    gana: 'Deva',     yoni: 'Horse',    rajju: 'Pada'  },
    { id: 2,  code: 'BHARANI',          name: 'Bharani',          rasis: [1],    gana: 'Manushya', yoni: 'Elephant', rajju: 'Kati'  },
    { id: 3,  code: 'KRITTIKA',         name: 'Krittika',         rasis: [1,2],  gana: 'Rakshasa', yoni: 'Sheep',    rajju: 'Nabhi' },
    { id: 4,  code: 'ROHINI',           name: 'Rohini',           rasis: [2],    gana: 'Manushya', yoni: 'Serpent',  rajju: 'Kantha'},
    { id: 5,  code: 'MRIGASHIRA',       name: 'Mrigashira',       rasis: [2,3],  gana: 'Deva',     yoni: 'Serpent',  rajju: 'Siro'  },
    { id: 6,  code: 'ARDRA',            name: 'Ardra',            rasis: [3],    gana: 'Manushya', yoni: 'Dog',      rajju: 'Kantha'},
    { id: 7,  code: 'PUNARVASU',        name: 'Punarvasu',        rasis: [3,4],  gana: 'Deva',     yoni: 'Cat',      rajju: 'Nabhi' },
    { id: 8,  code: 'PUSHYA',           name: 'Pushya',           rasis: [4],    gana: 'Deva',     yoni: 'Sheep',    rajju: 'Kati'  },
    { id: 9,  code: 'ASHLESHA',         name: 'Ashlesha',         rasis: [4],    gana: 'Rakshasa', yoni: 'Cat',      rajju: 'Pada'  },
    { id: 10, code: 'MAGHA',            name: 'Magha',            rasis: [5],    gana: 'Rakshasa', yoni: 'Rat',      rajju: 'Pada'  },
    { id: 11, code: 'PURVA_PHALGUNI',   name: 'Purva Phalguni',   rasis: [5],    gana: 'Manushya', yoni: 'Rat',      rajju: 'Kati'  },
    { id: 12, code: 'UTTARA_PHALGUNI',  name: 'Uttara Phalguni',  rasis: [5,6],  gana: 'Manushya', yoni: 'Cow',      rajju: 'Nabhi' },
    { id: 13, code: 'HASTA',            name: 'Hasta',            rasis: [6],    gana: 'Deva',     yoni: 'Buffalo',  rajju: 'Kantha'},
    { id: 14, code: 'CHITRA',           name: 'Chitra',           rasis: [6,7],  gana: 'Rakshasa', yoni: 'Tiger',    rajju: 'Siro'  },
    { id: 15, code: 'SWATI',            name: 'Swati',            rasis: [7],    gana: 'Deva',     yoni: 'Buffalo',  rajju: 'Kantha'},
    { id: 16, code: 'VISHAKHA',         name: 'Vishakha',         rasis: [7,8],  gana: 'Rakshasa', yoni: 'Tiger',    rajju: 'Nabhi' },
    { id: 17, code: 'ANURADHA',         name: 'Anuradha',         rasis: [8],    gana: 'Deva',     yoni: 'Deer',     rajju: 'Kati'  },
    { id: 18, code: 'JYESHTHA',         name: 'Jyeshtha',         rasis: [8],    gana: 'Rakshasa', yoni: 'Deer',     rajju: 'Pada'  },
    { id: 19, code: 'MULA',             name: 'Mula',             rasis: [9],    gana: 'Rakshasa', yoni: 'Dog',      rajju: 'Pada'  },
    { id: 20, code: 'PURVA_ASHADHA',    name: 'Purva Ashadha',    rasis: [9],    gana: 'Manushya', yoni: 'Monkey',   rajju: 'Kati'  },
    { id: 21, code: 'UTTARA_ASHADHA',   name: 'Uttara Ashadha',   rasis: [9,10], gana: 'Manushya', yoni: 'Mongoose', rajju: 'Nabhi' },
    { id: 22, code: 'SHRAVANA',         name: 'Shravana',         rasis: [10],   gana: 'Deva',     yoni: 'Monkey',   rajju: 'Kantha'},
    { id: 23, code: 'DHANISHTA',        name: 'Dhanishta',        rasis: [10,11],gana: 'Rakshasa', yoni: 'Lion',     rajju: 'Siro'  },
    { id: 24, code: 'SHATABHISHA',      name: 'Shatabhisha',      rasis: [11],   gana: 'Rakshasa', yoni: 'Horse',    rajju: 'Kantha'},
    { id: 25, code: 'PURVA_BHADRAPADA', name: 'Purva Bhadrapada', rasis: [11,12],gana: 'Manushya', yoni: 'Lion',     rajju: 'Nabhi' },
    { id: 26, code: 'UTTARA_BHADRAPADA',name: 'Uttara Bhadrapada',rasis: [12],   gana: 'Manushya', yoni: 'Cow',      rajju: 'Kati'  },
    { id: 27, code: 'REVATI',           name: 'Revati',           rasis: [12],   gana: 'Deva',     yoni: 'Elephant', rajju: 'Pada'  }
];

// ══════════════════════════════════════════════════════════════════════
// VEDHA PAIRS — symmetric, stored as sorted pairs
// ══════════════════════════════════════════════════════════════════════
const VEDHA_PAIRS = new Set([
    '1-18',  // Ashwini – Jyeshtha
    '2-17',  // Bharani – Anuradha
    '3-16',  // Krittika – Vishakha
    '4-15',  // Rohini – Swati
    '6-22',  // Ardra – Shravana
    '7-21',  // Punarvasu – Uttara Ashadha
    '8-20',  // Pushya – Purva Ashadha
    '9-19',  // Ashlesha – Mula
    '10-27', // Magha – Revati
    '11-26', // Purva Phalguni – Uttara Bhadrapada
    '12-25', // Uttara Phalguni – Purva Bhadrapada
    '13-24', // Hasta – Shatabhisha
]);

// ══════════════════════════════════════════════════════════════════════
// YONI HOSTILE PAIRS
// ══════════════════════════════════════════════════════════════════════
const YONI_HOSTILE = new Set([
    'Horse-Buffalo', 'Buffalo-Horse',
    'Elephant-Lion', 'Lion-Elephant',
    'Sheep-Monkey',  'Monkey-Sheep',
    'Serpent-Mongoose', 'Mongoose-Serpent',
    'Dog-Deer',      'Deer-Dog',
    'Cat-Rat',       'Rat-Cat',
    'Cow-Tiger',     'Tiger-Cow'
]);

// ══════════════════════════════════════════════════════════════════════
// RASI POSITION ACCEPTANCE (groom Rasi counted from bride, inclusive)
// 1,7,9,10,11 = MATCH; 4,5,8 = PARTIAL; rest = NO_MATCH
// ══════════════════════════════════════════════════════════════════════
const RASI_MATCH_POSITIONS    = new Set([1, 7, 9, 10, 11]);
const RASI_PARTIAL_POSITIONS  = new Set([4, 5, 8]);

// ══════════════════════════════════════════════════════════════════════
// DINA ACCEPTED COUNTS (bride → groom)
// ══════════════════════════════════════════════════════════════════════
const DINA_ACCEPTED = new Set([2, 4, 6, 8, 9, 11, 13, 15, 18, 20, 24, 26]);

// ══════════════════════════════════════════════════════════════════════
// MAHENDRA ACCEPTED COUNTS
// ══════════════════════════════════════════════════════════════════════
const MAHENDRA_ACCEPTED = new Set([4, 7, 10, 13, 16, 19, 22, 25]);

// ══════════════════════════════════════════════════════════════════════
// PLANETARY FRIENDSHIP MATRIX
// Key: "PlanetA-PlanetB" => 'friend' | 'neutral' | 'enemy'
// ══════════════════════════════════════════════════════════════════════
const PLANET_RELATIONS = (() => {
    const raw = {
        Sun:     { friends: ['Moon','Mars','Jupiter'],      enemies: ['Venus','Saturn'],  neutral: ['Mercury']                       },
        Moon:    { friends: ['Sun','Mercury'],              enemies: [],                   neutral: ['Mars','Jupiter','Venus','Saturn'] },
        Mars:    { friends: ['Sun','Moon','Jupiter'],       enemies: ['Mercury'],          neutral: ['Venus','Saturn']                 },
        Mercury: { friends: ['Sun','Venus'],                enemies: ['Moon'],             neutral: ['Mars','Jupiter','Saturn']        },
        Jupiter: { friends: ['Sun','Moon','Mars'],          enemies: ['Mercury','Venus'],  neutral: ['Saturn']                        },
        Venus:   { friends: ['Mercury','Saturn'],           enemies: ['Sun','Moon'],       neutral: ['Mars','Jupiter']                 },
        Saturn:  { friends: ['Mercury','Venus'],            enemies: ['Sun','Moon','Mars'],neutral: ['Jupiter']                       }
    };
    const map = new Map();
    for (const [a, v] of Object.entries(raw)) {
        for (const b of v.friends)  map.set(`${a}-${b}`, 'friend');
        for (const b of v.enemies)  map.set(`${a}-${b}`, 'enemy');
        for (const b of v.neutral)  map.set(`${a}-${b}`, 'neutral');
    }
    return map;
})();

// ══════════════════════════════════════════════════════════════════════
// GANA COMPATIBILITY
// ══════════════════════════════════════════════════════════════════════
function evaluateGana(brideGana, groomGana) {
    if (!brideGana || !groomGana) return { status: 'REVIEW', explanation: 'Gana data missing for one or both profiles.' };
    if (brideGana === groomGana) {
        return { status: 'MATCH', explanation: `Both have ${brideGana} gana. Same gana is favourable.` };
    }
    const bg = brideGana;
    const gg = groomGana;
    // Deva bride + Manushya groom = acceptable (PARTIAL)
    if ((bg === 'Deva' && gg === 'Manushya') || (bg === 'Manushya' && gg === 'Deva')) {
        return { status: 'PARTIAL', explanation: `Deva–Manushya combination is considered moderate in most traditions.` };
    }
    // Any Rakshasa pairing is traditionally unfavourable
    return { status: 'NO_MATCH', explanation: `${bg}–${gg} gana combination is traditionally unfavourable under this ruleset.` };
}

// ══════════════════════════════════════════════════════════════════════
// INCLUSIVE STAR COUNT (bride → groom, 1-based, wraps at 27)
// ══════════════════════════════════════════════════════════════════════
function inclusiveStarCount(brideIdx, groomIdx) {
    return ((groomIdx - brideIdx + 27) % 27) + 1;
}

// ══════════════════════════════════════════════════════════════════════
// 10 PORUTHAM EVALUATORS
// ══════════════════════════════════════════════════════════════════════

function evalDina(brideIdx, groomIdx) {
    if (!brideIdx || !groomIdx) return { code:'DINA', status:'REVIEW', explanation:'Nakshatra index unavailable.' };
    const count = inclusiveStarCount(brideIdx, groomIdx);
    // Check if same nakshatra — by convention: same star is NOT in the accepted list
    if (brideIdx === groomIdx) {
        return { code:'DINA', status:'PARTIAL', starCount: count,
            explanation:`Bride and groom share the same nakshatra (count=1). Same-star Dina is considered partial by this ruleset.` };
    }
    const accepted = DINA_ACCEPTED.has(count);
    return {
        code: 'DINA',
        status: accepted ? 'MATCH' : 'NO_MATCH',
        starCount: count,
        explanation: accepted
            ? `Inclusive bride-to-groom star count is ${count}, which is in the accepted Dina list.`
            : `Inclusive bride-to-groom star count is ${count}, which is NOT in the accepted Dina list (${[...DINA_ACCEPTED].join(', ')}).`
    };
}

function evalGana(brideNak, groomNak) {
    if (!brideNak || !groomNak) return { code:'GANA', status:'REVIEW', explanation:'Nakshatra data unavailable.' };
    const result = evaluateGana(brideNak.gana, groomNak.gana);
    return { code:'GANA', brideGana: brideNak.gana, groomGana: groomNak.gana, ...result };
}

function evalMahendra(brideIdx, groomIdx) {
    if (!brideIdx || !groomIdx) return { code:'MAHENDRA', status:'REVIEW', explanation:'Nakshatra index unavailable.' };
    const count = inclusiveStarCount(brideIdx, groomIdx);
    const accepted = MAHENDRA_ACCEPTED.has(count);
    return {
        code: 'MAHENDRA',
        status: accepted ? 'MATCH' : 'NO_MATCH',
        starCount: count,
        explanation: accepted
            ? `Star count ${count} is a Mahendra count (4,7,10,13,16,19,22,25). Mahendra indicates longevity and prosperity.`
            : `Star count ${count} is not a Mahendra count. Mahendra requires count at 4,7,10,13,16,19,22,25.`
    };
}

function evalStreeDeergha(brideIdx, groomIdx) {
    if (!brideIdx || !groomIdx) return { code:'STREE_DEERGHA', status:'REVIEW', explanation:'Nakshatra index unavailable.' };
    const count = inclusiveStarCount(brideIdx, groomIdx);
    // Strict baseline: count must be > 13
    const matches = count > 13;
    return {
        code: 'STREE_DEERGHA',
        status: matches ? 'MATCH' : 'NO_MATCH',
        starCount: count,
        explanation: matches
            ? `Star count ${count} exceeds 13, satisfying Stree Deergha (bride-to-groom distance indicates long and happy married life).`
            : `Star count ${count} does not exceed 13 (strict baseline threshold). Stree Deergha is not satisfied.`
    };
}

function evalYoni(brideNak, groomNak) {
    if (!brideNak || !groomNak) return { code:'YONI', status:'REVIEW', explanation:'Nakshatra data unavailable.' };
    const pair = `${brideNak.yoni}-${groomNak.yoni}`;
    const hostile = YONI_HOSTILE.has(pair);
    return {
        code: 'YONI',
        brideYoni: brideNak.yoni,
        groomYoni: groomNak.yoni,
        status: hostile ? 'NO_MATCH' : 'MATCH',
        explanation: hostile
            ? `${brideNak.yoni}–${groomNak.yoni} is a hostile Yoni pair. Hostile pairs indicate incompatibility in intimate harmony.`
            : `${brideNak.yoni}–${groomNak.yoni} is not a hostile Yoni pair. Yoni compatibility is favourable.`
    };
}

function evalRasi(brideRasiId, groomRasiId) {
    if (!brideRasiId || !groomRasiId) return { code:'RASI', status:'REVIEW', explanation:'Rasi data unavailable.' };
    const count = ((groomRasiId - brideRasiId + 12) % 12) + 1;
    let status, explanation;
    if (RASI_MATCH_POSITIONS.has(count)) {
        status = 'MATCH';
        explanation = `Groom's Rasi is at position ${count} from bride's Rasi — a favourable Rasi position (1,7,9,10,11).`;
    } else if (RASI_PARTIAL_POSITIONS.has(count)) {
        status = 'PARTIAL';
        explanation = `Groom's Rasi is at position ${count} from bride's Rasi — a moderate Rasi position (4,5,8) in this ruleset.`;
    } else {
        status = 'NO_MATCH';
        explanation = `Groom's Rasi is at position ${count} from bride's Rasi — not in the accepted positions (1,7,9,10,11).`;
    }
    return { code:'RASI', rasiCount: count, status, explanation };
}

function evalRasiAdhipathi(brideRasi, groomRasi) {
    if (!brideRasi || !groomRasi) return { code:'RASI_ADHIPATHI', status:'REVIEW', explanation:'Rasi data unavailable.' };
    const brideLord = brideRasi.lord;
    const groomLord = groomRasi.lord;
    if (brideLord === groomLord) {
        return { code:'RASI_ADHIPATHI', brideLord, groomLord, status:'MATCH',
            explanation:`Both Rasis share the same lord (${brideLord}). Same lord is considered favourable.` };
    }
    const a2b = PLANET_RELATIONS.get(`${brideLord}-${groomLord}`) || 'neutral';
    const b2a = PLANET_RELATIONS.get(`${groomLord}-${brideLord}`) || 'neutral';
    // Mutual friends
    if (a2b === 'friend' && b2a === 'friend') {
        return { code:'RASI_ADHIPATHI', brideLord, groomLord, status:'MATCH',
            explanation:`${brideLord} and ${groomLord} are mutual friends. Rasi lords are compatible.` };
    }
    // Mutual enemies
    if (a2b === 'enemy' && b2a === 'enemy') {
        return { code:'RASI_ADHIPATHI', brideLord, groomLord, status:'NO_MATCH',
            explanation:`${brideLord} and ${groomLord} are mutual enemies. Rasi lord relationship is unfavourable.` };
    }
    // One-way or neutral
    return { code:'RASI_ADHIPATHI', brideLord, groomLord, status:'PARTIAL',
        explanation:`${brideLord}–${groomLord}: one-way friendship or neutral relationship. Moderate compatibility.` };
}

function evalVasiya() {
    // Not configured — no approved Vasiya Rasi matrix available.
    // Per specification: show NOT_CONFIGURED and exclude from denominator.
    return {
        code: 'VASIYA',
        status: 'NOT_CONFIGURED',
        explanation: 'Vasiya requires a tradition-specific Rasi attraction matrix that has not yet been approved. This check is excluded from the score.'
    };
}

function evalRajju(brideNak, groomNak) {
    if (!brideNak || !groomNak) return { code:'RAJJU', status:'REVIEW', explanation:'Nakshatra data unavailable.' };
    const brideRajju = brideNak.rajju;
    const groomRajju = groomNak.rajju;
    if (brideRajju === groomRajju) {
        return { code:'RAJJU', brideRajju, groomRajju, status:'NO_MATCH',
            explanation:`Both stars are in the '${brideRajju}' Rajju group. Same Rajju group is unfavourable (traditional hard filter in many communities).` };
    }
    return { code:'RAJJU', brideRajju, groomRajju, status:'MATCH',
        explanation:`Bride's Rajju group (${brideRajju}) differs from groom's (${groomRajju}). Different Rajju groups are favourable.` };
}

function evalVedha(brideIdx, groomIdx) {
    if (!brideIdx || !groomIdx) return { code:'VEDHA', status:'REVIEW', explanation:'Nakshatra index unavailable.' };
    const a = Math.min(brideIdx, groomIdx);
    const b = Math.max(brideIdx, groomIdx);
    const pairKey = `${a}-${b}`;
    const isVedha = VEDHA_PAIRS.has(pairKey);
    const brideNak = NAKSHATRAS[brideIdx - 1];
    const groomNak = NAKSHATRAS[groomIdx - 1];
    return {
        code: 'VEDHA',
        status: isVedha ? 'NO_MATCH' : 'MATCH',
        explanation: isVedha
            ? `${brideNak.name} and ${groomNak.name} form a Vedha pair. Vedha indicates obstruction and is traditionally unfavourable.`
            : `${brideNak.name} and ${groomNak.name} do not form a Vedha pair. No Vedha obstruction detected.`
    };
}

// ══════════════════════════════════════════════════════════════════════
// MASTER MATCH CALCULATOR
// ══════════════════════════════════════════════════════════════════════
function calculateTenPorutham(bride, groom) {
    // Resolve Nakshatra objects
    const brideNak = NAKSHATRAS.find(n => normalize(n.name) === normalize(bride.star) || normalize(n.code) === normalize(bride.star));
    const groomNak = NAKSHATRAS.find(n => normalize(n.name) === normalize(groom.star) || normalize(n.code) === normalize(groom.star));
    const brideRasi = RASIS.find(r => normalize(r.name) === normalize(bride.rasi) || normalize(r.code) === normalize(bride.rasi));
    const groomRasi = RASIS.find(r => normalize(r.name) === normalize(groom.rasi) || normalize(r.code) === normalize(groom.rasi));

    const brideIdx = brideNak ? brideNak.id : null;
    const groomIdx = groomNak ? groomNak.id : null;
    const brideRasiId = brideRasi ? brideRasi.id : null;
    const groomRasiId = groomRasi ? groomRasi.id : null;

    const results = [
        evalDina(brideIdx, groomIdx),
        evalGana(brideNak, groomNak),
        evalMahendra(brideIdx, groomIdx),
        evalStreeDeergha(brideIdx, groomIdx),
        evalYoni(brideNak, groomNak),
        evalRasi(brideRasiId, groomRasiId),
        evalRasiAdhipathi(brideRasi, groomRasi),
        evalVasiya(),
        evalRajju(brideNak, groomNak),
        evalVedha(brideIdx, groomIdx)
    ];

    // Score calculation — NOT_CONFIGURED and REVIEW excluded from denominator
    let matched = 0, partial = 0, notMatched = 0, notConfigured = 0, review = 0;
    for (const r of results) {
        if (r.status === 'MATCH')          matched++;
        else if (r.status === 'PARTIAL')   partial++;
        else if (r.status === 'NO_MATCH')  notMatched++;
        else if (r.status === 'NOT_CONFIGURED') notConfigured++;
        else if (r.status === 'REVIEW')    review++;
    }

    const assessed = matched + partial + notMatched;
    const score = assessed > 0 ? ((matched + 0.5 * partial) / assessed) * 100 : null;

    let classification;
    if (score === null) classification = 'CANNOT_ASSESS';
    else if (score >= 70) classification = 'HIGH';
    else if (score >= 40) classification = 'MODERATE';
    else classification = 'LOW';

    return {
        ruleset: RULESET_VERSION,
        orientation: 'bride_to_groom',
        bride: { rasi: bride.rasi, star: bride.star },
        groom: { rasi: groom.rasi, star: groom.star },
        overall: { matched, partial, notMatched, notConfigured, review, assessed, score, classification },
        poruthams: results,
        warnings: generateWarnings(brideNak, groomNak, brideRasi, groomRasi, bride, groom)
    };
}

function normalize(s) {
    if (!s) return '';
    return s.toString().toLowerCase().replace(/[\s_\-().]/g, '').trim();
}

// ══════════════════════════════════════════════════════════════════════
// 108 PADA TO RASI MAPPING & VALIDATION
// ══════════════════════════════════════════════════════════════════════
// Maps (nakshatra_id, pada: 1..4) -> rasi_id (1..12)
function getExpectedRasiForPada(nakshatraId, pada) {
    if (!nakshatraId || !pada || pada < 1 || pada > 4) return null;
    switch (nakshatraId) {
        case 1:  return 1; // Ashwini 1-4 -> Mesha
        case 2:  return 1; // Bharani 1-4 -> Mesha
        case 3:  return pada === 1 ? 1 : 2; // Krittika: 1 -> Mesha, 2-4 -> Rishabha
        case 4:  return 2; // Rohini 1-4 -> Rishabha
        case 5:  return pada <= 2 ? 2 : 3; // Mrigashira: 1-2 -> Rishabha, 3-4 -> Mithuna
        case 6:  return 3; // Ardra 1-4 -> Mithuna
        case 7:  return pada <= 3 ? 3 : 4; // Punarvasu: 1-3 -> Mithuna, 4 -> Kataka
        case 8:  return 4; // Pushya 1-4 -> Kataka
        case 9:  return 4; // Ashlesha 1-4 -> Kataka
        case 10: return 5; // Magha 1-4 -> Simha
        case 11: return 5; // Purva Phalguni 1-4 -> Simha
        case 12: return pada === 1 ? 5 : 6; // Uttara Phalguni: 1 -> Simha, 2-4 -> Kanya
        case 13: return 6; // Hasta 1-4 -> Kanya
        case 14: return pada <= 2 ? 6 : 7; // Chitra: 1-2 -> Kanya, 3-4 -> Tula
        case 15: return 7; // Swati 1-4 -> Tula
        case 16: return pada <= 3 ? 7 : 8; // Vishakha: 1-3 -> Tula, 4 -> Vrischika
        case 17: return 8; // Anuradha 1-4 -> Vrischika
        case 18: return 8; // Jyeshtha 1-4 -> Vrischika
        case 19: return 9; // Mula 1-4 -> Dhanus
        case 20: return 9; // Purva Ashadha 1-4 -> Dhanus
        case 21: return pada === 1 ? 9 : 10; // Uttara Ashadha: 1 -> Dhanus, 2-4 -> Makara
        case 22: return 10; // Shravana 1-4 -> Makara
        case 23: return pada <= 2 ? 10 : 11; // Dhanishta: 1-2 -> Makara, 3-4 -> Kumbha
        case 24: return 11; // Shatabhisha 1-4 -> Kumbha
        case 25: return pada <= 3 ? 11 : 12; // Purva Bhadrapada: 1-3 -> Kumbha, 4 -> Meena
        case 26: return 12; // Uttara Bhadrapada 1-4 -> Meena
        case 27: return 12; // Revati 1-4 -> Meena
        default: return null;
    }
}

function validateRasiNakshatraPada(rasiInput, starInput, padaInput) {
    const nak = NAKSHATRAS.find(n => normalize(n.name) === normalize(starInput) || normalize(n.code) === normalize(starInput));
    const rasi = RASIS.find(r => normalize(r.name) === normalize(rasiInput) || normalize(r.code) === normalize(rasiInput));

    if (!nak) {
        return { valid: false, error: `Invalid nakshatra: '${starInput}' is not recognized.` };
    }
    if (!rasi) {
        return { valid: false, error: `Invalid rasi: '${rasiInput}' is not recognized.` };
    }

    const pada = padaInput ? parseInt(padaInput, 10) : null;
    if (pada && (pada < 1 || pada > 4)) {
        return { valid: false, error: `Pada must be an integer between 1 and 4. Received: ${padaInput}` };
    }

    if (pada) {
        const expectedRasiId = getExpectedRasiForPada(nak.id, pada);
        if (expectedRasiId !== rasi.id) {
            const expectedRasi = RASIS[expectedRasiId - 1];
            return {
                valid: false,
                error: `Validation error: ${nak.name} pada ${pada} belongs to ${expectedRasi.name}, but ${rasi.name} was provided.`
            };
        }
    } else {
        // Star occurs in specific rasis
        if (!nak.rasis.includes(rasi.id)) {
            const allowed = nak.rasis.map(id => RASIS[id - 1].name).join(' / ');
            return {
                valid: false,
                error: `Validation error: ${nak.name} can only occur in ${allowed}, but ${rasi.name} was provided.`
            };
        }
    }

    return { valid: true, nakshatra: nak, rasi, pada };
}

function generateWarnings(brideNak, groomNak, brideRasi, groomRasi, bride, groom) {
    const warnings = [];
    if (!brideNak) warnings.push(`Bride's nakshatra '${bride.star}' could not be resolved. Please verify spelling.`);
    if (!groomNak) warnings.push(`Groom's nakshatra '${groom.star}' could not be resolved. Please verify spelling.`);
    if (!brideRasi) warnings.push(`Bride's rasi '${bride.rasi}' could not be resolved.`);
    if (!groomRasi) warnings.push(`Groom's rasi '${groom.rasi}' could not be resolved.`);

    // Pada / Rasi consistency check
    if (brideNak && brideRasi) {
        const check = validateRasiNakshatraPada(bride.rasi, bride.star, bride.pada);
        if (!check.valid) warnings.push(`Bride: ${check.error}`);
    }
    if (groomNak && groomRasi) {
        const check = validateRasiNakshatraPada(groom.rasi, groom.star, groom.pada);
        if (!check.valid) warnings.push(`Groom: ${check.error}`);
    }

    return warnings;
}

// ══════════════════════════════════════════════════════════════════════
// HELPER: normalize raw profile rasi/star fields
// ══════════════════════════════════════════════════════════════════════
function extractAstroData(profile) {
    return {
        id: profile.id,
        member_id: profile.member_id,
        full_name: profile.full_name,
        gender: profile.gender,
        rasi: profile.rasi || null,
        star: profile.star || null,
        date_of_birth: profile.date_of_birth,
        city: profile.city,
        state: profile.state,
        profile_picture_url: profile.profile_picture_url,
        plan_name: profile.plan_name,
        education: profile.education,
        job_roles: profile.job_roles,
        caste: profile.caste,
        is_managed: profile.is_managed
    };
}

// ══════════════════════════════════════════════════════════════════════
// ROUTES
// ══════════════════════════════════════════════════════════════════════

// GET /api/astro-match/my-data — current user's astro data
router.get('/my-data', requireAuth, async (req, res) => {
    try {
        const { data: profile, error } = await supabaseAdmin
            .from('profiles')
            .select('id, member_id, full_name, gender, rasi, star, date_of_birth')
            .eq('id', req.userId)
            .single();

        if (error) throw error;

        const hasAstroData = !!(profile.rasi && profile.star);
        const resolvedNak = profile.star
            ? NAKSHATRAS.find(n => normalize(n.name) === normalize(profile.star) || normalize(n.code) === normalize(profile.star))
            : null;
        const resolvedRasi = profile.rasi
            ? RASIS.find(r => normalize(r.name) === normalize(profile.rasi) || normalize(r.code) === normalize(profile.rasi))
            : null;

        res.json({
            profile: {
                id: profile.id,
                member_id: profile.member_id,
                full_name: profile.full_name,
                gender: profile.gender,
                rasi: profile.rasi,
                star: profile.star,
                rasi_resolved: resolvedRasi ? resolvedRasi.name : null,
                star_resolved: resolvedNak ? resolvedNak.name : null,
                gana: resolvedNak ? resolvedNak.gana : null,
                yoni: resolvedNak ? resolvedNak.yoni : null,
                rajju: resolvedNak ? resolvedNak.rajju : null
            },
            hasAstroData
        });
    } catch (err) {
        console.error('[AstroMatch] my-data error:', err);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/astro-match/candidates — fetch opposite-gender profiles that have rasi+star
router.get('/candidates', requireAuth, async (req, res) => {
    try {
        // Get current user gender
        const { data: me, error: meErr } = await supabaseAdmin
            .from('profiles')
            .select('id, gender, rasi, star')
            .eq('id', req.userId)
            .single();

        if (meErr) throw meErr;

        // Determine opposite gender
        const myGender = (me.gender || '').toLowerCase();
        let targetGender = null;
        if (myGender === 'male' || (myGender.includes('male') && !myGender.includes('female'))) {
            targetGender = 'Female';
        } else if (myGender === 'female' || myGender.includes('female')) {
            targetGender = 'Male';
        }

        // Query profiles with rasi AND star fields populated
        let query = supabaseAdmin
            .from('profiles')
            .select(`id, member_id, full_name, gender, rasi, star,
                     date_of_birth, city, state, profile_picture_url,
                     plan_name, education, job_roles, caste, is_managed, is_blocked, hide_photo`)
            .eq('is_blocked', false)
            .neq('id', req.userId)
            .not('rasi', 'is', null)
            .not('star', 'is', null);

        if (targetGender) {
            query = query.ilike('gender', `${targetGender}%`);
        }

        // Filter params
        const { rasi_filter, star_filter, min_score } = req.query;

        const { data, error } = await query.limit(200).order('created_at', { ascending: false });
        if (error) throw error;

        // Also get offline members with rasi+star
        let offlineQuery = supabaseAdmin
            .from('offline_members')
            .select('*')
            .eq('status', 'active')
            .not('rasi', 'is', null)
            .not('star', 'is', null);

        if (targetGender) {
            offlineQuery = offlineQuery.ilike('gender', `${targetGender}%`);
        }

        const { data: offlineData } = await offlineQuery.limit(100);

        // Normalize offline members
        const normalizedOffline = (offlineData || []).map(o => ({
            id: `offline_${o.member_id}`,
            member_id: o.member_id,
            full_name: o.full_name,
            gender: o.gender,
            rasi: o.rasi || null,
            star: o.star || null,
            date_of_birth: o.dob,
            city: o.birth_place,
            state: null,
            profile_picture_url: o.profile_picture_url,
            plan_name: null,
            education: o.education,
            job_roles: o.job,
            caste: o.caste,
            is_managed: true,
            is_offline: true
        }));

        // Combine and filter to only those with rasi+star
        const allProfiles = [...(data || []), ...normalizedOffline].filter(p => p.rasi && p.star);

        // Calculate match for each candidate
        const myRasi = me.rasi;
        const myStar = me.star;
        const myGenderNorm = (me.gender || '').toLowerCase();
        const isBride = myGenderNorm === 'female' || myGenderNorm.includes('female');

        const enriched = allProfiles.map(candidate => {
            const astro = extractAstroData(candidate);
            let matchResult = null;

            if (myRasi && myStar && candidate.rasi && candidate.star) {
                try {
                    if (isBride) {
                        // Current user is bride, candidate is groom
                        matchResult = calculateTenPorutham(
                            { rasi: myRasi, star: myStar },
                            { rasi: candidate.rasi, star: candidate.star }
                        );
                    } else {
                        // Current user is groom, candidate is bride
                        matchResult = calculateTenPorutham(
                            { rasi: candidate.rasi, star: candidate.star },
                            { rasi: myRasi, star: myStar }
                        );
                    }
                } catch (calcErr) {
                    console.warn('[AstroMatch] Calc error for candidate:', candidate.member_id, calcErr.message);
                }
            }

            const age = candidate.date_of_birth
                ? Math.floor((Date.now() - new Date(candidate.date_of_birth)) / 31557600000)
                : null;

            return {
                ...astro,
                age,
                astro_match: matchResult ? {
                    score: matchResult.overall.score,
                    matched: matchResult.overall.matched,
                    partial: matchResult.overall.partial,
                    notMatched: matchResult.overall.notMatched,
                    assessed: matchResult.overall.assessed,
                    classification: matchResult.overall.classification,
                    warnings: matchResult.warnings
                } : null
            };
        });

        // Apply client-requested filters
        let filtered = enriched;
        if (rasi_filter) {
            filtered = filtered.filter(p => normalize(p.rasi) === normalize(rasi_filter));
        }
        if (star_filter) {
            filtered = filtered.filter(p => normalize(p.star) === normalize(star_filter));
        }
        if (min_score !== undefined && min_score !== '') {
            const minS = parseFloat(min_score);
            filtered = filtered.filter(p => p.astro_match && p.astro_match.score !== null && p.astro_match.score >= minS);
        }

        // Sort by score descending
        filtered.sort((a, b) => {
            const sa = a.astro_match?.score ?? -1;
            const sb = b.astro_match?.score ?? -1;
            return sb - sa;
        });

        res.json({
            myAstroData: { rasi: myRasi, star: myStar, hasData: !!(myRasi && myStar) },
            candidates: filtered,
            total: filtered.total,
            ruleset: RULESET_VERSION
        });
    } catch (err) {
        console.error('[AstroMatch] candidates error:', err);
        res.status(500).json({ error: err.message });
    }
});

// POST /api/astro-match/calculate — detailed 10 Porutham for a specific pair
router.post('/calculate', requireAuth, async (req, res) => {
    try {
        const { bride_rasi, bride_star, groom_rasi, groom_star } = req.body;

        if (!bride_rasi || !bride_star || !groom_rasi || !groom_star) {
            return res.status(400).json({ error: 'bride_rasi, bride_star, groom_rasi, groom_star are all required.' });
        }

        const result = calculateTenPorutham(
            { rasi: bride_rasi, star: bride_star },
            { rasi: groom_rasi, star: groom_star }
        );

        res.json(result);
    } catch (err) {
        console.error('[AstroMatch] calculate error:', err);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/astro-match/reference — return canonical Rasi/Nakshatra lists
router.get('/reference', async (req, res) => {
    res.json({ rasis: RASIS, nakshatras: NAKSHATRAS, ruleset: RULESET_VERSION });
});

// Attach matching helpers for direct unit testing & modular reuse
router.calculateTenPorutham = calculateTenPorutham;
router.validateRasiNakshatraPada = validateRasiNakshatraPada;
router.inclusiveStarCount = inclusiveStarCount;
router.getExpectedRasiForPada = getExpectedRasiForPada;
router.NAKSHATRAS = NAKSHATRAS;
router.RASIS = RASIS;
router.RULESET_VERSION = RULESET_VERSION;

module.exports = router;
