/* ========================================
   NEON XO — Local + Firebase Online
   (نسخة معدّلة: إصلاح المزامنة على الهواتف)
   ======================================== */

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const homeScreen = $("#homeScreen");
const sizeScreen = $("#sizeScreen");
const friendsScreen = $("#friendsScreen");
const gameScreen = $("#gameScreen");
const resultScreen = $("#resultScreen");
const screens = $$(".screen");

const boardElement = $("#gameBoard");
const winSvg = $("#winSvg");
const winLine = $("#winLine");
const toastElement = $("#toast");

let boardSize = 3;
let selectedSize = 3;
let selectedFriendSize = 3;
let winLength = 3;
let board = [];
let currentPlayer = "X";
let gameOver = false;
let locked = false;
let currentMode = "local";

let scores = { X: 0, O: 0, draw: 0 };

let toastTimer = null;
let resultTimer = null;
let flipTimer = null;
let roundNumber = 0;

let auth = null;
let db = null;
let myUid = null;
let firebaseReady = false;

let roomRef = null;
let roomUnsubscribe = null;
let roomCode = null;
let roomRole = null;
let roomState = null;
let lastResultKey = "";
let handlingOnlineMove = false;

/* حالة جديدة لمزامنة موثوقة على الهواتف */
let relistenTimer = null;
let pollTimer = null;
let lastRoomSignature = "";
let lastListenerErrorAt = 0;

/* ========================================
   Firebase configuration
   ======================================== */

const firebaseConfig = {
  apiKey: "AIzaSyCyjP9jz55XQ63GbmlLj8Rpl0fnKJYa4Tc",
  authDomain: "xo-game-8f57d.firebaseapp.com",
  projectId: "xo-game-8f57d",
  storageBucket: "xo-game-8f57d.firebasestorage.app",
  messagingSenderId: "111278500291",
  appId: "1:111278500291:web:5fd6b1bf8ae3a8ebc6f576",
  measurementId: "G-N8342XDXF1"
};

function initializeFirebase() {
  try {
    if (!window.firebase) {
      throw new Error("لم يتم تحميل مكتبة Firebase.");
    }

    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }

    auth = firebase.auth();
    db = firebase.firestore();

    /* مهم للهواتف: شبكات الجوال والمتصفحات الداخلية (واتساب وغيره) كثيرًا
       ما تقطع أو تؤخر قناة البث المباشر (WebChannel streaming)،
       فلا يصل تحديث الغرفة لصاحبها. Long polling يعمل في كل الشبكات.
       يجب استدعاء settings قبل أي استخدام آخر لـ Firestore. */
    try {
      db.settings({ experimentalForceLongPolling: true });
    } catch (settingsError) {
      console.warn("Firestore settings warning:", settingsError);
    }

    auth.onAuthStateChanged(async (user) => {
      if (!user) {
        try {
          await auth.signInAnonymously();
        } catch (error) {
          firebaseReady = false;
          updateInternetStatus();
          console.error("Anonymous sign-in error:", error);
          showToast("تعذّر تسجيل الدخول المجهول. راجع إعدادات Firebase.");
        }
        return;
      }

      myUid = user.uid;
      firebaseReady = true;
      updateInternetStatus();
    });
  } catch (error) {
    console.error("Firebase initialization error:", error);
    firebaseReady = false;
    updateInternetStatus();
  }
}

/* ========================================
   Navigation
   ======================================== */

function showScreen(screen) {
  if (!screen) return;

  screens.forEach((item) => item.classList.remove("active"));
  screen.classList.add("active");
  window.scrollTo({ top: 0, behavior: "auto" });
}

function showFriendsPanel(panel) {
  [
    $("#friendsSetup"),
    $("#createRoomPanel"),
    $("#joinRoomPanel"),
    $("#roomWaitingPanel")
  ].forEach((item) => item?.classList.add("hidden"));

  panel?.classList.remove("hidden");
}

function showToast(message) {
  if (!toastElement) return;

  toastElement.textContent = message;
  toastElement.classList.add("show");

  clearTimeout(toastTimer);

  toastTimer = setTimeout(() => {
    toastElement.classList.remove("show");
  }, 3000);
}

/* ========================================
   Internet status
   ======================================== */

