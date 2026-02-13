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

  function loadAnswerBank() {
    return fetch('answer-bank.json')
      .then(function (res) {
        if (!res.ok) return { tests: [] };
        return res.json();
      })
      .then(function (data) {
        return data.tests || [];
      })
      .catch(function () {
        return [];
      });
  }

  function loadReferenceWords() {
    return fetch('part2-reference-words.json')
      .then(function (res) {
        if (!res.ok) return { byType: {}, fixedPhrases: [] };
        return res.json();
      })
      .then(function (data) {
        return data || { byType: {}, fixedPhrases: [] };
      })
      .catch(function () {
        return { byType: {}, fixedPhrases: [] };
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

  var GRAMMAR_TYPES = ['article', 'determiner', 'possessive determiner', 'pronoun', 'relative pronoun', 'relative adverb', 'preposition', 'auxiliary verb', 'modal verb', 'conjunction', 'adjective (such as)', 'adverb', 'noun', 'verb'];
  var FIXED_PHRASE_TYPE = 'other';

  function buildCheatSheet(testList, referenceData) {
    const grammarContainer = document.getElementById('cheatsheet-grammar-content');
    const fixedContainer = document.getElementById('cheatsheet-fixed-content');
    if (!grammarContainer || !fixedContainer) return;
    const referenceByType = referenceData && referenceData.byType ? referenceData.byType : {};
    const fixedPhrasesList = referenceData && Array.isArray(referenceData.fixedPhrases) ? referenceData.fixedPhrases : [];
    const byType = {};
    if (referenceByType && typeof referenceByType === 'object') {
      Object.keys(referenceByType).forEach(function (type) {
        const words = referenceByType[type];
        if (!Array.isArray(words)) return;
        type = type.toLowerCase();
        if (!byType[type]) byType[type] = {};
        words.forEach(function (w) {
          if (w && typeof w === 'string') byType[type][w.toLowerCase().trim()] = true;
        });
      });
    }
    (testList || []).forEach(function (t) {
      const answers = t.answers || [];
      const wordTypes = t.wordTypes || [];
      answers.forEach(function (word, i) {
        const type = (wordTypes[i] || FIXED_PHRASE_TYPE).toLowerCase();
        if (!byType[type]) byType[type] = {};
        byType[type][word.toLowerCase()] = true;
      });
    });
    var grammarOrder = ['article', 'determiner', 'possessive determiner', 'pronoun', 'relative pronoun', 'relative adverb', 'preposition', 'auxiliary verb', 'modal verb', 'conjunction', 'adjective (such as)', 'adverb', 'noun', 'verb'];
    var grammarSeen = {};
    grammarOrder.forEach(function (type) {
      if (!byType[type]) return;
      var words = Object.keys(byType[type]).sort();
      if (words.length === 0) return;
      grammarSeen[type] = true;
    });
    var grammarTypes = grammarOrder.filter(function (t) { return grammarSeen[t]; }).concat(Object.keys(byType).filter(function (t) { return grammarSeen[t] !== true && t !== FIXED_PHRASE_TYPE; }).sort());
    grammarContainer.innerHTML = '';
    grammarTypes.forEach(function (type) {
      const words = Object.keys(byType[type] || {}).sort();
      if (words.length === 0) return;
      const heading = document.createElement('h3');
      heading.className = 'cheatsheet-type';
      heading.textContent = type.charAt(0).toUpperCase() + type.slice(1);
      grammarContainer.appendChild(heading);
      const list = document.createElement('p');
      list.className = 'cheatsheet-words';
      list.textContent = words.join(', ');
      grammarContainer.appendChild(list);
    });
    fixedContainer.innerHTML = '';
    if (fixedPhrasesList.length > 0) {
      const list = document.createElement('ul');
      list.className = 'cheatsheet-phrases';
      fixedPhrasesList.forEach(function (phrase) {
        if (!phrase || typeof phrase !== 'string') return;
        const li = document.createElement('li');
        li.textContent = phrase.trim();
        list.appendChild(li);
      });
      fixedContainer.appendChild(list);
    } else {
      var fixedWords = byType[FIXED_PHRASE_TYPE] ? Object.keys(byType[FIXED_PHRASE_TYPE]).sort() : [];
      if (fixedWords.length > 0) {
        const list = document.createElement('p');
        list.className = 'cheatsheet-words';
        list.textContent = fixedWords.join(', ');
        fixedContainer.appendChild(list);
      }
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

  Promise.all([loadTests(), loadAnswerBank(), loadReferenceWords()])
    .then(function (results) {
      const practiceTests = results[0];
      const answerBankTests = results[1];
      const referenceData = results[2];
      fillTestSelect();
      buildCheatSheet(practiceTests.concat(answerBankTests), referenceData);
    })
    .catch(function (err) {
      console.error(err);
      $testSelect.innerHTML = '<option value="">Error loading tests</option>';
    });

  // ========== Home / Part 2 / Part 3 navigation ==========
  const homePanel = document.getElementById('home-panel');
  const part2Panel = document.getElementById('part2-panel');
  const part3Panel = document.getElementById('part3-panel');
  const pathPanel = document.getElementById('path-panel');
  const part2PracticePanel = document.getElementById('part2-practice-panel');
  const btnBackHome = document.getElementById('btn-back-home');
  const part2Choice = document.getElementById('part2-choice');
  const part2IntroSection = document.getElementById('part2-intro-section');
  const part2PracticeSection = document.getElementById('part2-practice-section');

  function showPart2MainSection(which) {
    if (part2Choice) part2Choice.classList.toggle('hidden', which !== 'choice');
    if (part2IntroSection) part2IntroSection.classList.toggle('hidden', which !== 'intro');
    if (part2PracticeSection) part2PracticeSection.classList.toggle('hidden', which !== 'practice');
  }

  if (document.getElementById('home-part2')) {
    document.getElementById('home-part2').addEventListener('click', function () {
      homePanel.classList.add('hidden');
      part2Panel.classList.remove('hidden');
      part3Panel.classList.add('hidden');
      if (btnBackHome) btnBackHome.classList.remove('hidden');
      showPart2MainSection('choice');
    });
  }
  if (document.getElementById('home-part3')) {
    document.getElementById('home-part3').addEventListener('click', function () {
      homePanel.classList.add('hidden');
      part2Panel.classList.add('hidden');
      part3Panel.classList.remove('hidden');
      if (btnBackHome) btnBackHome.classList.remove('hidden');
      if (typeof initPart3 === 'function') initPart3();
    });
  }
  if (btnBackHome) {
    btnBackHome.addEventListener('click', function () {
      homePanel.classList.remove('hidden');
      part2Panel.classList.add('hidden');
      part3Panel.classList.add('hidden');
      btnBackHome.classList.add('hidden');
    });
  }

  if (document.getElementById('part2-intro-btn')) {
    document.getElementById('part2-intro-btn').addEventListener('click', function () {
      showPart2MainSection('intro');
      showPart2Category('general');
    });
  }
  if (document.getElementById('part2-practice-btn')) {
    document.getElementById('part2-practice-btn').addEventListener('click', function () {
      showPart2MainSection('practice');
      if (pathPanel) pathPanel.classList.add('hidden');
      if (part2PracticePanel) part2PracticePanel.classList.remove('hidden');
    });
  }
  if (document.getElementById('part2-intro-back')) {
    document.getElementById('part2-intro-back').addEventListener('click', function (e) {
      e.preventDefault();
      showPart2MainSection('choice');
    });
  }
  if (document.getElementById('part2-practice-back')) {
    document.getElementById('part2-practice-back').addEventListener('click', function (e) {
      e.preventDefault();
      showPart2MainSection('choice');
    });
  }

  function showPart2Category(cat) {
    document.querySelectorAll('.category-tab').forEach(function (t) {
      t.classList.toggle('part-tab-active', t.getAttribute('data-category') === cat);
    });
    document.querySelectorAll('.category-panel').forEach(function (p) {
      p.classList.toggle('hidden', p.id !== 'category-' + cat);
    });
    if (cat === 'general') initGeneralCategory();
    if (cat === 'parts-of-speech') initPartsOfSpeechCategory();
    if (cat === 'determiners') initDeterminersCategory();
    if (cat === 'prepositions') initPrepositionsCategory();
    if (cat === 'auxiliary') initAuxiliaryCategory();
    if (cat === 'conjunctions') initConjunctionsCategory();
    if (cat === 'pronouns') initPronounsCategory();
    if (cat === 'phrasal-verbs') initPhrasalVerbsCategory();
    if (cat === 'comparatives') initComparativesCategory();
    if (cat === 'negatives') initNegativesCategory();
    if (cat === 'fixed-expressions') initFixedExpressionsCategory();
  }

  document.querySelectorAll('.category-tab').forEach(function (tab) {
    tab.addEventListener('click', function () {
      showPart2Category(tab.getAttribute('data-category'));
    });
  });

  function showRefSubPage(ref) {
    document.querySelectorAll('.ref-sub-tab').forEach(function (t) {
      t.classList.toggle('ref-sub-tab-active', t.getAttribute('data-ref') === ref);
    });
    document.querySelectorAll('.ref-sub-panel').forEach(function (p) {
      p.classList.toggle('hidden', p.id !== 'ref-' + ref);
    });
  }

  document.querySelectorAll('.ref-sub-tab').forEach(function (tab) {
    tab.addEventListener('click', function () {
      showRefSubPage(tab.getAttribute('data-ref'));
    });
  });

  function buildMCQuizFeedback(questions, namePrefix) {
    var html = '';
    var correct = 0;
    questions.forEach(function (q, i) {
      var sel = document.querySelector('input[name="' + namePrefix + i + '"]:checked');
      var userIdx = sel ? parseInt(sel.value, 10) : -1;
      var isCorrect = userIdx === q.correct;
      if (isCorrect) correct++;
      var userAnswer = userIdx >= 0 && q.options && q.options[userIdx] ? q.options[userIdx] : '(not answered)';
      var correctAnswer = q.options && q.options[q.correct] ? q.options[q.correct] : '';
      var expl = q.explanation || '';
      html += '<div class="quiz-feedback-item ' + (isCorrect ? 'correct' : 'wrong') + '">';
      html += '<p class="quiz-feedback-q"><strong>' + (i + 1) + '.</strong> ' + q.question + '</p>';
      html += '<p class="quiz-feedback-ans">Your answer: ' + userAnswer + ' ' + (isCorrect ? '✓ Correct.' : '✗ Wrong. Correct: ' + correctAnswer + '.') + '</p>';
      if (expl) html += '<p class="quiz-feedback-expl">' + expl + '</p>';
      html += '</div>';
    });
    return { html: html, correct: correct };
  }

  function normalizeForShortQuiz(val) {
    return (val || '').trim().toLowerCase().replace(/\s+/g, ' ').replace(/[.,;:!?\u2026\s]+$/, '').trim();
  }

  function buildShortQuizFeedback(questions, container) {
    var html = '';
    var correct = 0;
    questions.forEach(function (q, i) {
      var input = container && container.querySelector('input[data-i="' + i + '"]');
      var rawVal = (input && input.value || '').trim();
      var val = normalizeForShortQuiz(rawVal);
      var accepted = (q.accepted || []).map(function (a) { return normalizeForShortQuiz(a); });
      var isCorrect = accepted.indexOf(val) !== -1;
      if (isCorrect) correct++;
      var correctDisplay = (q.accepted && q.accepted[0]) ? q.accepted[0] : '';
      var expl = q.explanation || '';
      html += '<div class="quiz-feedback-item ' + (isCorrect ? 'correct' : 'wrong') + '">';
      html += '<p class="quiz-feedback-q"><strong>' + (i + 1) + '.</strong> ' + q.question + '</p>';
      html += '<p class="quiz-feedback-ans">Your answer: ' + (rawVal || '(blank)') + ' ' + (isCorrect ? '✓ Correct.' : '✗ Wrong. Correct: ' + correctDisplay + '.') + '</p>';
      if (expl) html += '<p class="quiz-feedback-expl">' + expl + '</p>';
      html += '</div>';
    });
    return { html: html, correct: correct };
  }

  // ========== General category (Intro, MC quiz, short questions, optional) ==========
  var generalData = null;
  var generalIntroPage = 0;
  var generalOptionalShown = [];

  function initGeneralCategory() {
    if (generalData) {
      renderGeneralIntro();
      return;
    }
    fetch('general-content.json').then(function (r) { return r.json(); }).then(function (data) {
      generalData = data;
      renderGeneralIntro();
    }).catch(function () { alert('Could not load General content.'); });
  }

  function renderGeneralIntro() {
    if (!generalData || !generalData.introPages) return;
    var pages = generalData.introPages;
    generalIntroPage = 0;
    generalOptionalShown = [];
    var content = document.getElementById('general-intro-content');
    var indicator = document.getElementById('general-intro-page-indicator');
    var prevBtn = document.getElementById('general-intro-prev');
    var nextBtn = document.getElementById('general-intro-next');
    var startBtn = document.getElementById('general-intro-start-quiz');
    var introDiv = document.getElementById('general-intro');
    var mcQuiz = document.getElementById('general-mc-quiz');
    var shortQuiz = document.getElementById('general-short-quiz');
    var optionalSection = document.getElementById('general-optional-section');
    if (!content) return;

    function showPage(i) {
      generalIntroPage = i;
      content.innerHTML = '<h4>' + pages[i].title + '</h4><div class="intro-body">' + pages[i].body + '</div>';
      indicator.textContent = (i + 1) + ' / ' + pages.length;
      prevBtn.disabled = i === 0;
      nextBtn.classList.toggle('hidden', i === pages.length - 1);
      startBtn.classList.toggle('hidden', i !== pages.length - 1);
    }
    showPage(0);

    prevBtn.onclick = function () { if (generalIntroPage > 0) showPage(generalIntroPage - 1); };
    nextBtn.onclick = function () { if (generalIntroPage < pages.length - 1) showPage(generalIntroPage + 1); };

    startBtn.onclick = function () {
      introDiv.classList.add('hidden');
      mcQuiz.classList.remove('hidden');
      renderGeneralMCQuiz();
    };

    introDiv.classList.remove('hidden');
    mcQuiz.classList.add('hidden');
    shortQuiz.classList.add('hidden');
    optionalSection.classList.add('hidden');
  }

  function renderGeneralMCQuiz() {
    if (!generalData || !generalData.mcQuiz) return;
    var container = document.getElementById('general-mc-questions');
    var resultEl = document.getElementById('general-mc-result');
    var continueBtn = document.getElementById('general-mc-continue');
    if (!container) return;
    container.innerHTML = '';
    generalData.mcQuiz.forEach(function (q, i) {
      var div = document.createElement('div');
      div.className = 'cat-quiz-mc-q';
      div.innerHTML = '<p class="cat-quiz-question">' + (i + 1) + '. ' + q.question + '</p>';
      (q.options || []).forEach(function (opt, j) {
        var label = document.createElement('label');
        label.innerHTML = '<input type="radio" name="general-mc-' + i + '" value="' + j + '"> ' + opt;
        div.appendChild(label);
      });
      container.appendChild(div);
    });
    resultEl.classList.add('hidden');
    continueBtn.classList.add('hidden');

    document.getElementById('general-mc-submit').onclick = function () {
      var res = buildMCQuizFeedback(generalData.mcQuiz, 'general-mc-');
      var total = generalData.mcQuiz.length;
      var pct = total ? Math.round((res.correct / total) * 100) : 0;
      resultEl.innerHTML = '<p class="quiz-feedback-score">Score: <strong>' + res.correct + '/' + total + '</strong> (' + pct + '%)</p><div class="quiz-feedback-detail">' + res.html + '</div>';
      resultEl.classList.remove('hidden');
      continueBtn.classList.remove('hidden');
    };

    document.getElementById('general-mc-continue').onclick = function () {
      document.getElementById('general-mc-quiz').classList.add('hidden');
      document.getElementById('general-short-quiz').classList.remove('hidden');
      renderGeneralShortQuiz();
    };
  }

  function renderGeneralShortQuiz() {
    if (!generalData || !generalData.shortQuestions) return;
    var container = document.getElementById('general-short-questions');
    var resultEl = document.getElementById('general-short-result');
    var continueBtn = document.getElementById('general-short-continue');
    if (!container) return;
    container.innerHTML = '';
    generalData.shortQuestions.forEach(function (q, i) {
      var div = document.createElement('div');
      div.className = 'cat-quiz-short-q';
      div.innerHTML = '<p class="cat-quiz-question">' + (i + 1) + '. ' + q.question + '</p><input type="text" class="cat-quiz-input" data-i="' + i + '" placeholder="Your answer">';
      container.appendChild(div);
    });
    resultEl.classList.add('hidden');
    continueBtn.classList.add('hidden');

    document.getElementById('general-short-submit').onclick = function () {
      var res = buildShortQuizFeedback(generalData.shortQuestions, container);
      var total = generalData.shortQuestions.length;
      var pct = total ? Math.round((res.correct / total) * 100) : 0;
      resultEl.innerHTML = '<p class="quiz-feedback-score">Score: <strong>' + res.correct + '/' + total + '</strong> (' + pct + '%)</p><div class="quiz-feedback-detail">' + res.html + '</div>';
      resultEl.classList.remove('hidden');
      continueBtn.classList.remove('hidden');
    };

    document.getElementById('general-short-continue').onclick = function () {
      document.getElementById('general-short-quiz').classList.add('hidden');
      document.getElementById('general-optional-section').classList.remove('hidden');
      renderGeneralOptional();
    };
  }

  function renderGeneralOptional() {
    if (!generalData || !generalData.optionalQuestionsBank) return;
    var container = document.getElementById('general-optional-questions');
    if (!container) return;
    var batchSize = generalData.optionalBatchSize || 3;
    var bank = generalData.optionalQuestionsBank;

    var available = bank.map(function (_, i) { return i; }).filter(function (i) { return generalOptionalShown.indexOf(i) === -1; });
    if (available.length === 0) {
      generalOptionalShown = [];
      available = bank.map(function (_, i) { return i; });
    }
    var shuffled = available.sort(function () { return Math.random() - 0.5; });
    var batch = shuffled.slice(0, batchSize);
    batch.forEach(function (i) {
      if (generalOptionalShown.indexOf(i) === -1) generalOptionalShown.push(i);
    });

    batch.forEach(function (i) {
      var q = bank[i];
      var div = document.createElement('div');
      div.className = 'cat-quiz-optional-q';
      div.innerHTML = '<p class="cat-quiz-question">' + q.question + '</p><button type="button" class="btn btn-secondary btn-small cat-quiz-show-answer">Show suggested answer</button><div class="cat-quiz-suggested hidden">' + (q.suggested || '') + '</div>';
      var suggested = div.querySelector('.cat-quiz-suggested');
      div.querySelector('.cat-quiz-show-answer').onclick = function () {
        suggested.classList.remove('hidden');
        this.classList.add('hidden');
      };
      container.appendChild(div);
    });
  }

  document.getElementById('general-optional-more').addEventListener('click', function () {
    renderGeneralOptional();
  });

  // ========== Parts of Speech category (Intro, MC quiz, short questions, optional) ==========
  var posData = null;
  var posIntroPage = 0;
  var posOptionalShown = [];

  function initPartsOfSpeechCategory() {
    if (posData) {
      renderPosIntro();
      return;
    }
    fetch('parts-of-speech-content.json').then(function (r) { return r.json(); }).then(function (data) {
      posData = data;
      renderPosIntro();
    }).catch(function () { alert('Could not load Parts of Speech content.'); });
  }

  function renderPosIntro() {
    if (!posData || !posData.introPages) return;
    var pages = posData.introPages;
    posIntroPage = 0;
    posOptionalShown = [];
    var content = document.getElementById('pos-intro-content');
    var indicator = document.getElementById('pos-intro-page-indicator');
    var prevBtn = document.getElementById('pos-intro-prev');
    var nextBtn = document.getElementById('pos-intro-next');
    var startBtn = document.getElementById('pos-intro-start-quiz');
    if (!content) return;

    function showPage(i) {
      posIntroPage = i;
      content.innerHTML = '<h4>' + pages[i].title + '</h4><div class="intro-body">' + pages[i].body + '</div>';
      indicator.textContent = (i + 1) + ' / ' + pages.length;
      prevBtn.disabled = i === 0;
      nextBtn.classList.toggle('hidden', i === pages.length - 1);
      startBtn.classList.toggle('hidden', i !== pages.length - 1);
    }
    showPage(0);

    prevBtn.onclick = function () { if (posIntroPage > 0) showPage(posIntroPage - 1); };
    nextBtn.onclick = function () { if (posIntroPage < pages.length - 1) showPage(posIntroPage + 1); };

    startBtn.onclick = function () {
      document.getElementById('pos-intro').classList.add('hidden');
      document.getElementById('pos-mc-quiz').classList.remove('hidden');
      renderPosMCQuiz();
    };

    document.getElementById('pos-intro').classList.remove('hidden');
    document.getElementById('pos-mc-quiz').classList.add('hidden');
    document.getElementById('pos-short-quiz').classList.add('hidden');
    document.getElementById('pos-optional-section').classList.add('hidden');
  }

  function renderPosMCQuiz() {
    if (!posData || !posData.mcQuiz) return;
    var container = document.getElementById('pos-mc-questions');
    var resultEl = document.getElementById('pos-mc-result');
    var continueBtn = document.getElementById('pos-mc-continue');
    if (!container) return;
    container.innerHTML = '';
    posData.mcQuiz.forEach(function (q, i) {
      var div = document.createElement('div');
      div.className = 'cat-quiz-mc-q';
      div.innerHTML = '<p class="cat-quiz-question">' + (i + 1) + '. ' + q.question + '</p>';
      (q.options || []).forEach(function (opt, j) {
        var label = document.createElement('label');
        label.innerHTML = '<input type="radio" name="pos-mc-' + i + '" value="' + j + '"> ' + opt;
        div.appendChild(label);
      });
      container.appendChild(div);
    });
    resultEl.classList.add('hidden');
    continueBtn.classList.add('hidden');

    document.getElementById('pos-mc-submit').onclick = function () {
      var res = buildMCQuizFeedback(posData.mcQuiz, 'pos-mc-');
      var total = posData.mcQuiz.length;
      var pct = total ? Math.round((res.correct / total) * 100) : 0;
      resultEl.innerHTML = '<p class="quiz-feedback-score">Score: <strong>' + res.correct + '/' + total + '</strong> (' + pct + '%)</p><div class="quiz-feedback-detail">' + res.html + '</div>';
      resultEl.classList.remove('hidden');
      continueBtn.classList.remove('hidden');
    };

    document.getElementById('pos-mc-continue').onclick = function () {
      document.getElementById('pos-mc-quiz').classList.add('hidden');
      document.getElementById('pos-short-quiz').classList.remove('hidden');
      renderPosShortQuiz();
    };
  }

  function renderPosShortQuiz() {
    if (!posData || !posData.shortQuestions) return;
    var container = document.getElementById('pos-short-questions');
    var resultEl = document.getElementById('pos-short-result');
    var continueBtn = document.getElementById('pos-short-continue');
    if (!container) return;
    container.innerHTML = '';
    posData.shortQuestions.forEach(function (q, i) {
      var div = document.createElement('div');
      div.className = 'cat-quiz-short-q';
      div.innerHTML = '<p class="cat-quiz-question">' + (i + 1) + '. ' + q.question + '</p><input type="text" class="cat-quiz-input" data-i="' + i + '" placeholder="Your answer">';
      container.appendChild(div);
    });
    resultEl.classList.add('hidden');
    continueBtn.classList.add('hidden');

    document.getElementById('pos-short-submit').onclick = function () {
      var res = buildShortQuizFeedback(posData.shortQuestions, container);
      var total = posData.shortQuestions.length;
      var pct = total ? Math.round((res.correct / total) * 100) : 0;
      resultEl.innerHTML = '<p class="quiz-feedback-score">Score: <strong>' + res.correct + '/' + total + '</strong> (' + pct + '%)</p><div class="quiz-feedback-detail">' + res.html + '</div>';
      resultEl.classList.remove('hidden');
      continueBtn.classList.remove('hidden');
    };

    document.getElementById('pos-short-continue').onclick = function () {
      document.getElementById('pos-short-quiz').classList.add('hidden');
      document.getElementById('pos-optional-section').classList.remove('hidden');
      renderPosOptional();
    };
  }

  function renderPosOptional() {
    if (!posData || !posData.optionalQuestionsBank) return;
    var container = document.getElementById('pos-optional-questions');
    if (!container) return;
    var batchSize = posData.optionalBatchSize || 3;
    var bank = posData.optionalQuestionsBank;
    var available = bank.map(function (_, i) { return i; }).filter(function (i) { return posOptionalShown.indexOf(i) === -1; });
    if (available.length === 0) {
      posOptionalShown = [];
      available = bank.map(function (_, i) { return i; });
    }
    var shuffled = available.sort(function () { return Math.random() - 0.5; });
    var batch = shuffled.slice(0, batchSize);
    batch.forEach(function (i) {
      if (posOptionalShown.indexOf(i) === -1) posOptionalShown.push(i);
    });
    batch.forEach(function (i) {
      var q = bank[i];
      var div = document.createElement('div');
      div.className = 'cat-quiz-optional-q';
      div.innerHTML = '<p class="cat-quiz-question">' + q.question + '</p><button type="button" class="btn btn-secondary btn-small cat-quiz-show-answer">Show suggested answer</button><div class="cat-quiz-suggested hidden">' + (q.suggested || '') + '</div>';
      var suggested = div.querySelector('.cat-quiz-suggested');
      div.querySelector('.cat-quiz-show-answer').onclick = function () {
        suggested.classList.remove('hidden');
        this.classList.add('hidden');
      };
      container.appendChild(div);
    });
  }

  document.getElementById('pos-optional-more').addEventListener('click', function () {
    renderPosOptional();
  });

  // ========== Determiners category (Intro, MC quiz, short questions, optional) ==========
  var detData = null;
  var detIntroPage = 0;
  var detOptionalShown = [];

  function initDeterminersCategory() {
    if (detData) {
      renderDetIntro();
      return;
    }
    fetch('determiners-content.json').then(function (r) { return r.json(); }).then(function (data) {
      detData = data;
      renderDetIntro();
    }).catch(function () { alert('Could not load Determiners content.'); });
  }

  function renderDetIntro() {
    if (!detData || !detData.introPages) return;
    var pages = detData.introPages;
    detIntroPage = 0;
    detOptionalShown = [];
    var content = document.getElementById('det-intro-content');
    var indicator = document.getElementById('det-intro-page-indicator');
    var prevBtn = document.getElementById('det-intro-prev');
    var nextBtn = document.getElementById('det-intro-next');
    var startBtn = document.getElementById('det-intro-start-quiz');
    if (!content) return;

    function showPage(i) {
      detIntroPage = i;
      content.innerHTML = '<h4>' + pages[i].title + '</h4><div class="intro-body">' + pages[i].body + '</div>';
      indicator.textContent = (i + 1) + ' / ' + pages.length;
      prevBtn.disabled = i === 0;
      nextBtn.classList.toggle('hidden', i === pages.length - 1);
      startBtn.classList.toggle('hidden', i !== pages.length - 1);
    }
    showPage(0);

    prevBtn.onclick = function () { if (detIntroPage > 0) showPage(detIntroPage - 1); };
    nextBtn.onclick = function () { if (detIntroPage < pages.length - 1) showPage(detIntroPage + 1); };

    startBtn.onclick = function () {
      document.getElementById('det-intro').classList.add('hidden');
      document.getElementById('det-mc-quiz').classList.remove('hidden');
      renderDetMCQuiz();
    };

    document.getElementById('det-intro').classList.remove('hidden');
    document.getElementById('det-mc-quiz').classList.add('hidden');
    document.getElementById('det-short-quiz').classList.add('hidden');
    document.getElementById('det-optional-section').classList.add('hidden');
  }

  function renderDetMCQuiz() {
    if (!detData || !detData.mcQuiz) return;
    var container = document.getElementById('det-mc-questions');
    var resultEl = document.getElementById('det-mc-result');
    var continueBtn = document.getElementById('det-mc-continue');
    if (!container) return;
    container.innerHTML = '';
    detData.mcQuiz.forEach(function (q, i) {
      var div = document.createElement('div');
      div.className = 'cat-quiz-mc-q';
      div.innerHTML = '<p class="cat-quiz-question">' + (i + 1) + '. ' + q.question + '</p>';
      (q.options || []).forEach(function (opt, j) {
        var label = document.createElement('label');
        label.innerHTML = '<input type="radio" name="det-mc-' + i + '" value="' + j + '"> ' + opt;
        div.appendChild(label);
      });
      container.appendChild(div);
    });
    resultEl.classList.add('hidden');
    continueBtn.classList.add('hidden');

    document.getElementById('det-mc-submit').onclick = function () {
      var res = buildMCQuizFeedback(detData.mcQuiz, 'det-mc-');
      var total = detData.mcQuiz.length;
      var pct = total ? Math.round((res.correct / total) * 100) : 0;
      resultEl.innerHTML = '<p class="quiz-feedback-score">Score: <strong>' + res.correct + '/' + total + '</strong> (' + pct + '%)</p><div class="quiz-feedback-detail">' + res.html + '</div>';
      resultEl.classList.remove('hidden');
      continueBtn.classList.remove('hidden');
    };

    document.getElementById('det-mc-continue').onclick = function () {
      document.getElementById('det-mc-quiz').classList.add('hidden');
      document.getElementById('det-short-quiz').classList.remove('hidden');
      renderDetShortQuiz();
    };
  }

  function renderDetShortQuiz() {
    if (!detData || !detData.shortQuestions) return;
    var container = document.getElementById('det-short-questions');
    var resultEl = document.getElementById('det-short-result');
    var continueBtn = document.getElementById('det-short-continue');
    if (!container) return;
    container.innerHTML = '';
    detData.shortQuestions.forEach(function (q, i) {
      var div = document.createElement('div');
      div.className = 'cat-quiz-short-q';
      div.innerHTML = '<p class="cat-quiz-question">' + (i + 1) + '. ' + q.question + '</p><input type="text" class="cat-quiz-input" data-i="' + i + '" placeholder="Your answer">';
      container.appendChild(div);
    });
    resultEl.classList.add('hidden');
    continueBtn.classList.add('hidden');

    document.getElementById('det-short-submit').onclick = function () {
      var res = buildShortQuizFeedback(detData.shortQuestions, container);
      var total = detData.shortQuestions.length;
      var pct = total ? Math.round((res.correct / total) * 100) : 0;
      resultEl.innerHTML = '<p class="quiz-feedback-score">Score: <strong>' + res.correct + '/' + total + '</strong> (' + pct + '%)</p><div class="quiz-feedback-detail">' + res.html + '</div>';
      resultEl.classList.remove('hidden');
      continueBtn.classList.remove('hidden');
    };

    document.getElementById('det-short-continue').onclick = function () {
      document.getElementById('det-short-quiz').classList.add('hidden');
      document.getElementById('det-optional-section').classList.remove('hidden');
      renderDetOptional();
    };
  }

  function renderDetOptional() {
    if (!detData || !detData.optionalQuestionsBank) return;
    var container = document.getElementById('det-optional-questions');
    if (!container) return;
    var batchSize = detData.optionalBatchSize || 3;
    var bank = detData.optionalQuestionsBank;
    var available = bank.map(function (_, i) { return i; }).filter(function (i) { return detOptionalShown.indexOf(i) === -1; });
    if (available.length === 0) {
      detOptionalShown = [];
      available = bank.map(function (_, i) { return i; });
    }
    var shuffled = available.sort(function () { return Math.random() - 0.5; });
    var batch = shuffled.slice(0, batchSize);
    batch.forEach(function (i) {
      if (detOptionalShown.indexOf(i) === -1) detOptionalShown.push(i);
    });
    batch.forEach(function (i) {
      var q = bank[i];
      var div = document.createElement('div');
      div.className = 'cat-quiz-optional-q';
      div.innerHTML = '<p class="cat-quiz-question">' + q.question + '</p><button type="button" class="btn btn-secondary btn-small cat-quiz-show-answer">Show suggested answer</button><div class="cat-quiz-suggested hidden">' + (q.suggested || '') + '</div>';
      var suggested = div.querySelector('.cat-quiz-suggested');
      div.querySelector('.cat-quiz-show-answer').onclick = function () {
        suggested.classList.remove('hidden');
        this.classList.add('hidden');
      };
      container.appendChild(div);
    });
  }

  var detOptionalMore = document.getElementById('det-optional-more');
  if (detOptionalMore) detOptionalMore.addEventListener('click', function () { renderDetOptional(); });

  // ========== Prepositions category (Intro, MC quiz, short questions, optional) ==========
  var prepData = null;
  var prepIntroPage = 0;
  var prepOptionalShown = [];

  function initPrepositionsCategory() {
    if (prepData) {
      renderPrepIntro();
      return;
    }
    fetch('prepositions-content.json').then(function (r) { return r.json(); }).then(function (data) {
      prepData = data;
      renderPrepIntro();
    }).catch(function () { alert('Could not load Prepositions content.'); });
  }

  function renderPrepIntro() {
    if (!prepData || !prepData.introPages) return;
    var pages = prepData.introPages;
    prepIntroPage = 0;
    prepOptionalShown = [];
    var content = document.getElementById('prep-intro-content');
    var indicator = document.getElementById('prep-intro-page-indicator');
    var prevBtn = document.getElementById('prep-intro-prev');
    var nextBtn = document.getElementById('prep-intro-next');
    var startBtn = document.getElementById('prep-intro-start-quiz');
    if (!content) return;

    function showPage(i) {
      prepIntroPage = i;
      content.innerHTML = '<h4>' + pages[i].title + '</h4><div class="intro-body">' + pages[i].body + '</div>';
      indicator.textContent = (i + 1) + ' / ' + pages.length;
      prevBtn.disabled = i === 0;
      nextBtn.classList.toggle('hidden', i === pages.length - 1);
      startBtn.classList.toggle('hidden', i !== pages.length - 1);
    }
    showPage(0);

    prevBtn.onclick = function () { if (prepIntroPage > 0) showPage(prepIntroPage - 1); };
    nextBtn.onclick = function () { if (prepIntroPage < pages.length - 1) showPage(prepIntroPage + 1); };

    startBtn.onclick = function () {
      document.getElementById('prep-intro').classList.add('hidden');
      document.getElementById('prep-mc-quiz').classList.remove('hidden');
      renderPrepMCQuiz();
    };

    document.getElementById('prep-intro').classList.remove('hidden');
    document.getElementById('prep-mc-quiz').classList.add('hidden');
    document.getElementById('prep-short-quiz').classList.add('hidden');
    document.getElementById('prep-optional-section').classList.add('hidden');
  }

  function renderPrepMCQuiz() {
    if (!prepData || !prepData.mcQuiz) return;
    var container = document.getElementById('prep-mc-questions');
    var resultEl = document.getElementById('prep-mc-result');
    var continueBtn = document.getElementById('prep-mc-continue');
    if (!container) return;
    container.innerHTML = '';
    prepData.mcQuiz.forEach(function (q, i) {
      var div = document.createElement('div');
      div.className = 'cat-quiz-mc-q';
      div.innerHTML = '<p class="cat-quiz-question">' + (i + 1) + '. ' + q.question + '</p>';
      (q.options || []).forEach(function (opt, j) {
        var label = document.createElement('label');
        label.innerHTML = '<input type="radio" name="prep-mc-' + i + '" value="' + j + '"> ' + opt;
        div.appendChild(label);
      });
      container.appendChild(div);
    });
    resultEl.classList.add('hidden');
    continueBtn.classList.add('hidden');

    document.getElementById('prep-mc-submit').onclick = function () {
      var res = buildMCQuizFeedback(prepData.mcQuiz, 'prep-mc-');
      var total = prepData.mcQuiz.length;
      var pct = total ? Math.round((res.correct / total) * 100) : 0;
      resultEl.innerHTML = '<p class="quiz-feedback-score">Score: <strong>' + res.correct + '/' + total + '</strong> (' + pct + '%)</p><div class="quiz-feedback-detail">' + res.html + '</div>';
      resultEl.classList.remove('hidden');
      continueBtn.classList.remove('hidden');
    };

    document.getElementById('prep-mc-continue').onclick = function () {
      document.getElementById('prep-mc-quiz').classList.add('hidden');
      document.getElementById('prep-short-quiz').classList.remove('hidden');
      renderPrepShortQuiz();
    };
  }

  function renderPrepShortQuiz() {
    if (!prepData || !prepData.shortQuestions) return;
    var container = document.getElementById('prep-short-questions');
    var resultEl = document.getElementById('prep-short-result');
    var continueBtn = document.getElementById('prep-short-continue');
    if (!container) return;
    container.innerHTML = '';
    prepData.shortQuestions.forEach(function (q, i) {
      var div = document.createElement('div');
      div.className = 'cat-quiz-short-q';
      div.innerHTML = '<p class="cat-quiz-question">' + (i + 1) + '. ' + q.question + '</p><input type="text" class="cat-quiz-input" data-i="' + i + '" placeholder="Your answer">';
      container.appendChild(div);
    });
    resultEl.classList.add('hidden');
    continueBtn.classList.add('hidden');

    document.getElementById('prep-short-submit').onclick = function () {
      var res = buildShortQuizFeedback(prepData.shortQuestions, container);
      var total = prepData.shortQuestions.length;
      var pct = total ? Math.round((res.correct / total) * 100) : 0;
      resultEl.innerHTML = '<p class="quiz-feedback-score">Score: <strong>' + res.correct + '/' + total + '</strong> (' + pct + '%)</p><div class="quiz-feedback-detail">' + res.html + '</div>';
      resultEl.classList.remove('hidden');
      continueBtn.classList.remove('hidden');
    };

    document.getElementById('prep-short-continue').onclick = function () {
      document.getElementById('prep-short-quiz').classList.add('hidden');
      document.getElementById('prep-optional-section').classList.remove('hidden');
      renderPrepOptional();
    };
  }

  function renderPrepOptional() {
    if (!prepData || !prepData.optionalQuestionsBank) return;
    var container = document.getElementById('prep-optional-questions');
    if (!container) return;
    var batchSize = prepData.optionalBatchSize || 3;
    var bank = prepData.optionalQuestionsBank;
    var available = bank.map(function (_, i) { return i; }).filter(function (i) { return prepOptionalShown.indexOf(i) === -1; });
    if (available.length === 0) {
      prepOptionalShown = [];
      available = bank.map(function (_, i) { return i; });
    }
    var shuffled = available.sort(function () { return Math.random() - 0.5; });
    var batch = shuffled.slice(0, batchSize);
    batch.forEach(function (i) {
      if (prepOptionalShown.indexOf(i) === -1) prepOptionalShown.push(i);
    });
    batch.forEach(function (i) {
      var q = bank[i];
      var div = document.createElement('div');
      div.className = 'cat-quiz-optional-q';
      div.innerHTML = '<p class="cat-quiz-question">' + q.question + '</p><button type="button" class="btn btn-secondary btn-small cat-quiz-show-answer">Show suggested answer</button><div class="cat-quiz-suggested hidden">' + (q.suggested || '') + '</div>';
      var suggested = div.querySelector('.cat-quiz-suggested');
      div.querySelector('.cat-quiz-show-answer').onclick = function () {
        suggested.classList.remove('hidden');
        this.classList.add('hidden');
      };
      container.appendChild(div);
    });
  }

  var prepOptionalMore = document.getElementById('prep-optional-more');
  if (prepOptionalMore) prepOptionalMore.addEventListener('click', function () { renderPrepOptional(); });

  // ========== Auxiliary verbs category (Intro, MC quiz, short questions, optional) ==========
  var auxData = null;
  var auxIntroPage = 0;
  var auxOptionalShown = [];

  function initAuxiliaryCategory() {
    if (auxData) {
      renderAuxIntro();
      return;
    }
    fetch('auxiliary-content.json').then(function (r) { return r.json(); }).then(function (data) {
      auxData = data;
      renderAuxIntro();
    }).catch(function () { alert('Could not load Auxiliary verbs content.'); });
  }

  function renderAuxIntro() {
    if (!auxData || !auxData.introPages) return;
    var pages = auxData.introPages;
    auxIntroPage = 0;
    auxOptionalShown = [];
    var content = document.getElementById('aux-intro-content');
    var indicator = document.getElementById('aux-intro-page-indicator');
    var prevBtn = document.getElementById('aux-intro-prev');
    var nextBtn = document.getElementById('aux-intro-next');
    var startBtn = document.getElementById('aux-intro-start-quiz');
    if (!content) return;

    function showPage(i) {
      auxIntroPage = i;
      content.innerHTML = '<h4>' + pages[i].title + '</h4><div class="intro-body">' + pages[i].body + '</div>';
      indicator.textContent = (i + 1) + ' / ' + pages.length;
      prevBtn.disabled = i === 0;
      nextBtn.classList.toggle('hidden', i === pages.length - 1);
      startBtn.classList.toggle('hidden', i !== pages.length - 1);
    }
    showPage(0);

    prevBtn.onclick = function () { if (auxIntroPage > 0) showPage(auxIntroPage - 1); };
    nextBtn.onclick = function () { if (auxIntroPage < pages.length - 1) showPage(auxIntroPage + 1); };

    startBtn.onclick = function () {
      document.getElementById('aux-intro').classList.add('hidden');
      document.getElementById('aux-mc-quiz').classList.remove('hidden');
      renderAuxMCQuiz();
    };

    document.getElementById('aux-intro').classList.remove('hidden');
    document.getElementById('aux-mc-quiz').classList.add('hidden');
    document.getElementById('aux-short-quiz').classList.add('hidden');
    document.getElementById('aux-optional-section').classList.add('hidden');
  }

  function renderAuxMCQuiz() {
    if (!auxData || !auxData.mcQuiz) return;
    var container = document.getElementById('aux-mc-questions');
    var resultEl = document.getElementById('aux-mc-result');
    var continueBtn = document.getElementById('aux-mc-continue');
    if (!container) return;
    container.innerHTML = '';
    auxData.mcQuiz.forEach(function (q, i) {
      var div = document.createElement('div');
      div.className = 'cat-quiz-mc-q';
      div.innerHTML = '<p class="cat-quiz-question">' + (i + 1) + '. ' + q.question + '</p>';
      (q.options || []).forEach(function (opt, j) {
        var label = document.createElement('label');
        label.innerHTML = '<input type="radio" name="aux-mc-' + i + '" value="' + j + '"> ' + opt;
        div.appendChild(label);
      });
      container.appendChild(div);
    });
    resultEl.classList.add('hidden');
    continueBtn.classList.add('hidden');

    document.getElementById('aux-mc-submit').onclick = function () {
      var res = buildMCQuizFeedback(auxData.mcQuiz, 'aux-mc-');
      var total = auxData.mcQuiz.length;
      var pct = total ? Math.round((res.correct / total) * 100) : 0;
      resultEl.innerHTML = '<p class="quiz-feedback-score">Score: <strong>' + res.correct + '/' + total + '</strong> (' + pct + '%)</p><div class="quiz-feedback-detail">' + res.html + '</div>';
      resultEl.classList.remove('hidden');
      continueBtn.classList.remove('hidden');
    };

    document.getElementById('aux-mc-continue').onclick = function () {
      document.getElementById('aux-mc-quiz').classList.add('hidden');
      document.getElementById('aux-short-quiz').classList.remove('hidden');
      renderAuxShortQuiz();
    };
  }

  function renderAuxShortQuiz() {
    if (!auxData || !auxData.shortQuestions) return;
    var container = document.getElementById('aux-short-questions');
    var resultEl = document.getElementById('aux-short-result');
    var continueBtn = document.getElementById('aux-short-continue');
    if (!container) return;
    container.innerHTML = '';
    auxData.shortQuestions.forEach(function (q, i) {
      var div = document.createElement('div');
      div.className = 'cat-quiz-short-q';
      div.innerHTML = '<p class="cat-quiz-question">' + (i + 1) + '. ' + q.question + '</p><input type="text" class="cat-quiz-input" data-i="' + i + '" placeholder="Your answer">';
      container.appendChild(div);
    });
    resultEl.classList.add('hidden');
    continueBtn.classList.add('hidden');

    document.getElementById('aux-short-submit').onclick = function () {
      var res = buildShortQuizFeedback(auxData.shortQuestions, container);
      var total = auxData.shortQuestions.length;
      var pct = total ? Math.round((res.correct / total) * 100) : 0;
      resultEl.innerHTML = '<p class="quiz-feedback-score">Score: <strong>' + res.correct + '/' + total + '</strong> (' + pct + '%)</p><div class="quiz-feedback-detail">' + res.html + '</div>';
      resultEl.classList.remove('hidden');
      continueBtn.classList.remove('hidden');
    };

    document.getElementById('aux-short-continue').onclick = function () {
      document.getElementById('aux-short-quiz').classList.add('hidden');
      document.getElementById('aux-optional-section').classList.remove('hidden');
      renderAuxOptional();
    };
  }

  function renderAuxOptional() {
    if (!auxData || !auxData.optionalQuestionsBank) return;
    var container = document.getElementById('aux-optional-questions');
    if (!container) return;
    var batchSize = auxData.optionalBatchSize || 3;
    var bank = auxData.optionalQuestionsBank;
    var available = bank.map(function (_, i) { return i; }).filter(function (i) { return auxOptionalShown.indexOf(i) === -1; });
    if (available.length === 0) {
      auxOptionalShown = [];
      available = bank.map(function (_, i) { return i; });
    }
    var shuffled = available.sort(function () { return Math.random() - 0.5; });
    var batch = shuffled.slice(0, batchSize);
    batch.forEach(function (i) {
      if (auxOptionalShown.indexOf(i) === -1) auxOptionalShown.push(i);
    });
    batch.forEach(function (i) {
      var q = bank[i];
      var div = document.createElement('div');
      div.className = 'cat-quiz-optional-q';
      div.innerHTML = '<p class="cat-quiz-question">' + q.question + '</p><button type="button" class="btn btn-secondary btn-small cat-quiz-show-answer">Show suggested answer</button><div class="cat-quiz-suggested hidden">' + (q.suggested || '') + '</div>';
      var suggested = div.querySelector('.cat-quiz-suggested');
      div.querySelector('.cat-quiz-show-answer').onclick = function () {
        suggested.classList.remove('hidden');
        this.classList.add('hidden');
      };
      container.appendChild(div);
    });
  }

  var auxOptionalMore = document.getElementById('aux-optional-more');
  if (auxOptionalMore) auxOptionalMore.addEventListener('click', function () { renderAuxOptional(); });

  // ========== Conjunctions and linkers category (Intro, MC quiz, error correction, optional) ==========
  var conjData = null;
  var conjIntroPage = 0;
  var conjOptionalShown = [];

  function initConjunctionsCategory() {
    if (conjData) {
      renderConjIntro();
      return;
    }
    fetch('conjunctions-content.json').then(function (r) { return r.json(); }).then(function (data) {
      conjData = data;
      renderConjIntro();
    }).catch(function () { alert('Could not load Conjunctions content.'); });
  }

  function renderConjIntro() {
    if (!conjData || !conjData.introPages) return;
    var pages = conjData.introPages;
    conjIntroPage = 0;
    conjOptionalShown = [];
    var content = document.getElementById('conj-intro-content');
    var indicator = document.getElementById('conj-intro-page-indicator');
    var prevBtn = document.getElementById('conj-intro-prev');
    var nextBtn = document.getElementById('conj-intro-next');
    var startBtn = document.getElementById('conj-intro-start-quiz');
    if (!content) return;

    function showPage(i) {
      conjIntroPage = i;
      content.innerHTML = '<h4>' + pages[i].title + '</h4><div class="intro-body">' + pages[i].body + '</div>';
      indicator.textContent = (i + 1) + ' / ' + pages.length;
      prevBtn.disabled = i === 0;
      nextBtn.classList.toggle('hidden', i === pages.length - 1);
      startBtn.classList.toggle('hidden', i !== pages.length - 1);
    }
    showPage(0);

    prevBtn.onclick = function () { if (conjIntroPage > 0) showPage(conjIntroPage - 1); };
    nextBtn.onclick = function () { if (conjIntroPage < pages.length - 1) showPage(conjIntroPage + 1); };

    startBtn.onclick = function () {
      document.getElementById('conj-intro').classList.add('hidden');
      document.getElementById('conj-mc-quiz').classList.remove('hidden');
      renderConjMCQuiz();
    };

    document.getElementById('conj-intro').classList.remove('hidden');
    document.getElementById('conj-mc-quiz').classList.add('hidden');
    document.getElementById('conj-short-quiz').classList.add('hidden');
    document.getElementById('conj-optional-section').classList.add('hidden');
  }

  function renderConjMCQuiz() {
    if (!conjData || !conjData.mcQuiz) return;
    var container = document.getElementById('conj-mc-questions');
    var resultEl = document.getElementById('conj-mc-result');
    var continueBtn = document.getElementById('conj-mc-continue');
    if (!container) return;
    container.innerHTML = '';
    conjData.mcQuiz.forEach(function (q, i) {
      var div = document.createElement('div');
      div.className = 'cat-quiz-mc-q';
      div.innerHTML = '<p class="cat-quiz-question">' + (i + 1) + '. ' + q.question + '</p>';
      (q.options || []).forEach(function (opt, j) {
        var label = document.createElement('label');
        label.innerHTML = '<input type="radio" name="conj-mc-' + i + '" value="' + j + '"> ' + opt;
        div.appendChild(label);
      });
      container.appendChild(div);
    });
    resultEl.classList.add('hidden');
    continueBtn.classList.add('hidden');

    document.getElementById('conj-mc-submit').onclick = function () {
      var res = buildMCQuizFeedback(conjData.mcQuiz, 'conj-mc-');
      var total = conjData.mcQuiz.length;
      var pct = total ? Math.round((res.correct / total) * 100) : 0;
      resultEl.innerHTML = '<p class="quiz-feedback-score">Score: <strong>' + res.correct + '/' + total + '</strong> (' + pct + '%)</p><div class="quiz-feedback-detail">' + res.html + '</div>';
      resultEl.classList.remove('hidden');
      continueBtn.classList.remove('hidden');
    };

    document.getElementById('conj-mc-continue').onclick = function () {
      document.getElementById('conj-mc-quiz').classList.add('hidden');
      document.getElementById('conj-short-quiz').classList.remove('hidden');
      renderConjShortQuiz();
    };
  }

  function renderConjShortQuiz() {
    if (!conjData || !conjData.shortQuestions) return;
    var container = document.getElementById('conj-short-questions');
    var resultEl = document.getElementById('conj-short-result');
    var continueBtn = document.getElementById('conj-short-continue');
    if (!container) return;
    container.innerHTML = '';
    conjData.shortQuestions.forEach(function (q, i) {
      var div = document.createElement('div');
      div.className = 'cat-quiz-short-q';
      div.innerHTML = '<p class="cat-quiz-question">' + (i + 1) + '. ' + q.question + '</p><input type="text" class="cat-quiz-input" data-i="' + i + '" placeholder="Corrected version">';
      container.appendChild(div);
    });
    resultEl.classList.add('hidden');
    continueBtn.classList.add('hidden');

    document.getElementById('conj-short-submit').onclick = function () {
      var res = buildShortQuizFeedback(conjData.shortQuestions, container);
      var total = conjData.shortQuestions.length;
      var pct = total ? Math.round((res.correct / total) * 100) : 0;
      resultEl.innerHTML = '<p class="quiz-feedback-score">Score: <strong>' + res.correct + '/' + total + '</strong> (' + pct + '%)</p><div class="quiz-feedback-detail">' + res.html + '</div>';
      resultEl.classList.remove('hidden');
      continueBtn.classList.remove('hidden');
    };

    document.getElementById('conj-short-continue').onclick = function () {
      document.getElementById('conj-short-quiz').classList.add('hidden');
      document.getElementById('conj-optional-section').classList.remove('hidden');
      renderConjOptional();
    };
  }

  function renderConjOptional() {
    if (!conjData || !conjData.optionalQuestionsBank) return;
    var container = document.getElementById('conj-optional-questions');
    if (!container) return;
    var batchSize = conjData.optionalBatchSize || 3;
    var bank = conjData.optionalQuestionsBank;
    var available = bank.map(function (_, i) { return i; }).filter(function (i) { return conjOptionalShown.indexOf(i) === -1; });
    if (available.length === 0) {
      conjOptionalShown = [];
      available = bank.map(function (_, i) { return i; });
    }
    var shuffled = available.sort(function () { return Math.random() - 0.5; });
    var batch = shuffled.slice(0, batchSize);
    batch.forEach(function (i) {
      if (conjOptionalShown.indexOf(i) === -1) conjOptionalShown.push(i);
    });
    batch.forEach(function (i) {
      var q = bank[i];
      var div = document.createElement('div');
      div.className = 'cat-quiz-optional-q';
      div.innerHTML = '<p class="cat-quiz-question">' + q.question + '</p><button type="button" class="btn btn-secondary btn-small cat-quiz-show-answer">Show suggested answer</button><div class="cat-quiz-suggested hidden">' + (q.suggested || '') + '</div>';
      var suggested = div.querySelector('.cat-quiz-suggested');
      div.querySelector('.cat-quiz-show-answer').onclick = function () {
        suggested.classList.remove('hidden');
        this.classList.add('hidden');
      };
      container.appendChild(div);
    });
  }

  var conjOptionalMore = document.getElementById('conj-optional-more');
  if (conjOptionalMore) conjOptionalMore.addEventListener('click', function () { renderConjOptional(); });

  // ========== Pronouns category (Intro, MC quiz, error correction, optional) ==========
  var pronData = null;
  var pronIntroPage = 0;
  var pronOptionalShown = [];

  function initPronounsCategory() {
    if (pronData) {
      renderPronIntro();
      return;
    }
    fetch('pronouns-content.json').then(function (r) { return r.json(); }).then(function (data) {
      pronData = data;
      renderPronIntro();
    }).catch(function () { alert('Could not load Pronouns content.'); });
  }

  function renderPronIntro() {
    if (!pronData || !pronData.introPages) return;
    var pages = pronData.introPages;
    pronIntroPage = 0;
    pronOptionalShown = [];
    var content = document.getElementById('pron-intro-content');
    var indicator = document.getElementById('pron-intro-page-indicator');
    var prevBtn = document.getElementById('pron-intro-prev');
    var nextBtn = document.getElementById('pron-intro-next');
    var startBtn = document.getElementById('pron-intro-start-quiz');
    if (!content) return;

    function showPage(i) {
      pronIntroPage = i;
      content.innerHTML = '<h4>' + pages[i].title + '</h4><div class="intro-body">' + pages[i].body + '</div>';
      indicator.textContent = (i + 1) + ' / ' + pages.length;
      prevBtn.disabled = i === 0;
      nextBtn.classList.toggle('hidden', i === pages.length - 1);
      startBtn.classList.toggle('hidden', i !== pages.length - 1);
    }
    showPage(0);

    prevBtn.onclick = function () { if (pronIntroPage > 0) showPage(pronIntroPage - 1); };
    nextBtn.onclick = function () { if (pronIntroPage < pages.length - 1) showPage(pronIntroPage + 1); };

    startBtn.onclick = function () {
      document.getElementById('pron-intro').classList.add('hidden');
      document.getElementById('pron-mc-quiz').classList.remove('hidden');
      renderPronMCQuiz();
    };

    document.getElementById('pron-intro').classList.remove('hidden');
    document.getElementById('pron-mc-quiz').classList.add('hidden');
    document.getElementById('pron-short-quiz').classList.add('hidden');
    document.getElementById('pron-optional-section').classList.add('hidden');
  }

  function renderPronMCQuiz() {
    if (!pronData || !pronData.mcQuiz) return;
    var container = document.getElementById('pron-mc-questions');
    var resultEl = document.getElementById('pron-mc-result');
    var continueBtn = document.getElementById('pron-mc-continue');
    if (!container) return;
    container.innerHTML = '';
    pronData.mcQuiz.forEach(function (q, i) {
      var div = document.createElement('div');
      div.className = 'cat-quiz-mc-q';
      div.innerHTML = '<p class="cat-quiz-question">' + (i + 1) + '. ' + q.question + '</p>';
      (q.options || []).forEach(function (opt, j) {
        var label = document.createElement('label');
        label.innerHTML = '<input type="radio" name="pron-mc-' + i + '" value="' + j + '"> ' + opt;
        div.appendChild(label);
      });
      container.appendChild(div);
    });
    resultEl.classList.add('hidden');
    continueBtn.classList.add('hidden');

    document.getElementById('pron-mc-submit').onclick = function () {
      var res = buildMCQuizFeedback(pronData.mcQuiz, 'pron-mc-');
      var total = pronData.mcQuiz.length;
      var pct = total ? Math.round((res.correct / total) * 100) : 0;
      resultEl.innerHTML = '<p class="quiz-feedback-score">Score: <strong>' + res.correct + '/' + total + '</strong> (' + pct + '%)</p><div class="quiz-feedback-detail">' + res.html + '</div>';
      resultEl.classList.remove('hidden');
      continueBtn.classList.remove('hidden');
    };

    document.getElementById('pron-mc-continue').onclick = function () {
      document.getElementById('pron-mc-quiz').classList.add('hidden');
      document.getElementById('pron-short-quiz').classList.remove('hidden');
      renderPronShortQuiz();
    };
  }

  function renderPronShortQuiz() {
    if (!pronData || !pronData.shortQuestions) return;
    var container = document.getElementById('pron-short-questions');
    var resultEl = document.getElementById('pron-short-result');
    var continueBtn = document.getElementById('pron-short-continue');
    if (!container) return;
    container.innerHTML = '';
    pronData.shortQuestions.forEach(function (q, i) {
      var div = document.createElement('div');
      div.className = 'cat-quiz-short-q';
      div.innerHTML = '<p class="cat-quiz-question">' + (i + 1) + '. ' + q.question + '</p><input type="text" class="cat-quiz-input" data-i="' + i + '" placeholder="Corrected version">';
      container.appendChild(div);
    });
    resultEl.classList.add('hidden');
    continueBtn.classList.add('hidden');

    document.getElementById('pron-short-submit').onclick = function () {
      var res = buildShortQuizFeedback(pronData.shortQuestions, container);
      var total = pronData.shortQuestions.length;
      var pct = total ? Math.round((res.correct / total) * 100) : 0;
      resultEl.innerHTML = '<p class="quiz-feedback-score">Score: <strong>' + res.correct + '/' + total + '</strong> (' + pct + '%)</p><div class="quiz-feedback-detail">' + res.html + '</div>';
      resultEl.classList.remove('hidden');
      continueBtn.classList.remove('hidden');
    };

    document.getElementById('pron-short-continue').onclick = function () {
      document.getElementById('pron-short-quiz').classList.add('hidden');
      document.getElementById('pron-optional-section').classList.remove('hidden');
      renderPronOptional();
    };
  }

  function renderPronOptional() {
    if (!pronData || !pronData.optionalQuestionsBank) return;
    var container = document.getElementById('pron-optional-questions');
    if (!container) return;
    var batchSize = pronData.optionalBatchSize || 3;
    var bank = pronData.optionalQuestionsBank;
    var available = bank.map(function (_, i) { return i; }).filter(function (i) { return pronOptionalShown.indexOf(i) === -1; });
    if (available.length === 0) {
      pronOptionalShown = [];
      available = bank.map(function (_, i) { return i; });
    }
    var shuffled = available.sort(function () { return Math.random() - 0.5; });
    var batch = shuffled.slice(0, batchSize);
    batch.forEach(function (i) {
      if (pronOptionalShown.indexOf(i) === -1) pronOptionalShown.push(i);
    });
    batch.forEach(function (i) {
      var q = bank[i];
      var div = document.createElement('div');
      div.className = 'cat-quiz-optional-q';
      div.innerHTML = '<p class="cat-quiz-question">' + q.question + '</p><button type="button" class="btn btn-secondary btn-small cat-quiz-show-answer">Show suggested answer</button><div class="cat-quiz-suggested hidden">' + (q.suggested || '') + '</div>';
      var suggested = div.querySelector('.cat-quiz-suggested');
      div.querySelector('.cat-quiz-show-answer').onclick = function () {
        suggested.classList.remove('hidden');
        this.classList.add('hidden');
      };
      container.appendChild(div);
    });
  }

  var pronOptionalMore = document.getElementById('pron-optional-more');
  if (pronOptionalMore) pronOptionalMore.addEventListener('click', function () { renderPronOptional(); });

  // ========== Phrasal verbs category (Intro, MC quiz, short questions, optional) ==========
  var pvData = null;
  var pvIntroPage = 0;
  var pvOptionalShown = [];

  function initPhrasalVerbsCategory() {
    if (pvData) {
      renderPvIntro();
      return;
    }
    fetch('phrasal-verbs-content.json').then(function (r) { return r.json(); }).then(function (data) {
      pvData = data;
      renderPvIntro();
    }).catch(function () { alert('Could not load Phrasal verbs content.'); });
  }

  function renderPvIntro() {
    if (!pvData || !pvData.introPages) return;
    var pages = pvData.introPages;
    pvIntroPage = 0;
    pvOptionalShown = [];
    var content = document.getElementById('pv-intro-content');
    var indicator = document.getElementById('pv-intro-page-indicator');
    var prevBtn = document.getElementById('pv-intro-prev');
    var nextBtn = document.getElementById('pv-intro-next');
    var startBtn = document.getElementById('pv-intro-start-quiz');
    if (!content) return;

    function showPage(i) {
      pvIntroPage = i;
      content.innerHTML = '<h4>' + pages[i].title + '</h4><div class="intro-body">' + pages[i].body + '</div>';
      indicator.textContent = (i + 1) + ' / ' + pages.length;
      prevBtn.disabled = i === 0;
      nextBtn.classList.toggle('hidden', i === pages.length - 1);
      startBtn.classList.toggle('hidden', i !== pages.length - 1);
    }
    showPage(0);

    prevBtn.onclick = function () { if (pvIntroPage > 0) showPage(pvIntroPage - 1); };
    nextBtn.onclick = function () { if (pvIntroPage < pages.length - 1) showPage(pvIntroPage + 1); };

    startBtn.onclick = function () {
      document.getElementById('pv-intro').classList.add('hidden');
      document.getElementById('pv-mc-quiz').classList.remove('hidden');
      renderPvMCQuiz();
    };

    document.getElementById('pv-intro').classList.remove('hidden');
    document.getElementById('pv-mc-quiz').classList.add('hidden');
    document.getElementById('pv-short-quiz').classList.add('hidden');
    document.getElementById('pv-optional-section').classList.add('hidden');
  }

  function renderPvMCQuiz() {
    if (!pvData || !pvData.mcQuiz) return;
    var container = document.getElementById('pv-mc-questions');
    var resultEl = document.getElementById('pv-mc-result');
    var continueBtn = document.getElementById('pv-mc-continue');
    if (!container) return;
    container.innerHTML = '';
    pvData.mcQuiz.forEach(function (q, i) {
      var div = document.createElement('div');
      div.className = 'cat-quiz-mc-q';
      div.innerHTML = '<p class="cat-quiz-question">' + (i + 1) + '. ' + q.question + '</p>';
      (q.options || []).forEach(function (opt, j) {
        var label = document.createElement('label');
        label.innerHTML = '<input type="radio" name="pv-mc-' + i + '" value="' + j + '"> ' + opt;
        div.appendChild(label);
      });
      container.appendChild(div);
    });
    resultEl.classList.add('hidden');
    continueBtn.classList.add('hidden');

    document.getElementById('pv-mc-submit').onclick = function () {
      var res = buildMCQuizFeedback(pvData.mcQuiz, 'pv-mc-');
      var total = pvData.mcQuiz.length;
      var pct = total ? Math.round((res.correct / total) * 100) : 0;
      resultEl.innerHTML = '<p class="quiz-feedback-score">Score: <strong>' + res.correct + '/' + total + '</strong> (' + pct + '%)</p><div class="quiz-feedback-detail">' + res.html + '</div>';
      resultEl.classList.remove('hidden');
      continueBtn.classList.remove('hidden');
    };

    document.getElementById('pv-mc-continue').onclick = function () {
      document.getElementById('pv-mc-quiz').classList.add('hidden');
      document.getElementById('pv-short-quiz').classList.remove('hidden');
      renderPvShortQuiz();
    };
  }

  function renderPvShortQuiz() {
    if (!pvData || !pvData.shortQuestions) return;
    var container = document.getElementById('pv-short-questions');
    var resultEl = document.getElementById('pv-short-result');
    var continueBtn = document.getElementById('pv-short-continue');
    if (!container) return;
    container.innerHTML = '';
    pvData.shortQuestions.forEach(function (q, i) {
      var div = document.createElement('div');
      div.className = 'cat-quiz-short-q';
      div.innerHTML = '<p class="cat-quiz-question">' + (i + 1) + '. ' + q.question + '</p><input type="text" class="cat-quiz-input" data-i="' + i + '" placeholder="Corrected version">';
      container.appendChild(div);
    });
    resultEl.classList.add('hidden');
    continueBtn.classList.add('hidden');

    document.getElementById('pv-short-submit').onclick = function () {
      var res = buildShortQuizFeedback(pvData.shortQuestions, container);
      var total = pvData.shortQuestions.length;
      var pct = total ? Math.round((res.correct / total) * 100) : 0;
      resultEl.innerHTML = '<p class="quiz-feedback-score">Score: <strong>' + res.correct + '/' + total + '</strong> (' + pct + '%)</p><div class="quiz-feedback-detail">' + res.html + '</div>';
      resultEl.classList.remove('hidden');
      continueBtn.classList.remove('hidden');
    };

    document.getElementById('pv-short-continue').onclick = function () {
      document.getElementById('pv-short-quiz').classList.add('hidden');
      document.getElementById('pv-optional-section').classList.remove('hidden');
      renderPvOptional();
    };
  }

  function renderPvOptional() {
    if (!pvData || !pvData.optionalQuestionsBank) return;
    var container = document.getElementById('pv-optional-questions');
    if (!container) return;
    var batchSize = pvData.optionalBatchSize || 3;
    var bank = pvData.optionalQuestionsBank;
    var available = bank.map(function (_, i) { return i; }).filter(function (i) { return pvOptionalShown.indexOf(i) === -1; });
    if (available.length === 0) {
      pvOptionalShown = [];
      available = bank.map(function (_, i) { return i; });
    }
    var shuffled = available.sort(function () { return Math.random() - 0.5; });
    var batch = shuffled.slice(0, batchSize);
    batch.forEach(function (i) {
      if (pvOptionalShown.indexOf(i) === -1) pvOptionalShown.push(i);
    });
    batch.forEach(function (i) {
      var q = bank[i];
      var div = document.createElement('div');
      div.className = 'cat-quiz-optional-q';
      div.innerHTML = '<p class="cat-quiz-question">' + q.question + '</p><button type="button" class="btn btn-secondary btn-small cat-quiz-show-answer">Show suggested answer</button><div class="cat-quiz-suggested hidden">' + (q.suggested || '') + '</div>';
      var suggested = div.querySelector('.cat-quiz-suggested');
      div.querySelector('.cat-quiz-show-answer').onclick = function () {
        suggested.classList.remove('hidden');
        this.classList.add('hidden');
      };
      container.appendChild(div);
    });
  }

  var pvOptionalMore = document.getElementById('pv-optional-more');
  if (pvOptionalMore) pvOptionalMore.addEventListener('click', function () { renderPvOptional(); });

  // ========== Comparatives and superlatives category (Intro, MC quiz, error correction, optional) ==========
  var compData = null;
  var compIntroPage = 0;
  var compOptionalShown = [];

  function initComparativesCategory() {
    if (compData) {
      renderCompIntro();
      return;
    }
    fetch('comparatives-content.json').then(function (r) { return r.json(); }).then(function (data) {
      compData = data;
      renderCompIntro();
    }).catch(function () { alert('Could not load Comparatives content.'); });
  }

  function renderCompIntro() {
    if (!compData || !compData.introPages) return;
    var pages = compData.introPages;
    compIntroPage = 0;
    compOptionalShown = [];
    var content = document.getElementById('comp-intro-content');
    var indicator = document.getElementById('comp-intro-page-indicator');
    var prevBtn = document.getElementById('comp-intro-prev');
    var nextBtn = document.getElementById('comp-intro-next');
    var startBtn = document.getElementById('comp-intro-start-quiz');
    if (!content) return;

    function showPage(i) {
      compIntroPage = i;
      content.innerHTML = '<h4>' + pages[i].title + '</h4><div class="intro-body">' + pages[i].body + '</div>';
      indicator.textContent = (i + 1) + ' / ' + pages.length;
      prevBtn.disabled = i === 0;
      nextBtn.classList.toggle('hidden', i === pages.length - 1);
      startBtn.classList.toggle('hidden', i !== pages.length - 1);
    }
    showPage(0);

    prevBtn.onclick = function () { if (compIntroPage > 0) showPage(compIntroPage - 1); };
    nextBtn.onclick = function () { if (compIntroPage < pages.length - 1) showPage(compIntroPage + 1); };

    startBtn.onclick = function () {
      document.getElementById('comp-intro').classList.add('hidden');
      document.getElementById('comp-mc-quiz').classList.remove('hidden');
      renderCompMCQuiz();
    };

    document.getElementById('comp-intro').classList.remove('hidden');
    document.getElementById('comp-mc-quiz').classList.add('hidden');
    document.getElementById('comp-short-quiz').classList.add('hidden');
    document.getElementById('comp-optional-section').classList.add('hidden');
  }

  function renderCompMCQuiz() {
    if (!compData || !compData.mcQuiz) return;
    var container = document.getElementById('comp-mc-questions');
    var resultEl = document.getElementById('comp-mc-result');
    var continueBtn = document.getElementById('comp-mc-continue');
    if (!container) return;
    container.innerHTML = '';
    compData.mcQuiz.forEach(function (q, i) {
      var div = document.createElement('div');
      div.className = 'cat-quiz-mc-q';
      div.innerHTML = '<p class="cat-quiz-question">' + (i + 1) + '. ' + q.question + '</p>';
      (q.options || []).forEach(function (opt, j) {
        var label = document.createElement('label');
        label.innerHTML = '<input type="radio" name="comp-mc-' + i + '" value="' + j + '"> ' + opt;
        div.appendChild(label);
      });
      container.appendChild(div);
    });
    resultEl.classList.add('hidden');
    continueBtn.classList.add('hidden');

    document.getElementById('comp-mc-submit').onclick = function () {
      var res = buildMCQuizFeedback(compData.mcQuiz, 'comp-mc-');
      var total = compData.mcQuiz.length;
      var pct = total ? Math.round((res.correct / total) * 100) : 0;
      resultEl.innerHTML = '<p class="quiz-feedback-score">Score: <strong>' + res.correct + '/' + total + '</strong> (' + pct + '%)</p><div class="quiz-feedback-detail">' + res.html + '</div>';
      resultEl.classList.remove('hidden');
      continueBtn.classList.remove('hidden');
    };

    document.getElementById('comp-mc-continue').onclick = function () {
      document.getElementById('comp-mc-quiz').classList.add('hidden');
      document.getElementById('comp-short-quiz').classList.remove('hidden');
      renderCompShortQuiz();
    };
  }

  function renderCompShortQuiz() {
    if (!compData || !compData.shortQuestions) return;
    var container = document.getElementById('comp-short-questions');
    var resultEl = document.getElementById('comp-short-result');
    var continueBtn = document.getElementById('comp-short-continue');
    if (!container) return;
    container.innerHTML = '';
    compData.shortQuestions.forEach(function (q, i) {
      var div = document.createElement('div');
      div.className = 'cat-quiz-short-q';
      div.innerHTML = '<p class="cat-quiz-question">' + (i + 1) + '. ' + q.question + '</p><input type="text" class="cat-quiz-input" data-i="' + i + '" placeholder="Corrected version">';
      container.appendChild(div);
    });
    resultEl.classList.add('hidden');
    continueBtn.classList.add('hidden');

    document.getElementById('comp-short-submit').onclick = function () {
      var res = buildShortQuizFeedback(compData.shortQuestions, container);
      var total = compData.shortQuestions.length;
      var pct = total ? Math.round((res.correct / total) * 100) : 0;
      resultEl.innerHTML = '<p class="quiz-feedback-score">Score: <strong>' + res.correct + '/' + total + '</strong> (' + pct + '%)</p><div class="quiz-feedback-detail">' + res.html + '</div>';
      resultEl.classList.remove('hidden');
      continueBtn.classList.remove('hidden');
    };

    document.getElementById('comp-short-continue').onclick = function () {
      document.getElementById('comp-short-quiz').classList.add('hidden');
      document.getElementById('comp-optional-section').classList.remove('hidden');
      renderCompOptional();
    };
  }

  function renderCompOptional() {
    if (!compData || !compData.optionalQuestionsBank) return;
    var container = document.getElementById('comp-optional-questions');
    if (!container) return;
    var batchSize = compData.optionalBatchSize || 3;
    var bank = compData.optionalQuestionsBank;
    var available = bank.map(function (_, i) { return i; }).filter(function (i) { return compOptionalShown.indexOf(i) === -1; });
    if (available.length === 0) {
      compOptionalShown = [];
      available = bank.map(function (_, i) { return i; });
    }
    var shuffled = available.sort(function () { return Math.random() - 0.5; });
    var batch = shuffled.slice(0, batchSize);
    batch.forEach(function (i) {
      if (compOptionalShown.indexOf(i) === -1) compOptionalShown.push(i);
    });
    batch.forEach(function (i) {
      var q = bank[i];
      var div = document.createElement('div');
      div.className = 'cat-quiz-optional-q';
      div.innerHTML = '<p class="cat-quiz-question">' + q.question + '</p><button type="button" class="btn btn-secondary btn-small cat-quiz-show-answer">Show suggested answer</button><div class="cat-quiz-suggested hidden">' + (q.suggested || '') + '</div>';
      var suggested = div.querySelector('.cat-quiz-suggested');
      div.querySelector('.cat-quiz-show-answer').onclick = function () {
        suggested.classList.remove('hidden');
        this.classList.add('hidden');
      };
      container.appendChild(div);
    });
  }

  var compOptionalMore = document.getElementById('comp-optional-more');
  if (compOptionalMore) compOptionalMore.addEventListener('click', function () { renderCompOptional(); });

  // ========== Negatives and inversion category (Intro, MC quiz, error correction, optional) ==========
  var negData = null;
  var negIntroPage = 0;
  var negOptionalShown = [];

  function initNegativesCategory() {
    if (negData) {
      renderNegIntro();
      return;
    }
    fetch('negatives-content.json').then(function (r) { return r.json(); }).then(function (data) {
      negData = data;
      renderNegIntro();
    }).catch(function () { alert('Could not load Negatives and inversion content.'); });
  }

  function renderNegIntro() {
    if (!negData || !negData.introPages) return;
    var pages = negData.introPages;
    negIntroPage = 0;
    negOptionalShown = [];
    var content = document.getElementById('neg-intro-content');
    var indicator = document.getElementById('neg-intro-page-indicator');
    var prevBtn = document.getElementById('neg-intro-prev');
    var nextBtn = document.getElementById('neg-intro-next');
    var startBtn = document.getElementById('neg-intro-start-quiz');
    if (!content) return;

    function showPage(i) {
      negIntroPage = i;
      content.innerHTML = '<h4>' + pages[i].title + '</h4><div class="intro-body">' + pages[i].body + '</div>';
      indicator.textContent = (i + 1) + ' / ' + pages.length;
      prevBtn.disabled = i === 0;
      nextBtn.classList.toggle('hidden', i === pages.length - 1);
      startBtn.classList.toggle('hidden', i !== pages.length - 1);
    }
    showPage(0);

    prevBtn.onclick = function () { if (negIntroPage > 0) showPage(negIntroPage - 1); };
    nextBtn.onclick = function () { if (negIntroPage < pages.length - 1) showPage(negIntroPage + 1); };

    startBtn.onclick = function () {
      document.getElementById('neg-intro').classList.add('hidden');
      document.getElementById('neg-mc-quiz').classList.remove('hidden');
      renderNegMCQuiz();
    };

    document.getElementById('neg-intro').classList.remove('hidden');
    document.getElementById('neg-mc-quiz').classList.add('hidden');
    document.getElementById('neg-short-quiz').classList.add('hidden');
    document.getElementById('neg-optional-section').classList.add('hidden');
  }

  function renderNegMCQuiz() {
    if (!negData || !negData.mcQuiz) return;
    var container = document.getElementById('neg-mc-questions');
    var resultEl = document.getElementById('neg-mc-result');
    var continueBtn = document.getElementById('neg-mc-continue');
    if (!container) return;
    container.innerHTML = '';
    negData.mcQuiz.forEach(function (q, i) {
      var div = document.createElement('div');
      div.className = 'cat-quiz-mc-q';
      div.innerHTML = '<p class="cat-quiz-question">' + (i + 1) + '. ' + q.question + '</p>';
      (q.options || []).forEach(function (opt, j) {
        var label = document.createElement('label');
        label.innerHTML = '<input type="radio" name="neg-mc-' + i + '" value="' + j + '"> ' + opt;
        div.appendChild(label);
      });
      container.appendChild(div);
    });
    resultEl.classList.add('hidden');
    continueBtn.classList.add('hidden');

    document.getElementById('neg-mc-submit').onclick = function () {
      var res = buildMCQuizFeedback(negData.mcQuiz, 'neg-mc-');
      var total = negData.mcQuiz.length;
      var pct = total ? Math.round((res.correct / total) * 100) : 0;
      resultEl.innerHTML = '<p class="quiz-feedback-score">Score: <strong>' + res.correct + '/' + total + '</strong> (' + pct + '%)</p><div class="quiz-feedback-detail">' + res.html + '</div>';
      resultEl.classList.remove('hidden');
      continueBtn.classList.remove('hidden');
    };

    document.getElementById('neg-mc-continue').onclick = function () {
      document.getElementById('neg-mc-quiz').classList.add('hidden');
      document.getElementById('neg-short-quiz').classList.remove('hidden');
      renderNegShortQuiz();
    };
  }

  function renderNegShortQuiz() {
    if (!negData || !negData.shortQuestions) return;
    var container = document.getElementById('neg-short-questions');
    var resultEl = document.getElementById('neg-short-result');
    var continueBtn = document.getElementById('neg-short-continue');
    if (!container) return;
    container.innerHTML = '';
    negData.shortQuestions.forEach(function (q, i) {
      var div = document.createElement('div');
      div.className = 'cat-quiz-short-q';
      div.innerHTML = '<p class="cat-quiz-question">' + (i + 1) + '. ' + q.question + '</p><input type="text" class="cat-quiz-input" data-i="' + i + '" placeholder="Corrected version">';
      container.appendChild(div);
    });
    resultEl.classList.add('hidden');
    continueBtn.classList.add('hidden');

    document.getElementById('neg-short-submit').onclick = function () {
      var res = buildShortQuizFeedback(negData.shortQuestions, container);
      var total = negData.shortQuestions.length;
      var pct = total ? Math.round((res.correct / total) * 100) : 0;
      resultEl.innerHTML = '<p class="quiz-feedback-score">Score: <strong>' + res.correct + '/' + total + '</strong> (' + pct + '%)</p><div class="quiz-feedback-detail">' + res.html + '</div>';
      resultEl.classList.remove('hidden');
      continueBtn.classList.remove('hidden');
    };

    document.getElementById('neg-short-continue').onclick = function () {
      document.getElementById('neg-short-quiz').classList.add('hidden');
      document.getElementById('neg-optional-section').classList.remove('hidden');
      renderNegOptional();
    };
  }

  function renderNegOptional() {
    if (!negData || !negData.optionalQuestionsBank) return;
    var container = document.getElementById('neg-optional-questions');
    if (!container) return;
    var batchSize = negData.optionalBatchSize || 3;
    var bank = negData.optionalQuestionsBank;
    var available = bank.map(function (_, i) { return i; }).filter(function (i) { return negOptionalShown.indexOf(i) === -1; });
    if (available.length === 0) {
      negOptionalShown = [];
      available = bank.map(function (_, i) { return i; });
    }
    var shuffled = available.sort(function () { return Math.random() - 0.5; });
    var batch = shuffled.slice(0, batchSize);
    batch.forEach(function (i) {
      if (negOptionalShown.indexOf(i) === -1) negOptionalShown.push(i);
    });
    batch.forEach(function (i) {
      var q = bank[i];
      var div = document.createElement('div');
      div.className = 'cat-quiz-optional-q';
      div.innerHTML = '<p class="cat-quiz-question">' + q.question + '</p><button type="button" class="btn btn-secondary btn-small cat-quiz-show-answer">Show suggested answer</button><div class="cat-quiz-suggested hidden">' + (q.suggested || '') + '</div>';
      var suggested = div.querySelector('.cat-quiz-suggested');
      div.querySelector('.cat-quiz-show-answer').onclick = function () {
        suggested.classList.remove('hidden');
        this.classList.add('hidden');
      };
      container.appendChild(div);
    });
  }

  var negOptionalMore = document.getElementById('neg-optional-more');
  if (negOptionalMore) negOptionalMore.addEventListener('click', function () { renderNegOptional(); });

  // ========== Fixed expressions category (Intro, MC quiz, error correction, optional) ==========
  var fixData = null;
  var fixIntroPage = 0;
  var fixOptionalShown = [];

  function initFixedExpressionsCategory() {
    if (fixData) {
      renderFixIntro();
      return;
    }
    fetch('fixed-expressions-content.json').then(function (r) { return r.json(); }).then(function (data) {
      fixData = data;
      renderFixIntro();
    }).catch(function () { alert('Could not load Fixed expressions content.'); });
  }

  function renderFixIntro() {
    if (!fixData || !fixData.introPages) return;
    var pages = fixData.introPages;
    fixIntroPage = 0;
    fixOptionalShown = [];
    var content = document.getElementById('fix-intro-content');
    var indicator = document.getElementById('fix-intro-page-indicator');
    var prevBtn = document.getElementById('fix-intro-prev');
    var nextBtn = document.getElementById('fix-intro-next');
    var startBtn = document.getElementById('fix-intro-start-quiz');
    if (!content) return;

    function showPage(i) {
      fixIntroPage = i;
      content.innerHTML = '<h4>' + pages[i].title + '</h4><div class="intro-body">' + pages[i].body + '</div>';
      indicator.textContent = (i + 1) + ' / ' + pages.length;
      prevBtn.disabled = i === 0;
      nextBtn.classList.toggle('hidden', i === pages.length - 1);
      startBtn.classList.toggle('hidden', i !== pages.length - 1);
    }
    showPage(0);

    prevBtn.onclick = function () { if (fixIntroPage > 0) showPage(fixIntroPage - 1); };
    nextBtn.onclick = function () { if (fixIntroPage < pages.length - 1) showPage(fixIntroPage + 1); };

    startBtn.onclick = function () {
      document.getElementById('fix-intro').classList.add('hidden');
      document.getElementById('fix-mc-quiz').classList.remove('hidden');
      renderFixMCQuiz();
    };

    document.getElementById('fix-intro').classList.remove('hidden');
    document.getElementById('fix-mc-quiz').classList.add('hidden');
    document.getElementById('fix-short-quiz').classList.add('hidden');
    document.getElementById('fix-optional-section').classList.add('hidden');
  }

  function renderFixMCQuiz() {
    if (!fixData || !fixData.mcQuiz) return;
    var container = document.getElementById('fix-mc-questions');
    var resultEl = document.getElementById('fix-mc-result');
    var continueBtn = document.getElementById('fix-mc-continue');
    if (!container) return;
    container.innerHTML = '';
    fixData.mcQuiz.forEach(function (q, i) {
      var div = document.createElement('div');
      div.className = 'cat-quiz-mc-q';
      div.innerHTML = '<p class="cat-quiz-question">' + (i + 1) + '. ' + q.question + '</p>';
      (q.options || []).forEach(function (opt, j) {
        var label = document.createElement('label');
        label.innerHTML = '<input type="radio" name="fix-mc-' + i + '" value="' + j + '"> ' + opt;
        div.appendChild(label);
      });
      container.appendChild(div);
    });
    resultEl.classList.add('hidden');
    continueBtn.classList.add('hidden');

    document.getElementById('fix-mc-submit').onclick = function () {
      var res = buildMCQuizFeedback(fixData.mcQuiz, 'fix-mc-');
      var total = fixData.mcQuiz.length;
      var pct = total ? Math.round((res.correct / total) * 100) : 0;
      resultEl.innerHTML = '<p class="quiz-feedback-score">Score: <strong>' + res.correct + '/' + total + '</strong> (' + pct + '%)</p><div class="quiz-feedback-detail">' + res.html + '</div>';
      resultEl.classList.remove('hidden');
      continueBtn.classList.remove('hidden');
    };

    document.getElementById('fix-mc-continue').onclick = function () {
      document.getElementById('fix-mc-quiz').classList.add('hidden');
      document.getElementById('fix-short-quiz').classList.remove('hidden');
      renderFixShortQuiz();
    };
  }

  function renderFixShortQuiz() {
    if (!fixData || !fixData.shortQuestions) return;
    var container = document.getElementById('fix-short-questions');
    var resultEl = document.getElementById('fix-short-result');
    var continueBtn = document.getElementById('fix-short-continue');
    if (!container) return;
    container.innerHTML = '';
    fixData.shortQuestions.forEach(function (q, i) {
      var div = document.createElement('div');
      div.className = 'cat-quiz-short-q';
      div.innerHTML = '<p class="cat-quiz-question">' + (i + 1) + '. ' + q.question + '</p><input type="text" class="cat-quiz-input" data-i="' + i + '" placeholder="Corrected version">';
      container.appendChild(div);
    });
    resultEl.classList.add('hidden');
    continueBtn.classList.add('hidden');

    document.getElementById('fix-short-submit').onclick = function () {
      var res = buildShortQuizFeedback(fixData.shortQuestions, container);
      var total = fixData.shortQuestions.length;
      var pct = total ? Math.round((res.correct / total) * 100) : 0;
      resultEl.innerHTML = '<p class="quiz-feedback-score">Score: <strong>' + res.correct + '/' + total + '</strong> (' + pct + '%)</p><div class="quiz-feedback-detail">' + res.html + '</div>';
      resultEl.classList.remove('hidden');
      continueBtn.classList.remove('hidden');
    };

    document.getElementById('fix-short-continue').onclick = function () {
      document.getElementById('fix-short-quiz').classList.add('hidden');
      document.getElementById('fix-optional-section').classList.remove('hidden');
      renderFixOptional();
    };
  }

  function renderFixOptional() {
    if (!fixData || !fixData.optionalQuestionsBank) return;
    var container = document.getElementById('fix-optional-questions');
    if (!container) return;
    var batchSize = fixData.optionalBatchSize || 3;
    var bank = fixData.optionalQuestionsBank;
    var available = bank.map(function (_, i) { return i; }).filter(function (i) { return fixOptionalShown.indexOf(i) === -1; });
    if (available.length === 0) {
      fixOptionalShown = [];
      available = bank.map(function (_, i) { return i; });
    }
    var shuffled = available.sort(function () { return Math.random() - 0.5; });
    var batch = shuffled.slice(0, batchSize);
    batch.forEach(function (i) {
      if (fixOptionalShown.indexOf(i) === -1) fixOptionalShown.push(i);
    });
    batch.forEach(function (i) {
      var q = bank[i];
      var div = document.createElement('div');
      div.className = 'cat-quiz-optional-q';
      div.innerHTML = '<p class="cat-quiz-question">' + q.question + '</p><button type="button" class="btn btn-secondary btn-small cat-quiz-show-answer">Show suggested answer</button><div class="cat-quiz-suggested hidden">' + (q.suggested || '') + '</div>';
      var suggested = div.querySelector('.cat-quiz-suggested');
      div.querySelector('.cat-quiz-show-answer').onclick = function () {
        suggested.classList.remove('hidden');
        this.classList.add('hidden');
      };
      container.appendChild(div);
    });
  }

  var fixOptionalMore = document.getElementById('fix-optional-more');
  if (fixOptionalMore) fixOptionalMore.addEventListener('click', function () { renderFixOptional(); });

  var part2GoToReference = document.getElementById('part2-go-to-reference');
  if (part2GoToReference) {
    part2GoToReference.addEventListener('click', function (e) {
      e.preventDefault();
      showPart2MainSection('intro');
      showPart2Category('reference');
      var el = document.getElementById('part2-category-content');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    });
  }

  document.querySelectorAll('.cat-go-practice').forEach(function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      showPart2MainSection('practice');
      if (pathPanel) pathPanel.classList.add('hidden');
      if (part2PracticePanel) part2PracticePanel.classList.remove('hidden');
      var el = document.getElementById('part2-practice');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    });
  });

  var part2RefGoPractice = document.getElementById('part2-ref-go-practice');
  if (part2RefGoPractice) {
    part2RefGoPractice.addEventListener('click', function (e) {
      e.preventDefault();
      showPart2MainSection('practice');
      if (pathPanel) pathPanel.classList.add('hidden');
      if (part2PracticePanel) part2PracticePanel.classList.remove('hidden');
      var el = document.getElementById('part2-practice');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    });
  }

  var part2ShowGuided = document.getElementById('part2-show-guided');
  if (part2ShowGuided) {
    part2ShowGuided.addEventListener('click', function (e) {
      e.preventDefault();
      if (pathPanel) pathPanel.classList.remove('hidden');
      if (part2PracticePanel) part2PracticePanel.classList.add('hidden');
      if (typeof initPath === 'function') initPath();
    });
  }

  var pathBackToPractice = document.getElementById('path-back-to-practice');
  if (pathBackToPractice) {
    pathBackToPractice.addEventListener('click', function (e) {
      e.preventDefault();
      if (pathPanel) pathPanel.classList.add('hidden');
      if (part2PracticePanel) part2PracticePanel.classList.remove('hidden');
    });
  }

  function showPart2SubSection(which) {
    if (which === 'path') {
      if (pathPanel) pathPanel.classList.remove('hidden');
      if (part2PracticePanel) part2PracticePanel.classList.add('hidden');
    } else {
      if (pathPanel) pathPanel.classList.add('hidden');
      if (part2PracticePanel) part2PracticePanel.classList.remove('hidden');
    }
  }

  // ========== Guided path ==========
  const PATH_STORAGE = 'useOfEnglishPathProgress';
  const PASS_PERCENT = 70;
  let introQuizData = null;
  let pathLevelTests = { easy: [], medium: [], hard: [], expert: [] };
  let pathClozeData = { easy: [], medium: [], hard: [], expert: [] };
  let pathCurrentLevel = null;
  let pathCurrentTestIndex = 0;
  let pathClozeIndex = 0;
  let pathLevelScores = { easy: [], medium: [], hard: [], expert: [] };

  const LEVEL_INTROS = {
    easy: {
      title: 'Easy level',
      body: '<p>Here the texts are short and the gaps use the <strong>most common</strong> grammar words: articles (<em>a</em>, <em>an</em>, <em>the</em>), simple prepositions (<em>in</em>, <em>on</em>, <em>to</em>, <em>for</em>), pronouns (<em>it</em>, <em>they</em>, <em>there</em>), and basic conjunctions (<em>and</em>, <em>but</em>).</p><p><strong>Focus on:</strong> subject–verb agreement, simple prepositions of place and time, and common determiners.</p>'
    },
    medium: {
      title: 'Medium level',
      body: '<p>At this level texts are longer and gaps often test <strong>relative pronouns</strong> (<em>which</em>, <em>who</em>, <em>that</em>, <em>where</em>), <strong>fixed phrases</strong> (<em>in fact</em>, <em>in order to</em>, <em>take turns</em>), and a wider range of prepositions and linkers.</p><p><strong>Extra words to watch:</strong> <em>however</em>, <em>therefore</em>, <em>although</em>, <em>despite</em>, <em>such as</em>, <em>in spite of</em>, <em>on behalf of</em>, <em>in terms of</em>.</p><p>Pass with 70% to unlock Hard.</p>'
    },
    hard: {
      title: 'Hard level',
      body: '<p>Texts here use more formal, academic or argumentative language. Gaps often involve <strong>complex linkers</strong> (<em>whereas</em>, <em>nevertheless</em>, <em>consequently</em>), <strong>noun phrases</strong> in fixed expressions, and subtle grammar (e.g. <em>that</em>-clauses, fronting).</p><p><strong>Extra words to watch:</strong> <em>whereas</em>, <em>hence</em>, <em>thus</em>, <em>moreover</em>, <em>on the other hand</em>, <em>in view of</em>, <em>with regard to</em>, <em>in the hope that</em>.</p><p>Pass with 70% to unlock Expert.</p>'
    },
    expert: {
      title: 'Expert level',
      body: '<p>The most demanding level: dense, formal or philosophical texts. Gaps test <strong>advanced linkers</strong>, <strong>complex prepositions</strong>, and precise use of <em>that</em>, <em>what</em>, <em>which</em> in formal structures.</p><p><strong>Extra words to watch:</strong> <em>whereby</em>, <em>wherein</em>, <em>whereas</em>, <em>insofar as</em>, <em>in that</em>, <em>for all</em>, <em>by no means</em>, <em>such that</em>.</p>'
    }
  };

  function getPathProgress() {
    try {
      var raw = localStorage.getItem(PATH_STORAGE);
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  }
  function setPathProgress(o) {
    try {
      var cur = getPathProgress();
      localStorage.setItem(PATH_STORAGE, JSON.stringify(Object.assign({}, cur, o)));
    } catch (e) {}
  }

  function showPathScreen(screenId) {
    ['path-walkthrough', 'path-quiz', 'path-levels', 'path-level-intro', 'path-level-test-view', 'path-cloze-view'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.classList.toggle('hidden', id !== screenId);
    });
  }

  function initPath() {
    var progress = getPathProgress();
    if (progress.introQuizPassed) {
      showPathScreen('path-levels');
      updateLevelLocks();
    } else {
      showPathScreen('path-walkthrough');
    }
  }

  function updateLevelLocks() {
    var progress = getPathProgress();
    ['easy', 'medium', 'hard', 'expert'].forEach(function (level) {
      var btn = document.getElementById('path-level-' + level);
      if (!btn) return;
      btn.classList.remove('level-locked');
      var hint = document.getElementById('path-level-hint');
      if (level === 'easy' || (level === 'medium' && progress.easyPassed) || (level === 'hard' && progress.mediumPassed) || (level === 'expert' && progress.hardPassed)) {
        btn.disabled = false;
        btn.title = '';
      } else {
        btn.classList.add('level-locked');
        btn.disabled = true;
        var prev = level === 'medium' ? 'Easy' : level === 'hard' ? 'Medium' : 'Hard';
        btn.title = 'Pass ' + prev + ' with 70% to unlock';
      }
    });
  }

  document.getElementById('path-btn-quiz').addEventListener('click', function () {
    if (!introQuizData) {
      fetch('intro-quiz.json').then(function (r) { return r.json(); }).then(function (data) {
        introQuizData = data;
        renderPathQuiz();
        showPathScreen('path-quiz');
      }).catch(function () { alert('Could not load intro quiz.'); });
    } else {
      renderPathQuiz();
      showPathScreen('path-quiz');
    }
  });

  function renderPathQuiz() {
    var container = document.getElementById('path-quiz-questions');
    if (!container || !introQuizData || !introQuizData.questions) return;
    container.innerHTML = '';
    introQuizData.questions.forEach(function (q, i) {
      var div = document.createElement('div');
      div.className = 'path-quiz-q';
      div.innerHTML = '<p class="path-quiz-question">' + (i + 1) + '. ' + q.question + '</p>';
      (q.options || []).forEach(function (opt, j) {
        var label = document.createElement('label');
        label.innerHTML = '<input type="radio" name="path-q' + i + '" value="' + j + '"> ' + opt;
        div.appendChild(label);
      });
      container.appendChild(div);
    });
    document.getElementById('path-quiz-result').classList.add('hidden');
  }

  document.getElementById('path-quiz-submit').addEventListener('click', function () {
    if (!introQuizData || !introQuizData.questions) return;
    var correct = 0;
    introQuizData.questions.forEach(function (q, i) {
      var selected = document.querySelector('input[name="path-q' + i + '"]:checked');
      if (selected && parseInt(selected.value, 10) === q.correct) correct++;
    });
    var total = introQuizData.questions.length;
    var percent = total ? Math.round((correct / total) * 100) : 0;
    var pass = percent >= (introQuizData.passPercent || PASS_PERCENT);
    var resultEl = document.getElementById('path-quiz-result');
    resultEl.innerHTML = 'Score: <strong>' + correct + '/' + total + '</strong> (' + percent + '%). ' + (pass ? 'Well done! You can now access Easy level.' : 'You need ' + (introQuizData.passPercent || PASS_PERCENT) + '% to unlock Easy. Try again.');
    resultEl.classList.remove('hidden');
    if (pass) {
      setPathProgress({ introQuizPassed: true });
      setTimeout(function () {
        showPathScreen('path-levels');
        updateLevelLocks();
      }, 1500);
    }
  });

  document.querySelectorAll('.level-card').forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (btn.disabled || btn.classList.contains('level-locked')) return;
      pathCurrentLevel = btn.getAttribute('data-level');
      var intro = LEVEL_INTROS[pathCurrentLevel];
      if (intro) {
        document.getElementById('path-level-intro-title').textContent = intro.title;
        document.getElementById('path-level-intro-body').innerHTML = intro.body;
        showPathScreen('path-level-intro');
      }
    });
  });

  document.getElementById('path-btn-back-levels').addEventListener('click', function () {
    showPathScreen('path-levels');
    updateLevelLocks();
  });

  document.getElementById('path-btn-tests').addEventListener('click', function () {
    if (!pathCurrentLevel) return;
    var list = pathLevelTests[pathCurrentLevel];
    if (list.length === 0) {
      var file = 'tests-' + pathCurrentLevel + '.json';
      fetch(file).then(function (r) { return r.json(); }).then(function (data) {
        pathLevelTests[pathCurrentLevel] = data.tests || [];
        pathCurrentTestIndex = 0;
        renderPathTest();
        showPathScreen('path-level-test-view');
      }).catch(function () { alert('Could not load tests.'); });
    } else {
      pathCurrentTestIndex = 0;
      renderPathTest();
      showPathScreen('path-level-test-view');
    }
  });

  function renderPathTest() {
    var list = pathLevelTests[pathCurrentLevel];
    if (!list || !list.length) return;
    var test = list[pathCurrentTestIndex];
    if (!test) return;
    document.getElementById('path-test-title').textContent = test.title + ' (' + (pathCurrentTestIndex + 1) + '/' + list.length + ')';
    var container = document.getElementById('path-text-with-gaps');
    container.innerHTML = '';
    var parts = parseTextWithGaps(test.text);
    var answers = test.answers || [];
    parts.forEach(function (part) {
      if (part.type === 'text') {
        container.appendChild(document.createTextNode(part.value));
        return;
      }
      var i = part.index - 1;
      var span = document.createElement('span');
      span.className = 'gap-wrapper';
      var input = document.createElement('input');
      input.type = 'text';
      input.setAttribute('data-gap', String(i));
      input.placeholder = '?';
      span.appendChild(input);
      container.appendChild(span);
    });
    document.getElementById('path-feedback').classList.add('hidden');
  }

  document.getElementById('path-btn-submit').addEventListener('click', function () {
    var list = pathLevelTests[pathCurrentLevel];
    if (!list || !list.length) return;
    var test = list[pathCurrentTestIndex];
    var answers = test.answers || [];
    var inputs = document.querySelectorAll('#path-text-with-gaps input');
    var correct = 0;
    inputs.forEach(function (inp, i) {
      var given = (inp.value || '').trim().toLowerCase();
      var expected = (answers[i] || '').toLowerCase();
      var ok = given === expected;
      if (ok) correct++;
      inp.classList.toggle('correct', ok);
      inp.classList.toggle('incorrect', !ok && given.length > 0);
    });
    var total = answers.length;
    var percent = total ? Math.round((correct / total) * 100) : 0;
    var progress = getPathProgress();
    if (!pathLevelScores[pathCurrentLevel]) pathLevelScores[pathCurrentLevel] = [];
    pathLevelScores[pathCurrentLevel].push(percent);
    var avg = pathLevelScores[pathCurrentLevel].reduce(function (a, b) { return a + b; }, 0) / pathLevelScores[pathCurrentLevel].length;
    if (avg >= PASS_PERCENT) {
      var key = pathCurrentLevel + 'Passed';
      if (!progress[key]) setPathProgress({ [key]: true });
    }
    var fb = document.getElementById('path-feedback');
    fb.innerHTML = 'Score: <strong>' + correct + '/' + total + '</strong> (' + percent + '%). ' + (pathCurrentLevel === 'expert' ? '' : 'Average so far: ' + Math.round(avg) + '%. ' + (avg >= PASS_PERCENT ? 'Level passed! Next level unlocked.' : 'Keep practising to reach 70%.'));
    fb.classList.remove('hidden');
    var list = pathLevelTests[pathCurrentLevel];
    var nextBtn = document.getElementById('path-btn-next-test');
    if (nextBtn) nextBtn.classList.toggle('hidden', !list || pathCurrentTestIndex >= list.length - 1);
  });

  document.getElementById('path-btn-next-test').addEventListener('click', function () {
    pathCurrentTestIndex++;
    renderPathTest();
    document.getElementById('path-feedback').classList.add('hidden');
    document.getElementById('path-btn-next-test').classList.add('hidden');
  });

  document.getElementById('path-btn-back-level').addEventListener('click', function () {
    showPathScreen('path-level-intro');
  });

  document.getElementById('path-btn-cloze').addEventListener('click', function () {
    if (!pathCurrentLevel) return;
    var list = pathClozeData[pathCurrentLevel];
    if (list.length === 0) {
      fetch('cloze-' + pathCurrentLevel + '.json').then(function (r) { return r.json(); }).then(function (data) {
        pathClozeData[pathCurrentLevel] = data.sentences || [];
        pathClozeIndex = 0;
        showPathClozeSentence();
        document.getElementById('path-cloze-level-name').textContent = pathCurrentLevel.charAt(0).toUpperCase() + pathCurrentLevel.slice(1);
        showPathScreen('path-cloze-view');
      }).catch(function () { alert('Could not load cloze.'); });
    } else {
      pathClozeIndex = 0;
      showPathClozeSentence();
      document.getElementById('path-cloze-level-name').textContent = pathCurrentLevel.charAt(0).toUpperCase() + pathCurrentLevel.slice(1);
      showPathScreen('path-cloze-view');
    }
  });

  function showPathClozeSentence() {
    var list = pathClozeData[pathCurrentLevel];
    if (!list || !list.length) return;
    var item = list[pathClozeIndex];
    if (!item) return;
    var sent = (item.sentence || '').replace(/\(1\)/g, '______');
    document.getElementById('path-cloze-sentence').textContent = sent;
    document.getElementById('path-cloze-input').value = '';
    document.getElementById('path-cloze-input').classList.remove('correct', 'incorrect');
    document.getElementById('path-cloze-feedback').classList.add('hidden');
    document.getElementById('path-cloze-next').classList.add('hidden');
    document.getElementById('path-cloze-progress').textContent = (pathClozeIndex + 1) + ' / ' + list.length;
  }

  document.getElementById('path-cloze-check').addEventListener('click', function () {
    var list = pathClozeData[pathCurrentLevel];
    if (!list || !list.length) return;
    var item = list[pathClozeIndex];
    var given = (document.getElementById('path-cloze-input').value || '').trim().toLowerCase();
    var expected = (item.answer || '').toLowerCase();
    var ok = given === expected;
    document.getElementById('path-cloze-input').classList.toggle('correct', ok);
    document.getElementById('path-cloze-input').classList.toggle('incorrect', !ok && given.length > 0);
    var fb = document.getElementById('path-cloze-feedback');
    fb.innerHTML = ok ? 'Correct!' : 'The answer is: <strong>' + (item.answer || '') + '</strong>' + (item.wordType ? ' (' + item.wordType + ')' : '');
    fb.classList.remove('hidden');
    document.getElementById('path-cloze-next').classList.remove('hidden');
  });

  document.getElementById('path-cloze-next').addEventListener('click', function () {
    pathClozeIndex++;
    var list = pathClozeData[pathCurrentLevel];
    if (pathClozeIndex >= list.length) {
      pathClozeIndex = 0;
      document.getElementById('path-cloze-feedback').innerHTML = 'You finished this set. Well done!';
      document.getElementById('path-cloze-feedback').classList.remove('hidden');
      document.getElementById('path-cloze-next').classList.add('hidden');
      return;
    }
    showPathClozeSentence();
  });

  document.getElementById('path-cloze-back').addEventListener('click', function () {
    showPathScreen('path-level-intro');
  });

  window.initPath = initPath;

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
