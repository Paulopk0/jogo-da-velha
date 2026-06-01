const TicTacToeGame = require('./game');

const queue = [];
const activeGames = new Map(); // roomId -> { game, players: { X: socket, O: socket } }
const socketRoom = new Map();  // socketId -> roomId

function addToQueue(socket, io) {
  // Bug fix: prevent double-queueing and re-entry while already in an active game
  if (socketRoom.has(socket.id) || queue.includes(socket)) return;

  if (queue.length > 0) {
    const opponent = queue.shift();

    const roomId = `room-${opponent.id}-${socket.id}`;
    const [symbolA, symbolB] = Math.random() < 0.5 ? ['X', 'O'] : ['O', 'X'];

    opponent.join(roomId);
    socket.join(roomId);

    const game = new TicTacToeGame();

    activeGames.set(roomId, {
      game,
      players: { [symbolA]: opponent, [symbolB]: socket },
    });

    socketRoom.set(opponent.id, roomId);
    socketRoom.set(socket.id, roomId);

    opponent.emit('game-start', { symbol: symbolA, roomId });
    socket.emit('game-start', { symbol: symbolB, roomId });
  } else {
    queue.push(socket);
    socket.emit('waiting');
  }
}

function removeFromQueue(socket) {
  const index = queue.indexOf(socket);
  if (index !== -1) {
    queue.splice(index, 1);
  }
}

function handleDisconnect(socket, io) {
  removeFromQueue(socket);

  const roomId = socketRoom.get(socket.id);
  if (!roomId) return;

  const room = activeGames.get(roomId);
  if (room) {
    const opponent = Object.values(room.players).find((p) => p.id !== socket.id);
    if (opponent) {
      opponent.emit('opponent-left');
      socketRoom.delete(opponent.id);
    }
    activeGames.delete(roomId);
  }

  socketRoom.delete(socket.id);
}

module.exports = { addToQueue, removeFromQueue, handleDisconnect, activeGames, socketRoom };
