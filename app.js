
const creators = [
  "hiquality",
  "pikaapi",
  "toxic",
  "j.j.max",
  "nazmul",
  "simpy",
  "korynn",
  "mimoko",
  "djam",
  "lilsnapes",
  "nox",
  "cardsharkman",
  "erika",
  "belittle",
  "axel",
  "sturmjager",
  "theramlerblman",
  "blackwidowink",
  "stargazer",
  "angelclaw",
  "vibecreai"
];

const board = document.getElementById("board");
const keyboard = document.getElementById("keyboard");
const message = document.getElementById("message");

let mode = "daily";
let answer;
let guess = "";
let guesses = [];
let finished = false;
let keyStates = {};

const keyboardRows = [
  "qwertyuiop".split(""),
  "asdfghjkl".split(""),
  ["ENTER", ..."zxcvbnm", "⌫"]
];

function dailyAnswer() {
  const day = Math.floor(Date.now() / 86400000);
  return creators[(day * 7 + 11) % creators.length];
}

function startGame(newMode = mode) {
  mode = newMode;
  answer = mode === "daily"
    ? dailyAnswer()
    : creators[Math.floor(Math.random() * creators.length)];

  guess = "";
  guesses = [];
  finished = false;
  keyStates = {};

  document.getElementById("dailyBtn").classList.toggle("active", mode === "daily");
  document.getElementById("freeBtn").classList.toggle("active", mode === "free");

  document.getElementById("bottomNote").textContent =
    mode === "daily" ? "One creator every day!" : "Free play mode!";

  message.textContent = "";
  render();
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
    if (result[i] !== "correct") {
      const index = remaining.indexOf(word[i]);

      if (index !== -1) {
        result[i] = "present";
        remaining[index] = null;
      }
    }
  }

  return result;
}

function render() {
  board.innerHTML = "";

  for (let r = 0; r < 6; r++) {
    const row = document.createElement("div");
    row.className = "row";

    const word = guesses[r] || (r === guesses.length ? guess : "");
    const width = Math.max(answer.length, 5);

    for (let c = 0; c < width; c++) {
      const tile = document.createElement("div");
      tile.className = "tile";

      const letter = word[c] || "";
      tile.textContent = letter;

      if (letter) tile.classList.add("filled");

      if (guesses[r]) {
        tile.classList.add(score(guesses[r])[c]);
      }

      row.appendChild(tile);
    }

    board.appendChild(row);
  }

  keyboard.innerHTML = "";

  keyboardRows.forEach(keys => {
    const row = document.createElement("div");
    row.className = "key-row";

    keys.forEach(key => {
      const button = document.createElement("button");
      button.className = "key";
      button.textContent = key === "⌫" ? "⌫" : key;

      if (key === "ENTER" || key === "⌫") {
        button.classList.add("wide");
      }

      if (keyStates[key.toLowerCase()]) {
        button.classList.add(keyStates[key.toLowerCase()]);
      }

      button.addEventListener("click", () => press(key));
      row.appendChild(button);
    });

    keyboard.appendChild(row);
  });
}

function press(key) {
  if (finished) return;

  if (key === "ENTER") {
    submitGuess();
    return;
  }

  if (key === "⌫" || key === "BACKSPACE") {
    guess = guess.slice(0, -1);
    render();
    return;
  }

  const letter = key.toLowerCase();

  if (/^[a-z.]$/.test(letter) && guess.length < answer.length) {
    guess += letter;
    render();
  }
}

function submitGuess() {
  if (guess.length !== answer.length) {
    message.textContent = `Enter ${answer.length} characters.`;
    return;
  }

  if (!creators.includes(guess)) {
    message.textContent = "That creator name isn't in the list!";
    return;
  }

  guesses.push(guess);

  const marks = score(guess);
  const priority = { absent: 0, present: 1, correct: 2 };

  guess.split("").forEach((letter, i) => {
    const key = letter;

    if (!keyStates[key] || priority[marks[i]] > priority[keyStates[key]]) {
      keyStates[key] = marks[i];
    }
  });

  const won = guess === answer;
  guess = "";

  if (won || guesses.length === 6) {
    finish(won);
  }

  render();
}

function finish(won) {
  finished = true;

  document.getElementById("resultTitle").textContent =
    won ? "Brilliant! 🎉" : "Game over!";

  document.getElementById("resultText").textContent =
    won
      ? `You guessed ${answer} in ${guesses.length} tries!`
      : `The creator was ${answer}.`;

  document.getElementById("resultDialog").showModal();
}

function shareResult() {
  const grid = guesses.map(word =>
    score(word).map(mark =>
      mark === "correct" ? "🟩" :
      mark === "present" ? "🟨" : "⬛"
    ).join("")
  ).join("\n");

  const result =
    `Astro's Creators Wordle\n${guesses.length}/6\n\n${grid}`;

  if (navigator.share) {
    navigator.share({ text: result }).catch(() => {});
  } else if (navigator.clipboard) {
    navigator.clipboard.writeText(result);
    message.textContent = "Result copied!";
  }
}

document.getElementById("dailyBtn").onclick = () => startGame("daily");
document.getElementById("freeBtn").onclick = () => startGame("free");

document.getElementById("helpBtn").onclick = () =>
  document.getElementById("helpDialog").showModal();

document.getElementById("statsBtn").onclick = () => {
  document.getElementById("stats").textContent = "Stats coming soon!";
  document.getElementById("statsDialog").showModal();
};

document.getElementById("themeBtn").onclick = () =>
  document.body.classList.toggle("light");

document.querySelectorAll("[data-close]").forEach(button => {
  button.onclick = () => button.closest("dialog").close();
});

document.getElementById("shareBtn").onclick = shareResult;

document.getElementById("nextBtn").onclick = () => {
  document.getElementById("resultDialog").close();
  startGame("free");
};

document.addEventListener("keydown", event => {
  if (event.ctrlKey || event.altKey || event.metaKey) return;

  if (event.key === "Enter") {
    press("ENTER");
  } else if (event.key === "Backspace") {
    press("BACKSPACE");
  } else if (/^[a-z.]$/i.test(event.key)) {
    press(event.key);
  }
});

startGame("daily");
