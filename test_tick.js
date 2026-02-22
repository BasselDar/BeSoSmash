const io = require("socket.io-client");

// Connect to the local Node server
const socket = io("http://localhost:3000");

let scoreHistory = [];
let gameStarted = false;

// 1. Listen for connection
socket.on("connect", () => {
    console.log("✅ Conntected to server as:", socket.id);

    // 2. Start a mock game
    console.log("➡️ Emitting 'startGame' with mode 'classic'...");
    socket.emit("startGame", { name: "TestBot", mode: "classic" });
});

// 3. Listen for gameStarted event
socket.on("gameStarted", () => {
    console.log("✅ Server acknowledged 'gameStarted'!");
    gameStarted = true;

    // 4. Send a batch of simulated key presses
    // We are simulating pressing 'Space', 'ArrowUp', 'KeyA', 'KeyD', 'Enter' all within one tick
    const testBatch = ["Space", "ArrowUp", "KeyA", "KeyD", "Enter"];

    console.log(`➡️ Sending 'keyPressBatch' with ${testBatch.length} keys...`);
    socket.emit("keyPressBatch", testBatch);
});

// 5. Listen for real-time score updates
socket.on("scoreUpdate", (score) => {
    console.log(`✅ Received 'scoreUpdate': Current score is now ${score}`);
    scoreHistory.push(score);

    // Test assertion: The score should instantly be 5 after our batch of 5 keys
    if (score === 5 && scoreHistory.length === 1) {
        console.log("🎉 TEST PASSED: The batched score incremented precisely by the length of the batch! (5)");
    } else {
        console.error(`❌ TEST FAILED: Expected score 5 on first update, got ${score}`);
    }
});

// 6. Listen for game over to gracefully disconnect
socket.on("gameOver", (data) => {
    console.log("✅ Game Over event received.");
    console.log(`🏁 Final verified score from server: ${data.finalScore}`);

    if (data.finalScore >= 5) {
        console.log("🎉 All Tests Passed Successfully!");
        process.exit(0);
    } else {
        console.error("❌ Final score test failed!");
        process.exit(1);
    }
});

// Error handling
socket.on("connect_error", (err) => {
    console.error("❌ Connection Error:", err.message);
    process.exit(1);
});

// Timeout fallback just in case the server hangs
setTimeout(() => {
    console.error("❌ Test timed out after 10 seconds.");
    process.exit(1);
}, 10000);
