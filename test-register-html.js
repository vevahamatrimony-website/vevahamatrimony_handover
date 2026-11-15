/**
 * test-register-html.js
 * Verification script for register.html photo promotion consent feature.
 */

const fs = require('fs');
const assert = require('assert');

const html = fs.readFileSync('register.html', 'utf8');

console.log('🧪 Verifying register.html for Photo Promotion Consent Checkbox...\n');

// 1. Checkbox ID, Name, Type
assert.ok(html.includes('id="photoPromoConsent"'), 'id="photoPromoConsent" exists');
assert.ok(html.includes('name="photoPromoConsent"'), 'name="photoPromoConsent" exists');
assert.ok(html.includes('type="checkbox" id="photoPromoConsent"'), 'Checkbox type is correct');

// 2. Default state: not checked by default
assert.ok(!html.includes('id="photoPromoConsent" checked'), 'Checkbox is NOT checked by default');

// 3. Exact label text
const expectedLabel = 'I agree to the use of my profile photo for Vevahamatrimony.com promotions and advertisements, even if hidden on my profile.';
assert.ok(html.includes(expectedLabel), 'Exact label text is present');

// 4. Button #nextStep2 disabled by default and aria-disabled="true"
assert.ok(html.includes('id="nextStep2"'), '#nextStep2 exists');
assert.ok(html.includes('disabled'), '#nextStep2 has disabled attribute');
assert.ok(html.includes('aria-disabled="true"'), '#nextStep2 has aria-disabled="true"');

// 5. Exact error message
const expectedError = 'Please tick the checkbox to agree to the use of your profile photo for promotions to continue.';
assert.ok(html.includes(expectedError), 'Exact inline error message is present');

// 6. Functions present in script
assert.ok(html.includes('function highlightAndShowConsentError'), 'highlightAndShowConsentError function defined');
assert.ok(html.includes('function handlePhotoPromoConsentChange'), 'handlePhotoPromoConsentChange function defined');
assert.ok(html.includes('nextStep2Wrapper'), 'nextStep2Wrapper click listener present');

// 7. Verify script tags syntax
const scriptRegex = /<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/gi;
let match;
let scriptIndex = 0;
while ((match = scriptRegex.exec(html)) !== null) {
    scriptIndex++;
    const code = match[1];
    if (code.trim().length > 0) {
        try {
            new Function(code);
        } catch (e) {
            console.error(`❌ Script block ${scriptIndex} syntax error: ${e.message}`);
            process.exit(1);
        }
    }
}

console.log(`✅ All ${scriptIndex} inline script blocks passed syntax compilation!`);
console.log('🎉 ALL ACCEPTANCE CRITERIA FOR PHOTO PROMOTION CONSENT CHECKBOX PASSED!\n');
