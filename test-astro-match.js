/**
 * test-astro-match.js
 * Comprehensive automated QA test suite for Tamil 10 Porutham Engine
 * Validates against Section 17 QA test cases in the technical specification.
 */

const assert = require('assert');
const astro = require('./routes/astro-match');

const {
    calculateTenPorutham,
    validateRasiNakshatraPada,
    inclusiveStarCount,
    getExpectedRasiForPada,
    NAKSHATRAS,
    RASIS,
    RULESET_VERSION
} = astro;

console.log('🧪 Starting Astro Match Test Suite (Ruleset: ' + RULESET_VERSION + ')\n');
let passed = 0;
let total = 0;

function it(name, fn) {
    total++;
    try {
        fn();
        console.log(`  ✅ PASS: ${name}`);
        passed++;
    } catch (e) {
        console.error(`  ❌ FAIL: ${name}`);
        console.error(`     Error: ${e.message}`);
    }
}

// ── Test 1: Count wraparound ──────────────────────────────────────────
it('QA-01: Count wraparound (Bride star 25, Groom star 3 -> count 6)', () => {
    const count = inclusiveStarCount(25, 3);
    assert.strictEqual(count, 6, `Expected 6, got ${count}`);
});

// ── Test 2: Mahendra pass ─────────────────────────────────────────────
it('QA-02: Mahendra pass (count 4)', () => {
    // Star 1 (Ashwini) to Star 4 (Rohini) -> count = 4
    const res = calculateTenPorutham({ star: 'Ashwini', rasi: 'Mesha' }, { star: 'Rohini', rasi: 'Rishabha' });
    const p = res.poruthams.find(x => x.code === 'MAHENDRA');
    assert.strictEqual(p.status, 'MATCH');
    assert.strictEqual(p.starCount, 4);
});

// ── Test 3: Mahendra fail ─────────────────────────────────────────────
it('QA-03: Mahendra fail (count 5)', () => {
    // Star 1 (Ashwini) to Star 5 (Mrigashira) -> count = 5
    const res = calculateTenPorutham({ star: 'Ashwini', rasi: 'Mesha' }, { star: 'Mrigashira', rasi: 'Rishabha' });
    const p = res.poruthams.find(x => x.code === 'MAHENDRA');
    assert.strictEqual(p.status, 'NO_MATCH');
    assert.strictEqual(p.starCount, 5);
});

// ── Test 4: Stree Deergha strict pass ─────────────────────────────────
it('QA-04: Stree Deergha strict pass (count 14 > 13)', () => {
    // Star 1 (Ashwini) to Star 14 (Chitra) -> count = 14
    const res = calculateTenPorutham({ star: 'Ashwini', rasi: 'Mesha' }, { star: 'Chitra', rasi: 'Kanya' });
    const p = res.poruthams.find(x => x.code === 'STREE_DEERGHA');
    assert.strictEqual(p.status, 'MATCH');
    assert.strictEqual(p.starCount, 14);
});

// ── Test 5: Stree Deergha boundary fail ───────────────────────────────
it('QA-05: Stree Deergha boundary fail (count 13 is NOT > 13)', () => {
    // Star 1 (Ashwini) to Star 13 (Hasta) -> count = 13
    const res = calculateTenPorutham({ star: 'Ashwini', rasi: 'Mesha' }, { star: 'Hasta', rasi: 'Kanya' });
    const p = res.poruthams.find(x => x.code === 'STREE_DEERGHA');
    assert.strictEqual(p.status, 'NO_MATCH');
    assert.strictEqual(p.starCount, 13);
});

// ── Test 6: Rajju same group fail ─────────────────────────────────────
it('QA-06: Rajju same group fail (Both in Pada rajju: Ashwini & Ashlesha)', () => {
    const res = calculateTenPorutham({ star: 'Ashwini', rasi: 'Mesha' }, { star: 'Ashlesha', rasi: 'Kataka' });
    const p = res.poruthams.find(x => x.code === 'RAJJU');
    assert.strictEqual(p.status, 'NO_MATCH');
    assert.strictEqual(p.brideRajju, 'Pada');
    assert.strictEqual(p.groomRajju, 'Pada');
});

// ── Test 7: Rajju different groups pass ───────────────────────────────
it('QA-07: Rajju different groups pass (Ashwini=Pada, Bharani=Kati)', () => {
    const res = calculateTenPorutham({ star: 'Ashwini', rasi: 'Mesha' }, { star: 'Bharani', rasi: 'Mesha' });
    const p = res.poruthams.find(x => x.code === 'RAJJU');
    assert.strictEqual(p.status, 'MATCH');
});

// ── Test 8: Vedha pair fail ───────────────────────────────────────────
it('QA-08: Vedha pair fail (Ashwini + Jyeshtha)', () => {
    const res = calculateTenPorutham({ star: 'Ashwini', rasi: 'Mesha' }, { star: 'Jyeshtha', rasi: 'Vrischika' });
    const p = res.poruthams.find(x => x.code === 'VEDHA');
    assert.strictEqual(p.status, 'NO_MATCH');
});

// ── Test 9: Vedha reverse symmetry ────────────────────────────────────
it('QA-09: Vedha reverse symmetry (Jyeshtha + Ashwini)', () => {
    const res = calculateTenPorutham({ star: 'Jyeshtha', rasi: 'Vrischika' }, { star: 'Ashwini', rasi: 'Mesha' });
    const p = res.poruthams.find(x => x.code === 'VEDHA');
    assert.strictEqual(p.status, 'NO_MATCH');
});