function updateInternetStatus() {
  const dot = $("#connectionDot");
  const text = $("#connectionText");

  if (!dot || !text) return;

  if (!navigator.onLine) {
    dot.classList.remove("online");
    dot.classList.add("offline");
    text.textContent = "بدون إنترنت";
    return;
  }

  if (firebaseReady) {
    dot.classList.remove("offline");
    dot.classList.add("online");
    text.textContent = "متصل بالخدمة";
  } else {
    dot.classList.remove("online");
    dot.classList.remove("offline");
    text.textContent = "جارٍ الاتصال...";
  }
}

window.addEventListener("online", () => {
  updateInternetStatus();
  resumeRoomSync();
});
window.addEventListener("offline", updateInternetStatus);

/* عند رجوع المستخدم للتبويب (مثلًا بعد إرسال الكود في واتساب)
   نعيد ربط الاستماع ونجلب آخر حالة من السيرفر فورًا */
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) resumeRoomSync();
});
window.addEventListener("pageshow", resumeRoomSync);
window.addEventListener("focus", resumeRoomSync);

/* ========================================
   Home and navigation buttons
   ======================================== */

$("#localModeBtn")?.addEventListener("click", () => {
  currentMode = "local";
  showScreen(sizeScreen);
});

$("#friendsModeBtn")?.addEventListener("click", () => {
  showFriendsPanel($("#friendsSetup"));
  $("#offlineNotice")?.classList.toggle("hidden", navigator.onLine);
  showScreen(friendsScreen);
});

$("#friendsLocalBtn")?.addEventListener("click", () => {
  currentMode = "local";
  showScreen(sizeScreen);
});

$("#retryInternetBtn")?.addEventListener("click", () => {
  updateInternetStatus();

  if (navigator.onLine && firebaseReady) {
    $("#offlineNotice")?.classList.add("hidden");
    showToast("الاتصال جاهز.");
  } else {
    showToast("تأكد من الإنترنت وانتظر اتصال Firebase.");
  }
});

$$("[data-back]").forEach((button) => {
  button.addEventListener("click", () => {
    if (button.dataset.back === "homeScreen") {
      showScreen(homeScreen);
    } else if (button.dataset.back === "sizeScreen") {
      showScreen(sizeScreen);
    }
  });
});

$$("[data-friends-back]").forEach((button) => {
  button.addEventListener("click", () => {
    showFriendsPanel($("#friendsSetup"));
  });
});

/* ========================================
   Local board size
   ======================================== */

$$(".size-card[data-size]").forEach((button) => {
  button.addEventListener("click", () => {
    selectedSize = Number(button.dataset.size);

    $$(".size-card[data-size]").forEach((card) => {
      card.classList.toggle("selected", card === button);
    });
  });
});

$("#startLocalBtn")?.addEventListener("click", () => {
  currentMode = "local";
  boardSize = selectedSize;
  startGame();
});

/* ========================================
   Online room size
   ======================================== */

$$("[data-friend-size]").forEach((button) => {
  button.addEventListener("click", () => {
    selectedFriendSize = Number(button.dataset.friendSize);

    $$("[data-friend-size]").forEach((card) => {
      card.classList.toggle("selected", card === button);
    });
  });
});

$("#openCreateRoomBtn")?.addEventListener("click", () => {
  showFriendsPanel($("#createRoomPanel"));
});

$("#openJoinRoomBtn")?.addEventListener("click", () => {
  showFriendsPanel($("#joinRoomPanel"));
  $("#joinRoomCode")?.focus();
});

/* ========================================
   Authentication readiness
   ======================================== */

async function ensureFirebaseReady() {
  if (!navigator.onLine) {
    throw new Error("تأكد من اتصال الإنترنت.");
  }

  if (!auth || !db) {
    throw new Error("Firebase لم يتم تجهيزه. راجع إعدادات المشروع.");
  }

  if (auth.currentUser) {
    myUid = auth.currentUser.uid;
    firebaseReady = true;
    updateInternetStatus();
    return;
  }

  const credential = await auth.signInAnonymously();
  myUid = credential.user.uid;
  firebaseReady = true;
  updateInternetStatus();
}

/* ========================================
   Room codes and creation
   ======================================== */

function generateRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";

  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }

  return code;
}

function newEmptyBoard(size) {
  return Array(size * size).fill("");
}

