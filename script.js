// Utility
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

const letterDisplay = $("#letterDisplay");
const imageDisplay  = $("#imageDisplay");
const msg           = $("#message");
const scoreEl       = $("#score");
const streakEl      = $("#streak");
const muteBtn       = $("#muteBtn");

const correctSound  = $("#correctSound");
const wrongSound    = $("#wrongSound");

// Map letters to <audio> element IDs you already included
const letterAudio = Object.fromEntries(
  letters.map((L) => [L, document.getElementById(`${L}Sound`)])
);

// Optional: If you have per-letter images, set them here; otherwise we keep your default.
const letterImages = {
  // Example:
  // A: "images/a-apple.jpg",
  // B: "images/b-ball.jpg",
  // ...
};

// State
let currentLetter = "?";
let score = 0;
let streak = 0;
let muted = false;
let audioUnlocked = false;

// iOS/Chrome mobile need a user gesture before audio can play reliably.
function unlockAudioOnFirstTap() {
  if (audioUnlocked) return;
  const all = [correctSound, wrongSound, ...Object.values(letterAudio)];
  all.forEach((a) => {
    try { a.muted = true; a.play().catch(()=>{}); a.pause(); a.currentTime = 0; } catch {}
  });
  audioUnlocked = true;
  // Unmute back to current setting
  setTimeout(() => {
    all.forEach((a)=> a.muted = muted);
  }, 0);
}

function setMuted(flag) {
  muted = flag;
  const all = [correctSound, wrongSound, ...Object.values(letterAudio)];
  all.forEach((a) => (a.muted = muted));
  muteBtn.textContent = muted ? "🔇" : "🔊";
  muteBtn.setAttribute("aria-pressed", String(muted));
}

function randLetter(exclude) {
  let pick;
  do {
    pick = letters[Math.floor(Math.random() * letters.length)];
  } while (pick === exclude);
  return pick;
}

function showLetter(L) {
  currentLetter = l;
  letterDisplay.textContent = l;

  // Update image if available, else keep current
  const img = letterImages[L];
  if (img) {
    imageDisplay.src = img;
    imageDisplay.alt = `Image for ${L}`;
  }
}

function setMessage(text, type) {
  msg.textContent = text;
  msg.classList.remove("ok", "bad");
  if (type === "ok") msg.classList.add("ok");
  if (type === "bad") msg.classList.add("bad");
}

function resetButtonStyles() {
  $$(".letter-btn").forEach((b) => b.classList.remove("correct", "wrong"));
}

async function playSequence(isCorrect, letter) {
  const first = isCorrect ? correctSound : wrongSound;
  const second = isCorrect ? letterAudio[letter] : null;

  // Some browsers ignore await on play; we use events
  return new Promise((resolve) => {
    const playSecond = () => {
      if (second) {
        second.currentTime = 0;
        second.play().catch(()=>{}); // best-effort
        // No need to wait for finishing
      }
      resolve();
    };

    first.currentTime = 0;
    first.play().then(() => {
      first.onended = () => {
        first.onended = null;
        playSecond();
      };
    }).catch(() => {
      // If first can't play, try second or resolve
      playSecond();
    });
  });
}

function nextRound() {
  resetButtonStyles();
  const l = randLetter(currentLetter);
  showLetter(l);
  setMessage("", "");
}

async function handleGuess(guessBtn) {
  unlockAudioOnFirstTap();

  const guess = guessBtn.dataset.letter;
  const isCorrect = guess === currentLetter;

  if (isCorrect) {
    score++;
    streak++;
    guessBtn.classList.add("correct");
    setMessage(`Great! ${currentLetter} is correct.`, "ok");
  } else {
    streak = 0;
    guessBtn.classList.add("wrong");
    setMessage(`Oops! Try again — looking for ${currentLetter}.`, "bad");
  }

  scoreEl.textContent = String(score);
  streakEl.textContent = String(streak);

  await playSequence(isCorrect, currentLetter);

  if (isCorrect) {
    setTimeout(nextRound, 500);
  } else {
    // keep the same letter; remove red border after a moment
    setTimeout(() => guessBtn.classList.remove("wrong"), 500);
  }
}

// Wire up buttons
$("#buttons").addEventListener("click", (e) => {
  const btn = e.target.closest(".letter-btn");
  if (!btn) return;
  handleGuess(btn);
});

// Keyboard support (A–Z)
document.addEventListener("keydown", (e) => {
  const key = e.key.toUpperCase();
  if (letters.includes(key)) {
    const btn = document.querySelector(`.letter-btn[data-letter="${key}"]`);
    if (btn) handleGuess(btn);
  }
});

// Mute toggle
muteBtn.addEventListener("click", () => setMuted(!muted));

// Start
setMuted(false);
nextRound();
document.addEventListener("DOMContentLoaded", () => {
  pickRandomLetter();
});
