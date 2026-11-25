
"use strict";

/* ASTRO'S CREATORS WORDLE */

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
let pendingGuess = "";

const today = new Date().toISOString().slice(0, 10);

function getDailyAnswer() {
  const start = new Date("2026-01-01");
  const current = new Date(today);
  const days = Math.floor((current - start) / 86400000);
  return CREATORS[
    ((days % CREATORS.length) + CREATORS.length) % CREATORS.length
  ];
}

/* CREATE MISSING HTML ELEMENTS */

function ensureElement(id, parent, tag = "div") {
  let element = $(id);

  if (!element) {
    element = document.createElement(tag);
    element.id = id;
    parent.appendChild(element);
  }

  return element;
}

function setupElements() {
  const body = document.body;

  let main = document.querySelector("main");

  if (!main) {
    main = document.createElement("main");
    body.appendChild(main);
  }

  ensureElement("message", main);
  ensureElement("board", main);
  ensureElement("keyboard", main);

  let note = $("bottomNote");
  if (!note) {
    note = document.createElement("p");
    note.id = "bottomNote";
    main.appendChild(note);
  }

  ensureElement("dailyBtn", document.querySelector("nav") || main, "button");
  ensureElement("freeBtn", document.querySelector("nav") || main, "button");

  ensureElement("helpBtn", document.querySelector("header") || body, "button");
  ensureElement("statsBtn", document.querySelector("header") || body, "button");
  ensureElement("themeBtn", document.querySelector("header") || body, "button");

  ensureDialog("helpDialog", "How to play",
    "<p>Guess the creator in six tries.</p><p>🟩 Correct letter and position.</p><p>🟨 Correct letter, wrong position.</p><p>⬛ Letter is not in the name.</p>");

  ensureDialog("statsDialog", "Statistics", '<div id="stats"></div>');

  ensureDialog("resultDialog", "Game over",
    '<p id="resultText"></p><button id="shareBtn">Share result</button><button id="nextBtn">Play again</button>');

  ensureDialog("confirmDialog", "Are you sure?",
    '<p>This creator is not on the list. Are you sure you want to submit it?</p><button id="confirmYes">Yes, submit</button><button id="confirmNo">Go back</button>');

  ["helpDialog", "statsDialog", "resultDialog", "confirmDialog"].forEach(id => {
    const dialog = $(id);
    if (dialog && !dialog.querySelector("[data-close]")) {
      const close = document.createElement("button");
      close.textContent = "×";
      close.className = "close";
      close.setAttribute("data-close", "");
      dialog.prepend(close);
    }
  });
}

function ensureDialog(id, heading, content) {
  let dialog = $(id);

  if (!dialog) {
    dialog = document.createElement("dialog");
    dialog.id = id;
    document.body.appendChild(dialog);
  }

  if (!dialog.innerHTML.trim()) {
    dialog.innerHTML = `<h2>${heading}</h2>${content}`;
  }

  return dialog;
}

/* GAME SETUP */

function setup() {
  setupElements();

  $("dailyBtn").textContent = "Daily";
  $("freeBtn").textContent = "Free Play";

  $("dailyBtn").onclick = () => startGame("daily");
  $("freeBtn").onclick = () => startGame("free");

  $("helpBtn").onclick = () => openDialog("helpDialog");
  $("statsBtn").onclick = showStats;

  $("themeBtn").onclick = () => {
    document.body.classList.toggle("light");
  };

  $("nextBtn").onclick = () => {
    closeDialog("resultDialog");
    startGame("free");
  };

  $("shareBtn").onclick = shareResult;

  $("confirmYes").onclick = () => {
    closeDialog("confirmDialog");
    guess = pendingGuess;
    acceptGuess();
  };

  $("confirmNo").onclick = () => {
    closeDialog("confirmDialog");
    pendingGuess = "";
  };

  document.querySelectorAll("[data-close]").forEach(button => {
    button.onclick = () => closeDialog(button.closest("dialog").id);
  });

  document.addEventListener("keydown", event => {
    if (event.target.matches("input, textarea")) return;

    if (event.key === "Enter") {
      event.preventDefault();
      submitGuess();
    } else if (event.key === "Backspace") {
      removeLetter();
    } else if (/^[a-zA-Z.-]$/.test(event.key)) {
      addLetter(event.key);
    }
  });

  startGame("daily");
}

function openDialog(id) {
  const dialog = $(id);
  if (!dialog) return;

  if (typeof dialog.showModal === "function") {
    if (!dialog.open) dialog.showModal();
  } else {
    dialog.setAttribute("open", "");
  }
}

function closeDialog(id) {
  const dialog = $(id);
  if (!dialog) return;

  if (typeof dialog.close === "function") {
    dialog.close();
  } else {
    dialog.removeAttribute("open");
  }
}

/* START AND SAVE */

function startGame(newMode) {
  mode = newMode;
  guess = "";
  guesses = [];
  finished = false;
  busy = false;
  keyStates = {};
  pendingGuess = "";

  if (mode === "daily") {
    answer = getDailyAnswer();

    try {
      const saved = JSON.parse(
        localStorage.getItem("astro-wordle-" + today) || "null"
      );

      if (saved && Array.isArray(saved.guesses)) {
        guesses = saved.guesses.filter(
          word => typeof word === "string" && word.length === answer.length
        ).slice(0, 6);

        finished = Boolean(saved.finished);
        rebuildKeys();
      }
    } catch (error) {
      console.warn("Could not load saved game:", error);
    }
  } else {
    answer = CREATORS[Math.floor(Math.random() * CREATORS.length)];
  }

  $("dailyBtn").classList.toggle("active", mode === "daily");
  $("freeBtn").classList.toggle("active", mode === "free");

  closeDialog("resultDialog");
  closeDialog("confirmDialog");

  showMessage("");
  render();
}