$("#createRoomBtn")?.addEventListener("click", createRoom);

async function createRoom() {
  const button = $("#createRoomBtn");
  if (button.disabled) return;

  button.disabled = true;

  try {
    await ensureFirebaseReady();

    let created = false;

    for (let attempt = 0; attempt < 8 && !created; attempt++) {
      const code = generateRoomCode();
      const ref = db.collection("rooms").doc(code);

      const result = await db.runTransaction(async (transaction) => {
        const existing = await transaction.get(ref);

        if (existing.exists) return false;

        const size = selectedFriendSize;

        transaction.set(ref, {
          creatorUid: myUid,
          guestUid: null,
          boardSize: size,
          board: newEmptyBoard(size),
          currentPlayer: "X",
          status: "waiting",
          winner: null,
          winningCells: [],
          moveCount: 0,
          scoreX: 0,
          scoreO: 0,
          scoreDraw: 0,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        return true;
      });

      if (result) {
        created = true;
        roomCode = code;
        roomRole = "X";
        roomRef = ref;
        roomState = null;
        currentMode = "online";
        lastResultKey = "";
        boardSize = selectedFriendSize;
        selectedSize = boardSize;

        /* نعرض شاشة الانتظار أولًا ثم نبدأ الاستماع */
        showFriendsPanel($("#roomWaitingPanel"));
        $("#roomWaitingTitle").textContent = "غرفتك جاهزة!";
        $("#roomWaitingMessage").textContent =
          "أرسل الكود إلى صديقك. ستبدأ المباراة تلقائيًا عند انضمامه.";
        $("#roomCodeDisplay").textContent = code;
        showScreen(friendsScreen);
        listenToRoom();
        showToast("تم إنشاء الغرفة.");
      }
    }

    if (!created) {
      showToast("تعذّر إنشاء كود فريد. حاول مرة أخرى.");
    }
  } catch (error) {
    console.error("Create room error:", error);
    showToast(friendlyError(error));
  } finally {
    button.disabled = false;
  }
}

/* ========================================
   Join a room
   ======================================== */

$("#confirmJoinBtn")?.addEventListener("click", joinRoom);

async function joinRoom() {
  const button = $("#confirmJoinBtn");
  if (button.disabled) return;

  const code = ($("#joinRoomCode")?.value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

  if (!/^[A-Z0-9]{6}$/.test(code)) {
    showToast("اكتب كود الغرفة المكوّن من 6 أحرف أو أرقام.");
    return;
  }

  button.disabled = true;

  try {
    await ensureFirebaseReady();

    const ref = db.collection("rooms").doc(code);

    await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(ref);

      if (!snapshot.exists) {
        throw new Error("الغرفة غير موجودة. راجع الكود.");
      }

      const room = snapshot.data();

      if (room.creatorUid === myUid) {
        throw new Error("أنت صاحب الغرفة بالفعل، افتحها من جهاز آخر للانضمام.");
      }

      if (room.status !== "waiting" || room.guestUid) {
        throw new Error("الغرفة ممتلئة أو بدأت المباراة بالفعل.");
      }

      transaction.update(ref, {
        guestUid: myUid,
        status: "playing",
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    });

    roomCode = code;
    roomRole = "O";
    roomRef = ref;
    roomState = null;
    currentMode = "online";
    lastResultKey = "";
    listenToRoom();
    showToast("انضممت إلى الغرفة بنجاح.");
  } catch (error) {
    console.error("Join room error:", error);
    showToast(friendlyError(error));
  } finally {
    button.disabled = false;
  }
}

/* ========================================
   Realtime room updates
   ======================================== */

function stopRoomListener() {
  clearTimeout(relistenTimer);
  relistenTimer = null;

  if (typeof roomUnsubscribe === "function") {
    try { roomUnsubscribe(); } catch (e) { /* ignore */ }
  }
  roomUnsubscribe = null;
}

function stopRoomPolling() {
  clearInterval(pollTimer);
  pollTimer = null;
}

function scheduleRelisten() {
  clearTimeout(relistenTimer);
  relistenTimer = setTimeout(() => {
    if (roomRef) listenToRoom({ keepSignature: true });
  }, 2500);
}

/* نسخة احتياطية: جلب مباشر من السيرفر كل 3 ثوانٍ.
   لو فشل البث المباشر لأي سبب على الهاتف، تبقى الغرفة تتحدث. */
function startRoomPolling() {
  stopRoomPolling();

  pollTimer = setInterval(() => {
    if (document.hidden) return;
    pollRoomOnce();
  }, 3000);
}

async function pollRoomOnce() {
  const ref = roomRef;
  if (!ref) return;

  try {
    const snapshot = await ref.get({ source: "server" });
    if (ref !== roomRef) return; // خرجنا من الغرفة أثناء الانتظار
    handleRoomSnapshot(snapshot);
  } catch (error) {
    /* لا نزعج المستخدم: غالبًا انقطاع مؤقت */
    console.warn("Room poll failed:", error?.code || error);
  }
}

function resumeRoomSync() {
  if (!roomRef || document.hidden) return;

  listenToRoom({ keepSignature: true });
  pollRoomOnce();
}

function listenToRoom(options = {}) {
  stopRoomListener();

  if (!roomRef) return;

  if (!options.keepSignature) lastRoomSignature = "";

  const listeningRef = roomRef;

  roomUnsubscribe = listeningRef.onSnapshot(
    (snapshot) => {
      if (listeningRef !== roomRef) return;
      handleRoomSnapshot(snapshot);
    },
    (error) => {
      if (listeningRef !== roomRef) return;

      console.error("Room listener error:", error);
      roomUnsubscribe = null;

      /* نعرض الخطأ مرة كل 10 ثوانٍ فقط حتى لا يتكرر */
      if (Date.now() - lastListenerErrorAt > 10000) {
        lastListenerErrorAt = Date.now();
        showToast(friendlyError(error));
      }

      /* نعيد المحاولة تلقائيًا، والـ polling يغطي في الأثناء */
      scheduleRelisten();
    }
  );

  startRoomPolling();
}

function handleRoomSnapshot(snapshot) {
  if (!snapshot) return;

  if (!snapshot.exists) {
    /* مهم جدًا: لو الجهاز لسه ما اتصل بالسيرفر، Firestore يرسل لقطة
       "غير موجود" من الكاش المحلي. هذا ليس حذفًا حقيقيًا للغرفة،
       وكان هذا يجعل صاحب الغرفة يخرج من الغرفة بصمت ويبقى الكود ظاهرًا. */
    if (snapshot.metadata && snapshot.metadata.fromCache) return;

    showToast("الغرفة لم تعد موجودة.");
    leaveOnlineRoom(false);
    showFriendsPanel($("#friendsSetup"));
    showScreen(homeScreen);
    return;
  }

  applyRoomData(snapshot.data());
}

function roomSignature(data) {
  return [
    data.status,
    data.guestUid || "",
    data.creatorUid || "",
    data.currentPlayer,
    data.moveCount,
    data.winner || "",
    data.boardSize,
    data.scoreX,
    data.scoreO,
    data.scoreDraw,
    Array.isArray(data.board) ? data.board.join(",") : ""
  ].join("|");
}

function applyRoomData(data) {
  const uid = auth?.currentUser?.uid || myUid;

  if (data.creatorUid !== uid && data.guestUid !== uid) {
    showToast("ليس لديك إذن للوصول إلى هذه الغرفة.");
    leaveOnlineRoom(false);
    showFriendsPanel($("#friendsSetup"));
    showScreen(friendsScreen);
    return;
  }

  /* نتجاهل التحديثات المكررة (من الـ listener والـ polling معًا) */
  const signature = roomSignature(data);
  if (signature === lastRoomSignature) return;
  lastRoomSignature = signature;

  roomState = data;
  boardSize = Number(data.boardSize) || 3;
  winLength = boardSize === 3 ? 3 : 4;
  board = Array.isArray(data.board)
    ? data.board.slice()
    : newEmptyBoard(boardSize);

  currentPlayer = data.currentPlayer || "X";
  scores = {
    X: Number(data.scoreX) || 0,
    O: Number(data.scoreO) || 0,
    draw: Number(data.scoreDraw) || 0
  };

  if (data.status === "waiting") {
    showFriendsPanel($("#roomWaitingPanel"));
    $("#roomWaitingTitle").textContent = "في انتظار صديقك";
    $("#roomWaitingMessage").textContent =
      "أرسل الكود لصديق واحد. لا يمكن للاعب ثالث الانضمام.";
    $("#roomCodeDisplay").textContent = roomCode || "";
    showScreen(friendsScreen);
    return;
  }

  if (data.status === "playing" ||
      data.status === "won" ||
      data.status === "draw") {
    showOnlineGame(data);
  }
}

function showOnlineGame(data) {
  clearTimeout(resultTimer);
  gameOver = data.status === "won" || data.status === "draw";
  locked = gameOver;

  gameScreen?.classList.remove("flipped");
  $("#gameModeLabel").textContent =
    `أونلاين • أنت اللاعب ${roomRole}`;
  $("#roomGameInfo")?.classList.remove("hidden");
  $("#gameRoomCode").textContent = roomCode || "";
  $("#flipHint").textContent =
    roomRole === "X"
      ? "أنت صاحب الغرفة وتلعب بعلامة X."
      : "أنت الضيف وتلعب بعلامة O.";

  $("#playerXName").textContent = "صاحب الغرفة";
  $("#playerOName").textContent = "الضيف";

  renderBoard();

  if (Array.isArray(data.winningCells)) {
    data.winningCells.forEach((index) => {
      boardElement.children[index]?.classList.add("win-cell");
    });
  }

  updateScoreboard();
  updateTurnUI();
  showScreen(gameScreen);

  if (data.status === "won" || data.status === "draw") {
    const resultKey = `${roomCode}:${data.moveCount}:${data.status}:${data.winner || ""}`;

    if (lastResultKey !== resultKey) {
      lastResultKey = resultKey;

      if (data.status === "draw") {
        $("#resultIcon").textContent = "🤝";
        $("#resultTitle").textContent = "تعادل!";
        $("#resultMessage").textContent = "مباراة متكافئة، جرّبوا مرة أخرى.";
      } else {
        $("#resultIcon").textContent = "🏆";
        $("#resultTitle").textContent =
          data.winner === roomRole ? "لقد فزت!" : "فاز صديقك!";
        $("#resultMessage").textContent =
          `الفائز هو اللاعب ${data.winner}.`;
      }

      resultTimer = setTimeout(() => {
        showScreen(resultScreen);
      }, 1600);
    }
  } else {
    lastResultKey = "";
  }
}

function renderBoard() {
  boardElement.style.setProperty("--board-size", boardSize);

  if (boardElement.children.length !== boardSize * boardSize) {
    boardElement.replaceChildren();

    for (let i = 0; i < boardSize * boardSize; i++) {
      const cell = document.createElement("button");

      cell.type = "button";
      cell.className = "cell";
      cell.dataset.index = String(i);
      cell.setAttribute("aria-label", `المربع ${i + 1}`);
      cell.addEventListener("click", () => playMove(i));

      boardElement.appendChild(cell);
    }
  }

  [...boardElement.children].forEach((cell, index) => {
    const value = board[index] || "";

    cell.textContent = value;
    cell.classList.toggle("mark-x", value === "X");
    cell.classList.toggle("mark-o", value === "O");
    cell.classList.remove("win-cell");

    if (currentMode === "local") {
      cell.disabled = gameOver || Boolean(value);
    } else {
      const myTurn = roomRole === currentPlayer;

      cell.disabled =
        gameOver ||
        !roomState ||
        roomState.status !== "playing" ||
        !myTurn ||
        Boolean(value);
    }
  });
}

/* ========================================
   Make a move
   ======================================== */

function playMove(index) {
  if (currentMode === "online") {
    makeOnlineMove(index);
    return;
  }

  if (gameOver || locked || board[index]) return;
  if (index < 0 || index >= board.length) return;

  board[index] = currentPlayer;

  const cell = boardElement.children[index];
  if (!cell) return;

  cell.textContent = currentPlayer;
  cell.classList.add(currentPlayer === "X" ? "mark-x" : "mark-o");
  cell.disabled = true;

  const winningCells = getWinningCells(index);

  if (winningCells) {
    finishGame(currentPlayer, winningCells);
    return;
  }

  if (board.every((value) => value !== "")) {
    finishGame("draw", []);
    return;
  }

  currentPlayer = currentPlayer === "X" ? "O" : "X";
  updateTurnUI();

  clearTimeout(flipTimer);

  flipTimer = setTimeout(() => {
    if (!gameOver && gameScreen?.classList.contains("active")) {
      gameScreen.classList.toggle("flipped", currentPlayer === "O");
    }
  }, 80);
}

async function makeOnlineMove(index) {
  if (handlingOnlineMove || !roomRef || !roomState) return;

  if (roomState.status !== "playing" || gameOver) return;
  if (roomRole !== roomState.currentPlayer) {
    showToast("انتظر دورك.");
    return;
  }

  if (index < 0 || index >= roomState.boardSize ** 2) return;
  if (roomState.board[index]) return;

  handlingOnlineMove = true;

  try {
    await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(roomRef);

      if (!snapshot.exists) throw new Error("الغرفة غير موجودة.");

      const data = snapshot.data();

      if (data.status !== "playing") {
        throw new Error("المباراة ليست في حالة لعب.");
      }

      const mySymbol = data.creatorUid === myUid
        ? "X"
        : data.guestUid === myUid
          ? "O"
          : null;

      if (!mySymbol) throw new Error("أنت لست لاعبًا في هذه الغرفة.");
      if (data.currentPlayer !== mySymbol) {
        throw new Error("ليس دورك الآن.");
      }

      const nextBoard = data.board.slice();

      if (nextBoard[index]) {
        throw new Error("هذا المربع تم اختياره بالفعل.");
      }

      nextBoard[index] = mySymbol;

      const result = findWinningCells(
        nextBoard,
        data.boardSize,
        index,
        mySymbol
      );

      const updates = {
        board: nextBoard,
        moveCount: (Number(data.moveCount) || 0) + 1,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      };

      if (result) {
        updates.status = "won";
        updates.winner = mySymbol;
        updates.winningCells = result;
        updates[`score${mySymbol}`] =
          (Number(data[`score${mySymbol}`]) || 0) + 1;
      } else if (nextBoard.every((value) => value !== "")) {
        updates.status = "draw";
        updates.winner = null;
        updates.winningCells = [];
        updates.scoreDraw = (Number(data.scoreDraw) || 0) + 1;
      } else {
        updates.currentPlayer = mySymbol === "X" ? "O" : "X";
      }

      transaction.update(roomRef, updates);
    });

    /* نحدّث الشاشة فورًا بدون انتظار البث المباشر */
    pollRoomOnce();
  } catch (error) {
    console.error("Move error:", error);
    showToast(friendlyError(error));
  } finally {
    handlingOnlineMove = false;
  }
}

/* ========================================
   Find winning cells
   ======================================== */

function findWinningCells(stateBoard, size, index, symbol) {
  const row = Math.floor(index / size);
  const col = index % size;
  const needed = size === 3 ? 3 : 4;

  const directions = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1]
  ];

  for (const [dr, dc] of directions) {
    const cells = [index];

    for (const sign of [-1, 1]) {
      let r = row + dr * sign;
      let c = col + dc * sign;

      while (
        r >= 0 && r < size &&
        c >= 0 && c < size &&
        stateBoard[r * size + c] === symbol
      ) {
        cells.push(r * size + c);
        r += dr * sign;
        c += dc * sign;
      }
    }

    if (cells.length >= needed) return cells;
  }

  return null;
}

