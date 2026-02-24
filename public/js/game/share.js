// public/js/game/share.js — Score sharing and card image saving

import { state, ranks } from '../core/state.js';
import { showToast } from '../ui/toast.js';

// Function to copy score to clipboard
export function shareScore() {
    const nameInput = document.getElementById('username');
    const name = nameInput ? nameInput.value.trim() : "Someone";
    const modeFriendly = state.currentMode === 'blitz' ? "Blitz Mode" : "Classic Sprint";
    let finalRank = ranks[0];
    for (let r of ranks) {
        if (state.localScore >= r.threshold) finalRank = r;
    }

    const seconds = state.gameDuration / 1000;
    const finalKPS = (state.localScore / seconds).toFixed(1);

    let profileText = state.finalProfiles && state.finalProfiles.length > 0
        ? state.finalProfiles.map(p => p.title).join(" & ")
        : "The Unknown";

    const smashStr = state.currentSession && state.currentSession.smash_score ? ` (Smash Score: ${state.currentSession.smash_score.toLocaleString()})` : '';
    const textToShare = `I just hit ${state.localScore} keys in BeSoSmash!${smashStr}\nRank: ${finalRank.title} (Global: ${state.finalAbsoluteRank})\nSpeed: ${(state.localScore / (state.gameDuration / 1000)).toFixed(1)} KPS\nChaos: ${state.finalEntropy}%\nDiagnosis: ${profileText}\n\nPlay now: ${window.location.origin}`;

    navigator.clipboard.writeText(textToShare).then(() => {
        showToast("COPIED TO CLIPBOARD");
    }).catch(err => {
        console.error('Failed to copy text: ', err);
        showToast("Failed to copy score.");
    });
}

// Function to save the game over panel as an image
export function saveCardImage() {
    if (typeof html2canvas === 'undefined') {
        showToast("Image export library not loaded yet.");
        return;
    }

    const panel = document.getElementById('game-over-panel');
    if (!panel) return;

    // Add a slight padding/margin adjustment if needed for the pure image
    const oldMargin = panel.style.margin;
    const oldRadius = panel.style.borderRadius;
    panel.style.margin = '0';
    panel.style.borderRadius = '0'; // Sometimes helps with canvas rounding bugs

    showToast("GENERATING ID CARD...");

    html2canvas(panel, {
        backgroundColor: '#020617', // Match the slate-950 background
        scale: 2, // High resolution
        logging: false,
        useCORS: true,
        onclone: (clonedDoc) => {
            // 1. Hide the action buttons array explicitly
            const clonedPanel = clonedDoc.getElementById('game-over-panel');
            if (clonedPanel && clonedPanel.lastElementChild) {
                clonedPanel.lastElementChild.style.display = 'none';
            }

            // 2. Fix html2canvas crashing on `background-clip: text` by flattening the logo colors
            Array.from(clonedDoc.querySelectorAll('span')).forEach(span => {
                if (span.textContent === 'BeSo') {
                    span.className = "text-fuchsia-500 pr-4 -mr-4 relative z-10";
                } else if (span.textContent === 'Smash') {
                    span.className = "text-rose-500 relative z-0 pr-4";
                }
            });

            // 3. Purge CSS blurs which corrupt the html2canvas bounding box calculations
            clonedDoc.querySelectorAll('.blur-2xl, .blur-3xl').forEach(b => b.style.display = 'none');

            // 4. Strip complex drop-shadows just in case they clip the stats bounding box
            clonedDoc.querySelectorAll('*').forEach(el => {
                if (typeof el.className === 'string' && el.className.includes('drop-shadow')) {
                    el.className = el.className.replace(/drop-shadow-\[.*?\]/g, '').replace('drop-shadow-md', '').replace('drop-shadow-lg', '');
                }
            });
        }
    }).then(canvas => {
        // Restore styling
        panel.style.margin = oldMargin;
        panel.style.borderRadius = oldRadius;

        // Trigger download
        const image = canvas.toDataURL("image/png").replace("image/png", "image/octet-stream");
        const link = document.createElement('a');
        link.download = `besosmash-${state.currentSession?.smash_score || state.localScore}.png`;
        link.href = image;
        link.click();

        showToast("CARD SAVED!");
    }).catch(err => {
        console.error("HTML2Canvas Error:", err);
        panel.style.margin = oldMargin;
        panel.style.borderRadius = oldRadius;
        showToast("FAILED TO GENERATE IMAGE");
    });
}
