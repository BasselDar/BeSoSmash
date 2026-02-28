// public/js/ui/leaderboard.js — Leaderboard rendering, fetching, and initialization
import { state, ranks } from '../core/state.js';
import { socket } from '../core/socket.js';
import { timeAgo } from '../utils/time.js';
import { showToast } from './toast.js';
import { profileCategoryMap } from '../utils/profileData.js';
import { isCheater, cheaterBadgeHtml, buildProfilesHtml, attachExpandHandler, chevronSvg } from './profiles.js';
import { renderPagination } from './pagination.js';

const totalLegitProfiles = Object.keys(profileCategoryMap).filter(k => profileCategoryMap[k] !== 'cheater').length;

// Compute rank title from raw score (keys pressed) using client-side thresholds
function getRankTitle(score) {
    let rank = ranks[0];
    for (const r of ranks) {
        if (score >= r.threshold) rank = r;
    }
    return rank;
}

// Render Leaderboard Items
export function renderLeaderboard(data, append = false, currentSession = null) {
    const list = document.getElementById('leaderboard-list');
    if (!append) list.innerHTML = '';

    // If the run wasn't a PB, the database naturally dropped it.
    // We synthesize it and inject it directly into the leaderboard 
    // array so the user can natively see where this specific run ranked!
    if (currentSession && currentSession.isPersonalBest === false) {
        // Calculate the page this run belongs on
        const runRankNum = parseInt(currentSession.rank, 10);
        const expectedPage = !isNaN(runRankNum) && runRankNum > 0 ? Math.ceil(runRankNum / 10) : 1;

        // Only inject if the user is currently viewing the page this run belongs to,
        // OR if their expected page doesn't exist yet (db has fewer legit players than this rank)
        if (state.currentLeaderboardPage === expectedPage || expectedPage > state.currentLeaderboardPage) {
            const fakePlayer = {
                name: currentSession.name,
                score: currentSession.score,
                smash_score: currentSession.smash_score,
                kps: currentSession.kps,
                entropy: currentSession.entropy,
                profiles: JSON.stringify(currentSession.profiles),
                created_at: new Date().toISOString(),
                global_rank: currentSession.rank,
                is_injected_run: true
            };

            let insertIndex = data.findIndex(p => parseInt(p.smash_score) < currentSession.smash_score);

            if (insertIndex === -1) {
                // If it belongs at the bottom, place it just before any cheaters
                insertIndex = data.findIndex(p => {
                    let profs = [];
                    try { profs = typeof p.profiles === 'string' ? JSON.parse(p.profiles) : (p.profiles || []); } catch (e) { }
                    return p.is_flagged || isCheater(profs);
                });
                if (insertIndex === -1) insertIndex = data.length;
            }

            data.splice(insertIndex, 0, fakePlayer);
        }
    }

    if (data.length === 0 && !append && !currentSession) {
        list.innerHTML = `<li class="text-center p-8 text-slate-500 font-bold uppercase tracking-widest bg-black/30 rounded-2xl border border-white/5">No records found.</li>`;
        return;
    }

    data.forEach((player, index) => {
        // Absolute rank is now provided directly from the database Window Function!
        const rank = parseInt(player.global_rank, 10);

        // Parse profiles from DB JSON
        let profiles = [];
        try {
            profiles = typeof player.profiles === 'string' ? JSON.parse(player.profiles) : (player.profiles || []);
        } catch (e) { profiles = []; }

        const entryId = `entry-${rank}-${index}`;
        const playerCheater = player.is_flagged || isCheater(profiles);
        const displayProfiles = profiles.filter(p => p.title !== 'Suspected Cheater');
        const hasProfiles = displayProfiles.length > 0;
        const profilesHtml = buildProfilesHtml(profiles, entryId);

        // Flagged players or injected runs: no medals, dimmed styling
        let medalHtml = `<span class="text-slate-500 font-mono text-xl w-10 text-center bg-slate-800/80 py-1 rounded-lg">${player.is_injected_run ? '-' : '#' + rank}</span>`;
        if (!playerCheater && !player.is_injected_run) {
            if (rank === 1) medalHtml = `<img src="/assets/icons/medals/rank1.png" alt="1st Place Medal" class="h-[50px] w-auto object-contain drop-shadow-[0_0_10px_rgba(250,204,21,0.6)]" />`;
            if (rank === 2) medalHtml = `<img src="/assets/icons/medals/rank2.png" alt="2nd Place Medal" class="h-[50px] w-auto object-contain drop-shadow-[0_0_10px_rgba(203,213,225,0.6)]" />`;
            if (rank === 3) medalHtml = `<img src="/assets/icons/medals/rank3.png" alt="3rd Place Medal" class="h-[50px] w-auto object-contain drop-shadow-[0_0_10px_rgba(217,119,6,0.6)]" />`;
        }

        // Check if this row is the artificially injected current run OR a real PB run
        const isCurrentRun = currentSession && (
            player.is_injected_run ||
            (currentSession.isPersonalBest && player.name.toUpperCase() === currentSession.name.toUpperCase() && rank === parseInt(currentSession.rank, 10))
        );

        // Check if this row is their legacy PB row (when they didn't beat it)
        const isPBRow = currentSession && !currentSession.isPersonalBest && !player.is_injected_run &&
            player.name.toUpperCase() === currentSession.name.toUpperCase() &&
            rank === parseInt(currentSession.pbRank, 10);

        const themeColor = state.leaderboardMode === 'blitz' ? 'purple' : 'rose';
        let nameColor = playerCheater ? 'text-red-400/60' :
            rank === 1 ? (state.leaderboardMode === 'blitz' ? 'text-purple-400' : 'text-yellow-400') :
                rank === 2 ? 'text-slate-200' :
                    rank === 3 ? (state.leaderboardMode === 'blitz' ? 'text-fuchsia-400' : 'text-amber-500') : 'text-slate-300';

        if (isCurrentRun) {
            nameColor = 'text-yellow-300 drop-shadow-[0_0_5px_rgba(250,204,21,0.5)]';
        } else if (isPBRow) {
            nameColor = 'text-yellow-100';
        }

        const li = document.createElement('li');

        // Base styling for the list item
        let liClasses = '';
        if (playerCheater) {
            liClasses = `p-4 md:p-5 rounded-2xl bg-red-950/20 transition-all duration-300 border border-red-500/20 shadow-lg group relative overflow-hidden opacity-40 ${hasProfiles ? 'cursor-pointer select-none' : ''}`;
        } else if (isCurrentRun) {
            liClasses = `p-4 md:p-5 rounded-2xl bg-white/10 transition-all duration-300 border-2 border-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.3)] group relative overflow-hidden transform scale-[1.02] z-20 ${hasProfiles ? 'cursor-pointer select-none' : ''}`;
        } else if (isPBRow) {
            // Subtle highlight for their PB row if they didn't beat it this run
            liClasses = `p-4 md:p-5 rounded-2xl bg-black/40 hover:bg-white/5 transition-all duration-300 border border-yellow-500/30 shadow-lg group relative overflow-hidden ${hasProfiles ? 'cursor-pointer select-none' : ''}`;
        } else {
            liClasses = `p-4 md:p-5 rounded-2xl bg-black/40 hover:bg-black/60 transform hover:scale-[1.01] transition-all duration-300 border border-white/5 hover:border-white/10 shadow-lg group relative overflow-hidden ${hasProfiles ? 'cursor-pointer select-none' : ''}`;
        }
        li.className = liClasses;

        // Highlight background for current run
        const bgHighlight = isCurrentRun ? `<div class="absolute inset-0 bg-gradient-to-r from-yellow-400/15 via-transparent to-yellow-400/5 pointer-events-none"></div>` : `<div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 pointer-events-none"></div>`;
        const runBadge = isCurrentRun ? `<div class="absolute top-0 left-6 bg-yellow-400 text-black text-[10px] font-black tracking-widest px-3 py-1 rounded-b-md shadow-md z-20 uppercase">${currentSession.isPersonalBest ? 'NEW HIGHSCORE' : 'YOUR RUN'}</div>` : isPBRow ? `<div class="absolute top-0 left-6 bg-slate-800 text-slate-300 text-[10px] font-black tracking-widest px-3 py-1 rounded-b-md shadow-md z-20 uppercase border border-t-0 border-white/10">PERSONAL BEST</div>` : ``;

        // Shift down the content slightly if it's the current run to make room for the badge
        const mtClass = (isCurrentRun || isPBRow) ? "mt-5" : "";

        const scoreColorClass = playerCheater ? 'text-red-500/40 line-through decoration-red-500/60' :
            isCurrentRun ? 'text-yellow-300 drop-shadow-[0_0_10px_rgba(250,204,21,0.6)]' :
                `text-${themeColor}-500 group-hover:text-${themeColor}-400`;

        let titleMedalHtml = '';
        if (displayProfiles.length >= totalLegitProfiles) titleMedalHtml = `<img src="/assets/icons/medals/completionist.png" alt="Completionist Trophy" class="h-10 w-10 ml-2 drop-shadow-[0_0_15px_rgba(250,204,21,0.6)] cursor-help transition-transform hover:scale-110 -my-1" title="Completionist (${displayProfiles.length}/${totalLegitProfiles} Profiles)" /><span class="cursor-help hidden md:inline-block ml-1 text-[9px] font-black text-yellow-400 uppercase tracking-widest mt-1" title="Completionist (${displayProfiles.length}/${totalLegitProfiles} Profiles)">Completionist</span>`;
        else if (displayProfiles.length >= 110) titleMedalHtml = `<img src="/assets/icons/medals/gold.png" alt="Gold Medal" class="h-8 w-8 ml-2 drop-shadow-[0_0_10px_rgba(250,204,21,0.5)] cursor-help transition-transform hover:scale-110 -my-1" title="Legendary Collector (${displayProfiles.length}+ Profiles)" /><span class="cursor-help hidden md:inline-block ml-1 text-[9px] font-black text-yellow-500 uppercase tracking-widest mt-0.5" title="Legendary Collector (${displayProfiles.length}+ Profiles)">Legendary</span>`;
        else if (displayProfiles.length >= 70) titleMedalHtml = `<img src="/assets/icons/medals/silver.png" alt="Silver Medal" class="h-7 w-7 ml-2 drop-shadow-md cursor-help transition-transform hover:scale-110 -my-0.5" title="Master Collector (${displayProfiles.length}+ Profiles)" /><span class="cursor-help hidden md:inline-block ml-1 text-[9px] font-black text-slate-300 uppercase tracking-widest mt-0.5" title="Master Collector (${displayProfiles.length}+ Profiles)">Master</span>`;
        else if (displayProfiles.length >= 25) titleMedalHtml = `<img src="/assets/icons/medals/bronze.png" alt="Bronze Medal" class="h-7 w-7 ml-2 drop-shadow-md cursor-help transition-transform hover:scale-110 -my-0.5" title="Novice Collector (${displayProfiles.length}+ Profiles)" /><span class="cursor-help hidden md:inline-block ml-1 text-[9px] font-black text-amber-600 uppercase tracking-widest mt-0.5" title="Novice Collector (${displayProfiles.length}+ Profiles)">Novice</span>`;
        else titleMedalHtml = `<img src="/assets/icons/medals/noob.png" alt="Noob Medal" class="h-7 w-7 ml-2 drop-shadow-md cursor-help transition-transform hover:scale-110 filter grayscale opacity-70 -my-0.5" title="Noob Collector (<25 Profiles)" /><span class="cursor-help hidden md:inline-block ml-1 text-[9px] font-black text-slate-500 uppercase tracking-widest mt-0.5" title="Noob Collector (<25 Profiles)">Noob</span>`;

        li.innerHTML = `
            ${bgHighlight}
            ${runBadge}
            <div class="flex flex-col md:flex-row md:items-center gap-3 md:gap-6 z-10 w-full ${mtClass}">
                <div class="flex items-center gap-3 md:gap-4 min-w-0">
                    <div class="flex items-center justify-center min-w-[3rem] shrink-0">${medalHtml}</div>
                    <div class="flex flex-col min-w-0">
                        <div class="flex items-center min-w-0">
                            <span class="font-black text-lg md:text-xl tracking-wide ${nameColor} uppercase truncate">
                                ${player.name}
                            </span>
                            <div class="flex items-center shrink-0">
                                ${titleMedalHtml}
                            </div>
                        </div>
                        ${playerCheater ? cheaterBadgeHtml : ''}
                        <span class="text-[10px] text-slate-600 tracking-widest uppercase flex items-center gap-1 mt-0.5">
                            <svg class="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                            ${timeAgo(player.created_at)}
                        </span>
                        ${(() => { const rk = getRankTitle(player.score); return `<span class="text-[10px] font-black ${rk.color} uppercase tracking-wider mt-0.5">${rk.title}</span>`; })()}
                    </div>
                </div>
                <div class="flex items-center justify-between md:justify-end md:ml-auto gap-3 md:gap-4 w-full md:w-auto pl-1 md:pl-0">
                    <div class="flex flex-col items-start md:items-end">
                        <span class="font-mono font-black text-xl md:text-3xl ${scoreColorClass} transition-colors leading-none" title="Smash Score">${player.smash_score != null ? parseInt(player.smash_score).toLocaleString() : '---'}</span>
                        <div class="flex items-center gap-2 flex-wrap mt-1">
                            <span class="text-[10px] font-bold text-slate-500" title="Keys Pressed">💢${player.score}</span>
                            <span class="text-[10px] font-bold text-slate-500" title="Keys Per Second">⚡${player.kps || '0'}</span>
                            <span class="text-[10px] font-bold text-slate-500" title="Entropy">🌪️${Math.round(parseFloat(player.entropy) || 0)}%</span>
                            ${hasProfiles ? `
                                <span class="text-[10px] font-bold text-violet-400 flex items-center gap-1" title="Collected Profiles — Each unique profile adds +420 to Smash Score">
                                    🗣️${profiles.length}
                                    <span class="w-3.5 h-3.5 rounded-full bg-violet-500/20 border border-violet-500/40 text-violet-400 flex items-center justify-center text-[8px] font-black cursor-help shrink-0">?</span>
                                </span>
                            ` : ''}
                        </div>
                    </div>
                    ${hasProfiles ? chevronSvg(isCurrentRun ? 'text-yellow-400/40' : 'text-slate-600') : ''}
                </div>
            </div>
            ${profilesHtml}
        `;

        if (hasProfiles) {
            attachExpandHandler(li);
        }

        list.appendChild(li);
    });
}

