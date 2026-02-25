// public/js/game/summary.js — Post-game summary panel rendering

import { state, ranks } from '../core/state.js';
import { fetchLeaderboard } from '../ui/leaderboard.js';
import { categoryPalettes, profileCategoryMap, profileFlavors } from '../utils/profileData.js';

/**
 * Handle the gameOver socket event — populates the post-game results panel.
 * Called from initGameEngine() in engine.js.
 */
export function renderGameOverSummary(data) {
    state.active = false;
    cancelAnimationFrame(state.timerRAF);
    clearInterval(state.tickInterval);
    const timerDisplay = document.getElementById('timer-display');
    if (timerDisplay) timerDisplay.innerText = "0.0s"; // Force end

    // Store server's authoritative values WITHOUT touching the live score display.
    // Updating localScore here causes a visible drop during the "CALCULATING..." phase.
    // We sync inside the setTimeout, hidden behind the results panel appearing.
    const serverFinalScore = data.finalScore;
    const serverSmashScore = data.smash_score;
    const serverKPS = data.kps;
    if (data.rank) state.finalAbsoluteRank = `#${data.rank}`;
    if (data.runProfiles) state.finalProfiles = data.runProfiles;
    else if (data.profiles) state.finalProfiles = data.profiles; // fallback
    if (data.entropy) state.finalEntropy = data.entropy;
    if (data.totalProfiles) state.totalProfiles = data.totalProfiles;

    // Block all default key behaviour during the "CALCULATING" phase
    function blockKeys(e) {
        e.preventDefault();
    }
    document.addEventListener('keydown', blockKeys);

    document.getElementById('status-text').innerText = "CALCULATING...";
    document.body.style.backgroundColor = '#020617'; // Reset background

    setTimeout(() => {
        // Sync to authoritative server score NOW — smash-zone is about to be hidden
        // so there's no visible drop in the live score display
        state.localScore = serverFinalScore;

        // Unblock keys once the results panel is visible
        document.removeEventListener('keydown', blockKeys);

        document.getElementById('smash-zone').classList.add('hidden');
        document.getElementById('status-text').innerText = "SMASH YOUR KEYBOARD";
        document.getElementById('status-text').classList.remove('animate-pulse');

        // Show Post-Game Summary Panel
        document.getElementById('game-over-panel').classList.remove('hidden');

        if (serverSmashScore) {
            // If they have a smash score, display it as the primary result
            document.getElementById('final-score-display').innerText = serverSmashScore.toLocaleString();
        } else {
            // For Ghost/Cheater profiles that don't generate a smash score
            document.getElementById('final-score-display').innerText = state.localScore;
        }

        // Populate new 4-column sub-stats
        const keysDisplay = document.getElementById('final-keys-display');
        if (keysDisplay) keysDisplay.innerText = state.localScore;

        // Set Player Name
        const nameInput = document.getElementById('username');
        const playerName = (nameInput ? nameInput.value.trim() : '') || 'PLAYER';
        document.getElementById('final-name-display').innerText = playerName;

        // Match Rank Display
        let finalRank = ranks[0];
        for (let r of ranks) {
            if (state.localScore >= r.threshold) finalRank = r;
        }
        const rankEl = document.getElementById('final-rank-display');
        rankEl.innerText = finalRank.title;
        rankEl.className = `text-2xl font-black mt-2 ${finalRank.color}`;

        // Populate new stats
        document.getElementById('absolute-rank-display').innerText = state.finalAbsoluteRank;
        document.getElementById('final-entropy-display').innerHTML = `${state.finalEntropy}<span class="text-sm">%</span>`;
        document.getElementById('final-kps-display').innerHTML = `${serverKPS} <span class="text-sm">KPS</span>`;

        // Show Profiles
        const profileContainer = document.getElementById('profile-container');
        if (profileContainer) {
            profileContainer.innerHTML = '';

            if (state.finalProfiles && state.finalProfiles.length > 0) {
                state.finalProfiles.forEach(prof => {
                    // Handle Suspected Cheater as a flag, not a normal card
                    if (prof.title === 'Suspected Cheater') {
                        const flavorText = profileFlavors[prof.title] || prof.flavor || "";
                        profileContainer.innerHTML += `
                            <div class="col-span-full bg-red-500/10 border-2 border-red-500/40 shadow-[0_0_20px_rgba(239,68,68,0.3)] p-4 rounded-xl relative overflow-hidden flex flex-col justify-center items-center text-center animate-pulse">
                                <p class="text-2xl md:text-3xl font-black text-red-400 uppercase drop-shadow-md">⚠️ FLAGGED</p>
                                <p class="text-sm font-bold text-red-300/70 mt-2 italic">"${flavorText}"</p>
                            </div>
                        `;
                        return;
                    }

                    const cat = profileCategoryMap[prof.title] || 'default';
                    const pal = categoryPalettes[cat];

                    const flavorText = profileFlavors[prof.title] || prof.flavor || "";
                    profileContainer.innerHTML += `
                        <div class="${pal.bg} ${pal.border} ${pal.glow} p-4 rounded-xl border border-t-2 relative overflow-hidden cursor-default flex flex-col justify-center h-full text-center group">
                            <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 pointer-events-none"></div>
                            <div class="flex items-center justify-center gap-2 mb-1 z-10 relative">
                                <span class="text-[9px] px-2 py-0.5 rounded ${pal.bg} border ${pal.border} ${pal.text} font-bold uppercase tracking-wider cursor-help" title="${pal.tip}">${pal.label}</span>
                            </div>
                            <p class="text-xl md:text-2xl font-black ${pal.text} uppercase drop-shadow-md leading-none z-10 relative">${prof.title}</p>
                            <p class="text-sm font-bold text-slate-300 mt-2 italic px-2 z-10 relative">"${flavorText}"</p>
                        </div>
                    `;
                });
            } else {
                profileContainer.innerHTML = `
                    <div class="col-span-full border-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.3)] bg-rose-900/20 p-4 rounded-xl border border-t-2 relative flex flex-col justify-center items-center">
                        <p class="text-2xl md:text-3xl font-black text-rose-400 uppercase drop-shadow-[0_0_10px_rgba(251,113,133,0.5)]">THE UNKNOWN</p>
                        <p class="text-sm font-bold text-slate-400 mt-2 italic px-2">"Entity unclassifiable."</p>
                    </div>
                `;
            }
        }

        // Unhide leaderboard and fetch specifically with current run pinned
        const lbSection = document.getElementById('leaderboard-section');
        if (lbSection) lbSection.classList.remove('hidden');

        const finalKPS = (state.localScore / (state.gameDuration / 1000)).toFixed(1);
        state.currentLeaderboardPage = 1;
        state.currentSession = {
            name: playerName,
            score: state.localScore,
            smash_score: serverSmashScore,
            rank: data.rank,
            kps: data.kps || finalKPS,
            entropy: state.finalEntropy,
            profiles: state.finalProfiles || [],
            totalProfiles: state.totalProfiles || 0
        };

        fetchLeaderboard(false);
    }, 3000);
}
