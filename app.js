
"use strict";

const ORIGINAL_CREATORS = [
  "hiquality", "pikaapi", "toxic", "j.j.max", "nazmul",
  "simpy", "korynn", "mimoko", "djam", "lilsnapes",
  "nox", "cardsharkman", "erika", "belittle", "axel",
  "sturmjager", "theramlerblman", "blackwidowink",
  "stargazer", "angelclaw", "vibecreai", "creativeguy", "planktonfun", "selrak", 
];

const CREATORS = [...ORIGINAL_CREATORS];

const ADMIN_UID = "kkRVVb2c0jd8tMRmoIZUOFVH3Fl1";

const firebaseConfig = {
  apiKey: "AIzaSyBCwKZRARQxvm2Vv4oqvcrWBwfQ6HqJBCI",
  authDomain: "wordle-d9760.firebaseapp.com",
  databaseURL: "https://wordle-d9760-default-rtdb.firebaseio.com",
  projectId: "wordle-d9760",
  storageBucket: "wordle-d9760.firebasestorage.app",
  messagingSenderId: "688177001022",
  appId: "1:688177001022:web:70202c003cceda976d976f",
  measurementId: "G-M80RBSLSN7"
};

const $ = id => document.getElementById(id);
const today = new Date().toISOString().slice(0, 10);

let answer = "";
let guess = "";
let guesses = [];
let mode = "daily";
let finished = false;
let busy = false;
let keyStates = {};
let pendingGuess = "";
let firebaseAuth = null;
let creatorsRef = null;
let isAdmin = false;
let creatorDataReady = false;

function showMessage(message) {
  $("message").textContent = message;
}

function openDialog(id) {
  const dialog = $(id);
  if (dialog && !dialog.open) dialog.showModal();
}

function closeDialog(id) {
  const dialog = $(id);
  if (dialog && dialog.open) dialog.close();
}

/* FIREBASE */

function initFirebase() {
  if (!window.firebase) {
    showMessage("Firebase could not load. Refresh the page.");
    return;
  }

  try {
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }

    firebaseAuth = firebase.auth();
    creatorsRef = firebase.database().ref("creators");

    creatorsRef.on("value", snapshot => {
      const remoteNames = [];

      snapshot.forEach(child => {
        const value = child.val();

        if (typeof value === "string") {
          const name = value.trim().toLowerCase();

          if (/^[a-z0-9.-]{1,25}$/.test(name)) {
            remoteNames.push(name);
          }
        }
      });

      CREATORS.splice(0, CREATORS.length, ...ORIGINAL_CREATORS);

      remoteNames.forEach(name => {
        if (!CREATORS.includes(name)) {
          CREATORS.push(name);
        }
      });

      creatorDataReady = true;

      if (!answer) {
        startGame(mode);
      }
    }, error => {
      console.error(error);
      showMessage("Could not load online creators.");
    });

    firebaseAuth.onAuthStateChanged(user => {
      updateAdminPanel(user);
    });

  } catch (error) {
    console.error(error);
    showMessage("Firebase setup failed.");
  }
}

/* DAILY ANSWER */

function getDailyAnswer() {
  const start = new Date("2026-01-01T00:00:00Z");
  const current = new Date(today + "T00:00:00Z");
  const days = Math.floor((current - start) / 86400000);

  return CREATORS[
    ((days % CREATORS.length) + CREATORS.length) % CREATORS.length
  ];
}

/* ADMIN CORNER */

function setupSecretCorner() {
  const corner = document.createElement("button");

  corner.id = "secretCorner";
  corner.type = "button";
  corner.setAttribute("aria-label", "Admin");

  corner.style.cssText = `
    position:fixed;
    top:0;
    left:0;
    width:32px;
    height:32px;
    padding:0;
    border:0;
    background:transparent;
    opacity:0;
    z-index:2147483647;
  `;

  document.body.appendChild(corner);

  const popup = document.createElement("dialog");
  popup.id = "secretCreatorDialog";

  popup.innerHTML = `
    <button class="close" id="secretClose">×</button>
    <h2>Creator admin</h2>

    <section id="adminLogin">
      <p>Sign in with your admin account.</p>
      <input id="adminEmail" type="email"
        placeholder="Email" autocomplete="username"
        style="width:100%;padding:12px;margin:6px 0">

      <input id="adminPassword" type="password"
        placeholder="Password" autocomplete="current-password"
        style="width:100%;padding:12px;margin:6px 0">

      <button id="adminLoginBtn">Sign in</button>
    </section>

    <section id="adminAdd" hidden>
      <p>Admin access enabled.</p>

      <input id="newCreator" type="text"
        maxlength="25" placeholder="Creator name"
        style="width:100%;padding:12px;margin:6px 0">

      <button id="addCreator">Add creator</button>
      <button id="adminLogout">Sign out</button>
    </section>

    <p id="secretMessage"></p>
  `;

  document.body.appendChild(popup);

  corner.onclick = () => {
    $("secretMessage").textContent = "";
    updateAdminPanel(firebaseAuth?.currentUser || null);
    openDialog("secretCreatorDialog");
  };

  $("secretClose").onclick = () => {
    closeDialog("secretCreatorDialog");
  };

  $("adminLoginBtn").onclick = async () => {
    const email = $("adminEmail").value.trim();
    const password = $("adminPassword").value;

    if (!firebaseAuth || !email || !password) {
      $("secretMessage").textContent =
        "Enter your email and password.";
      return;
    }

    try {
      const result =
        await firebaseAuth.signInWithEmailAndPassword(email, password);

      if (result.user.uid !== ADMIN_UID) {
        await firebaseAuth.signOut();

        $("secretMessage").textContent =
          "This is not the admin account.";
        return;
      }

      $("adminPassword").value = "";
      $("secretMessage").textContent = "Admin signed in!";
      updateAdminPanel(result.user);

    } catch (error) {
      console.error(error);
      $("secretMessage").textContent =
        "Sign-in failed. Check your email and password.";
    }
  };

  $("addCreator").onclick = addCreator;

  $("newCreator").addEventListener("keydown", event => {
    if (event.key === "Enter") {
      event.preventDefault();
      addCreator();
    }
  });

  $("adminLogout").onclick = async () => {
    if (firebaseAuth) await firebaseAuth.signOut();

    updateAdminPanel(null);
    $("secretMessage").textContent = "Signed out.";
  };
}

