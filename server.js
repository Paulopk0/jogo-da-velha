const path = require('path');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { addToQueue, handleDisconnect, activeGames, socketRoom } = require('./matchmaking');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

io.on('connection', (socket) => {
  console.log('Player connected:', socket.id);

  socket.on('find-game', () => {
    addToQueue(socket, io);
  });

  socket.on('make-move', ({ index }) => {
    const roomId = socketRoom.get(socket.id);
    if (!roomId) return;

    const room = activeGames.get(roomId);
    if (!room) return;

    const { game, players } = room;

    // Bug fix: reject moves from the player whose turn it is not
    if (players[game.currentTurn].id !== socket.id) return;

    const result = game.makeMove(index);
    if (!result.valid) return;

    // Bug fix: include winner/isDraw in move-made so the client can lock
    // the board immediately, before the separate game-over frame arrives
    io.to(roomId).emit('move-made', {
      index,
      symbol: result.symbol,
      board: result.board,
      winner: result.winner,
      isDraw: result.isDraw,
    });

    if (result.winner) {
      io.to(roomId).emit('game-over', { winner: result.winner });
      activeGames.delete(roomId);
      socketRoom.delete(players.X.id);
      socketRoom.delete(players.O.id);
    } else if (result.isDraw) {
      io.to(roomId).emit('game-over', { winner: null, isDraw: true });
      activeGames.delete(roomId);
      socketRoom.delete(players.X.id);
      socketRoom.delete(players.O.id);
    }
  });

  socket.on('disconnect', () => {
    console.log('Player disconnected:', socket.id);
    handleDisconnect(socket, io);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
