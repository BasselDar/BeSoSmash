// public/js/ui/leaderboard.js — Leaderboard rendering, fetching, and initialization
import { state } from '../core/state.js';
import { socket } from '../core/socket.js';
import { timeAgo } from '../utils/time.js';
import { showToast } from './toast.js';
import { isCheater, cheaterBadgeHtml, buildProfilesHtml, attachExpandHandler, chevronSvg } from './profiles.js';
import { renderPagination } from './pagination.js';

// Render Leaderboard Items
export function renderLeaderboard(data, append = false, currentSession = null) {
    const list = document.getElementById('leaderboard-list');
    if (!append) list.innerHTML = '';

    // If we have a current session to highlight, inject it at the very top as a special "YOUR RUN" card
    if (currentSession && !append) {
        const li = document.createElement('li');
        li.className = "p-4 md:p-5 rounded-2xl bg-white/10 border-2 border-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.3)] group relative overflow-hidden mb-6 transform scale-[1.02] z-20 cursor-pointer select-none";

        let medalHtml = `<span class="text-yellow-400 font-black font-mono text-xl w-10 text-center bg-black/50 py-1 rounded-lg">#${currentSession.rank}</span>`;
        if (currentSession.rank === 1) medalHtml = `<span class="text-4xl drop-shadow-[0_0_10px_rgba(250,204,21,0.6)]">🥇</span>`;
        if (currentSession.rank === 2) medalHtml = `<span class="text-4xl drop-shadow-[0_0_10px_rgba(203,213,225,0.6)]">🥈</span>`;
        if (currentSession.rank === 3) medalHtml = `<span class="text-4xl drop-shadow-[0_0_10px_rgba(217,119,6,0.6)]">🥉</span>`;

        const sessionProfiles = currentSession.profiles || [];
        const sessionTotal = currentSession.totalProfiles || 0;
        const sessionCheater = isCheater(sessionProfiles);
        const profilesHtml = buildProfilesHtml(sessionProfiles, 'current', sessionTotal);

        li.innerHTML = `
            <div class="absolute inset-0 bg-gradient-to-r from-yellow-400/15 via-transparent to-yellow-400/5 pointer-events-none"></div>
            <div class="absolute top-0 left-6 bg-yellow-400 text-black text-[10px] font-black tracking-widest px-3 py-1 rounded-b-md shadow-md z-20 uppercase">YOUR RUN</div>
            <div class="flex items-center gap-4 md:gap-6 z-10 w-full mt-5">
                <div class="flex items-center justify-center min-w-[3rem]">${medalHtml}</div>
                <div class="flex flex-col min-w-0 flex-shrink">
                    <span class="font-black text-lg md:text-xl tracking-wide text-yellow-300 uppercase truncate">${currentSession.name}</span>
                    ${sessionCheater ? cheaterBadgeHtml : ''}
                    <span class="text-[10px] text-yellow-200/50 tracking-widest uppercase flex items-center gap-1 mt-0.5">
                        <svg class="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        ${timeAgo(new Date().toISOString())}
                    </span>
                </div>
                <div class="ml-auto flex flex-col items-end gap-1.5 shrink-0">
                    <span class="font-mono font-black text-2xl md:text-3xl text-yellow-300 drop-shadow-[0_0_10px_rgba(250,204,21,0.6)] leading-none" title="Smash Score">${currentSession.smash_score != null ? currentSession.smash_score.toLocaleString() : '---'}</span>
                    <div class="flex items-center gap-1.5 flex-wrap justify-end">
                        <span class="text-[10px] font-bold text-slate-400" title="Keys Pressed">💢${currentSession.score}</span>
                        <span class="text-[10px] text-slate-600">·</span>
                        <span class="text-[10px] font-bold text-slate-400" title="Keys Per Second">⚡${currentSession.kps || '0'}</span>
                        <span class="text-[10px] text-slate-600">·</span>
                        <span class="text-[10px] font-bold text-slate-400" title="Entropy">🌪️${Math.round(parseFloat(currentSession.entropy) || 0)}%</span>
                        ${sessionProfiles.length > 0 ? `
                            <span class="text-[10px] text-slate-600">·</span>
                            <span class="text-[10px] font-bold text-violet-400 flex items-center gap-1" title="Collected Profiles — Each unique profile adds +420 to your Smash Score. Play different styles to collect them all!">
                                🧬${sessionProfiles.length}
                                <span class="w-3.5 h-3.5 rounded-full bg-violet-500/20 border border-violet-500/40 text-violet-400 flex items-center justify-center text-[8px] font-black cursor-help shrink-0">?</span>
                            </span>
                        ` : ''}
                    </div>
                </div>
                ${chevronSvg('text-yellow-400/40')}
            </div>
            ${profilesHtml}
        `;

        attachExpandHandler(li);
        list.appendChild(li);
    }

    if (data.length === 0 && !append && !currentSession) {
        list.innerHTML = `<li class="text-center p-8 text-slate-500 font-bold uppercase tracking-widest bg-black/30 rounded-2xl border border-white/5">No records found.</li>`;
        return;
    }

    data.forEach((player, index) => {
        // Absolute rank is now provided directly from the database Window Function!
        const rank = parseInt(player.global_rank, 10);

        let medalHtml = `<span class="text-slate-500 font-mono text-xl w-10 text-center bg-slate-800/80 py-1 rounded-lg">#${rank}</span>`;
        if (rank === 1) medalHtml = `<span class="text-4xl drop-shadow-[0_0_10px_rgba(250,204,21,0.6)]">🥇</span>`;
        if (rank === 2) medalHtml = `<span class="text-4xl drop-shadow-[0_0_10px_rgba(203,213,225,0.6)]">🥈</span>`;
        if (rank === 3) medalHtml = `<span class="text-4xl drop-shadow-[0_0_10px_rgba(217,119,6,0.6)]">🥉</span>`;

        const themeColor = state.leaderboardMode === 'blitz' ? 'purple' : 'rose';
        const nameColor = rank === 1 ? (state.leaderboardMode === 'blitz' ? 'text-purple-400' : 'text-yellow-400') :
            rank === 2 ? 'text-slate-200' :
                rank === 3 ? (state.leaderboardMode === 'blitz' ? 'text-fuchsia-400' : 'text-amber-500') : 'text-slate-300';

        // Parse profiles from DB JSON
        let profiles = [];
        try {
            profiles = typeof player.profiles === 'string' ? JSON.parse(player.profiles) : (player.profiles || []);
        } catch (e) { profiles = []; }

        const entryId = `entry-${rank}-${index}`;
        const playerCheater = isCheater(profiles);
        const displayProfiles = profiles.filter(p => p.title !== 'Suspected Cheater');
        const hasProfiles = displayProfiles.length > 0;
        const profilesHtml = buildProfilesHtml(profiles, entryId);

        const li = document.createElement('li');
        li.className = `p-4 md:p-5 rounded-2xl bg-black/40 hover:bg-black/60 transform hover:scale-[1.01] transition-all duration-300 border border-white/5 hover:border-white/10 shadow-lg group relative overflow-hidden ${hasProfiles ? 'cursor-pointer select-none' : ''}`;

        li.innerHTML = `
            <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 pointer-events-none"></div>
            <div class="flex items-center gap-4 md:gap-6 z-10 w-full">
                <div class="flex items-center justify-center min-w-[3rem]">${medalHtml}</div>
                <div class="flex flex-col min-w-0 flex-shrink">
                    <span class="font-black text-lg md:text-xl tracking-wide ${nameColor} uppercase truncate">${player.name}</span>
                    ${playerCheater ? cheaterBadgeHtml : ''}
                    <span class="text-[10px] text-slate-600 tracking-widest uppercase flex items-center gap-1 mt-0.5">
                        <svg class="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        ${timeAgo(player.created_at)}
                    </span>
                </div>
                <div class="ml-auto flex flex-col items-end gap-1.5 shrink-0">
                    <span class="font-mono font-black text-2xl md:text-3xl text-${themeColor}-500 group-hover:text-${themeColor}-400 transition-colors leading-none" title="Smash Score">${player.smash_score != null ? parseInt(player.smash_score).toLocaleString() : '---'}</span>
                    <div class="flex items-center gap-1.5 flex-wrap justify-end">
                        <span class="text-[10px] font-bold text-slate-500" title="Keys Pressed">💢${player.score}</span>
                        <span class="text-[10px] text-slate-700">·</span>
                        <span class="text-[10px] font-bold text-slate-500" title="Keys Per Second">⚡${player.kps || '0'}</span>
                        <span class="text-[10px] text-slate-700">·</span>
                        <span class="text-[10px] font-bold text-slate-500" title="Entropy">🌪️${Math.round(parseFloat(player.entropy) || 0)}%</span>
                        ${hasProfiles ? `
                            <span class="text-[10px] text-slate-700">·</span>
                            <span class="text-[10px] font-bold text-violet-400 flex items-center gap-1" title="Collected Profiles — Each unique profile adds +420 to Smash Score">
                                🧬${profiles.length}
                                <span class="w-3.5 h-3.5 rounded-full bg-violet-500/20 border border-violet-500/40 text-violet-400 flex items-center justify-center text-[8px] font-black cursor-help shrink-0">?</span>
                            </span>
                        ` : ''}
                    </div>
                </div>
                ${hasProfiles ? chevronSvg('text-slate-600') : ''}
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
    socket.on('updateLeaderboard', () => {
        fetchLeaderboard(false);
    });
}
