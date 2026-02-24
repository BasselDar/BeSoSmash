// public/js/game/visuals.js — Screen shake, +1 particles, and visual feedback

import { state } from '../core/state.js';

// Throttle +1 particle spawns to prevent DOM flooding
let lastPlusOneTime = -Infinity;
const PLUS_ONE_COOLDOWN = 120; // ms between +1 spawns (~8 per second)
const MAX_PLUS_ONES = 15;      // max simultaneous particles

export function triggerVisuals() {
    // Screen shake fires on EVERY keypress for responsiveness
    const intensity = Math.random() * 15 - 7.5;
    anime({
        targets: '#game-container',
        translateX: intensity,
        translateY: intensity,
        scale: 1.02,
        duration: 50,
        direction: 'alternate',
        easing: 'easeInOutSine'
    });

    document.body.style.backgroundColor = '#450a0a';
    setTimeout(() => document.body.style.backgroundColor = '#020617', 50);

    // Throttle +1 particles — skip if too soon or too many active
    const now = performance.now();
    if (now - lastPlusOneTime < PLUS_ONE_COOLDOWN) return;

    const smashZone = document.getElementById('smash-zone');
    const existing = smashZone.querySelectorAll('.plus-one-particle');
    if (existing.length >= MAX_PLUS_ONES) return;
    lastPlusOneTime = now;

    const plusOne = document.createElement('div');
    plusOne.innerText = "+1";
    plusOne.className = "plus-one-particle absolute text-4xl font-black text-rose-500 pointer-events-none select-none z-50 neon-glow";

    const rect = smashZone.getBoundingClientRect();
    const startX = Math.random() * (rect.width - 60) + 30;
    const startY = Math.random() * (rect.height - 60) + 30;

    plusOne.style.left = `${startX}px`;
    plusOne.style.top = `${startY}px`;
    smashZone.appendChild(plusOne);

    anime({
        targets: plusOne,
        translateY: -100,
        opacity: [1, 0],
        scale: [1, 1.5],
        duration: 800,
        easing: 'easeOutExpo',
        complete: function () {
            plusOne.remove();
        }
    });
}
