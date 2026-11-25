
const creators = [
  "hiquality", "pikaapi", "toxic", "j.j.max", "nazmul",
  "simpy", "korynn", "mimoko", "djam", "lilsnapes",
  "nox", "cardsharkman", "erika", "belittle", "axel",
  "sturmjager", "theramlerblman", "blackwidowink",
  "stargazer", "angelclaw", "vibecreai"
];

const $ = id => document.getElementById(id);
const board = $("board");
const keyboard = $("keyboard");
const message = $("message");

let mode = "daily";
let answer = "";
let guess = "";
let guesses = [];
let finished = false;
let busy = false;
let keyStates = {};

const keyboardRows = [
  "qwertyuiop".split(""),
  "asdfghjkl".split(""),
  ["ENTER", ..."zxcvbnm", "⌫"]
];

const today = () => new Date().toLocaleDateString("en-CA");

function dailyAnswer() {
  const date = new Date();
  const start = new Date(date.getFullYear(), 0, 0);
  const day = Math.floor((date - start) / 86400000);
  return creators[(day * 7 + 11) % creators.length];
}

function saveGame() {
  if (mode === "daily") {
    localStorage.setItem("astro-wordle-daily", JSON.stringify({
      date: today(),
      guesses,
      finished
    }));
  }
}

function loadGame() {
  if (mode !== "daily") return;

  try {
    const saved = JSON.parse(
      localStorage.getItem("astro-wordle-daily")
    );

    if (saved && saved.date === today()) {
      guesses = saved.guesses || [];
      finished = !!saved.finished;
    }
  } catch {}
}

function startGame(newMode = mode) {
  mode = newMode;
  guess = "";
  guesses = [];
  finished = false;
  busy = false;
  keyStates = {};

  answer = mode === "daily"
    ? dailyAnswer()
    : creators[Math.floor(Math.random() * creators.length)];

  $("dailyBtn").classList.toggle("active", mode === "daily");
  $("freeBtn").classList.toggle("active", mode === "free");

  $("bottomNote").textContent = mode === "daily"
    ? "One creator every day."
    : "Free play — guess another creator!";

  message.textContent = "";

  loadGame();
  rebuildKeyStates();
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

function rebuildKeyStates() {
  keyStates = {};

  guesses.forEach(word => {
    const marks = score(word);

    word.split("").forEach((letter, i) => {
      const priority = {
        absent: 0,
        present: 1,
        correct: 2
      };

      if (
        !keyStates[letter] ||
        priority[marks[i]] > priority[keyStates[letter]]
      ) {
        keyStates[letter] = marks[i];
      }
    });
  });
}

function render() {
  board.innerHTML = "";

  for (let r = 0; r < 6; r++) {
    const row = document.createElement("div");
    row.className = "row";

    const word = guesses[r] || (
      r === guesses.length && !finished ? guess : ""
    );

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

function shakeBoard() {
  board.classList.remove("shake");
  void board.offsetWidth;
  board.classList.add("shake");
}

function press(key) {
  if (finished || busy) return;

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
    shakeBoard();
    return;
  }

  if (!creators.includes(guess)) {
    $("confirmDialog").showModal();
    return;
  }

  submitAcceptedGuess();
}

function submitAcceptedGuess() {
  if (finished || busy) return;

  busy = true;
  message.textContent = "";

  const submitted = guess;
  const rowIndex = guesses.length;
  const won = submitted === answer;

  guesses.push(submitted);
  guess = "";

  const marks = score(submitted);
  const row = board.children[rowIndex];

  submitted.split("").forEach((letter, i) => {
    const tile = row.children[i];

    setTimeout(() => {
      tile.classList.add("flip");

      setTimeout(() => {
        tile.classList.add(marks[i]);
        updateKey(letter, marks[i]);
      }, 250);
    }, i * 100);
  });

  const animationTime = submitted.length * 100 + 550;

  setTimeout(() => {
    busy = false;
    saveGame();

    if (won) finish(true);
    else if (guesses.length === 6) finish(false);

    render();
  }, animationTime);
}

$("confirmYes").onclick = () => {
  $("confirmDialog").close();
  submitAcceptedGuess();
};

$("confirmNo").onclick = () => {
  $("confirmDialog").close();
};


  busy = true;
  message.textContent = "";

  const submitted = guess;
  const rowIndex = guesses.length;
  const won = submitted === answer;

  guesses.push(submitted);
  guess = "";

  const marks = score(submitted);
  const row = board.children[rowIndex];

  submitted.split("").forEach((letter, i) => {
    const tile = row.children[i];

    setTimeout(() => {
      tile.classList.add("flip");

      setTimeout(() => {
        tile.classList.add(marks[i]);
        updateKey(letter, marks[i]);
      }, 250);
    }, i * 100);
  });

  const animationTime = submitted.length * 100 + 550;

  setTimeout(() => {
    busy = false;
    saveGame();

    if (won) {
      finish(true);
    } else if (guesses.length === 6) {
      finish(false);
    }

    render();
  }, animationTime);
}

function updateKey(letter, mark) {
  const priority = {
    absent: 0,
    present: 1,
    correct: 2
  };

  if (
    !keyStates[letter] ||
    priority[mark] > priority[keyStates[letter]]
  ) {
    keyStates[letter] = mark;
  }

  const buttons = keyboard.querySelectorAll(".key");

  buttons.forEach(button => {
    if (button.textContent.toLowerCase() === letter) {
      button.classList.remove("correct", "present", "absent");
      button.classList.add(keyStates[letter]);
    }
  });
}

function finish(won) {
  finished = true;
  saveGame();

  $("resultTitle").textContent = won
    ? "Brilliant! 🎉"
    : "Game over!";

  $("resultText").textContent = won
    ? `You guessed ${answer} in ${guesses.length} tries!`
    : `The creator was ${answer}.`;

  $("resultDialog").showModal();
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
    navigator.clipboard.writeText(result)
      .then(() => message.textContent = "Result copied!");
  }
}

$("dailyBtn").onclick = () => startGame("daily");
$("freeBtn").onclick = () => startGame("free");

$("helpBtn").onclick = () => $("helpDialog").showModal();

$("statsBtn").onclick = () => {
  $("stats").textContent = "Statistics coming soon!";
  $("statsDialog").showModal();
};

$("themeBtn").onclick = () =>
  document.body.classList.toggle("light");

document.querySelectorAll("[data-close]").forEach(button => {
  button.onclick = () => button.closest("dialog").close();
});

$("shareBtn").onclick = shareResult;

$("nextBtn").onclick = () => {
  $("resultDialog").close();
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
