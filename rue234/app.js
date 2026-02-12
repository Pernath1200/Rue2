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
