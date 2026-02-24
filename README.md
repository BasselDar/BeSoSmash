# BeSoSmash

BeSoSmash is a real-time, highly interactive front-end and back-end web application that gamifies the act of randomly smashing your keyboard. Built with Node.js, Express, Socket.io, PostgreSQL, and Redis, it turns chaotic typing into a competitive sport complete with leaderboards, global rankings, and highly specific, often hilarious personality profiling.

## Features

- **Real-Time Keyboard Smashing:** Mashes are sent to the server in real-time via WebSockets and validated asynchronously to ensure no cheating.
- **Multiple Game Modes:**
  - **Classic:** 5 seconds to achieve maximum keystrokes, entropy, and keys-per-second (KPS).
  - **Blitz:** A chaotic 2-second burst mode for ultimate fast fingers.
- **Personality Profiling Engine:** Analyze keystrokes to generate funny, meme-oriented, and highly judgmental profiles (e.g., "The Script Kiddie", "The Spacebar Supremacist", "The Glitch"). Over 50 unique profiles exist, including complex easter eggs and anti-cheat detections.
- **Global Leaderboard:** Features pagination and live ranking against the global database, optimized via PostgreSQL and Redis.
- **Dynamic Scoring:** Total `smash_score` is a combination of your raw keystroke count, the topological *entropy* (randomness) of your smashing, and your KPS (Keys Per Second).
- **Anti-Cheat Validation:** The server detects macros, botting scripts, Metronome timings, and hardware spoofing, instantly rejecting illegitimate runs.

## Tech Stack

- **Backend:** Node.js, Express.js
- **Database:** PostgreSQL (Primary Store), Redis (Caching & Sorted Sets)
- **Real-Time Engine:** Socket.io
- **Frontend:** Vanilla JavaScript, EJS (Embedded JavaScript templates), CSS3
- **Dev Tools:** Nodemon, Dotenv

## Installation & Setup

### Prerequisites
- Node.js (v18+ recommended)
- PostgreSQL
- Redis Server (Must be running on default port `6379`)

### Steps

1. **Clone the repository** (or navigate to the directory):
   ```bash
   cd BeSoSmash
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env` file in the root directory (or modify the existing one) with the following variables:
   ```env
   PORT=3000
   PGUSER=your_postgres_user
   PGHOST=localhost
   PGPASSWORD=your_postgres_password
   PGDATABASE=your_postgres_database
   PGPORT=5432
   ```

4. **Ensure PostgreSQL & Redis are running.**
   The server will automatically try to initialize the `scores` table in PostgreSQL on startup.

5. **Start the Application:**

   **Development mode (auto-reload):**
   ```bash
   npm run dev
   ```

   **Production mode:**
   ```bash
   npm start
   ```

6. **Play!**
   Open your browser and navigate to `http://localhost:3000`.

## Detailed Documentation

For a deeper dive into the system's architecture, game modes, and the complex inner workings of the personality inference engine, please refer to the `docs/` folder:

- [System Architecture](docs/ARCHITECTURE.md) - Overview of the Socket.io lifecycle, models, and databases.
- [Game Modes](docs/GAME_MODES.md) - Explanation of Classic vs Blitz and scoring mechanisms.
- [Profile Engine](docs/PROFILE_ENGINE.md) - How the game detects 50+ unique personality types based purely on keystrokes.

## License

ISC License.
