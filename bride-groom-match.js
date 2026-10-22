(function() {
  'use strict';

  const STORAGE_KEY = 'vevahaBrideGroomPorutham';
  const RASI_OPTIONS = ['Mesha', 'Vrishabha', 'Mithuna', 'Kataka', 'Simha', 'Kanya', 'Tula', 'Vrischika', 'Dhanus', 'Makara', 'Kumbha', 'Meena'];
  const NAKSHATRA_OPTIONS = [
    'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra',
    'Punarvasu', 'Pushya', 'Ashlesha', 'Magha', 'Purva Phalguni', 'Uttara Phalguni',
    'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha',
    'Mula', 'Purva Ashadha', 'Uttara Ashadha', 'Shravana', 'Dhanishta', 'Shatabhisha',
    'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati'
  ];
  const LAGNAM_OPTIONS = RASI_OPTIONS.slice();
  const DINA_DISTANCES = [2, 4, 6, 8, 9, 11, 13, 15, 18, 20, 22, 24, 26];
  const RASI_CANONICAL = {
    Mesha: 'Mesha',
    Vrishabha: 'Vrishabha',
    Mithuna: 'Mithuna',
    Kataka: 'Karka',
    Karka: 'Karka',
    Simha: 'Simha',
    Kanya: 'Kanya',
    Tula: 'Tula',
    Vrischika: 'Vrischika',
    Dhanus: 'Dhanu',
    Dhanu: 'Dhanu',
    Makara: 'Makara',
    Kumbha: 'Kumbha',
    Meena: 'Meena'
  };
  const RASI_ADHIPATHI = {
    Mesha: 'Mars',
    Vrishabha: 'Venus',
    Mithuna: 'Mercury',
    Kataka: 'Moon',
    Karka: 'Moon',
    Simha: 'Sun',
    Kanya: 'Mercury',
    Tula: 'Venus',
    Vrischika: 'Mars',
    Dhanus: 'Jupiter',
    Dhanu: 'Jupiter',
    Makara: 'Saturn',
    Kumbha: 'Saturn',
    Meena: 'Jupiter'
  };
  const ADHIPATHI_FRIENDS = {
    Sun: ['Moon', 'Mars', 'Jupiter'],
    Moon: ['Sun', 'Mercury'],
    Mars: ['Sun', 'Moon', 'Jupiter'],
    Mercury: ['Sun', 'Venus'],
    Jupiter: ['Sun', 'Moon', 'Mars'],
    Venus: ['Mercury', 'Saturn'],
    Saturn: ['Mercury', 'Venus']
  };
  const VASYA_RELATIONS = {
    Mesha: ['Simha', 'Vrischika'],
    Vrishabha: ['Kataka', 'Tula'],
    Mithuna: ['Kanya'],
    Kataka: ['Vrischika', 'Dhanus'],
    Simha: ['Tula'],
    Kanya: ['Mithuna', 'Meena'],
    Tula: ['Makara', 'Kumbha'],
    Vrischika: ['Kataka', 'Kanya'],
    Dhanus: ['Meena'],
    Makara: ['Mesha', 'Kumbha'],
    Kumbha: ['Meena'],
    Meena: ['Makara']
  };
  const VEDHA_PAIRS = null;

  document.addEventListener('DOMContentLoaded', () => {
    const panel = document.getElementById('bride-groom-form-panel');
    const form = document.getElementById('bride-groom-form');
    const alertBox = document.getElementById('bride-groom-form-alert');
    const resultBox = document.getElementById('bride-groom-results');
    const toggleBtn = document.getElementById('bride-groom-match-btn');
    if (!panel || !form || !alertBox || !resultBox) {
      return;
    }

    const calculator = typeof PoruthamCalculator === 'function' ? new PoruthamCalculator() : null;
    if (!calculator) {
      console.warn('PoruthamCalculator not available; bride-groom match form disabled.');
      return;
    }

    populateSelects(form);
    hydrateFromStorage(form);

    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        panel.classList.toggle('hidden');
        if (!panel.classList.contains('hidden')) {
          panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    }

    form.addEventListener('submit', event => {
      event.preventDefault();
      handleAnalyze(form, calculator, alertBox, resultBox);
    });

    form.addEventListener('keydown', event => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        form.requestSubmit();
      }
    });

    form.querySelectorAll('[data-match-action="save"]').forEach(btn => {
      btn.addEventListener('click', () => handleSave(form, alertBox));
    });
    form.querySelectorAll('[data-match-action="reset"]').forEach(btn => {
      btn.addEventListener('click', () => {
        form.reset();
        hideAlert(alertBox);
        resultBox.classList.add('hidden');
      });
    });
    form.querySelectorAll('[data-match-action="delete"]').forEach(btn => {
      btn.addEventListener('click', () => {
        localStorage.removeItem(STORAGE_KEY);
        form.reset();
        hideAlert(alertBox);
        resultBox.classList.add('hidden');
        showAlert(alertBox, 'Saved details deleted from localStorage.', 'info');
        setTimeout(() => hideAlert(alertBox), 2500);
      });
    });
  });

  function populateSelects(form) {
    form.querySelectorAll('[data-match-select="rasi"]').forEach(select => {
      select.innerHTML = buildOptions(RASI_OPTIONS);
    });
    form.querySelectorAll('[data-match-select="nakshatra"]').forEach(select => {
      select.innerHTML = buildOptions(NAKSHATRA_OPTIONS);
    });
    form.querySelectorAll('[data-match-select="lagnam"]').forEach(select => {
      select.innerHTML = buildOptions(LAGNAM_OPTIONS);
    });
  }

  function buildOptions(list) {
    const options = ['<option value="">-- Select --</option>'];
    list.forEach(item => options.push(`<option value="${item}">${item}</option>`));
    return options.join('');
  }

  function hydrateFromStorage(form) {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return;
      const data = JSON.parse(saved);
      Object.entries(data).forEach(([name, value]) => {
        if (form.elements[name]) {
          form.elements[name].value = value;
        }
      });
    } catch (err) {
      console.warn('Unable to load saved bride-groom data:', err);
    }
  }

  function collectValues(form) {
    const entries = new FormData(form);
    const values = {};
    entries.forEach((value, key) => {
      values[key] = typeof value === 'string' ? value.trim() : value;
    });
    return values;
  }

  function validate(values) {
    const required = [
      'brideName', 'brideRasi', 'brideNakshatra', 'brideLagnam', 'brideDosham', 'brideGotra',
      'groomName', 'groomRasi', 'groomNakshatra', 'groomLagnam', 'groomDosham', 'groomGotra'
    ];
    const missing = required.filter(key => !values[key]);
    return { valid: missing.length === 0, missing };
  }

  function handleSave(form, alertBox) {
    const values = collectValues(form);
    const validation = validate(values);
    if (!validation.valid) {
      showAlert(alertBox, 'Fill every field for both bride and groom before saving.', 'error');
      return;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(values));
    showAlert(alertBox, 'Details saved locally. Use Analyze Match anytime without retyping.', 'success');
    setTimeout(() => hideAlert(alertBox), 2500);
  }

  function handleAnalyze(form, calculator, alertBox, resultBox) {
    const values = collectValues(form);
    const validation = validate(values);
    if (!validation.valid) {
      showAlert(alertBox, 'Complete every Bride & Groom field. Deterministic analysis never runs on partial data.', 'error');
      return;
    }
    hideAlert(alertBox);

    const bride = buildProfile(values, 'bride');
    const groom = buildProfile(values, 'groom');
    const canonicalBride = canonicalizeProfile(bride);
    const canonicalGroom = canonicalizeProfile(groom);

    if (!canonicalBride || !canonicalGroom) {
      showAlert(alertBox, 'Invalid Rasi or Nakshatram detected. Use the provided dropdown values only.', 'error');
      return;
    }

    const baseResult = calculator.calculatePoruthamScore(canonicalBride, canonicalGroom);
    const evaluations = buildPoruthamEvaluations({ bride, groom, canonicalBride, canonicalGroom, baseResult });
    const passCount = evaluations.filter(item => item.passed).length;
    const percentage = Math.round((passCount / evaluations.length) * 100);
    const verdict = deriveVerdict(passCount, evaluations);
    const doshamNote = evaluateDosham(bride, groom);
    const gotraNote = evaluateGotra(bride, groom);

    renderResults({
      bride,
      groom,
      evaluations,
      score: passCount,
      percentage,
      verdict,
      doshamNote,
      gotraNote,
      resultBox
    });
  }

  function buildProfile(values, role) {
    return {
      name: values[`${role}Name`],
      rasi: values[`${role}Rasi`],
      nakshatra: values[`${role}Nakshatra`],
      lagnam: values[`${role}Lagnam`],
      dosham: values[`${role}Dosham`],
      gotra: values[`${role}Gotra`]
    };
  }

  function canonicalizeProfile(profile) {
    const canonicalRasi = RASI_CANONICAL[profile.rasi];
    if (!canonicalRasi) return null;
    if (!NAKSHATRA_OPTIONS.includes(profile.nakshatra)) return null;
    return {
      rasi: canonicalRasi,
      nakshatra: profile.nakshatra,
      lagnam: profile.lagnam,
      dosham: profile.dosham,
      gotra: profile.gotra
    };
  }

  function buildPoruthamEvaluations({ bride, groom, canonicalBride, canonicalGroom, baseResult }) {
    const breakdown = baseResult.breakdown || {};
    const poruthamOrder = [
      { key: 'dina', label: 'Dina Porutham', type: 'calculator' },
      { key: 'gana', label: 'Gana Porutham', type: 'calculator' },
      { key: 'mahendra', label: 'Mahendra Porutham', type: 'calculator' },
      { key: 'sthree', label: 'Sthree Deerga Porutham', type: 'custom' },
      { key: 'yoni', label: 'Yoni Porutham', type: 'calculator' },
      { key: 'rasi', label: 'Rasi Porutham', type: 'calculator' },
      { key: 'rasiAdhipathi', label: 'Rasi Adhipathi Porutham', type: 'custom' },
      { key: 'vasya', label: 'Vasya Porutham', type: 'calculator' },
      { key: 'rajju', label: 'Rajju Porutham', type: 'calculator' },
      { key: 'vedha', label: 'Vedha Porutham', type: 'calculator' }
    ];

    return poruthamOrder.map(item => {
      if (item.type === 'calculator') {
        const passed = Boolean(breakdown[item.key]);
        return {
          key: item.key,
          label: item.label,
          passed,
          detail: explainCalculatorPorutham(item.key, passed, bride, groom)
        };
      }
      if (item.key === 'sthree') {
        return evaluateSthreeDeerga(bride, groom);
      }
      if (item.key === 'rasiAdhipathi') {
        return evaluateRasiAdhipathi(bride, groom);
      }
      return {
        key: item.key,
        label: item.label,
        passed: false,
        detail: 'Unsupported Porutham key.'
      };
    });
  }

  function explainCalculatorPorutham(key, passed, bride, groom) {
    switch (key) {
      case 'dina':
        return passed
          ? 'Nakshatram tara distance supports shared wellbeing.'
          : 'Nakshatram tara distance is unfavourable for Dina Porutham.';
      case 'gana':
        return passed ? 'Gana temperaments align without friction.' : 'Gana temperaments clash; lifestyle adjustments needed.';
      case 'mahendra':
        return passed ? 'Groom Rasi falls in the 4/7/10th position from the bride, sustaining growth.' : 'Mahendra axis is missing; prosperity support is weak.';
      case 'yoni':
        return passed ? 'Yoni symbols are harmonious.' : 'Yoni symbols are incompatible; intimacy requires guidance.';
      case 'rasi':
        return passed ? 'Rasi spacing is auspicious.' : 'Rasi spacing is adverse for emotional flow.';
      case 'vasya':
        return passed ? 'Mutual Vasya attraction is present.' : 'Vasya control is imbalanced; dialogue is essential.';
      case 'rajju':
        return passed ? 'Rajju groups differ, safeguarding longevity.' : 'Same Rajju detected; elders usually advise against this.';
      default:
        return passed ? 'Vedha free alignment.' : 'Vedha clash recorded; tradition treats this as a dosha.';
    }
  }

  function evaluateSthreeDeerga(bride, groom) {
    const distance = nakshatraDistance(bride.nakshatra, groom.nakshatra);
    const passed = distance >= 13;
    return {
      key: 'sthree',
      label: 'Sthree Deerga Porutham',
      passed,
      detail: passed
        ? `Nakshatram separation of ${distance} counts ensures Deerga blessings.`
        : `Only ${distance} nakshatra counts apart; Deerga Porutham is not satisfied.`
    };
  }

  function evaluateRasiAdhipathi(bride, groom) {
    const brideLord = RASI_ADHIPATHI[bride.rasi] || RASI_ADHIPATHI[RASI_CANONICAL[bride.rasi]];
    const groomLord = RASI_ADHIPATHI[groom.rasi] || RASI_ADHIPATHI[RASI_CANONICAL[groom.rasi]];
    const friendly = ADHIPATHI_FRIENDS[brideLord] || [];
    const passed = Boolean(brideLord && groomLord && (brideLord === groomLord || friendly.includes(groomLord)));
    const detail = passed
      ? `Adhipathi harmony: ${brideLord} cooperates with ${groomLord}.`
      : `Adhipathi tension: ${brideLord || 'Unknown'} does not befriend ${groomLord || 'Unknown'}.`;
    return {
      key: 'rasiAdhipathi',
      label: 'Rasi Adhipathi Porutham',
      passed,
      detail
    };
  }

  function nakshatraDistance(from, to) {
    const start = NAKSHATRA_OPTIONS.indexOf(from);
    const end = NAKSHATRA_OPTIONS.indexOf(to);
    if (start === -1 || end === -1) return 0;
    const diff = (end - start + NAKSHATRA_OPTIONS.length) % NAKSHATRA_OPTIONS.length;
    return diff === 0 ? NAKSHATRA_OPTIONS.length : diff;
  }

  function deriveVerdict(score, evaluations) {
    const failsCritical = evaluations.some(item => !item.passed && ['rajju', 'vedha', 'sthree'].includes(item.key));
    if (score >= 8 && !failsCritical) {
      return { symbol: '✔', text: 'Highly Suitable for Marriage', note: 'Porutham alignment is strong across all major checkpoints.' };
    }
    if (score >= 6) {
      return { symbol: '✔', text: 'Suitable with Minor Adjustments', note: 'Perform recommended pariharam for the failed Porutham items before proceeding.' };
    }
    return { symbol: '✖', text: 'Not Traditionally Recommended', note: 'Multiple Porutham failures surfaced; seek senior astrologer guidance or explore alternate matches.' };
  }

  function evaluateDosham(bride, groom) {
    const brideYes = bride.dosham.toLowerCase() === 'yes';
    const groomYes = groom.dosham.toLowerCase() === 'yes';
    if (!brideYes && !groomYes) {
      return 'Dosham Interaction: Both marked No; proceed with the usual sankalpa.';
    }
    if (brideYes && groomYes) {
      return 'Dosham Interaction: Both indicated Dosham. Arrange the matching pariharam in consultation with elders.';
    }
    const carrier = brideYes ? 'Bride' : 'Groom';
    return `${carrier} indicated Dosham. Tradition expects an equivalent Dosham on both sides or a compensating ritual.`;
  }

  function evaluateGotra(bride, groom) {
    if (!bride.gotra || !groom.gotra) {
      return 'Gotram note: Provide both Gotram values to record the lineage check.';
    }
    if (bride.gotra.trim().toLowerCase() === groom.gotra.trim().toLowerCase()) {
      return 'Gotram note: Same Gotram entered. Customary practice advises against this match unless family preceptor permits.';
    }
    return 'Gotram note: Different Gotram entries uphold lineage separation.';
  }

  function renderResults({ bride, groom, evaluations, score, percentage, verdict, doshamNote, gotraNote, resultBox }) {
    const poruthamRows = evaluations.map(item => {
      const status = item.passed ? 'Pass' : 'Fail';
      const statusClass = item.passed ? 'text-green-700' : 'text-red-600';
      return `
        <tr class="border-b border-indigo-100 last:border-0">
          <td class="py-2 font-semibold text-gray-700">${item.label}</td>
          <td class="py-2 ${statusClass}">${status}</td>
          <td class="py-2 text-gray-600">${item.detail}</td>
        </tr>`;
    }).join('');

    resultBox.innerHTML = `
      <div class="space-y-4">
        <div class="grid gap-4 md:grid-cols-2">
          ${renderPersonCard('Bride', bride)}
          ${renderPersonCard('Groom', groom)}
        </div>
        <div class="rounded-xl bg-white shadow-inner border border-indigo-100">
          <div class="px-4 py-3 border-b border-indigo-100 flex flex-wrap items-center justify-between gap-2">
            <div class="text-base font-semibold text-indigo-800">10 Porutham Breakdown</div>
            <div class="text-sm text-gray-600">Score: ${score}/10 • Compatibility: ${percentage}%</div>
          </div>
          <div class="overflow-x-auto">
            <table class="min-w-full text-sm">
              <tbody>${poruthamRows}</tbody>
            </table>
          </div>
        </div>
        <div class="space-y-2 text-sm">
          <p><strong>Dosham Guidance:</strong> ${doshamNote}</p>
          <p><strong>Gotram Guidance:</strong> ${gotraNote}</p>
        </div>
        <div class="rounded-xl border ${verdict.symbol === '✔' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'} px-4 py-4">
          <p class="text-lg font-semibold">${verdict.symbol} ${verdict.text}</p>
          <p class="text-sm text-gray-700 mt-1">${verdict.note}</p>
        </div>
      </div>
    `;
    resultBox.classList.remove('hidden');
    resultBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function renderPersonCard(label, data) {
    return `
      <div class="rounded-xl border border-indigo-100 bg-white p-4">
        <div class="text-sm font-semibold text-indigo-600 uppercase tracking-wide">${label}</div>
        <div class="mt-2 text-sm text-gray-700 space-y-1">
          <p><strong>Name:</strong> ${data.name}</p>
          <p><strong>Rasi:</strong> ${data.rasi}</p>
          <p><strong>Nakshatram:</strong> ${data.nakshatra}</p>
          <p><strong>Lagnam:</strong> ${data.lagnam}</p>
          <p><strong>Dosham:</strong> ${data.dosham}</p>
          <p><strong>Gotram:</strong> ${data.gotra}</p>
        </div>
      </div>`;
  }

  function showAlert(alertBox, message, type) {
    alertBox.textContent = message;
    alertBox.classList.remove('hidden');
    alertBox.classList.toggle('border-red-200', type !== 'success');
    alertBox.classList.toggle('bg-red-50', type !== 'success');
    alertBox.classList.toggle('text-red-700', type !== 'success');
    alertBox.classList.toggle('border-green-200', type === 'success');
    alertBox.classList.toggle('bg-green-50', type === 'success');
    alertBox.classList.toggle('text-green-700', type === 'success');
  }

  function hideAlert(alertBox) {
    alertBox.classList.add('hidden');
  }
})();
