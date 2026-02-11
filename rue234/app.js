(function () {
  'use strict';

  const GAP_PATTERN = /\((\d+)\)/g;

  let tests = [];
  let currentTest = null;
  let currentMode = 'practice';

  const $mode = document.getElementById('mode');
  const $testSelect = document.getElementById('test-select');
  const $btnStart = document.getElementById('btn-start');
  const $intro = document.getElementById('intro');
  const $setup = document.getElementById('setup');
  const $testView = document.getElementById('test-view');
  const $testTitle = document.getElementById('test-title');
  const $modeHint = document.getElementById('mode-hint');
  const $textWithGaps = document.getElementById('text-with-gaps');
  const $btnSubmit = document.getElementById('btn-submit');
  const $btnRetry = document.getElementById('btn-retry');
  const $btnAnother = document.getElementById('btn-another');
  const $feedback = document.getElementById('feedback');

  function parseTextWithGaps(text) {
    const parts = [];
    let lastIndex = 0;
    let m;
    GAP_PATTERN.lastIndex = 0;
    while ((m = GAP_PATTERN.exec(text)) !== null) {
      parts.push({ type: 'text', value: text.slice(lastIndex, m.index) });
      parts.push({ type: 'gap', index: parseInt(m[1], 10) });
      lastIndex = m.index + m[0].length;
    }
    parts.push({ type: 'text', value: text.slice(lastIndex) });
    return parts;
  }

  function getFirstLetter(word) {
    return word.charAt(0);
  }

  function normalizeAnswer(input) {
    return (input || '').trim().toLowerCase();
  }

  function isAnswerCorrect(given, expected) {
    const g = normalizeAnswer(given);
    const e = expected.toLowerCase();
    return g === e;
  }

  function loadTests() {
    return fetch('tests.json')
      .then(function (res) {
        if (!res.ok) throw new Error('Could not load tests.json');
        return res.json();
      })
      .then(function (data) {
        tests = data.tests || [];
        return tests;
      });
  }

  function fillTestSelect() {
    $testSelect.innerHTML = '';
    tests.forEach(function (t) {
      const opt = document.createElement('option');
      opt.value = t.id;
      opt.textContent = t.title;
      $testSelect.appendChild(opt);
    });
    if (tests.length > 0) {
      $testSelect.value = tests[0].id;
    }
  }

  function getCurrentTest() {
    const id = $testSelect.value;
    return tests.find(function (t) { return t.id === id; }) || null;
  }

  function showTestView() {
    $intro.classList.add('hidden');
    $setup.classList.add('hidden');
    $testView.classList.remove('hidden');
  }

  function showSetup() {
    $testView.classList.add('hidden');
    $feedback.classList.add('hidden');
    $intro.classList.remove('hidden');
    $setup.classList.remove('hidden');
  }

  function renderTest(test, mode) {
    currentTest = test;
    currentMode = mode;
    $testTitle.textContent = test.title;

    const modeLabels = {
      'guided-letter': 'Hint: first letter of each word is shown.',
      'guided-type': 'Hint: word type (e.g. preposition, pronoun) is shown.',
      'practice': 'No hints – type the missing word for each gap.'
    };
    $modeHint.textContent = modeLabels[mode] || '';

    const parts = parseTextWithGaps(test.text);
    const answers = test.answers || [];
    const wordTypes = test.wordTypes || [];

    $textWithGaps.innerHTML = '';
    parts.forEach(function (part) {
      if (part.type === 'text') {
        $textWithGaps.appendChild(document.createTextNode(part.value));
        return;
      }
      const gapIndex = part.index - 1;
      const wrapper = document.createElement('span');
      wrapper.className = 'gap-wrapper';
      const input = document.createElement('input');
      input.type = 'text';
      input.autocomplete = 'off';
      input.setAttribute('data-gap', String(gapIndex));
      input.placeholder = '?';
      wrapper.appendChild(input);
      if (mode === 'guided-letter' && answers[gapIndex]) {
        const hint = document.createElement('span');
        hint.className = 'gap-hint';
        hint.textContent = '(' + getFirstLetter(answers[gapIndex]) + '…)';
        wrapper.appendChild(hint);
      }
      if (mode === 'guided-type' && wordTypes[gapIndex]) {
        const hint = document.createElement('span');
        hint.className = 'gap-hint';
        hint.textContent = '[' + wordTypes[gapIndex] + ']';
        wrapper.appendChild(hint);
      }
      $textWithGaps.appendChild(wrapper);
    });

    $feedback.classList.add('hidden');
    $btnSubmit.classList.remove('hidden');
    $btnRetry.classList.add('hidden');
    $btnSubmit.disabled = false;
    $textWithGaps.querySelectorAll('input').forEach(function (input) {
      input.disabled = false;
      input.classList.remove('correct', 'incorrect');
      input.value = '';
    });
    $textWithGaps.querySelector('input')?.focus();
  }

  function getInputs() {
    return Array.from($textWithGaps.querySelectorAll('input[data-gap]')).sort(function (a, b) {
      return parseInt(a.getAttribute('data-gap'), 10) - parseInt(b.getAttribute('data-gap'), 10);
    });
  }

  function showFeedback(correctCount, total, wrongGaps) {
    $feedback.classList.remove('hidden');
    $feedback.className = 'feedback summary';
    $btnSubmit.classList.add('hidden');
    $btnRetry.classList.remove('hidden');
    getInputs().forEach(function (input) { input.disabled = true; });

    let scoreClass = 'low';
    if (correctCount === total) scoreClass = 'good';
    else if (correctCount >= total - 2) scoreClass = 'ok';

    let html = '<p class="score ' + scoreClass + '">Score: ' + correctCount + ' / ' + total + '</p>';
    if (wrongGaps.length > 0) {
      html += '<p>Correct answers for the gaps you missed:</p><ul>';
      wrongGaps.forEach(function (item) {
        html += '<li>Gap ' + (item.index + 1) + ': <span class="correct-answer">' + escapeHtml(item.expected) + '</span></li>';
      });
      html += '</ul>';
    }
    $feedback.innerHTML = html;
  }

  function escapeHtml(s) {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  function checkAnswers() {
    if (!currentTest) return;
    const answers = currentTest.answers;
    const inputs = getInputs();
    let correctCount = 0;
    const wrongGaps = [];

    inputs.forEach(function (input, i) {
      const given = input.value.trim();
      const expected = answers[i];
      const correct = isAnswerCorrect(given, expected);
      if (correct) {
        correctCount += 1;
        input.classList.add('correct');
        input.classList.remove('incorrect');
      } else {
        input.classList.add('incorrect');
        input.classList.remove('correct');
        wrongGaps.push({ index: i, expected: expected });
      }
    });

    showFeedback(correctCount, answers.length, wrongGaps);
  }

  $btnStart.addEventListener('click', function () {
    const test = getCurrentTest();
    if (!test) return;
    currentMode = $mode.value;
    renderTest(test, currentMode);
    showTestView();
  });

  $btnSubmit.addEventListener('click', checkAnswers);

  $btnRetry.addEventListener('click', function () {
    if (currentTest) renderTest(currentTest, currentMode);
  });

  $btnAnother.addEventListener('click', showSetup);

  loadTests()
    .then(fillTestSelect)
    .catch(function (err) {
      console.error(err);
      $testSelect.innerHTML = '<option value="">Error loading tests</option>';
    });

  // ========== Part 2 / Part 3 navigation ==========
  const partSubtitle = document.getElementById('part-subtitle');
  const part2Panel = document.getElementById('part2-panel');
  const part3Panel = document.getElementById('part3-panel');
  document.querySelectorAll('.part-tab').forEach(function (tab) {
    tab.addEventListener('click', function () {
      const part = tab.getAttribute('data-part');
      document.querySelectorAll('.part-tab').forEach(function (t) { t.classList.remove('part-tab-active'); });
      tab.classList.add('part-tab-active');
      if (part === '2') {
        part2Panel.classList.remove('hidden');
        part3Panel.classList.add('hidden');
        partSubtitle.textContent = 'Part 2 – Open cloze';
      } else {
        part2Panel.classList.add('hidden');
        part3Panel.classList.remove('hidden');
        partSubtitle.textContent = 'Part 3 – Word formation';
        if (typeof initPart3 === 'function') initPart3();
      }
    });
  });

  // ========== Part 3 – Word formation ==========
  let part3Data = null;
  let currentP3Test = null;
  let currentP3Type = null; // 'guided' | 'mcq' | 'full'
  const P3_STORAGE_KEY = 'fcePart3Progress';
  const P3_CHART_MAX = 20;

  function getP3Progress() {
    try {
      var raw = localStorage.getItem(P3_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
  }

  function saveP3Attempt(type, id, score, total) {
    var list = getP3Progress();
    list.push({ type: type, id: id || type, score: score, total: total, date: Date.now() });
    if (list.length > 500) list = list.slice(-500);
    try { localStorage.setItem(P3_STORAGE_KEY, JSON.stringify(list)); } catch (e) {}
    updateP3ProgressDisplay();
  }

  function updateP3ProgressDisplay() {
    var list = getP3Progress();
    var testsList = list.filter(function (x) { return x.type === 'guided' || x.type === 'mcq' || x.type === 'full'; });
    var totalRight = 0, totalQuestions = 0;
    testsList.forEach(function (x) { totalRight += x.score; totalQuestions += x.total; });
    var percent = totalQuestions ? Math.round((100 * totalRight) / totalQuestions) : 0;
    var scoreEl = document.getElementById('p3-score-value');
    var testsDoneEl = document.getElementById('p3-tests-done');
    var percentEl = document.getElementById('p3-percent');
    var chartEl = document.getElementById('p3-chart');
    if (scoreEl) scoreEl.textContent = totalQuestions ? totalRight + ' / ' + totalQuestions : '—';
    if (testsDoneEl) testsDoneEl.textContent = '(' + testsList.length + ' test(s))';
    if (percentEl) { percentEl.textContent = percent + '%'; percentEl.className = 'progress-percent'; }
    if (chartEl && list.length > 0) {
      var recent = list.slice(-P3_CHART_MAX);
      chartEl.innerHTML = '';
      recent.forEach(function (r) {
        var p = r.total ? Math.round((100 * r.score) / r.total) : 0;
        var bar = document.createElement('div');
        bar.className = 'bar' + (p >= 80 ? ' good' : p < 50 ? ' low' : '');
        bar.style.height = (p || 2) + '%';
        bar.title = r.type + ': ' + r.score + '/' + r.total + ' (' + p + '%)';
        chartEl.appendChild(bar);
      });
    }
  }

  function loadPart3Data() {
    return fetch('tests-part3.json')
      .then(function (res) { if (!res.ok) throw new Error('Could not load tests-part3.json'); return res.json(); })
      .then(function (data) { part3Data = data; return data; });
  }

  function initPart3() {
    if (part3Data) {
      renderP3FullSelect();
      updateP3ProgressDisplay();
      return;
    }
    loadPart3Data().then(function () {
      renderP3Prefix();
      renderP3Suffix();
      renderP3Pos();
      renderP3FullSelect();
      updateP3ProgressDisplay();
      bindP3ExerciseTabs();
    }).catch(function (err) { console.error(err); });
  }

  function bindP3ExerciseTabs() {
    document.querySelectorAll('.p3-ex-tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        document.querySelectorAll('.p3-ex-tab').forEach(function (t) { t.classList.remove('active'); });
        tab.classList.add('active');
        var ex = tab.getAttribute('data-ex');
        document.querySelectorAll('.p3-ex-content').forEach(function (c) { c.classList.add('hidden'); });
        var panel = document.getElementById('p3-ex-' + ex);
        if (panel) panel.classList.remove('hidden');
      });
    });
  }

  function renderP3Prefix() {
    var container = document.getElementById('p3-prefix-container');
    if (!container || !part3Data || !part3Data.prefixExercises) return;
    var items = part3Data.prefixExercises;
    container.innerHTML = '';
    items.forEach(function (item, i) {
      var div = document.createElement('div');
      div.className = 'p3-ex-item';
      div.innerHTML = '<label>' + (i + 1) + '. ' + item.prefix + ' + <strong>' + item.base + '</strong> = </label><input type="text" data-idx="' + i + '" placeholder="type word">';
      container.appendChild(div);
    });
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-primary';
    btn.textContent = 'Check answers';
    btn.addEventListener('click', function () {
      var correct = 0;
      container.querySelectorAll('input').forEach(function (input) {
        var idx = parseInt(input.getAttribute('data-idx'), 10);
        var ans = items[idx].answer;
        var given = (input.value || '').trim().toLowerCase();
        var ok = given === ans.toLowerCase();
        if (ok) correct++;
        input.classList.toggle('correct', ok);
        input.classList.toggle('incorrect', !ok);
        input.disabled = true;
      });
      var fb = document.getElementById('p3-prefix-feedback');
      fb.classList.remove('hidden');
      fb.innerHTML = '<p class="score ' + (correct === items.length ? 'good' : 'ok') + '">Score: ' + correct + ' / ' + items.length + '</p>';
      saveP3Attempt('prefix', 'prefix', correct, items.length);
    });
    container.appendChild(btn);
  }

  function renderP3Suffix() {
    var container = document.getElementById('p3-suffix-container');
    if (!container || !part3Data || !part3Data.suffixExercises) return;
    var items = part3Data.suffixExercises;
    container.innerHTML = '';
    items.forEach(function (item, i) {
      var div = document.createElement('div');
      div.className = 'p3-ex-item';
      div.innerHTML = '<label>' + (i + 1) + '. <strong>' + item.base + '</strong> → ' + item.partOfSpeech + ': </label><input type="text" data-idx="' + i + '" placeholder="type word">';
      container.appendChild(div);
    });
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-primary';
    btn.textContent = 'Check answers';
    btn.addEventListener('click', function () {
      var correct = 0;
      container.querySelectorAll('input').forEach(function (input) {
        var idx = parseInt(input.getAttribute('data-idx'), 10);
        var ans = items[idx].answer;
        var given = (input.value || '').trim().toLowerCase();
        var ok = given === ans.toLowerCase();
        if (ok) correct++;
        input.classList.toggle('correct', ok);
        input.classList.toggle('incorrect', !ok);
        input.disabled = true;
      });
      var fb = document.getElementById('p3-suffix-feedback');
      fb.classList.remove('hidden');
      fb.innerHTML = '<p class="score ' + (correct === items.length ? 'good' : 'ok') + '">Score: ' + correct + ' / ' + items.length + '</p>';
      saveP3Attempt('suffix', 'suffix', correct, items.length);
    });
    container.appendChild(btn);
  }

  function renderP3Pos() {
    var container = document.getElementById('p3-pos-container');
    if (!container || !part3Data || !part3Data.posExercises) return;
    var items = part3Data.posExercises;
    container.innerHTML = '';
    items.forEach(function (item, i) {
      var div = document.createElement('div');
      div.className = 'p3-ex-item';
      var sent = item.sentence.replace('_____', '______');
      var opts = item.options.map(function (opt, j) {
        return '<label><input type="radio" name="pos' + i + '" value="' + escapeHtml(opt) + '" data-idx="' + i + '"> ' + opt + '</label>';
      }).join('');
      div.innerHTML = '<p><strong>' + (i + 1) + '.</strong> ' + sent + '</p><div class="p3-pos-options">' + opts + '</div>';
      container.appendChild(div);
    });
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-primary';
    btn.textContent = 'Check answers';
    btn.addEventListener('click', function () {
      var correct = 0;
      items.forEach(function (item, i) {
        var radio = container.querySelector('input[name="pos' + i + '"]:checked');
        var given = radio ? radio.value : '';
        var ok = given === item.correct;
        if (ok) correct++;
      });
      var fb = document.getElementById('p3-pos-feedback');
      fb.classList.remove('hidden');
      fb.innerHTML = '<p class="score ' + (correct === items.length ? 'good' : 'ok') + '">Score: ' + correct + ' / ' + items.length + '</p>';
      saveP3Attempt('pos', 'pos', correct, items.length);
    });
    container.appendChild(btn);
  }

  function renderP3FullSelect() {
    var sel = document.getElementById('p3-full-select');
    if (!sel || !part3Data || !part3Data.fullTests) return;
    sel.innerHTML = '';
    (part3Data.fullTests || []).forEach(function (t) {
      var opt = document.createElement('option');
      opt.value = t.id;
      opt.textContent = t.title;
      sel.appendChild(opt);
    });
    if (part3Data.fullTests && part3Data.fullTests.length > 0) sel.value = part3Data.fullTests[0].id;
  }

  function showP3TestView() {
    document.getElementById('p3-tests').classList.add('hidden');
    document.getElementById('p3-test-view').classList.remove('hidden');
  }

  function hideP3TestView() {
    document.getElementById('p3-test-view').classList.add('hidden');
    document.getElementById('p3-feedback').classList.add('hidden');
    document.getElementById('p3-tests').classList.remove('hidden');
  }

  function renderP3GuidedTest() {
    var t = part3Data.guidedTest;
    if (!t) return;
    currentP3Test = t;
    currentP3Type = 'guided';
    document.getElementById('p3-test-title').textContent = t.title;
    document.getElementById('p3-test-hint').textContent = 'Part-of-speech hint shown for each gap.';
    document.getElementById('p3-test-instruction').textContent = 'Form the correct word from the word in CAPITALS. Type your answer in each box.';
    var parts = parseTextWithGaps(t.text);
    var baseWords = t.baseWords || [];
    var answers = t.answers || [];
    var hints = t.posHints || [];
    var container = document.getElementById('p3-text-with-gaps');
    container.innerHTML = '';
    parts.forEach(function (part) {
      if (part.type === 'text') { container.appendChild(document.createTextNode(part.value)); return; }
      var idx = part.index - 1;
      var wrap = document.createElement('span');
      wrap.className = 'gap-wrapper p3-gap-wrapper';
      var input = document.createElement('input');
      input.type = 'text';
      input.setAttribute('data-gap', idx);
      input.placeholder = '?';
      wrap.appendChild(input);
      var base = document.createElement('span');
      base.className = 'base-word';
      base.textContent = '[' + (baseWords[idx] || '') + (hints[idx] ? ' → ' + hints[idx] : '') + ']';
      wrap.appendChild(base);
      container.appendChild(wrap);
    });
    document.getElementById('p3-feedback').classList.add('hidden');
    document.getElementById('p3-btn-submit').classList.remove('hidden');
    document.getElementById('p3-btn-submit').onclick = function () { checkP3Test(answers, t.explanations); };
    showP3TestView();
  }

  function renderP3McqTest() {
    var list = part3Data.mcqTests;
    if (!list || list.length === 0) return;
    var t = list[0];
    currentP3Test = t;
    currentP3Type = 'mcq';
    document.getElementById('p3-test-title').textContent = t.title;
    document.getElementById('p3-test-hint').textContent = 'Choose the correct option (A, B, C or D) for each gap.';
    document.getElementById('p3-test-instruction').textContent = 'Form the correct word from the word in CAPITALS. Select one option per gap.';
    var parts = parseTextWithGaps(t.text);
    var baseWords = t.baseWords || [];
    var options = t.options || [];
    var answers = t.answers || [];
    var container = document.getElementById('p3-text-with-gaps');
    container.innerHTML = '';
    parts.forEach(function (part) {
      if (part.type === 'text') { container.appendChild(document.createTextNode(part.value)); return; }
      var idx = part.index - 1;
      var wrap = document.createElement('span');
      wrap.className = 'gap-wrapper p3-gap-wrapper';
      var sel = document.createElement('select');
      sel.setAttribute('data-gap', idx);
      var opts = options[idx] || [];
      opts.forEach(function (opt, j) {
        var o = document.createElement('option');
        o.value = j;
        o.textContent = opt;
        sel.appendChild(o);
      });
      wrap.appendChild(sel);
      var base = document.createElement('span');
      base.className = 'base-word';
      base.textContent = '[' + (baseWords[idx] || '') + ']';
      wrap.appendChild(base);
      container.appendChild(wrap);
    });
    document.getElementById('p3-feedback').classList.add('hidden');
    document.getElementById('p3-btn-submit').classList.remove('hidden');
    document.getElementById('p3-btn-submit').onclick = function () { checkP3Mcq(answers, t.explanations); };
    showP3TestView();
  }

  function renderP3FullTest() {
    var id = document.getElementById('p3-full-select').value;
    var list = part3Data.fullTests;
    var t = list && list.find(function (x) { return x.id === id; });
    if (!t) return;
    currentP3Test = t;
    currentP3Type = 'full';
    document.getElementById('p3-test-title').textContent = t.title;
    document.getElementById('p3-test-hint').textContent = 'Type the correct word for each gap. Explanations appear when you check.';
    document.getElementById('p3-test-instruction').textContent = 'Form the correct word from the word in CAPITALS. Type your answer in each box.';
    var parts = parseTextWithGaps(t.text);
    var baseWords = t.baseWords || [];
    var answers = t.answers || [];
    var container = document.getElementById('p3-text-with-gaps');
    container.innerHTML = '';
    parts.forEach(function (part) {
      if (part.type === 'text') { container.appendChild(document.createTextNode(part.value)); return; }
      var idx = part.index - 1;
      var wrap = document.createElement('span');
      wrap.className = 'gap-wrapper p3-gap-wrapper';
      var input = document.createElement('input');
      input.type = 'text';
      input.setAttribute('data-gap', idx);
      input.placeholder = '?';
      wrap.appendChild(input);
      var base = document.createElement('span');
      base.className = 'base-word';
      base.textContent = '[' + (baseWords[idx] || '') + ']';
      wrap.appendChild(base);
      container.appendChild(wrap);
    });
    document.getElementById('p3-feedback').classList.add('hidden');
    document.getElementById('p3-btn-submit').classList.remove('hidden');
    document.getElementById('p3-btn-submit').onclick = function () { checkP3Test(answers, t.explanations); };
    showP3TestView();
  }

  function getP3Inputs() {
    var container = document.getElementById('p3-text-with-gaps');
    if (!container) return [];
    return Array.from(container.querySelectorAll('[data-gap]')).sort(function (a, b) {
      return parseInt(a.getAttribute('data-gap'), 10) - parseInt(b.getAttribute('data-gap'), 10);
    });
  }

  function checkP3Test(answers, explanations) {
    var inputs = getP3Inputs();
    var correctCount = 0;
    var wrongList = [];
    inputs.forEach(function (el, i) {
      var given = (el.tagName === 'SELECT' ? el.options[el.selectedIndex].textContent : el.value || '').trim().toLowerCase();
      var expected = (answers[i] || '').toLowerCase();
      var ok = given === expected;
      if (ok) correctCount++; else wrongList.push({ index: i, expected: answers[i], explanation: (explanations && explanations[i]) || '' });
      el.classList.toggle('correct', ok);
      el.classList.toggle('incorrect', !ok);
      el.disabled = true;
    });
    var fb = document.getElementById('p3-feedback');
    fb.classList.remove('hidden');
    var scoreClass = correctCount === answers.length ? 'good' : correctCount >= answers.length - 2 ? 'ok' : 'low';
    var html = '<p class="score ' + scoreClass + '">Score: ' + correctCount + ' / ' + answers.length + '</p>';
    if (wrongList.length > 0 && explanations) {
      html += '<ul class="p3-explanations-list">';
      wrongList.forEach(function (w) {
        html += '<li>Gap ' + (w.index + 1) + ': <span class="correct-answer">' + escapeHtml(w.expected) + '</span>' + (w.explanation ? '<p class="p3-explanation">' + escapeHtml(w.explanation) + '</p>' : '') + '</li>';
      });
      html += '</ul>';
    }
    fb.innerHTML = html;
    document.getElementById('p3-btn-submit').classList.add('hidden');
    saveP3Attempt(currentP3Type, currentP3Test.id, correctCount, answers.length);
  }

  function checkP3Mcq(answers, explanations) {
    var inputs = getP3Inputs();
    var correctCount = 0;
    var wrongList = [];
    inputs.forEach(function (el, i) {
      var given = parseInt(el.value, 10);
      var expected = answers[i];
      var ok = given === expected;
      if (ok) correctCount++; else wrongList.push({ index: i, expected: (currentP3Test.options[i] || [])[expected], explanation: (explanations && explanations[i]) || '' });
      el.classList.toggle('correct', ok);
      el.classList.toggle('incorrect', !ok);
      el.disabled = true;
    });
    var fb = document.getElementById('p3-feedback');
    fb.classList.remove('hidden');
    var scoreClass = correctCount === answers.length ? 'good' : correctCount >= answers.length - 2 ? 'ok' : 'low';
    var html = '<p class="score ' + scoreClass + '">Score: ' + correctCount + ' / ' + answers.length + '</p>';
    if (wrongList.length > 0 && explanations) {
      html += '<ul class="p3-explanations-list">';
      wrongList.forEach(function (w) {
        html += '<li>Gap ' + (w.index + 1) + ': <span class="correct-answer">' + escapeHtml(w.expected) + '</span>' + (w.explanation ? '<p class="p3-explanation">' + escapeHtml(w.explanation) + '</p>' : '') + '</li>';
      });
      html += '</ul>';
    }
    fb.innerHTML = html;
    document.getElementById('p3-btn-submit').classList.add('hidden');
    saveP3Attempt('mcq', currentP3Test.id, correctCount, answers.length);
  }

  document.getElementById('p3-btn-guided') && document.getElementById('p3-btn-guided').addEventListener('click', function () {
    if (!part3Data) { loadPart3Data().then(renderP3GuidedTest); return; }
    renderP3GuidedTest();
  });
  document.getElementById('p3-btn-mcq') && document.getElementById('p3-btn-mcq').addEventListener('click', function () {
    if (!part3Data) { loadPart3Data().then(renderP3McqTest); return; }
    renderP3McqTest();
  });
  document.getElementById('p3-btn-full') && document.getElementById('p3-btn-full').addEventListener('click', function () {
    if (!part3Data) { loadPart3Data().then(renderP3FullTest); return; }
    renderP3FullTest();
  });
  document.getElementById('p3-btn-back') && document.getElementById('p3-btn-back').addEventListener('click', hideP3TestView);

  window.initPart3 = initPart3;
})();
