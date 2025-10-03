// ===== Utilities
const $  = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

// Use LOWERCASE letters to match your HTML buttons' data-letter="a"
const letters = 'abcdefghijklmnopqrstuvwxyz'.split('');

// ===== DOM refs
const letterDisplay = $('#letterDisplay');
const msg           = $('#message');
const scoreEl       = $('#score');
const streakEl      = $('#streak');
const muteBtn       = $('#muteBtn');
const correctSound  = $('#correctSound');
const wrongSound    = $('#wrongSound');

// Map letter -> per-letter audio element (your IDs are A/B/C...Sound)
const letterAudio = Object.fromEntries(
  letters.map(l => [l, document.getElementById(`${l.toUpperCase()}Sound`)])
);

// ===== State
let currentLetter = '?';
let score = 0;
let streak = 0;
let muted = false;
let audioUnlocked = false;

// ===== Audio helpers
function unlockAudioOnFirstTap() {
  if (audioUnlocked) return;
  const all = [correctSound, wrongSound, ...Object.values(letterAudio).filter(Boolean)];
  all.forEach(a => {
    try { a.muted = true; a.play().catch(()=>{}); a.pause(); a.currentTime = 0; } catch {}
  });
  audioUnlocked = true;
  setTimeout(() => all.forEach(a => { if (a) a.muted = muted; }), 0);
}

function setMuted(flag) {
  muted = flag;
  const all = [correctSound, wrongSound, ...Object.values(letterAudio).filter(Boolean)];
  all.forEach(a => { if (a) a.muted = muted; });
  muteBtn.textContent = muted ? '🔇' : '🔊';
  muteBtn.setAttribute('aria-pressed', String(muted));
}

function safePlay(a) {
  if (!a || muted) return;
  a.currentTime = 0;
  a.play().catch(()=>{});
}

// ===== Game logic
function randLetter(exclude) {
  let p;
  do { p = letters[Math.floor(Math.random() * letters.length)]; }
  while (p === exclude);
  return p;
}

function showLetter(letter) {
  currentLetter = letter;               // << fixed var name
  letterDisplay.textContent = letter;   // display lowercase letter
  msg.textContent = '';                 // clear hint
}

function setMessage(text, kind) {
  msg.textContent = text;
  msg.classList.remove('ok', 'bad');
  if (kind === 'ok')  msg.classList.add('ok');
  if (kind === 'bad') msg.classList.add('bad');
}

function resetButtonStyles() {
  $$('.letter-btn').forEach(b => b.classList.remove('correct', 'wrong'));
}

async function playSequence(isCorrect, letter) {
  return new Promise(resolve => {
    const first = isCorrect ? correctSound : wrongSound;
    const second = isCorrect ? letterAudio[letter] : null;

    const playSecond = () => {
      if (second) safePlay(second);
      resolve();
    };

    safePlay(first);
    if (!first) return resolve();

    // best-effort chain
    if (first) {
      first.onended = () => { first.onended = null; playSecond(); };
      // If autoplay policy blocks it, still resolve shortly
      setTimeout(() => { if (first.paused) playSecond(); }, 300);
    }
  });
}

function nextRound() {
  resetButtonStyles();
  showLetter(randLetter(currentLetter));
}

async function handleGuess(guessBtn) {
  unlockAudioOnFirstTap();

  const guess = (guessBtn.dataset.letter || '').toLowerCase();
  const isCorrect = guess === currentLetter;

  if (isCorrect) {
    score += 1;
    streak += 1;
    guessBtn.classList.add('correct');
    setMessage(`Great! ${currentLetter} is correct.`, 'ok');
  } else {
    streak = 0;
    guessBtn.classList.add('wrong');
    setMessage(`Oops! Try again — looking for ${currentLetter}.`, 'bad');
  }

  scoreEl.textContent  = String(score);
  streakEl.textContent = String(streak);

  await playSequence(isCorrect, currentLetter);

  if (isCorrect) setTimeout(nextRound, 400);
  else setTimeout(() => guessBtn.classList.remove('wrong'), 400);
}

// ===== Wiring
$('#buttons').addEventListener('click', (e) => {
  const btn = e.target.closest('.letter-btn');
  if (btn) handleGuess(btn);
});

document.addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  if (!letters.includes(k)) return;
  const btn = document.querySelector(`.letter-btn[data-letter="${k}"]`);
  if (btn) handleGuess(btn);
});

muteBtn.addEventListener('click', () => setMuted(!muted));

// ===== Start
document.addEventListener('DOMContentLoaded', () => {
  setMuted(false);
  nextRound();            // no pickRandomLetter(); this is the start
});