// ── Test 10: Yoni enemy pair ──────────────────────────────────────────
it('QA-10: Yoni enemy pair (Horse [Ashwini] + Buffalo [Hasta] -> NO_MATCH)', () => {
    const res = calculateTenPorutham({ star: 'Ashwini', rasi: 'Mesha' }, { star: 'Hasta', rasi: 'Kanya' });
    const p = res.poruthams.find(x => x.code === 'YONI');
    assert.strictEqual(p.status, 'NO_MATCH');
    assert.strictEqual(p.brideYoni, 'Horse');
    assert.strictEqual(p.groomYoni, 'Buffalo');
});

// ── Test 11: Invalid pada mapping ─────────────────────────────────────
it('QA-11: Invalid pada mapping (Krittika pada 4 paired with Mesha)', () => {
    const check = validateRasiNakshatraPada('Mesha', 'Krittika', 4);
    assert.strictEqual(check.valid, false);
    assert.ok(check.error.includes('belongs to Rishabha'));
});

// ── Test 12: Valid pada mapping ───────────────────────────────────────
it('QA-12: Valid pada mapping (Krittika pada 1 in Mesha, pada 2 in Rishabha)', () => {
    const check1 = validateRasiNakshatraPada('Mesha', 'Krittika', 1);
    assert.strictEqual(check1.valid, true);

    const check2 = validateRasiNakshatraPada('Rishabha', 'Krittika', 2);
    assert.strictEqual(check2.valid, true);
});

// ── Test 13: Vasiya missing status ────────────────────────────────────
it('QA-13: Vasiya missing status is NOT_CONFIGURED and excluded from denominator', () => {
    const res = calculateTenPorutham({ star: 'Ashwini', rasi: 'Mesha' }, { star: 'Rohini', rasi: 'Rishabha' });
    const p = res.poruthams.find(x => x.code === 'VASIYA');
    assert.strictEqual(p.status, 'NOT_CONFIGURED');
    // Check that total assessed count excludes NOT_CONFIGURED
    assert.strictEqual(res.overall.notConfigured, 1);
    assert.strictEqual(res.overall.assessed + res.overall.notConfigured + res.overall.review, 10);
});

// ── Test 14: Dina accepted count ──────────────────────────────────────
it('QA-14: Dina accepted counts (count = 2, 4, 6... -> MATCH)', () => {
    // Star 1 to Star 2 -> count = 2
    const res = calculateTenPorutham({ star: 'Ashwini', rasi: 'Mesha' }, { star: 'Bharani', rasi: 'Mesha' });
    const p = res.poruthams.find(x => x.code === 'DINA');
    assert.strictEqual(p.status, 'MATCH');
    assert.strictEqual(p.starCount, 2);
});

// ── Test 15: Gana Deva-Deva match ─────────────────────────────────────
it('QA-15: Gana same gana match (Ashwini [Deva] + Rohini [Manushya] -> PARTIAL; Ashwini + Mrigashira [Deva] -> MATCH)', () => {
    const resMatch = calculateTenPorutham({ star: 'Ashwini', rasi: 'Mesha' }, { star: 'Mrigashira', rasi: 'Rishabha' });
    const pMatch = resMatch.poruthams.find(x => x.code === 'GANA');
    assert.strictEqual(pMatch.status, 'MATCH');

    const resPartial = calculateTenPorutham({ star: 'Ashwini', rasi: 'Mesha' }, { star: 'Rohini', rasi: 'Rishabha' });
    const pPartial = resPartial.poruthams.find(x => x.code === 'GANA');
    assert.strictEqual(pPartial.status, 'PARTIAL');
});

// ── Test 16: Rasi Lord same lord match ────────────────────────────────
it('QA-16: Rasi Adhipathi same lord (Mesha [Mars] + Vrischika [Mars] -> MATCH)', () => {
    const res = calculateTenPorutham({ star: 'Ashwini', rasi: 'Mesha' }, { star: 'Anuradha', rasi: 'Vrischika' });
    const p = res.poruthams.find(x => x.code === 'RASI_ADHIPATHI');
    assert.strictEqual(p.status, 'MATCH');
    assert.strictEqual(p.brideLord, 'Mars');
    assert.strictEqual(p.groomLord, 'Mars');
});

// ── Test 17: Score calculation formula ────────────────────────────────
it('QA-17: Score calculation formula (score = (matches + 0.5*partials) / assessed * 100)', () => {
    const res = calculateTenPorutham({ star: 'Rohini', rasi: 'Rishabha' }, { star: 'Hasta', rasi: 'Kanya' });
    const o = res.overall;
    const expectedScore = ((o.matched + 0.5 * o.partial) / o.assessed) * 100;
    assert.ok(Math.abs(o.score - expectedScore) < 0.001);
});

console.log(`\n========================================`);
console.log(`Results: ${passed} / ${total} passed`);
console.log(`========================================\n`);

if (passed === total) {
    console.log('🎉 ALL 17 PORUTHAM TESTS PASSED SUCCESSFULLY!');
    process.exit(0);
} else {
    console.error('❌ SOME TESTS FAILED');
    process.exit(1);
}
