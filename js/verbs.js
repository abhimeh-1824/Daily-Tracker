import {
  getUserVerbs,
  saveUserVerb,
  deleteUserVerb,
  updateUserVerbMastery
} from './firestore.js';
import { refreshIcons, showToast, triggerCelebration } from './utils.js';

// Initial starter verbs for new users (auto-seeded to user_verbs in Firestore)
export const STARTER_VERBS = [
  {
    id: 'verb_mitigate',
    verb: 'Mitigate',
    meaning: 'To make something less severe, harmful, or painful.',
    usage: 'Formal transitive verb; heavily used in engineering risk assessments, incident post-mortems, and architecture reviews.',
    forms: 'mitigate • mitigated • mitigating • collocations: mitigate risks, mitigate latency, mitigate impact',
    phonetic: '/ˈmɪt.ɪ.ɡeɪt/',
    sentences: [
      'We introduced Redis caching and connection pooling to mitigate the risk of database timeouts during peak traffic.',
      'Regular physical exercise and 8 hours of sleep help mitigate mental burnout during intense study sprints.',
      'In tech interviews, describe how you proactively identified a race condition and mitigated project delays.'
    ],
    memoryHook: 'Think of closing a security "Gate" to mitigate flood or security intrusion damage.',
    status: 'learning',
    mastered: false
  },
  {
    id: 'verb_articulate',
    verb: 'Articulate',
    meaning: 'To express an idea, thought, or feeling clearly, fluently, and effectively in spoken or written words.',
    usage: 'Crucial for behavioral and system design interview rounds where clear communication is evaluated.',
    forms: 'articulate • articulated • articulating • collocations: articulate trade-offs, articulate vision',
    phonetic: '/ɑːˈtɪk.jə.leɪt/',
    sentences: [
      'During System Design rounds, you must articulate the trade-offs between SQL consistency and NoSQL scalability.',
      'She clearly articulated her proposal for breaking the monolith into independent microservices.',
      'Practicing speaking aloud every evening helps articulate complex algorithmic solutions with confidence.'
    ],
    memoryHook: 'Art-in-Speech: expressing your thoughts with the clarity and mastery of a skilled artist.',
    status: 'learning',
    mastered: false
  },
  {
    id: 'verb_reconcile',
    verb: 'Reconcile',
    meaning: 'To find a way in which two conflicting situations, datasets, or requirements can agree or coexist.',
    usage: 'Used in distributed systems (eventual consistency), Git version control, and team negotiations.',
    forms: 'reconcile • reconciled • reconciling • collocations: reconcile conflicts, reconcile state',
    phonetic: '/ˈrek.ən.saɪl/',
    sentences: [
      'Git prompted the engineering team to reconcile three merge conflicts before deploying to production.',
      'The tech lead reconciled product management feature requests with strict performance budget constraints.',
      'Distributed databases use consensus algorithms to reconcile divergent replica state after network partitions.'
    ],
    memoryHook: 'Re-Connection: bringing two opposing sides back into complete agreement and alignment.',
    status: 'mastered',
    mastered: true
  },
  {
    id: 'verb_spearhead',
    verb: 'Spearhead',
    meaning: 'To act as the primary leader and energetic driving force behind a project, initiative, or campaign.',
    usage: 'High-impact action verb for resumes, performance self-reviews, and leadership interview questions.',
    forms: 'spearhead • spearheaded • spearheading • collocations: spearhead the migration, spearhead design',
    phonetic: '/ˈspɪə.hed/',
    sentences: [
      'I spearheaded the initiative to migrate our frontend codebase from legacy scripts to modular TypeScript.',
      'She spearheaded the university team in the hackathon, organizing task assignments and code reviews.',
      'On your resume, highlight projects where you spearheaded architectural improvements that improved reliability.'
    ],
    memoryHook: 'The sharp tip of a Spear is always at the very front, leading the charge forward.',
    status: 'learning',
    mastered: false
  },
  {
    id: 'verb_leverage',
    verb: 'Leverage',
    meaning: 'To use something to maximum advantage in order to achieve superior results.',
    usage: 'Very common in business strategy, system design, and algorithmic problem-solving.',
    forms: 'leverage • leveraged • leveraging • collocations: leverage capabilities, leverage cache',
    phonetic: '/ˈliː.vər.ɪdʒ/',
    sentences: [
      'We leverage Redis in-memory key-value storage to decrease average API latency from 450ms down to 18ms.',
      'He leveraged his strong discrete mathematics background to quickly grasp graph theory and dynamic programming.',
      'Leverage past problem patterns when tackling unfamiliar LeetCode medium and hard challenges.'
    ],
    memoryHook: 'A physical Lever allows you to lift immense weight with minimal effort.',
    status: 'mastered',
    mastered: true
  },
  {
    id: 'verb_persevere',
    verb: 'Persevere',
    meaning: 'To continue tenaciously in a course of action even in the face of difficulty or lack of immediate success.',
    usage: 'Key motivational trait for multi-month exam preparation (GATE, interview sprints, 30-day challenges).',
    forms: 'persevere • persevered • persevering • collocations: persevere through challenges',
    phonetic: '/ˌpɜː.sɪˈvɪər/',
    sentences: [
      'Debugging intermittent race conditions requires you to persevere through dozens of concurrent logs.',
      'Despite initial setbacks in mock exams, he persevered with daily practice and secured a top rank.',
      'Maintaining a 30-day streak requires you to persevere on difficult days when motivation feels low.'
    ],
    memoryHook: 'Per-Severe: marching steadily through severe conditions without surrendering.',
    status: 'learning',
    mastered: false
  }
];

