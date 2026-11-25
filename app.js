
"use strict";

// ASTRO'S CREATORS WORDLE

const CREATORS = [
  "hiquality", "pikaapi", "toxic", "j.j.max", "nazmul",
  "simpy", "korynn", "mimoko", "djam", "lilsnapes",
  "nox", "cardsharkman", "erika", "belittle", "axel",
  "sturmjager", "theramlerblman", "blackwidowink",
  "stargazer", "angelclaw", "vibecreai"
];

const $ = id => document.getElementById(id);

let answer = "";
let guess = "";
let guesses = [];
let mode = "daily";
let finished = false;
let busy = false;
let keyStates = {};

const today = new Date().toISOString().slice(0, 10);

function getDailyAnswer() {
  const start = new Date("2026-01-01");
  const current = new Date(today);
  const days = Math.floor((current - start) / 86400000);
  return CREATORS[((days % CREATORS.length) + CREATORS.length) % CREATORS.length];
}

function setup() {
  const board = $("board");
  const keyboard = $("keyboard");

  if (!board || !keyboard) {
    console.error("Wordle: board or keyboard element is missing.");
    return;
  }

  createConfirmationDialog();

  $("dailyBtn").onclick = () => startGame("daily");
  $("freeBtn").onclick = () => startGame("free");

  $("helpBtn").onclick = () => $("helpDialog").showModal();
  $("statsBtn").onclick = showStats;

  $("themeBtn").onclick = () => {
    document.body.classList.toggle("light");
  };

  $("nextBtn").onclick = () => {
    $("resultDialog").close();
    startGame("free");
  };

  $("shareBtn").onclick = shareResult;

  document.querySelectorAll("[data-close]").forEach(button => {
    button.onclick = () => button.closest("dialog").close();
  });

  document.addEventListener("keydown", event => {
    if (event.target.tagName === "INPUT") return;

    if (event.key === "Enter") submitGuess();
    else if (event.key === "Backspace") removeLetter();
    else if (/^[a-zA-Z]$/.test(event.key)) addLetter(event.key);
  });

  startGame("daily");
}

function createConfirmationDialog() {
  let dialog = $("confirmDialog");

  if (!dialog) {
    dialog = document.createElement("dialog");
    dialog.id = "confirmDialog";
    dialog.innerHTML = `
      <h2>Are you sure?</h2>
      <p>This creator isn't on the list. Do you still want to submit it?</p>
      <button id="confirmYes">Yes, submit</button>
      <button id="confirmNo">Go back</button>
    `;
    document.body.appendChild(dialog);
  }

  $("confirmYes").onclick = () => {
    dialog.close();
    acceptGuess();
  };

  $("confirmNo").onclick = () => dialog.close();
}

function startGame(newMode) {
  mode = newMode;
  guess = "";
  guesses = [];
  finished = false;
  busy = false;
  keyStates = {};

  if (mode === "daily") {
    answer = getDailyAnswer();

    try {
      const saved = JSON.parse(
        localStorage.getItem("astro-wordle-" + today) || "null"
      );

      if (saved) {
        guesses = saved.guesses || [];
        finished = saved.finished || false;
        rebuildKeys();
      }
    } catch {
      guesses = [];
    }
  } else {
    answer = CREATORS[Math.floor(Math.random() * CREATORS.length)];
  }

  $("dailyBtn").classList.toggle("active", mode === "daily");
  $("freeBtn").classList.toggle("active", mode === "free");

  showMessage("");
  render();
}

function saveGame() {
  if (mode !== "daily") return;

  localStorage.setItem("astro-wordle-" + today, JSON.stringify({
    guesses,
    finished
  }));
}

function score(word) {
  const marks = Array(word.length).fill("absent");
  const remaining = answer.split("");

  for (let i = 0; i < word.length; i++) {
    if (word[i] === answer[i]) {
      marks[i] = "correct";
      remaining[i] = null;
    }
  }

  for (let i = 0; i < word.length; i++) {
    if (marks[i] === "correct") continue;

    const index = remaining.indexOf(word[i]);
    if (index !== -1) {
      marks[i] = "present";
      remaining[index] = null;
    }
  }

  return marks;
}

function rebuildKeys() {
  keyStates = {};

  guesses.forEach(word => {
    if (word.length !== answer.length) return;

    score(word).forEach((mark, i) => {
      updateKey(word[i], mark);
    });
  });
}