function getWinningCells(index) {
  return findWinningCells(board, boardSize, index, currentPlayer);
}

/* ========================================
   Local win glow
   ======================================== */

function drawWinningLine(winningCells) {
  if (!Array.isArray(winningCells) || !winningCells.length) return;

  if (winSvg) winSvg.style.display = "none";
  if (winLine) winLine.classList.remove("draw");

  boardElement.querySelectorAll(".cell.win-cell").forEach((cell) => {
    cell.classList.remove("win-cell");
  });

  winningCells.forEach((index) => {
    boardElement.children[index]?.classList.add("win-cell");
  });
}

/* ========================================
   Local game ending
   ======================================== */

function finishGame(result, winningCells) {
  gameOver = true;
  locked = true;

  $$(".cell").forEach((cell) => { cell.disabled = true; });

  if (result === "draw") {
    scores.draw++;
    $("#resultIcon").textContent = "🤝";
    $("#resultTitle").textContent = "تعادل!";
    $("#resultMessage").textContent = "مباراة متكافئة، جرّبوا مرة أخرى.";
  } else {
    scores[result]++;
    $("#resultIcon").textContent = "🏆";
    $("#resultTitle").textContent = `اللاعب ${result} فاز!`;
    $("#resultMessage").textContent = "أحسنت! هل أنت مستعد لتحدٍّ جديد؟";
    drawWinningLine(winningCells);
  }

  updateScoreboard();
  clearTimeout(resultTimer);

  resultTimer = setTimeout(() => {
    gameScreen?.classList.remove("flipped");
    showScreen(resultScreen);
  }, result === "draw" ? 900 : 2200);
}

