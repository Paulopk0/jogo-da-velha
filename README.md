# Tic Tac Toe

Real-time multiplayer tic-tac-toe in the browser, powered by WebSockets.

## How to Play

1. Open the game and click **Find Game** — the server puts you in a matchmaking queue.
2. When a second player joins, the server pairs you, assigns symbols (X or O) randomly, and the match begins.
3. Players alternate turns. The status bar shows whose turn it is and pulses when it's yours.
4. The first player to align three symbols in a row, column, or diagonal wins. If all nine cells fill without a winner, it's a draw.
5. After the match ends, click **Play Again** to re-enter the queue.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js |
| HTTP server | Express |
| Real-time communication | Socket.io |
| Frontend | Vanilla HTML, CSS, JavaScript |

## Run Locally

```bash
git clone <repo-url>
cd jogo-da-velha
npm install
node server.js
```

Open [http://localhost:3000](http://localhost:3000) in two browser tabs to test with two players.

## How It Works

```
Browser A          Server            Browser B
   |--- find-game --->|                  |
   |<-- waiting ------|                  |
   |                  |<-- find-game ----|
   |<-- game-start ---|-- game-start --->|
   |--- make-move --->|                  |
   |<-- move-made ----|-- move-made ---->|
   |<-- game-over ----|-- game-over ---->|
```

**Matchmaking** — `matchmaking.js` keeps a waiting queue. When two sockets are available they're paired into a named Socket.io room so messages are scoped to that game only.

**Game logic** — `game.js` runs entirely on the server. The client sends a cell index; the server validates the move, checks all eight winning lines, and broadcasts the updated board to both players. The client never decides whether a move is legal.

**State sync** — every `move-made` event carries the full board snapshot, so both clients always reflect authoritative server state regardless of network conditions.
