# BeSoSmash Testing Ecosystem

This document provides a comprehensive overview of the testing tools and test suites used to ensure the stability, performance, and security of the BeSoSmash platform.

## Test Suites

The test suites are located in the `tests/` directory and can be executed simultaneously using the master test script. Our test coverage spans multiple layers of the application, from scoring logic to anti-cheat simulations.

### Available Test Scripts:

1. **`test_scoring.js`**
   Validates the Smash Score logic, making sure that keystrokes, entropy, keys-per-second (KPS), and profile discovery bonuses are correctly calculated and apply the dynamic scoring formula correctly.

2. **`test_gameManager.js`**
   Ensures that the `GameManager` functions correctly, tracking user sessions, managing game states (e.g., Classic vs Blitz modes), and validating score saves into Redis/PostgreSQL.

3. **`test_profiles.js`**
   Focuses on the `ProfileEngine`, guaranteeing that rule-based profiles trigger properly under specific simulation conditions (like zero-entropy mashing, extreme KPS, or specific key sequences).

4. **`test_socketFlow.js`**
   End-to-end (E2E) testing of real-time WebSocket communication, assuring that connection handling, payload structures, and client-server sync remain stable during the chaos of mashing.

5. **`test_performance.js`**
   Stress tests and benchmarks the server. It determines the max concurrent load the system can handle from multiple users submitting score chunks rapidly without degrading performance.

6. **`test_anti_cheat.js`**
   Verifies the internal cheat detection measures. Tests scenarios like hardware spoofing, impossible KPS, impossible entropy, and rapid payload chunk submission from bots to verify they are dropped/flagged properly by the server.

7. **`test_exploit_simulation.js`**
   Actively simulates malicious users attempting to exploit the system. This simulates API abuse, rapid payload injections, and bypass attempts to ensure the anti-cheat layers hold up dynamically.

## Running Tests

To run all test suites and view a aggregated output of all passes and failures, run:

```bash
npm test
```

Which executes:
```bash
node tests/test_all.js
```

### Grand Total Output
The `test_all.js` script loops through every test file and aggregates their results, outputting a grand total count of passes/fails, making it easy to identify regressions globally.