function saveGame() {
  if (mode !== "daily") return;

  try {
    localStorage.setItem("astro-wordle-" + today, JSON.stringify({
      guesses,
      finished
    }));
  } catch (error) {
    console.warn("Could not save game:", error);
  }
}

/* WORDLE COLOUR CHECKING */

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

function updateKey(letter, state) {
  const priority = { absent: 1, present: 2, correct: 3 };

  if (!keyStates[letter] || priority[state] > priority[keyStates[letter]]) {
    keyStates[letter] = state;
  }
}

function rebuildKeys() {
  keyStates = {};

  guesses.forEach(word => {
    score(word).forEach((mark, index) => {
      updateKey(word[index], mark);
    });
  });
}

/* DRAW THE BOARD AND KEYBOARD */

function render() {
  const board = $("board");
  const keyboard = $("keyboard");

  if (!board || !keyboard || !answer) {
    console.error("Wordle could not find the board, keyboard, or answer.");
    return;
  }

  board.innerHTML = "";
  keyboard.innerHTML = "";

  for (let rowIndex = 0; rowIndex < 6; rowIndex++) {
    const row = document.createElement("div");
    row.className = "row";

    for (let col = 0; col < answer.length; col++) {
      const tile = document.createElement("div");
      tile.className = "tile";

      let value = "";

      if (guesses[rowIndex]) {
        value = guesses[rowIndex][col] || "";
      } else if (rowIndex === guesses.length && !finished) {
        value = guess[col] || "";
      }

      tile.textContent = value;

      if (value) tile.classList.add("filled");

      if (guesses[rowIndex]) {
        tile.classList.add(score(guesses[rowIndex])[col]);
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

    if (index === 2) {
      addKey(row, ".", false);
      addKey(row, "⌫", true);
    }

    keyboard.appendChild(row);
  });

  $("bottomNote").textContent =
    `Guess the creator in 6 tries! (${answer.length} characters)`;
}

function addKey(row, value, wide = false) {
  const button = document.createElement("button");

  button.type = "button";
  button.className = "key" + (wide ? " wide" : "");
  button.textContent = value;

  if (keyStates[value]) {
    button.classList.add(keyStates[value]);
  }

  button.onclick = () => {
    if (value === "ENTER") submitGuess();
    else if (value === "⌫") removeLetter();
    else addLetter(value);
  };

  row.appendChild(button);
}

/* ENTER LETTERS */

function addLetter(letter) {
  if (finished || busy || guess.length >= answer.length) return;

  guess += letter.toLowerCase();
  showMessage("");
  render();
}

function removeLetter() {
  if (finished || busy) return;

  guess = guess.slice(0, -1);
  render();
}

/* SUBMIT A GUESS */

function submitGuess() {
  if (finished || busy) return;

  if (guess.length !== answer.length) {
    showMessage(`Enter ${answer.length} characters.`);
    $("board").classList.remove("shake");
    void $("board").offsetWidth;
    $("board").classList.add("shake");
    return;
  }

  if (!CREATORS.includes(guess)) {
    pendingGuess = guess;
    openDialog("confirmDialog");
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

  marks.forEach((mark, index) => {
    updateKey(submitted[index], mark);
  });

  render();

  const row = $("board").children[guesses.length - 1];

  submitted.split("").forEach((letter, index) => {
    const tile = row.children[index];

    setTimeout(() => {
      tile.classList.add("flip");

      setTimeout(() => {
        tile.classList.add(marks[index]);
      }, 250);
    }, index * 100);
  });

  setTimeout(() => {
    busy = false;

    if (won) {
      endGame(true);
    } else if (guesses.length >= 6) {
      endGame(false);
    }

    saveGame();
    render();
  }, answer.length * 100 + 650);
}

/* END GAME */

function endGame(won) {
  finished = true;
  saveGame();

  $("resultTitle").textContent = won ? "You got it!" : "Game over!";

  $("resultText").textContent = won
    ? `You guessed ${answer.toUpperCase()} in ${guesses.length} tries!`
    : `The creator was ${answer.toUpperCase()}.`;

  openDialog("resultDialog");
}

/* MESSAGES AND STATS */

function showMessage(message) {
  $("message").textContent = message;
}

function showStats() {
  $("stats").textContent = `Guesses used this game: ${guesses.length}`;
  openDialog("statsDialog");
}

/* SHARE */

function shareResult() {
  const result = guesses.map(word =>
    score(word).map(mark =>
      mark === "correct" ? "🟩" :
      mark === "present" ? "🟨" : "⬛"
    ).join("")
  ).join("\n");

  const text =
    `Astro's Creators Wordle\n${result}\n${guesses.length}/6`;

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text)
      .then(() => showMessage("Result copied!"))
      .catch(() => showMessage("Could not copy result."));
  } else {
    showMessage("Copy is not supported in this browser.");
  }
}

/* START AFTER THE PAGE LOADS */

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", setup);
} else {
  setup();
}
