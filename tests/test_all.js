/**
 * test_all.js — Run all test suites
 * Run: node tests/test_all.js
 */
const { execSync } = require('child_process');
const path = require('path');

const suites = [
    'test_scoring.js',
    'test_gameManager.js',
    'test_profiles.js',
    'test_socketFlow.js',
    'test_performance.js',
    'test_anti_cheat.js',
    'test_exploit_simulation.js'
];

let totalPassed = 0, totalFailed = 0;
const dir = __dirname;

console.log('\n' + '🚀 RUNNING ALL TEST SUITES '.padEnd(60, '═'));

for (const suite of suites) {
    const file = path.join(dir, suite);
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`📦 ${suite}`);
    console.log('─'.repeat(60));
    try {
        const cmd = file.endsWith('.py') ? `python "${file}"` : `node "${file}"`;
        const output = execSync(cmd, { encoding: 'utf8', timeout: 15000 });
        process.stdout.write(output);
        // Parse results from output
        const match = output.match(/(\d+) passed, (\d+) failed/);
        if (match) {
            totalPassed += parseInt(match[1]);
            totalFailed += parseInt(match[2]);
        }
    } catch (err) {
        console.log(err.stdout || '');
        console.log(`\n⚠️  ${suite} EXITED WITH ERROR`);
        const match = (err.stdout || '').match(/(\d+) passed, (\d+) failed/);
        if (match) {
            totalPassed += parseInt(match[1]);
            totalFailed += parseInt(match[2]);
        } else {
            totalFailed++;
        }
    }
}

console.log('\n' + '═'.repeat(60));
console.log(`\n🏁 GRAND TOTAL: ${totalPassed} passed, ${totalFailed} failed across ${suites.length} suites\n`);
console.log('═'.repeat(60));

process.exit(totalFailed > 0 ? 1 : 0);
