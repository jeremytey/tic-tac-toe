/* ======= Gameboard factory (simple & readable) ======= */
function Gameboard() {
  // private 3x3 array
  let board = [
    [null, null, null],
    [null, null, null],
    [null, null, null]
  ];

  // mark: returns true if placed, false if invalid/occupied
  function mark(symbol, r, c) {
    // simplified validation: ensure row exists and cell empty
    if (!board[r] || board[r][c] !== null) return false;
    board[r][c] = symbol;
    return true;
  }

  // return a copy of board (so callers don't mutate internal board)
  function getBoard() { return board.map(row => row.slice()); }

  // reset board to empty
  function reset() {
    board = [
      [null, null, null],
      [null, null, null],
      [null, null, null]
    ];
  }

  return { mark, getBoard, reset };
}

/* ======= Player factory ======= */
function Player(name = "", symbol = "") {
  return { name, symbol };
}

/* ======= GameController (merges readability + structured returns) ======= */
function GameController() {
  const gameboard = Gameboard();
  const player1 = Player("", "X");
  const player2 = Player("", "O");
  let active = player1;
  let running = false;

  // winning patterns in row/col pairs
  const wins = [
    // rows
    [[0,0],[0,1],[0,2]],
    [[1,0],[1,1],[1,2]],
    [[2,0],[2,1],[2,2]],
    // cols
    [[0,0],[1,0],[2,0]],
    [[0,1],[1,1],[2,1]],
    [[0,2],[1,2],[2,2]],
    // diags
    [[0,0],[1,1],[2,2]],
    [[0,2],[1,1],[2,0]]
  ];

  function startGame(nameX, nameO) {
    if (!nameX || !nameO || nameX === nameO) {
      return { ok: false, reason: "invalid-names" };
    }
    player1.name = nameX;
    player2.name = nameO;
    active = player1;
    gameboard.reset();
    running = true;
    return { ok: true };
  }

  function restartGame() {
    if (!player1.name || !player2.name) return { ok: false, reason: "no-players" };
    gameboard.reset();
    active = player1;
    running = true;
    return { ok: true };
  }

  function checkWin(symbol) {
    const b = gameboard.getBoard();
    return wins.some(pattern => pattern.every(([r,c]) => b[r][c] === symbol));
  }

  function boardFull() {
    return gameboard.getBoard().flat().every(cell => cell !== null);
  }

  // playRound returns a structured result object
  function playRound(r, c) {
    if (!running) return { ok: false, reason: "not-running" };
    const placed = gameboard.mark(active.symbol, r, c);
    if (!placed) return { ok: false, reason: "occupied-or-invalid" };

    // check win
    if (checkWin(active.symbol)) {
      running = false;
      return { ok: true, status: "win", winner: { name: active.name, symbol: active.symbol } };
    }

    // check draw
    if (boardFull()) {
      running = false;
      return { ok: true, status: "draw" };
    }

    // continue game: switch active player
    active = (active === player1) ? player2 : player1;
    return { ok: true, status: "continue", next: { name: active.name, symbol: active.symbol } };
  }

  function getActive() { return active; }
  function getBoard() { return gameboard.getBoard(); }
  function isRunning() { return running; }

  return { startGame, restartGame, playRound, getActive, getBoard, isRunning };
}

/* ======= UI (minimal IIFE) ======= */
(function UI() {
  const dialog = document.getElementById("nameDialog");
  const form = document.getElementById("nameForm");
  const err = document.getElementById("error");
  const boardDiv = document.getElementById("board");
  const info = document.getElementById("info");
  const restartBtn = document.getElementById("restart");

  const game = GameController();

  function renderBoard() {
    boardDiv.innerHTML = "";
    const b = game.getBoard();
    b.forEach((row, r) => {
      row.forEach((cell, c) => {
        const cellEl = document.createElement("div");
        cellEl.className = "cell" + (cell ? " occupied" : "");
        cellEl.textContent = cell || "";
        cellEl.dataset.r = r;
        cellEl.dataset.c = c;
        cellEl.addEventListener("click", onCellClick);
        boardDiv.appendChild(cellEl);
      });
    });
  }

  function setInfo(text) { info.textContent = text; }

  function onCellClick(e) {
    const r = Number(e.currentTarget.dataset.r);
    const c = Number(e.currentTarget.dataset.c);
    const res = game.playRound(r, c);

    if (!res.ok) {
      // do nothing for invalid moves; could show a short flash
      return;
    }

    renderBoard();

    if (res.status === "win") {
      setInfo(`${res.winner.name} (${res.winner.symbol}) wins!`);
      restartBtn.style.display = "inline-block";
    } else if (res.status === "draw") {
      setInfo("It's a draw!");
      restartBtn.style.display = "inline-block";
    } else {
      setInfo(`${res.next.name}'s turn (${res.next.symbol})`);
    }
  }

  form.addEventListener("submit", (ev) => {
    ev.preventDefault();
    const nameX = document.getElementById("pX").value.trim();
    const nameO = document.getElementById("pO").value.trim();
    const r = game.startGame(nameX, nameO);
    if (!r.ok) {
      err.style.display = "block";
      err.textContent = "Enter two different names.";
      return;
    }
    err.style.display = "none";
    dialog.close();
    renderBoard();
    setInfo(`${game.getActive().name}'s turn (${game.getActive().symbol})`);
    restartBtn.style.display = "none";
  });

  if (typeof dialog.showModal === "function") dialog.showModal();
  else dialog.setAttribute("open", "true");

  restartBtn.addEventListener("click", () => {
    const r = game.restartGame();
    if (!r.ok) return; // nothing
    renderBoard();
    setInfo(`${game.getActive().name}'s turn (${game.getActive().symbol})`);
    restartBtn.style.display = "none";
  });

  renderBoard(); // initial empty board
})();