let verbsList = [];
let activeTab = 'flashcards'; // 'flashcards' | 'quiz' | 'library'
let currentCardIndex = 0;
let isCardFlipped = false;
let quizState = null;

/**
 * Text-to-Speech audio pronunciation using browser SpeechSynthesis API
 */
export function speakWord(text) {
  if (!('speechSynthesis' in window)) {
    showToast('Speech audio is not supported in this browser.', 'warning');
    return;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  utterance.rate = 0.9;
  window.speechSynthesis.speak(utterance);
}

/**
 * Main Controller: Render the Verb Flashcards Interface & Sync to Firestore 'user_verbs'
 */
export async function renderVerbFlashcards(containerEl) {
  if (!containerEl) return;

  // Fetch persisted verbs from Firestore 'user_verbs' collection
  try {
    let saved = await getUserVerbs();
    if (!saved || saved.length === 0) {
      // Auto-seed starter verbs to user_verbs in Firestore
      for (const starter of STARTER_VERBS) {
        await saveUserVerb(starter);
      }
      saved = await getUserVerbs();
    }
    verbsList = saved && saved.length > 0 ? saved : STARTER_VERBS;
  } catch (err) {
    console.warn('Firestore user_verbs fetch error, using local fallback:', err);
    verbsList = STARTER_VERBS;
  }

  const totalVerbs = verbsList.length;
  const masteredCount = verbsList.filter(v => v.mastered || v.status === 'mastered').length;
  const learningCount = totalVerbs - masteredCount;

  containerEl.innerHTML = `
    <!-- Header -->
    <div class="page-header" style="margin-bottom: 20px;">
      <div>
        <h1 class="page-title" style="display: flex; align-items: center; gap: 10px;">
          <i data-lucide="brain" style="width: 26px; height: 26px; color: var(--teal-primary);"></i>
          Verb Flashcards & Contextual Memory Lab
        </h1>
        <p class="page-subtitle">
          Define verbs, usage context, and 2–3 real-life practical sentences. Persisted directly to Firestore <code>user_verbs</code>.
        </p>
      </div>

      <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
        <span class="badge badge-emerald"><i data-lucide="check" style="width: 12px; height: 12px;"></i> ${masteredCount} Mastered</span>
        <span class="badge badge-amber"><i data-lucide="clock" style="width: 12px; height: 12px;"></i> ${learningCount} Learning</span>
        <button class="btn btn-primary btn-sm" id="btn-add-verb-modal">
          <i data-lucide="plus-circle" style="width: 14px; height: 14px;"></i>
          Add New Verb
        </button>
      </div>
    </div>

    <!-- Mode Selector Tabs -->
    <div class="verb-lab-nav">
      <div class="verb-tab-btn ${activeTab === 'flashcards' ? 'active' : ''}" data-tab="flashcards">
        <i data-lucide="layers" style="width: 16px; height: 16px;"></i>
        <span>3D Flashcards</span>
      </div>
      <div class="verb-tab-btn ${activeTab === 'quiz' ? 'active' : ''}" data-tab="quiz">
        <i data-lucide="zap" style="width: 16px; height: 16px;"></i>
        <span>Speed Sentence Quiz</span>
      </div>
      <div class="verb-tab-btn ${activeTab === 'library' ? 'active' : ''}" data-tab="library">
        <i data-lucide="database" style="width: 16px; height: 16px;"></i>
        <span>Firestore Collection (${totalVerbs})</span>
      </div>
    </div>

    <!-- Dynamic Content Area -->
    <div id="verbs-tab-container">
      ${renderActiveTabContent()}
    </div>
  `;

  refreshIcons();
  attachEvents(containerEl);
}

function renderActiveTabContent() {
  if (activeTab === 'flashcards') {
    return renderFlashcardView();
  } else if (activeTab === 'quiz') {
    return renderQuizView();
  } else {
    return renderLibraryView();
  }
}

/**
 * 1. 3D Flashcard View
 */
function renderFlashcardView() {
  if (verbsList.length === 0) {
    return `
      <div class="card" style="text-align: center; padding: 40px;">
        <i data-lucide="book-open" style="width: 36px; height: 36px; color: var(--teal-primary); margin: 0 auto 12px; display: block;"></i>
        <h3 style="font-size: 16px; font-weight: 600; color: #fff;">No verbs saved in your collection</h3>
        <p style="font-size: 13px; color: var(--text-secondary); margin: 6px 0 16px;">Add a verb with its usage rules and 2-3 real-life sentences.</p>
        <button class="btn btn-primary btn-sm" onclick="window.openNewVerbModal()">Add First Verb</button>
      </div>
    `;
  }

  if (currentCardIndex >= verbsList.length) currentCardIndex = 0;
  const current = verbsList[currentCardIndex];
  const isMastered = current.mastered || current.status === 'mastered';

  return `
    <div class="flashcard-stage">
      <div class="flashcard-card-3d ${isCardFlipped ? 'flipped' : ''}" id="verb-flashcard-element" title="Click anywhere or press Spacebar to Flip">
        <!-- FRONT FACE -->
        <div class="flashcard-face front">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span class="badge ${isMastered ? 'badge-emerald' : 'badge-amber'}">
              ${isMastered ? '✓ Mastered' : '● In Practice'}
            </span>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 12px; color: var(--text-muted); font-family: var(--font-mono);">
                ${currentCardIndex + 1} / ${verbsList.length}
              </span>
              <button class="audio-btn" onclick="event.stopPropagation(); window.speakVerb('${escapeJs(current.verb)}')" title="Listen to pronunciation">
                <i data-lucide="volume-2" style="width: 17px; height: 17px;"></i>
              </button>
            </div>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <div class="verb-hero-title">${current.verb}</div>
            ${current.phonetic ? `<div class="verb-phonetic-badge">${current.phonetic}</div>` : ''}
            <div style="font-size: 13px; color: var(--text-secondary); margin-top: 10px;">
              ${current.forms || 'Action Verb'}
            </div>
            ${current.usage ? `
              <div style="display: inline-block; background-color: rgba(59, 130, 246, 0.12); color: #93c5fd; font-size: 11.5px; padding: 4px 10px; border-radius: var(--radius-sm); margin-top: 10px; max-width: 80%;">
                💡 Context: ${current.usage}
              </div>
            ` : ''}
          </div>

          <div style="text-align: center; border-top: 1px solid var(--border-subtle); padding-top: 16px; color: var(--text-muted); font-size: 12.5px; display: flex; align-items: center; justify-content: center; gap: 6px;">
            <i data-lucide="rotate-cw" style="width: 14px; height: 14px; color: var(--teal-primary);"></i>
            <span>Click card to reveal definition, 2-3 real-life sentences & memory hook</span>
          </div>
        </div>

        <!-- BACK FACE -->
        <div class="flashcard-face back">
          <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
              <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 20px; font-weight: 800; color: #fff;">${current.verb}</span>
                <button class="audio-btn" style="width: 28px; height: 28px;" onclick="event.stopPropagation(); window.speakVerb('${escapeJs(current.verb)}')" title="Speak">
                  <i data-lucide="volume-2" style="width: 15px; height: 15px;"></i>
                </button>
              </div>
              <span style="font-size: 12px; color: var(--text-muted);">${currentCardIndex + 1} / ${verbsList.length}</span>
            </div>

            <!-- Meaning & Usage -->
            <div style="background-color: var(--bg-input); padding: 12px 14px; border-radius: var(--radius-md); border-left: 3px solid var(--teal-primary); margin-bottom: 14px;">
              <div style="font-size: 11px; color: var(--teal-primary); font-weight: 700; text-transform: uppercase;">Definition</div>
              <div style="font-size: 14px; color: #fff; margin-top: 2px; font-weight: 600;">${current.meaning}</div>
              ${current.usage ? `
                <div style="font-size: 12px; color: var(--text-secondary); margin-top: 6px; border-top: 1px solid var(--border-subtle); padding-top: 6px;">
                  <strong>Usage:</strong> ${current.usage}
                </div>
              ` : ''}
            </div>

            <!-- 2 to 3 Real-Life Sentences -->
            <div style="margin-bottom: 12px;">
              <div style="font-size: 11.5px; color: var(--text-muted); font-weight: 700; text-transform: uppercase; margin-bottom: 6px; display: flex; align-items: center; gap: 6px;">
                <i data-lucide="message-square" style="width: 13px; height: 13px; color: var(--blue-primary);"></i>
                Real-Life Contextual Sentences
              </div>
              ${current.sentences && current.sentences.length > 0 ? current.sentences.map((sent, sIdx) => `
                <div class="real-life-sentence-item">
                  <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
                    <div><strong>${sIdx + 1}.</strong> ${highlightVerb(sent, current.verb)}</div>
                    <button class="audio-btn" style="width: 24px; height: 24px; flex-shrink: 0;" onclick="event.stopPropagation(); window.speakVerb('${escapeJs(sent)}')" title="Listen to sentence">
                      <i data-lucide="volume-2" style="width: 12px; height: 12px;"></i>
                    </button>
                  </div>
                </div>
              `).join('') : '<div style="font-size: 12px; color: var(--text-muted);">No sentences provided.</div>'}
            </div>

            <!-- Memory Hook -->
            ${current.memoryHook ? `
              <div class="memory-hook-container">
                <div style="font-size: 11px; color: #fbbf24; font-weight: 700; text-transform: uppercase; display: flex; align-items: center; gap: 6px;">
                  <i data-lucide="lightbulb" style="width: 13px; height: 13px;"></i>
                  Memory Hook / Mnemonic for Fast Recall
                </div>
                <div style="font-size: 13px; color: #fef3c7; margin-top: 3px; font-style: italic;">
                  "${current.memoryHook}"
                </div>
              </div>
            ` : ''}
          </div>

          <div style="border-top: 1px solid var(--border-subtle); padding-top: 14px; margin-top: 12px; display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 11.5px; color: var(--text-muted);">Click anywhere to flip front</span>
            <div style="display: flex; gap: 8px;" onclick="event.stopPropagation();">
              <button class="btn btn-outline btn-sm" onclick="window.handleVerbMastery('${current.id}', false)">
                <i data-lucide="rotate-ccw" style="width: 13px; height: 13px; color: var(--amber-warning);"></i>
                Need Review
              </button>
              <button class="btn btn-primary btn-sm" onclick="window.handleVerbMastery('${current.id}', true)">
                <i data-lucide="check" style="width: 13px; height: 13px;"></i>
                Mastered!
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Navigation Bar -->
    <div class="flashcard-nav-controls">
      <button class="btn btn-secondary" id="btn-verb-prev" title="Previous Card">
        <i data-lucide="arrow-left" style="width: 16px; height: 16px;"></i>
        Prev
      </button>

      <button class="btn btn-outline" id="btn-verb-flip">
        <i data-lucide="rotate-cw" style="width: 16px; height: 16px;"></i>
        Flip Card
      </button>

      <button class="btn btn-outline btn-icon" id="btn-verb-shuffle" title="Shuffle Deck">
        <i data-lucide="shuffle" style="width: 16px; height: 16px;"></i>
      </button>

      <button class="btn btn-secondary" id="btn-verb-next" title="Next Card">
        Next
        <i data-lucide="arrow-right" style="width: 16px; height: 16px;"></i>
      </button>
    </div>
  `;
}

/**
 * 2. Speed Quiz Mode View
 */
function renderQuizView() {
  if (verbsList.length < 3) {
    return `
      <div class="card" style="text-align: center; padding: 30px;">
        <p style="color: var(--text-secondary);">Add at least 3 verbs to unlock the Speed Sentence Quiz.</p>
      </div>
    `;
  }

  if (!quizState) {
    initQuizQuestion();
  }

  const { targetVerb, sentenceWithBlank, options, answered, selectedIndex, isCorrect } = quizState;

  return `
    <div class="card" style="max-width: 680px; margin: 0 auto;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; border-bottom: 1px solid var(--border-subtle); padding-bottom: 12px;">
        <span class="badge badge-teal">Sentence Completion Quiz</span>
        <span style="font-size: 12px; color: var(--text-muted);">Identify the correct verb from context</span>
      </div>

      <div style="background-color: var(--bg-input); padding: 20px; border-radius: var(--radius-md); border: 1px solid var(--border-subtle); margin-bottom: 20px;">
        <div style="font-size: 11.5px; color: var(--text-muted); font-weight: 700; text-transform: uppercase; margin-bottom: 8px;">
          Fill in the blank:
        </div>
        <div style="font-size: 16px; font-weight: 600; color: #fff; line-height: 1.5;">
          "${sentenceWithBlank}"
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px;">
        ${options.map((opt, idx) => {
          let btnClass = 'btn-secondary';
          if (answered) {
            if (opt === targetVerb.verb) btnClass = 'btn-primary';
            else if (idx === selectedIndex) btnClass = 'btn-outline';
          }
          return `
            <button 
              class="btn ${btnClass}" 
              style="padding: 14px; font-size: 15px; font-weight: 700; justify-content: flex-start;"
              onclick="window.handleQuizAnswer(${idx})"
              ${answered ? 'disabled' : ''}>
              ${opt}
            </button>
          `;
        }).join('')}
      </div>

      ${answered ? `
        <div style="background-color: ${isCorrect ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)'}; border: 1px solid ${isCorrect ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}; border-radius: var(--radius-md); padding: 14px 18px; margin-bottom: 16px;">
          <div style="font-weight: 700; color: ${isCorrect ? 'var(--emerald-success)' : 'var(--rose-danger)'}; font-size: 15px;">
            ${isCorrect ? '✓ Correct! Great active recall.' : `✗ Incorrect. The right verb is "${targetVerb.verb}".`}
          </div>
          <div style="font-size: 13px; color: var(--text-secondary); margin-top: 4px;">
            <strong>${targetVerb.verb}:</strong> ${targetVerb.meaning}
          </div>
          ${targetVerb.memoryHook ? `
            <div style="font-size: 12px; color: #fbbf24; margin-top: 4px; font-style: italic;">
              💡 Hook: "${targetVerb.memoryHook}"
            </div>
          ` : ''}
        </div>

        <button class="btn btn-primary" style="width: 100%;" onclick="window.nextQuizQuestion()">
          Next Sentence <i data-lucide="arrow-right" style="width: 16px; height: 16px;"></i>
        </button>
      ` : ''}
    </div>
  `;
}

function initQuizQuestion() {
  const eligible = verbsList.filter(v => v.sentences && v.sentences.length > 0);
  if (eligible.length === 0) return;

  const targetVerb = eligible[Math.floor(Math.random() * eligible.length)];
  const randomSentence = targetVerb.sentences[Math.floor(Math.random() * targetVerb.sentences.length)];

  const regex = new RegExp(`\\b${targetVerb.verb}\\w*\\b`, 'gi');
  const sentenceWithBlank = randomSentence.replace(regex, '[ ________ ]');

  const otherVerbs = verbsList.filter(v => v.verb !== targetVerb.verb).map(v => v.verb);
  shuffle(otherVerbs);
  const distractors = otherVerbs.slice(0, 3);

  const options = [targetVerb.verb, ...distractors];
  shuffle(options);

  quizState = {
    targetVerb,
    originalSentence: randomSentence,
    sentenceWithBlank,
    options,
    answered: false,
    selectedIndex: null,
    isCorrect: false
  };
}

/**
 * 3. Library & Firestore Collection View
 */
function renderLibraryView() {
  return `
    <div class="card">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 12px;">
        <input 
          type="text" 
          id="verb-library-search" 
          placeholder="Search by verb, definition, or real-life sentence..." 
          style="max-width: 340px; width: 100%;"
        />
        <span class="badge badge-teal">Firestore: user_verbs (${verbsList.length})</span>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px;" id="verbs-grid-cards">
        ${verbsList.map(v => renderVerbCardItem(v)).join('')}
      </div>
    </div>
  `;
}

function renderVerbCardItem(v) {
  const isMastered = v.mastered || v.status === 'mastered';
  return `
    <div style="background-color: var(--bg-input); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 18px; display: flex; flex-direction: column; justify-content: space-between;">
      <div>
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
          <div>
            <span style="font-size: 18px; font-weight: 800; color: #fff;">${v.verb}</span>
            ${v.phonetic ? `<span style="font-size: 11px; color: var(--teal-primary); margin-left: 6px;">${v.phonetic}</span>` : ''}
          </div>
          <div style="display: flex; align-items: center; gap: 6px;">
            <button class="audio-btn" style="width: 26px; height: 26px;" onclick="window.speakVerb('${escapeJs(v.verb)}')" title="Listen">
              <i data-lucide="volume-2" style="width: 13px; height: 13px;"></i>
            </button>
            <button class="btn-icon" style="width: 26px; height: 26px;" onclick="window.handleDeleteVerb('${v.id}')" title="Delete from Firestore">
              <i data-lucide="trash-2" style="width: 13px; height: 13px; color: var(--rose-danger);"></i>
            </button>
          </div>
        </div>

        <div style="font-size: 13.5px; color: var(--text-primary); margin-bottom: 8px; font-weight: 500;">
          ${v.meaning}
        </div>

        ${v.usage ? `
          <div style="font-size: 12px; color: #93c5fd; background-color: rgba(59, 130, 246, 0.1); padding: 6px 10px; border-radius: var(--radius-sm); margin-bottom: 8px;">
            <strong>Usage:</strong> ${v.usage}
          </div>
        ` : ''}

        <!-- Sentences preview -->
        <div style="margin-bottom: 8px;">
          ${v.sentences && v.sentences.length > 0 ? v.sentences.map((s, idx) => `
            <div style="font-size: 12px; color: var(--text-secondary); line-height: 1.4; border-left: 2px solid var(--teal-primary); padding-left: 8px; margin-bottom: 4px;">
              ${idx + 1}. "${s}"
            </div>
          `).join('') : ''}
        </div>

        ${v.memoryHook ? `
          <div style="font-size: 11.5px; color: #fbbf24; font-style: italic; background-color: rgba(245, 158, 11, 0.08); padding: 6px 10px; border-radius: var(--radius-sm); margin-bottom: 12px;">
            💡 Hook: "${v.memoryHook}"
          </div>
        ` : ''}
      </div>

      <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-subtle); padding-top: 10px; margin-top: 8px;">
        <span class="badge ${isMastered ? 'badge-emerald' : 'badge-amber'}">
          ${isMastered ? 'Mastered' : 'In Practice'}
        </span>
        <button class="btn-sm btn-outline" onclick="window.handleVerbMastery('${v.id}', ${!isMastered})">
          ${isMastered ? 'Mark Review' : 'Mark Mastered'}
        </button>
      </div>
    </div>
  `;
}

/**
 * Event Listeners
 */
function attachEvents(containerEl) {
  // Tab Switcher
  containerEl.querySelectorAll('.verb-tab-btn').forEach(btn => {
    btn.onclick = () => {
      activeTab = btn.getAttribute('data-tab');
      isCardFlipped = false;
      const target = document.getElementById('verbs-tab-container');
      if (target) {
        target.innerHTML = renderActiveTabContent();
        refreshIcons();
        attachEvents(containerEl);
      }
    };
  });

  // Card flip click
  const card = document.getElementById('verb-flashcard-element');
  if (card) {
    card.onclick = () => {
      isCardFlipped = !isCardFlipped;
      card.classList.toggle('flipped', isCardFlipped);
    };
  }

  // Flip button
  const flipBtn = document.getElementById('btn-verb-flip');
  if (flipBtn && card) {
    flipBtn.onclick = () => {
      isCardFlipped = !isCardFlipped;
      card.classList.toggle('flipped', isCardFlipped);
    };
  }

  // Next / Prev card
  const prevBtn = document.getElementById('btn-verb-prev');
  const nextBtn = document.getElementById('btn-verb-next');
  const shuffleBtn = document.getElementById('btn-verb-shuffle');

  if (prevBtn) {
    prevBtn.onclick = () => {
      isCardFlipped = false;
      currentCardIndex = (currentCardIndex - 1 + verbsList.length) % verbsList.length;
      refreshUI();
    };
  }

  if (nextBtn) {
    nextBtn.onclick = () => {
      isCardFlipped = false;
      currentCardIndex = (currentCardIndex + 1) % verbsList.length;
      refreshUI();
    };
  }

  if (shuffleBtn) {
    shuffleBtn.onclick = () => {
      shuffle(verbsList);
      currentCardIndex = 0;
      isCardFlipped = false;
      showToast('Deck shuffled!', 'info');
      refreshUI();
    };
  }

  // Search input in Library
  const searchInput = document.getElementById('verb-library-search');
  if (searchInput) {
    searchInput.oninput = (e) => {
      const q = e.target.value.toLowerCase().trim();
      const grid = document.getElementById('verbs-grid-cards');
      if (grid) {
        const filtered = verbsList.filter(v =>
          v.verb.toLowerCase().includes(q) ||
          v.meaning.toLowerCase().includes(q) ||
          (v.usage && v.usage.toLowerCase().includes(q)) ||
          (v.memoryHook && v.memoryHook.toLowerCase().includes(q)) ||
          (v.sentences && v.sentences.some(s => s.toLowerCase().includes(q)))
        );
        grid.innerHTML = filtered.map(v => renderVerbCardItem(v)).join('');
        refreshIcons();
      }
    };
  }

  // Add Verb Modal
  const addBtn = document.getElementById('btn-add-verb-modal');
  if (addBtn) {
    addBtn.onclick = openVerbModal;
  }
}

function refreshUI() {
  const target = document.getElementById('verbs-tab-container');
  if (target) {
    target.innerHTML = renderActiveTabContent();
    refreshIcons();
    const containerEl = document.getElementById('verbs-view');
    if (containerEl) attachEvents(containerEl);
  }
}

// Global action handlers
window.speakVerb = (text) => speakWord(text);

window.openNewVerbModal = openVerbModal;

window.handleVerbMastery = async (verbId, isMastered) => {
  const v = verbsList.find(i => i.id === verbId);
  if (v) {
    v.mastered = isMastered;
    v.status = isMastered ? 'mastered' : 'learning';
    await updateUserVerbMastery(verbId, isMastered);
    if (isMastered) {
      triggerCelebration();
      showToast(`Mastered "${v.verb}"! Persisted to Firestore.`, 'success');
      isCardFlipped = false;
      currentCardIndex = (currentCardIndex + 1) % verbsList.length;
    } else {
      showToast(`"${v.verb}" marked for practice.`, 'info');
    }
    refreshUI();
  }
};

window.handleDeleteVerb = async (verbId) => {
  if (confirm('Delete this verb document from your Firestore user_verbs collection?')) {
    await deleteUserVerb(verbId);
    verbsList = verbsList.filter(v => v.id !== verbId);
    showToast('Verb deleted from user_verbs collection.', 'info');
    refreshUI();
  }
};

window.handleQuizAnswer = (idx) => {
  if (!quizState || quizState.answered) return;
  quizState.answered = true;
  quizState.selectedIndex = idx;
  quizState.isCorrect = quizState.options[idx] === quizState.targetVerb.verb;
  if (quizState.isCorrect) triggerCelebration();
  refreshUI();
};

window.nextQuizQuestion = () => {
  quizState = null;
  refreshUI();
};

/**
 * Open Modal to Add a Verb, Usage, and 2-3 Real-Life Sentences
 */
export function openVerbModal() {
  let modal = document.getElementById('verb-creation-modal');
  if (!modal) {
    buildVerbCreationModal();
    modal = document.getElementById('verb-creation-modal');
  }
  if (modal) modal.classList.add('active');
}

function buildVerbCreationModal() {
  const modal = document.createElement('div');
  modal.id = 'verb-creation-modal';
  modal.className = 'modal-backdrop';
  modal.innerHTML = `
    <div class="modal-dialog" style="max-width: 640px;">
      <div class="modal-header">
        <h3 class="modal-title" style="display: flex; align-items: center; gap: 8px;">
          <i data-lucide="plus-circle" style="width: 20px; height: 20px; color: var(--teal-primary);"></i>
          Add Verb to Firestore (user_verbs)
        </h3>
        <button class="btn-icon modal-close-btn" onclick="this.closest('.modal-backdrop').classList.remove('active')">&times;</button>
      </div>

      <div class="modal-body">
        <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 12px;">
          <div class="form-group">
            <label class="form-label">Verb (Base Form) *</label>
            <input type="text" id="modal-verb-input" placeholder="e.g. Mitigate, Spearhead, Refactor" required style="width: 100%;" />
          </div>
          <div class="form-group">
            <label class="form-label">Phonetics / IPA</label>
            <input type="text" id="modal-verb-phonetic" placeholder="/ˈmɪt.ɪ.ɡeɪt/" style="width: 100%;" />
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Definition / Meaning *</label>
          <input type="text" id="modal-verb-meaning" placeholder="To make something less severe or harmful" required style="width: 100%;" />
        </div>

        <div class="form-group">
          <label class="form-label">Grammatical Usage Context & Collocations</label>
          <textarea id="modal-verb-usage" rows="2" placeholder="e.g. Transitive verb; frequently collocated with 'mitigate risks', 'mitigate performance impact'" style="width: 100%;"></textarea>
        </div>

        <div class="form-group">
          <label class="form-label">Verb Forms</label>
          <input type="text" id="modal-verb-forms" placeholder="e.g. V1: mitigate • V2: mitigated • V3: mitigated" style="width: 100%;" />
        </div>

        <!-- 2 to 3 Real-Life Sentences -->
        <div style="border-top: 1px solid var(--border-subtle); padding-top: 14px; margin-top: 14px;">
          <label class="form-label" style="color: var(--teal-primary); font-weight: 700;">
            2 to 3 Real-Life Practical Sentences (Contextual Memory)
          </label>
          <div class="form-group">
            <input type="text" id="modal-verb-s1" placeholder="Sentence 1: Technical / Engineering context (e.g. We mitigated database latency...)" style="width: 100%; margin-bottom: 8px;" />
            <input type="text" id="modal-verb-s2" placeholder="Sentence 2: Workplace / Daily conversation context (e.g. Regular workouts mitigate stress...)" style="width: 100%; margin-bottom: 8px;" />
            <input type="text" id="modal-verb-s3" placeholder="Sentence 3: Interview / Career context (e.g. Explain how you mitigated delays...)" style="width: 100%;" />
          </div>
        </div>

        <div class="form-group" style="margin-top: 12px;">
          <label class="form-label" style="color: #fbbf24; font-weight: 700;">
            💡 Cognitive Memory Hook / Mnemonic for Fast Recall
          </label>
          <input type="text" id="modal-verb-hook" placeholder="e.g. Think of a security gate closing to mitigate flood damage" style="width: 100%;" />
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn btn-secondary modal-close-btn" onclick="this.closest('.modal-backdrop').classList.remove('active')">Cancel</button>
        <button class="btn btn-primary" id="btn-save-verb-firestore">
          <i data-lucide="cloud" style="width: 15px; height: 15px;"></i>
          Save to user_verbs
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  refreshIcons();

  const saveBtn = modal.querySelector('#btn-save-verb-firestore');
  if (saveBtn) {
    saveBtn.onclick = async () => {
      const verb = modal.querySelector('#modal-verb-input').value.trim();
      const meaning = modal.querySelector('#modal-verb-meaning').value.trim();
      if (!verb || !meaning) {
        showToast('Please enter both the verb and its definition.', 'warning');
        return;
      }

      const phonetic = modal.querySelector('#modal-verb-phonetic').value.trim();
      const usage = modal.querySelector('#modal-verb-usage').value.trim();
      const forms = modal.querySelector('#modal-verb-forms').value.trim();
      const s1 = modal.querySelector('#modal-verb-s1').value.trim();
      const s2 = modal.querySelector('#modal-verb-s2').value.trim();
      const s3 = modal.querySelector('#modal-verb-s3').value.trim();
      const hook = modal.querySelector('#modal-verb-hook').value.trim();

      const sentences = [s1, s2, s3].filter(Boolean);

      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving to Firestore...';

      try {
        const newVerbDoc = {
          id: `verb_${Date.now()}`,
          verb,
          phonetic,
          meaning,
          usage,
          forms,
          sentences,
          memoryHook: hook,
          status: 'learning',
          mastered: false
        };

        await saveUserVerb(newVerbDoc);
        verbsList.unshift(newVerbDoc);

        showToast(`Saved "${verb}" to user_verbs collection in Firestore!`, 'success');
        modal.classList.remove('active');

        // Clear form
        modal.querySelectorAll('input, textarea').forEach(el => el.value = '');

        currentCardIndex = 0;
        isCardFlipped = false;
        refreshUI();
      } catch (err) {
        console.error('Failed to save verb to user_verbs:', err);
        showToast('Error saving verb to Firestore', 'error');
      } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save to user_verbs';
      }
    };
  }
}

function highlightVerb(sentence, verb) {
  if (!sentence || !verb) return sentence || '';
  const regex = new RegExp(`(\\b${verb}\\w*\\b)`, 'gi');
  return sentence.replace(regex, `<span class="sentence-highlight">$1</span>`);
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function escapeJs(str) {
  if (!str) return '';
  return str.replace(/'/g, "\\'").replace(/"/g, '&quot;');
}
