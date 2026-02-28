const { io } = require('socket.io-client');
const SERVER = 'http://localhost:3000';

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function run() {
    const username = 'FRAME_TEST_' + Date.now();
    let s1 = io(SERVER, { transports: ['websocket'], forceNew: true });

    // Legitimate run
    await new Promise(r => {
        s1.on('connect', () => {
            s1.once('gameStarted', async (data) => {
                for (let i = 0; i < 40; i++) {
                    s1.emit('keyPressBatch', { keys: ['A'], token: data.token });
                    await sleep(60);
                }
                s1.emit('clientGameEnd');
            });
            s1.emit('startGame', { name: username, mode: 'classic' });
        });
        s1.on('gameOver', (data) => {
            console.log("LEGIT RUN OVER:");
            console.log(JSON.stringify(data, null, 2));
            s1.disconnect();
            r();
        });
    });

    await sleep(1000);

    // Exploit run
    let s2 = io(SERVER, { transports: ['websocket'], forceNew: true });
    await new Promise(r => {
        s2.on('connect', () => {
            s2.once('gameStarted', async (data) => {
                const keys = 'asdfghjkl'.split('');
                const start = Date.now();
                let exploitKilled = false;
                s2.on('gameOver', (d) => {
                    exploitKilled = true;
                    console.log("EXPLOIT RUN OVER:");
                    console.log(JSON.stringify(d, null, 2));
                    s2.disconnect();
                    r();
                });

                while (Date.now() - start < 2000 && !exploitKilled) {
                    const batch = [];
                    for (let i = 0; i < 80; i++) batch.push(keys[Math.floor(Math.random() * keys.length)]);
                    s2.emit('keyPressBatch', { keys: batch, token: data.token });
                    await sleep(4);
                }
            });
            s2.emit('startGame', { name: username, mode: 'classic' });
        });
    });
}
run().then(() => process.exit(0)).catch(console.error);
