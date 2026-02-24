# System Architecture

BeSoSmash is designed for highly concurrent, low-latency interactions. The architecture is split between a standard HTTP Express application for view serving and REST APIs, and a WebSocket layer for real-time game state synchronization.

## 1. The HTTP Layer
The HTTP layer is handled by **Express** and configured in `app.js`. It delegates routing to `routes/gameRoutes.js` and view rendering to `controllers/httpController.js`.
- **Views**: The application uses EJS for server-side rendering (`views/classic.ejs`, `views/blitz.ejs`, etc.).
- **REST API**: There is an endpoint at `/api/leaderboard` for paginated fetching of global scores.

## 2. The WebSocket Layer (Real-Time Engine)
Located in `controllers/socketController.js`, this handles the entire game lifecycle.
- **Connection & Lobby**: A user connects via Socket.io. Game settings (like the name and mode) are initialized on the server.
- **Event: `startGame`**: Starts a server-side timer (e.g., 5 seconds for Classic, 2 seconds for Blitz) with a minor grace period catering to networking latency.
- **Event: `keyPressBatch`**: Instead of emitting 100 times per second, the client batches typed keys locally and flushes them to the server constantly. The server accumulates these batches into a `keyHistory` matrix.
- **Event: `clientGameEnd`**: Optimistic sync mechanism acknowledging the client timer has finished.
- **Game End Resolution**: Upon server timeout, the server halts accepting payloads. It runs the entire keystroke matrix through the `ProfileEngine.js` for cheating validation and personality diagnosis.

## 3. The Database Layer (`models/scoreModel.js`)
BeSoSmash utilizes a dual-database pattern for optimal performance:
1. **PostgreSQL (Source of Truth)**: Safely permanently stores the `id`, `name`, `score`, `mode`, `kps`, `entropy`, and the calculated `smash_score`. It provides rigid SQL row counts for accurate global rank lookups.
2. **Redis (Performance Cache)**: Bootstrapped on app initialization via cache warm-up. Used specifically as a Sorted Set (`ZSET`) to rapidly rank users and maintain an instant-load top leaderboard without slamming the PostgreSQL server.

## Calculating The Smash Score
Your rank isn't purely determined by how many keys you press. The `smash_score` is a holistic representation of your performance:

```javascript
smash_score = (score * 1000) + Math.round(entropy * 10) + Math.round(kps * 10);
```

Where:
- `score` = Raw keystroke count.
- `entropy` = The topological randomness of the keyboard traversal (0.0 to 100.0). High entropy means using every part of the keyboard.
- `kps` = Keys Per Second.
