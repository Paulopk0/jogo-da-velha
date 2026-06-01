const WINNING_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

const socket = io();

const statusEl     = document.getElementById('status');
const findBtn      = document.getElementById('find-btn');
const playAgainBtn = document.getElementById('play-again-btn');
const cells        = document.querySelectorAll('.cell');

let mySymbol  = null;
let myRoomId  = null;
let myTurn    = false;
let gameActive = false;

// --- helpers ---

function setStatus(text, cls = '') {
  statusEl.textContent = text;
  statusEl.className = cls;
}

function updateTurn(isMyTurn) {
  myTurn = isMyTurn;
  cells.forEach(cell => {
    cell.disabled = !isMyTurn || cell.textContent !== '';
  });
}

function setTurnStatus(nextTurn) {
  const isMyTurn = nextTurn === mySymbol;
  updateTurn(isMyTurn);
  const cls = `playing${isMyTurn ? ' my-turn' : ''} turn-${nextTurn.toLowerCase()}`;
  setStatus(isMyTurn ? 'Your turn!' : "Opponent's turn.", cls);
}

function resetBoard() {
  cells.forEach(cell => {
    cell.textContent = '';
    cell.className = 'cell';
    cell.disabled = true;
  });
}

function highlightWinningLine(winner) {
  const line = WINNING_LINES.find(([a, b, c]) =>
    cells[a].textContent === winner &&
    cells[b].textContent === winner &&
    cells[c].textContent === winner
  );
  if (line) line.forEach(i => cells[i].classList.add('winner'));
}

// --- socket events ---

socket.on('connect', () => {
  // Reset all game state on every (re)connect — auto-reconnect fires this too
  mySymbol   = null;
  myRoomId   = null;
  myTurn     = false;
  gameActive = false;
  resetBoard();
  findBtn.hidden = false;
  findBtn.disabled = false;
  findBtn.classList.remove('searching');
  playAgainBtn.hidden = true;
  setStatus('Click Find Game to start');
});

socket.on('disconnect', () => {
  setStatus('Disconnected from server.', 'error');
  findBtn.disabled = true;
  gameActive = false;
});

socket.on('waiting', () => {
  setStatus('Waiting for another player...', 'waiting');
});

socket.on('game-start', ({ symbol, roomId }) => {
  mySymbol  = symbol;
  myRoomId  = roomId;
  gameActive = true;

  resetBoard();
  findBtn.hidden = true;
  findBtn.classList.remove('searching');
  playAgainBtn.hidden = true;

  const isMyTurn = symbol === 'X';
  updateTurn(isMyTurn);
  const turnCls = `playing${isMyTurn ? ' my-turn' : ''} turn-x`;
  setStatus(`You are ${symbol}. ${isMyTurn ? 'Your turn!' : "Opponent's turn."}`, turnCls);
});

socket.on('move-made', ({ symbol, board, winner, isDraw }) => {
  board.forEach((val, i) => {
    if (val && !cells[i].textContent) {
      cells[i].textContent = val;
      cells[i].classList.add(val.toLowerCase(), 'placed');
    }
  });

  if (winner || isDraw) {
    cells.forEach(cell => { cell.disabled = true; });
    return;
  }

  const nextTurn = symbol === 'X' ? 'O' : 'X';
  setTurnStatus(nextTurn);
});

socket.on('game-over', ({ winner, isDraw }) => {
  gameActive = false;
  cells.forEach(cell => { cell.disabled = true; });

  if (isDraw) {
    setStatus("It's a draw!", 'gameover');
  } else {
    setStatus(winner === mySymbol ? 'You win!' : 'You lose.', 'gameover');
    highlightWinningLine(winner);
  }

  playAgainBtn.hidden = false;
  findBtn.hidden = true;
});

socket.on('opponent-left', () => {
  gameActive = false;
  cells.forEach(cell => { cell.disabled = true; });
  setStatus('Opponent disconnected.', 'error');
  playAgainBtn.hidden = false;
  findBtn.hidden = true;
});

// --- UI events ---

findBtn.addEventListener('click', () => {
  socket.emit('find-game');
  findBtn.disabled = true;
  findBtn.classList.add('searching');
  setStatus('Searching for opponent...', 'waiting');
});

playAgainBtn.addEventListener('click', () => {
  resetBoard();
  playAgainBtn.hidden = true;
  findBtn.hidden = false;
  findBtn.disabled = true;
  findBtn.classList.add('searching');
  socket.emit('find-game');
  setStatus('Searching for opponent...', 'waiting');
});

cells.forEach(cell => {
  cell.addEventListener('click', () => {
    if (!gameActive || !myTurn || cell.textContent) return;
    socket.emit('make-move', { index: Number(cell.dataset.index), roomId: myRoomId });
  });
});
