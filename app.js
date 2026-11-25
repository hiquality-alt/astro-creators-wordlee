
const creators = [
  "hiquality", "pikaapi", "toxic", "j.j.max", "nazmul",
  "simpy", "korynn", "mimoko", "djam", "lilsnapes",
  "nox", "cardsharkman", "erika", "belittle", "axel",
  "sturmjager", "theramlerblman", "blackwidowink",
  "stargazer", "angelclaw", "vibecreai"
];

const $ = id => document.getElementById(id);

let mode = "daily";
let answer = "";
let guess = "";
let guesses = [];
let finished = false;
let busy = false;
let keyStates = {};

const today = new Date().toISOString().slice(0, 10);
const dailyIndex = Math.floor(
  (new Date(today) - new Date("2026-01-01")) / 86400000
);
const dailyAnswer = creators[
  ((dailyIndex % creators.length) + creators.length) % creators.length
];

function makeConfirmationDialog() {
  let dialog = $("confirmDialog");

  if (!dialog) {
    dialog = document.createElement("dialog");
    dialog.id = "confirmDialog";
    dialog.innerHTML = `
      <h2>Are you sure?</h2>
      <p>This creator isn't on the creator list. Are you sure you want to submit it?</p>
      <button id="confirmYes">Yes, submit</button>
      <button id="confirmNo">Go back</button>
    `;
    document.body.appendChild(dialog);
  }

  $("confirmYes").onclick = () => {
    dialog.close();
    submitAcceptedGuess();
  };

  $("confirmNo").onclick = () => dialog.close();

  return dialog;
}

const confirmDialog = makeConfirmationDialog();

function startGame(newMode = mode) {
  mode = newMode;
  guess = "";
  guesses = [];
  finished = false;
  busy = false;
  keyStates = {};

  if (mode === "daily") {
    answer = dailyAnswer;
    const saved = JSON.parse(localStorage.getItem("astro-wordle-" + today) || "null");

    if (saved) {
      guesses = saved.guesses || [];
      finished = saved.finished || false;
      rebuildKeyStates();
    }
  } else {
    answer = creators[Math.floor(Math.random() * creators.length)];
  }

  if ($("dailyBtn")) $("dailyBtn").classList.toggle("active", mode === "daily");
  if ($("freeBtn")) $("freeBtn").classList.toggle("active", mode === "free");

  render();
}

function saveGame() {
  if (mode === "daily") {
    localStorage.setItem("astro-wordle-" + today, JSON.stringify({
      guesses,
      finished
    }));
  }
}

function score(word) {
  const result = Array(word.length).fill("absent");
  const remaining = answer.split("");

  for (let i = 0; i < word.length; i++) {
    if (word[i] === answer[i]) {
      result[i] = "correct";
      remaining[i] = null;
    }
  }

  for (let i = 0; i < word.length; i++) {
    if (result[i] === "correct") continue;

    const found = remaining.indexOf(word[i]);
    if (found !== -1) {
      result[i] = "present";
      remaining[found] = null;
    }
  }

  return result;
}

function rebuildKeyStates() {
  keyStates = {};

  guesses.forEach(word => {
    const marks = score(word);
    word.split("").forEach((letter, i) => {
      updateKey(letter, marks[i]);
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
        const marks = score(guesses[r]);
        tile.classList.add(marks[c]);
      }

      row.appendChild(tile);
    }

    board.appendChild(row);
  }

  const rows = ["qwertyuiop", "asdfghjkl", "zxcvbnm"];

  rows.forEach((letters, index) => {
    const row = document.createElement("div");
    row.className = "key-row";

    if (index === 2) addKey(row, "ENTER", true);

    for (const letter of letters) addKey(row, letter);

    if (index === 2) addKey(row, "⌫", true);

    keyboard.appendChild(row);
  });

  if ($("bottomNote")) {
    $("bottomNote").textContent =
      `Guess the creator in 6 tries! (${answer.length} letters)`;
  }
}

function addKey(row, value, wide = false) {
  const key = document.createElement("button");
  key.className = "key" + (wide ? " wide" : "");
  key.textContent = value;

  if (keyStates[value]) key.classList.add(keyStates[value]);

  key.onclick = () => {
    if (value === "ENTER") submitGuess();
    else if (value === "⌫") removeLetter();
    else addLetter(value);
  };

  row.appendChild(key);
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

function shakeBoard() {
  $("board").classList.remove("shake");
  void $("board").offsetWidth;
  $("board").classList.add("shake");
}

function submitGuess() {
  if (finished || busy) return;

  if (guess.length !== answer.length) {
    showMessage(`Enter ${answer.length} letters.`);
    shakeBoard();
    return;
  }

  if (!creators.includes(guess)) {
    showMessage("");
    confirmDialog.showModal();
    return;
  }

  submitAcceptedGuess();
}

function submitAcceptedGuess() {
  if (finished || busy) return;

  const submitted = guess;
  const won = submitted === answer;
  const marks = score(submitted);

  busy = true;
  guess = "";
  guesses.push(submitted);

  marks.forEach((mark, i) => {
    updateKey(submitted[i], mark);
  });

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

    if (won) finishGame(true);
    else if (guesses.length >= 6) finishGame(false);

    saveGame();
    render();
  }, answer.length * 100 + 600);
}

function showMessage(message) {
  if ($("message")) $("message").textContent = message;
}

function finishGame(won) {
  finished = true;
  saveGame();

  const title = won ? "You got it!" : "Game over!";
  const text = won
    ? `You guessed ${answer.toUpperCase()} in ${guesses.length} tries.`
    : `The creator was ${answer.toUpperCase()}.`;

  if ($("resultTitle")) $("resultTitle").textContent = title;
  if ($("resultText")) $("resultText").textContent = text;
  if ($("resultDialog")) $("resultDialog").showModal();
}

document.addEventListener("keydown", event => {
  if (event.key === "Enter") submitGuess();
  else if (event.key === "Backspace") removeLetter();
  else if (/^[a-zA-Z]$/.test(event.key)) addLetter(event.key);
});

if ($("dailyBtn")) $("dailyBtn").onclick = () => startGame("daily");
if ($("freeBtn")) $("freeBtn").onclick = () => startGame("free");

if ($("nextBtn")) {
  $("nextBtn").onclick = () => {
    if ($("resultDialog")) $("resultDialog").close();
    startGame("free");
  };
}

if ($("helpBtn")) {
  $("helpBtn").onclick = () => $("helpDialog")?.showModal();
}

if ($("statsBtn")) {
  $("statsBtn").onclick = () => {
    if ($("stats")) {
      $("stats").textContent =
        `${guesses.length} guesses used in this game.`;
    }
    $("statsDialog")?.showModal();
  };
}

if ($("themeBtn")) {
  $("themeBtn").onclick = () => {
    document.body.classList.toggle("light");
  };
}

document.querySelectorAll("[data-close]").forEach(button => {
  button.onclick = () => button.closest("dialog").close();
});

if ($("shareBtn")) {
  $("shareBtn").onclick = () => {
    const result = guesses.map(word =>
      score(word).map(mark =>
        mark === "correct" ? "🟩" :
        mark === "present" ? "🟨" : "⬛"
      ).join("")
    ).join("\n");

    const text = `Astro's Creators Wordle\n${result}`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      showMessage("Result copied!");
    }
  };
}

startGame("daily");