/* ========================================
   New game / restart
   ======================================== */

function clearGameTimers() {
  clearTimeout(resultTimer);
  clearTimeout(flipTimer);
}

async function startOnlineRound() {
  if (!roomRef || !roomState) return;

  try {
    await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(roomRef);

      if (!snapshot.exists) throw new Error("الغرفة غير موجودة.");

      const data = snapshot.data();

      if (data.creatorUid !== myUid && data.guestUid !== myUid) {
        throw new Error("ليس لديك إذن لإعادة المباراة.");
      }

      if (!data.guestUid) {
        throw new Error("انتظر انضمام صديقك أولًا.");
      }

      transaction.update(roomRef, {
        board: newEmptyBoard(data.boardSize),
        currentPlayer: "X",
        status: "playing",
        winner: null,
        winningCells: [],
        moveCount: 0,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    });

    lastResultKey = "";
    pollRoomOnce();
  } catch (error) {
    console.error("Restart error:", error);
    showToast(friendlyError(error));
  }
}

function startGame() {
  clearGameTimers();

  roundNumber++;
  gameOver = false;
  locked = false;
  currentPlayer = "X";
  board = newEmptyBoard(boardSize);
  winLength = boardSize === 3 ? 3 : 4;

  gameScreen?.classList.remove("flipped");
  $("#roomGameInfo")?.classList.add("hidden");
  $("#playerXName").textContent = "اللاعب الأول";
  $("#playerOName").textContent = "اللاعب الثاني";
  $("#flipHint").textContent = "الشاشة تنقلب مع تبديل الدور لمواجهة اللاعب التالي";

  $("#gameModeLabel").textContent = "اللعب المحلي";

  if (winLine) {
    winLine.classList.remove("draw");
    winLine.style.opacity = "0";
  }

  renderBoard();
  updateScoreboard();
  updateTurnUI();
  showScreen(gameScreen);
}

