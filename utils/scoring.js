// utils/scoring.js — Smash Score formula (single source of truth)

/**
 * Smash Score = keys × 1337 + entropy² × 1.7 + KPS × 69 + profiles × 420
 * Keys dominate, but entropy, speed, and profile count add noticeable bonuses.
 */
function calculateSmashScore(score, entropy, kps, profileCount) {
    return Math.round(
        (score * 1337) +
        (entropy * entropy * 1.7) +
        (kps * 69) +
        (profileCount * 420)
    );
}

module.exports = { calculateSmashScore };