function updateKey(letter, state) {
  const priority = { absent: 1, present: 2, correct: 3 };

  if (!keyStates[letter] || priority[state] > priority[keyStates[letter]]) {
    keyStates[letter] = state;
  }
}

function render() {
  const board = $("board");
  const keyboard = $("keyboard");

  board.innerHTML = "";
  keyboard.innerHTML = "";

  for (let r = 0; r < 6; r++) {
    const row = document.createElement("div");
    row.className = "row";

    for (let c = 0; c < answer.length; c++) {
      const tile = document.createElement("div");
      tile.className = "tile";

      const value = guesses[r]?.[c] ||
        (r === guesses.length && !finished ? guess[c] : "");

      tile.textContent = value || "";

      if (value) tile.classList.add("filled");

      if (guesses[r]) {
        tile.classList.add(score(guesses[r])[c]);
      }

      row.appendChild(tile);
    }

    board.appendChild(row);
  }

  const keyboardRows = [
    "qwertyuiop",
    "asdfghjkl",
    "zxcvbnm"
  ];

  keyboardRows.forEach((letters, index) => {
    const row = document.createElement("div");
    row.className = "key-row";

    if (index === 2) addKey(row, "ENTER", true);

    [...letters].forEach(letter => addKey(row, letter));

    if (index === 2) addKey(row, "⌫", true);

    keyboard.appendChild(row);
  });

  $("bottomNote").textContent =
    `Guess the creator in 6 tries! (${answer.length} letters)`;
}

function addKey(row, value, wide = false) {
  const button = document.createElement("button");
  button.className = "key" + (wide ? " wide" : "");
  button.textContent = value;

  if (keyStates[value]) button.classList.add(keyStates[value]);

  button.onclick = () => {
    if (value === "ENTER") submitGuess();
    else if (value === "⌫") removeLetter();
    else addLetter(value);
  };

  row.appendChild(button);
}

function addLetter(letter) {
  if (finished || busy || guess.length >= answer.length) return;

  guess += letter.toLowerCase();
  render();
}

function removeLetter() {
  if (finished || busy) return;

  guess = guess.slice(0, -1);
  render();
}

function submitGuess() {
  if (finished || busy) return;

  if (guess.length !== answer.length) {
    showMessage(`Enter ${answer.length} letters.`);
    $("board").classList.add("shake");
    setTimeout(() => $("board").classList.remove("shake"), 400);
    return;
  }

  if (!CREATORS.includes(guess)) {
    $("confirmDialog").showModal();
    return;
  }

  acceptGuess();
}

function acceptGuess() {
  if (finished || busy || guess.length !== answer.length) return;

  const submitted = guess;
  const marks = score(submitted);
  const won = submitted === answer;

  guesses.push(submitted);
  guess = "";
  busy = true;

  marks.forEach((mark, i) => updateKey(submitted[i], mark));

  render();

  const row = $("board").children[guesses.length - 1];

  submitted.split("").forEach((letter, i) => {
    const tile = row.children[i];

    setTimeout(() => {
      tile.classList.add("flip");

      setTimeout(() => {
        tile.classList.add(marks[i]);
      }, 250);
    }, i * 100);
  });

  setTimeout(() => {
    busy = false;

    if (won) endGame(true);
    else if (guesses.length >= 6) endGame(false);

    saveGame();
    render();
  }, answer.length * 100 + 600);
}

function endGame(won) {
  finished = true;
  saveGame();

  $("resultTitle").textContent = won ? "You got it!" : "Game over!";
  $("resultText").textContent = won
    ? `You guessed ${answer.toUpperCase()} in ${guesses.length} tries!`
    : `The creator was ${answer.toUpperCase()}.`;

  $("resultDialog").showModal();
}

function showMessage(message) {
  $("message").textContent = message;
}

function showStats() {
  $("stats").textContent =
    `Guesses used this game: ${guesses.length}`;
  $("statsDialog").showModal();
}

function shareResult() {
  const result = guesses.map(word =>
    score(word).map(mark =>
      mark === "correct" ? "🟩" :
      mark === "present" ? "🟨" : "⬛"
    ).join("")
  ).join("\n");

  const text = `Astro's Creators Wordle\n${result}`;

  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text);
    showMessage("Result copied!");
  }
}

// Wait until the HTML is ready before drawing the board.
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", setup);
} else {
  setup();
}