$("#leaveGameBtn")?.addEventListener("click", () => {
  clearGameTimers();

  if (currentMode === "online") {
    showScreen(friendsScreen);
    if (roomState?.status === "waiting") {
      showFriendsPanel($("#roomWaitingPanel"));
    }
    return;
  }

  gameScreen?.classList.remove("flipped");
  showScreen(homeScreen);
});

$("#changeSizeBtn")?.addEventListener("click", () => {
  if (currentMode === "online") {
    showToast("حجم اللوحة يحدده صاحب الغرفة عند إنشائها.");
    return;
  }

  clearGameTimers();
  gameScreen?.classList.remove("flipped");
  selectedSize = boardSize;

  $$(".size-card[data-size]").forEach((card) => {
    card.classList.toggle(
      "selected",
      Number(card.dataset.size) === selectedSize
    );
  });

  showScreen(sizeScreen);
});

$("#restartBtn")?.addEventListener("click", () => {
  if (currentMode === "online") {
    startOnlineRound();
  } else {
    startGame();
  }
});

$("#playAgainBtn")?.addEventListener("click", () => {
  if (currentMode === "online") {
    startOnlineRound();
  } else {
    startGame();
  }
});

$("#resultHomeBtn")?.addEventListener("click", () => {
  clearGameTimers();

  if (currentMode === "online") {
    showScreen(friendsScreen);
    return;
  }

  gameScreen?.classList.remove("flipped");
  showScreen(homeScreen);
});