// Fetch Leaderboard API
export async function fetchLeaderboard(append = false) {
    if (state.isLeaderboardLoading) return;
    state.isLeaderboardLoading = true;

    try {
        const url = `/api/leaderboard?mode=${state.leaderboardMode}&page=${state.currentLeaderboardPage}&limit=10&search=${encodeURIComponent(state.currentLeaderboardSearch)}`;
        const res = await fetch(url);
        const json = await res.json();

        // If rank paginated us too far out (e.g., Redis/DB desync after manual DB wipes)
        if (json.data && json.data.length === 0 && state.currentLeaderboardPage > 1) {
            state.currentLeaderboardPage = Math.max(1, json.pagination.totalPages || 1);
            return fetchLeaderboard(append);
        }

        state.hasMoreLeaderboard = json.pagination.hasMore;
        renderLeaderboard(json.data, append, state.currentSession);
        renderPagination(json.pagination);
    } catch (err) {
        console.error("Error fetching leaderboard", err);
        showToast("Error loading leaderboard");
    } finally {
        state.isLeaderboardLoading = false;
    }
}

export function initLeaderboard() {
    // Initial fetch
    fetchLeaderboard(false);

    // Search Input with Debounce
    const searchInput = document.getElementById('leaderboard-search');
    let searchTimeout;
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                state.currentLeaderboardSearch = e.target.value.trim();
                state.currentLeaderboardPage = 1; // Reset to page 1 on new search
                fetchLeaderboard(false);
            }, 300); // 300ms debounce
        });
    }

    // Real-Time Leaderboard Update (Fully Live Everywhere)
    // Skip if user is actively reading an expanded profile panel to prevent jarring collapse
    socket.on('updateLeaderboard', () => {
        const list = document.getElementById('leaderboard-list');
        const expandedPanels = list ? list.querySelectorAll('.profiles-expand') : [];
        const hasExpandedPanel = Array.from(expandedPanels).some(p => p.style.maxHeight && p.style.maxHeight !== '0px');
        if (hasExpandedPanel) return; // Don't interrupt — they'll get fresh data on next interaction
        fetchLeaderboard(false);
    });
}