function updateAdminPanel(user) {
  if (!$("adminLogin")) return;

  isAdmin = Boolean(user && user.uid === ADMIN_UID);

  $("adminLogin").hidden = isAdmin;
  $("adminAdd").hidden = !isAdmin;
}

async function addCreator() {
  const message = $("secretMessage");
  const name = $("newCreator").value.trim().toLowerCase();

  if (
    !firebaseAuth ||
    !firebaseAuth.currentUser ||
    firebaseAuth.currentUser.uid !== ADMIN_UID
  ) {
    message.textContent = "Please sign in as admin.";
    return;
  }

  if (!/^[a-z0-9.-]{1,25}$/.test(name)) {
    message.textContent =
      "Use 1–25 letters, numbers, dots or hyphens.";
    return;
  }

  if (CREATORS.includes(name)) {
    message.textContent = "Creator already exists!";
    return;
  }

  try {
    await creatorsRef.push(name);

    $("newCreator").value = "";
    message.textContent =
      "Creator added to the shared answer pool!";

  } catch (error) {
    console.error(error);
    message.textContent = "Could not save creator.";
  }
}

/* GAME */

function startGame(newMode) {
  if (!creatorDataReady) {
    mode = newMode;
    showMessage("Loading creators...");
    return;
  }

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
        guesses = saved.guesses
          .filter(word =>
            typeof word === "string" &&
            word.length === answer.length
          )
          .slice(0, 6);

        finished = Boolean(saved.finished);
        rebuildKeys();
      }
    } catch (error) {
      console.warn(error);
    }
  } else {
    answer = CREATORS[
      Math.floor(Math.random() * CREATORS.length)
    ];
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

  localStorage.setItem(
    "astro-wordle-" + today,
    JSON.stringify({ guesses, finished })
  );
}

/* WORDLE CHECKING */

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
  const priority = {
    absent: 1,
    present: 2,
    correct: 3
  };

  if (
    !keyStates[letter] ||
    priority[state] > priority[keyStates[letter]]
  ) {
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

/* BOARD AND KEYBOARD */

function render() {
  const board = $("board");
  const keyboard = $("keyboard");

  if (!board || !keyboard || !answer) return;

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
      } else if (
        rowIndex === guesses.length &&
        !finished
      ) {
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

  ["qwertyuiop", "asdfghjkl", "zxcvbnm"]
    .forEach((letters, index) => {
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

/* INPUT */

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

    if (won) endGame(true);
    else if (guesses.length >= 6) endGame(false);

    saveGame();
    render();
  }, answer.length * 100 + 650);
}

/* END GAME */

function endGame(won) {
  finished = true;
  saveGame();

  $("resultTitle").textContent =
    won ? "You got it!" : "Game over!";

  $("resultText").textContent = won
    ? `You guessed ${answer.toUpperCase()} in ${guesses.length} tries!`
    : `The creator was ${answer.toUpperCase()}.`;

  openDialog("resultDialog");
}

/* STATS AND SHARE */

function showStats() {
  $("stats").textContent =
    `Guesses used this game: ${guesses.length}`;

  openDialog("statsDialog");
}

function shareResult() {
  const result = guesses.map(word =>
    score(word).map(mark =>
      mark === "correct" ? "🟩" :
      mark === "present" ? "🟨" : "⬛"
    ).join("")
  ).join("\n");

  const text =
    `Astro's Creators Wordle\n${result}\n${guesses.length}/6`;

  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text)
      .then(() => showMessage("Result copied!"))
      .catch(() => showMessage("Could not copy result."));
  } else {
    showMessage("Copy is not supported.");
  }
}

/* START */

function setup() {
  $("dailyBtn").onclick = () => startGame("daily");
  $("freeBtn").onclick = () => startGame("free");
  $("helpBtn").onclick = () => openDialog("helpDialog");
  $("statsBtn").onclick = showStats;

  $("themeBtn").onclick = () =>
    document.body.classList.toggle("light");

  $("nextBtn").onclick = () => startGame("free");
  $("shareBtn").onclick = shareResult;

  $("confirmYes").onclick = () => {
    closeDialog("confirmDialog");
    guess = pendingGuess;
    pendingGuess = "";
    acceptGuess();
  };

  $("confirmNo").onclick = () => {
    closeDialog("confirmDialog");
    pendingGuess = "";
  };

  document.querySelectorAll("[data-close]").forEach(button => {
    button.onclick = () =>
      closeDialog(button.closest("dialog").id);
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

  setupSecretCorner();
  initFirebase();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", setup);
} else {
  setup();
}