/* ========================================
   Leave a room
   ======================================== */

async function leaveOnlineRoom(removeWaitingRoom = true) {
  clearGameTimers();
  stopRoomListener();
  stopRoomPolling();

  const refToDelete = roomRef;
  const shouldDelete =
    removeWaitingRoom &&
    refToDelete &&
    roomRole === "X" &&
    roomState?.status === "waiting" &&
    !roomState?.guestUid;

  /* نصفّر الحالة أولًا حتى لا تتداخل أي لقطة متأخرة */
  roomRef = null;
  roomCode = null;
  roomRole = null;
  roomState = null;
  lastResultKey = "";
  lastRoomSignature = "";
  currentMode = "local";

  $("#roomGameInfo")?.classList.add("hidden");

  if (shouldDelete) {
    try {
      await refToDelete.delete();
    } catch (error) {
      console.warn("Could not remove waiting room:", error);
    }
  }
}

$("#cancelRoomBtn")?.addEventListener("click", async () => {
  await leaveOnlineRoom(true);
  showFriendsPanel($("#friendsSetup"));
  showScreen(homeScreen);
});

/* ========================================
   Copy invitation code
   ======================================== */

async function copyText(value) {
  try {
    await navigator.clipboard.writeText(value);
    showToast("تم نسخ الكود.");
  } catch {
    const field = document.createElement("textarea");
    field.value = value;
    document.body.appendChild(field);
    field.select();

    try {
      document.execCommand("copy");
      showToast("تم نسخ الكود.");
    } catch {
      showToast(`انسخ الكود يدويًا: ${value}`);
    }

    field.remove();
  }
}

$("#copyRoomCodeBtn")?.addEventListener("click", () => {
  if (roomCode) copyText(roomCode);
});

$("#copyGameRoomCodeBtn")?.addEventListener("click", () => {
  if (roomCode) copyText(roomCode);
});

/* ========================================
   Turn and score UI
   ======================================== */

function updateTurnUI() {
  const isX = currentPlayer === "X";
  const heading = $("#turnHeading");
  const subheading = $("#turnSubheading");

  if (heading) {
    heading.innerHTML = `دور اللاعب <span>${currentPlayer}</span>`;
    const mark = heading.querySelector("span");
    if (mark) mark.style.color = isX ? "var(--cyan)" : "var(--pink)";
  }

  if (subheading) {
    if (currentMode === "online") {
      subheading.textContent = gameOver
        ? "انتهت المباراة"
        : roomRole === currentPlayer
          ? "دورك الآن، اختار مربعك"
          : "دور صديقك الآن";
    } else {
      subheading.textContent = isX
        ? "اللاعب الأول، اختار مربعك"
        : "اللاعب الثاني، اختار مربعك";
    }
  }

  $("#playerXCard")?.classList.toggle("active-player", isX);
  $("#playerOCard")?.classList.toggle("active-player", !isX);

  $("#playerXState").textContent = isX ? "دوره الآن" : "ينتظر دوره";
  $("#playerOState").textContent = isX ? "ينتظر دوره" : "دوره الآن";
}

function updateScoreboard() {
  $("#scoreX").textContent = String(scores.X);
  $("#scoreO").textContent = String(scores.O);
  $("#scoreDraw").textContent = String(scores.draw);
}

/* ========================================
   Friendly error messages
   ======================================== */

function friendlyError(error) {
  const code = error?.code || "";
  const message = error?.message || "";

  if (code === "permission-denied" || code === "firestore/permission-denied") {
    return "Firebase رفض العملية. راجع قواعد Firestore.";
  }

  if (code === "auth/operation-not-allowed") {
    return "فعّل Anonymous من Authentication ثم Sign-in method.";
  }

  if (code === "auth/network-request-failed" ||
      code === "unavailable" ||
      code === "firestore/unavailable") {
    return "تعذّر الاتصال. تأكد من الإنترنت.";
  }

  if (message.includes("الغرفة غير موجودة")) return message;
  if (message.includes("الغرفة ممتلئة")) return message;
  if (message.includes("كود")) return message;
  if (message.includes("ليس دورك")) return message;
  if (message.includes("انتظر")) return message;
  if (message.includes("تأكد من اتصال الإنترنت")) return message;

  return "حصلت مشكلة. افتح Console لمعرفة تفاصيل الخطأ.";
}

/* ========================================
   Startup
   ======================================== */

updateInternetStatus();
initializeFirebase();

$$(".size-card[data-size]").forEach((card) => {
  card.classList.toggle(
    "selected",
    Number(card.dataset.size) === selectedSize
  );
});