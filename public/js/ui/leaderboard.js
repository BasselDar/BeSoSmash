// public/js/ui/leaderboard.js
import { state } from '../core/state.js';
import { socket } from '../core/socket.js';
import { timeAgo } from '../utils/time.js';
import { showToast } from './toast.js';

// Color palettes for profile cards
const profilePalettes = [
    { accent: 'bg-purple-500', title: 'text-purple-400', border: 'border-purple-500/30', glow: 'shadow-[0_0_12px_rgba(168,85,247,0.2)]', bg: 'bg-purple-500/5' },
    { accent: 'bg-rose-500', title: 'text-rose-400', border: 'border-rose-500/30', glow: 'shadow-[0_0_12px_rgba(244,63,94,0.2)]', bg: 'bg-rose-500/5' },
    { accent: 'bg-amber-500', title: 'text-amber-400', border: 'border-amber-500/30', glow: 'shadow-[0_0_12px_rgba(245,158,11,0.2)]', bg: 'bg-amber-500/5' },
    { accent: 'bg-sky-500', title: 'text-sky-400', border: 'border-sky-500/30', glow: 'shadow-[0_0_12px_rgba(14,165,233,0.2)]', bg: 'bg-sky-500/5' },
    { accent: 'bg-emerald-500', title: 'text-emerald-400', border: 'border-emerald-500/30', glow: 'shadow-[0_0_12px_rgba(16,185,129,0.2)]', bg: 'bg-emerald-500/5' },
    { accent: 'bg-fuchsia-500', title: 'text-fuchsia-400', border: 'border-fuchsia-500/30', glow: 'shadow-[0_0_12px_rgba(217,70,239,0.2)]', bg: 'bg-fuchsia-500/5' },
    { accent: 'bg-indigo-500', title: 'text-indigo-400', border: 'border-indigo-500/30', glow: 'shadow-[0_0_12px_rgba(99,102,241,0.2)]', bg: 'bg-indigo-500/5' },
    { accent: 'bg-orange-500', title: 'text-orange-400', border: 'border-orange-500/30', glow: 'shadow-[0_0_12px_rgba(249,115,22,0.2)]', bg: 'bg-orange-500/5' },
];

// Get a consistent color for a profile title
function getProfilePalette(title) {
    let hash = 0;
    for (let i = 0; i < title.length; i++) hash = title.charCodeAt(i) + ((hash << 5) - hash);
    return profilePalettes[Math.abs(hash) % profilePalettes.length];
}

// Helper to build profile expansion HTML
function buildProfilesHtml(profiles, id) {
    if (!profiles || profiles.length === 0) return '';
    const profileCards = profiles.map(p => {
        // Special override for suspected cheaters — make it visually alarming
        const isSuspect = p.title === 'Suspected Cheater';
        const pal = isSuspect
            ? { accent: 'bg-red-500 animate-pulse', title: 'text-red-400', border: 'border-red-500/40', glow: 'shadow-[0_0_15px_rgba(239,68,68,0.3)]', bg: 'bg-red-500/10' }
            : getProfilePalette(p.title);
        return `
        <div class="flex items-stretch rounded-xl ${pal.bg} border ${pal.border} ${pal.glow} overflow-hidden group/card hover:scale-[1.01] transition-transform duration-200">
            <div class="${pal.accent} w-1 shrink-0 rounded-l-xl"></div>
            <div class="p-3 pl-4">
                <div class="font-black text-sm uppercase tracking-wider ${pal.title}">${p.title}</div>
                <div class="text-xs text-slate-400 mt-1 leading-relaxed italic">"${p.flavor}"</div>
            </div>
        </div>
    `}).join('');

    return `
        <div id="profiles-${id}" class="profiles-expand" style="max-height: 0; overflow: hidden; transition: max-height 0.35s ease;">
            <div class="pt-4 mt-4 border-t border-white/10 flex flex-col gap-2">
                <div class="flex items-center gap-2 mb-1">
                    <div class="h-px flex-grow bg-gradient-to-r from-fuchsia-500/50 to-transparent"></div>
                    <span class="text-[10px] font-black text-fuchsia-500/70 uppercase tracking-[0.2em]">Diagnosis</span>
                    <div class="h-px flex-grow bg-gradient-to-l from-fuchsia-500/50 to-transparent"></div>
                </div>
                ${profileCards}
            </div>
        </div>
    `;
}

// Toggle expand/collapse on a leaderboard entry
function attachExpandHandler(li) {
    li.addEventListener('click', () => {
        const panel = li.querySelector('.profiles-expand');
        const chevrons = li.querySelectorAll('.chevron-icon');
        if (!panel) return;
        if (panel.style.maxHeight && panel.style.maxHeight !== '0px') {
            panel.style.maxHeight = '0px';
            chevrons.forEach(c => c.style.transform = 'rotate(0deg)');
        } else {
            panel.style.maxHeight = panel.scrollHeight + 'px';
            chevrons.forEach(c => c.style.transform = 'rotate(180deg)');
        }
    });
}

// Chevron SVG
const chevronSvg = (extraClass = '') => `<svg class="w-5 h-5 shrink-0 transition-transform duration-300 chevron-icon ${extraClass}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>`;

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
        const profilesHtml = buildProfilesHtml(sessionProfiles, 'current');

        li.innerHTML = `
            <div class="absolute inset-0 bg-gradient-to-r from-yellow-400/20 via-transparent to-yellow-400/10 pointer-events-none opacity-50 border-white"></div>
            <div class="absolute top-0 left-6 bg-yellow-400 text-black text-[10px] font-black tracking-widest px-3 py-1 rounded-b-md shadow-md z-20 uppercase">YOUR RUN</div>
            <div class="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-6 z-10 w-full mt-4 md:mt-5">
                <div class="flex w-full md:w-auto items-center justify-between md:justify-start gap-4">
                    <div class="flex items-center gap-4">
                        <div class="flex items-center justify-center min-w-[3rem] md:w-12">${medalHtml}</div>
                        <div class="flex flex-col flex-grow truncate max-w-[150px] md:max-w-[200px] lg:max-w-none">
                            <span class="font-black text-lg md:text-2xl tracking-wide text-yellow-300 drop-shadow-md uppercase truncate">${currentSession.name} <span class="text-xs text-white/50 whitespace-nowrap">(Current)</span></span>
                            <span class="text-[10px] md:text-xs font-bold text-yellow-200/70 tracking-widest uppercase flex items-center gap-1 mt-1 truncate">
                                <svg class="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                ${timeAgo(new Date().toISOString())}
                            </span>
                        </div>
                    </div>
                    ${chevronSvg('text-yellow-400/60 md:hidden')}
                </div>
                <div class="flex items-center gap-3 md:ml-auto z-10">
                    <div class="text-left md:text-right flex flex-col items-start md:items-end">
                        <span class="font-mono font-black text-3xl md:text-4xl leading-none text-yellow-300 drop-shadow-[0_0_15px_rgba(250,204,21,0.8)] transition-all flex items-center gap-2" title="Smash Score (Includes speed & chaos bonus!)">
                            ${currentSession.smash_score != null ? currentSession.smash_score.toLocaleString() : '---'} <span class="text-xs text-yellow-500/50 cursor-help bg-black/40 rounded-full w-4 h-4 md:w-5 md:h-5 flex items-center justify-center border border-yellow-500/20 px-1 shrink-0">?</span>
                        </span>
                        <div class="flex flex-wrap gap-2 mt-2 w-full justify-start md:justify-end">
                            <span class="text-[10px] md:text-xs font-bold text-amber-300 bg-amber-900/50 px-2 py-0.5 rounded-sm border border-amber-500/30 cursor-help whitespace-nowrap" title="Raw Keys Smashed">💢 ${currentSession.score} keys</span>
                            <span class="text-[10px] md:text-xs font-bold text-cyan-300 bg-cyan-900/50 px-2 py-0.5 rounded-sm border border-cyan-500/30 cursor-help whitespace-nowrap" title="Keys Per Second (Speed)">⚡ ${currentSession.kps || '0.0'} KPS</span>
                            <span class="text-[10px] md:text-xs font-bold text-orange-300 bg-orange-900/50 px-2 py-0.5 rounded-sm border border-orange-500/30 cursor-help whitespace-nowrap" title="Entropy (Input Chaos Level)">🌪️ ${Math.round(parseFloat(currentSession.entropy) || 0)}% chaos</span>
                            ${sessionProfiles.length > 0 ? `<span class="text-[10px] md:text-xs font-bold text-violet-300 bg-violet-900/50 px-2 py-0.5 rounded-sm border border-violet-500/30 cursor-help whitespace-nowrap" title="Personality Profiles Earned (+420 each)">🗣️ ${sessionProfiles.length} ${sessionProfiles.length === 1 ? 'profile' : 'profiles'}</span>` : ''}
                        </div>
                    </div>
                    ${chevronSvg('text-yellow-400/60 hidden md:block')}
                </div>
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
        const hasProfiles = profiles.length > 0;
        const profilesHtml = buildProfilesHtml(profiles, entryId);

        const li = document.createElement('li');
        li.className = `p-4 md:p-5 rounded-2xl bg-black/40 hover:bg-black/60 transform hover:scale-[1.01] transition-all duration-300 border border-white/5 hover:border-white/10 shadow-lg group relative overflow-hidden ${hasProfiles ? 'cursor-pointer select-none' : ''}`;

        li.innerHTML = `
            <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 pointer-events-none"></div>
            <div class="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-6 z-10 w-full">
                <div class="flex w-full md:w-auto items-center justify-between md:justify-start gap-4">
                    <div class="flex items-center gap-4">
                        <div class="flex items-center justify-center min-w-[3rem] md:w-12">${medalHtml}</div>
                        <div class="flex flex-col flex-grow truncate max-w-[150px] md:max-w-[200px] lg:max-w-none">
                            <span class="font-black text-lg md:text-2xl tracking-wide ${nameColor} drop-shadow-md uppercase truncate">${player.name}</span>
                            <span class="text-[10px] md:text-xs font-bold text-slate-500 tracking-widest uppercase flex items-center gap-1 mt-1 truncate">
                                <svg class="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                ${timeAgo(player.created_at)}
                            </span>
                        </div>
                    </div>
                    ${hasProfiles ? chevronSvg('text-slate-500 md:hidden') : ''}
                </div>
                <div class="flex items-center gap-3 md:ml-auto z-10 w-full md:w-auto border-t border-white/10 md:border-0 pt-3 md:pt-0">
                    <div class="text-left md:text-right flex flex-col items-start md:items-end w-full">
                        <span class="font-mono font-black text-2xl md:text-4xl leading-none text-${themeColor}-500 group-hover:text-${themeColor}-400 group-hover:drop-shadow-[0_0_15px_rgba(var(--color-${themeColor}-500),0.8)] transition-all flex items-center gap-2" title="Smash Score (Includes speed & chaos bonus!)">
                            ${player.smash_score != null ? parseInt(player.smash_score).toLocaleString() : '---'} <span class="text-[10px] md:text-xs text-${themeColor}-500/50 cursor-help bg-white/5 rounded-full w-4 h-4 md:w-5 md:h-5 flex items-center justify-center border border-${themeColor}-500/20 shrink-0">?</span>
                        </span>
                        <div class="flex flex-wrap gap-2 mt-2 w-full justify-start md:justify-end">
                            <span class="text-[10px] md:text-xs font-bold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded-sm border border-amber-500/40 cursor-help whitespace-nowrap" title="Raw Keys Smashed">💢 ${player.score} keys</span>
                            <span class="text-[10px] md:text-xs font-bold text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded-sm border border-cyan-500/40 cursor-help whitespace-nowrap" title="Keys Per Second (Speed)">⚡ ${player.kps || '0.0'} KPS</span>
                            <span class="text-[10px] md:text-xs font-bold text-orange-400 bg-orange-950/60 px-2 py-0.5 rounded-sm border border-orange-500/40 cursor-help whitespace-nowrap" title="Entropy (Input Chaos Level)">🌪️ ${Math.round(parseFloat(player.entropy) || 0)}% chaos</span>
                            ${hasProfiles ? `<span class="text-[10px] md:text-xs font-bold text-violet-400 bg-violet-950/60 px-2 py-0.5 rounded-sm border border-violet-500/40 cursor-help whitespace-nowrap" title="Personality Profiles Earned (+420 each)">🗣️ ${profiles.length} ${profiles.length === 1 ? 'profile' : 'profiles'}</span>` : ''}
                        </div>
                    </div>
                    ${hasProfiles ? chevronSvg('text-slate-500 hidden md:block') : ''}
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

export function renderPagination(pagination) {
    const container = document.getElementById('pagination-controls');
    if (!container) return;

    container.innerHTML = '';

    if (pagination.totalPages <= 1) return;

    // Previous Button
    const prevBtn = document.createElement('button');
    prevBtn.innerHTML = '&laquo;';
    prevBtn.className = `px-4 py-2 rounded-xl text-lg font-bold transition-all border ${pagination.page > 1 ? 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border-slate-600 hover:text-white cursor-pointer' : 'bg-slate-800/40 text-slate-500 border-slate-700 opacity-50 cursor-not-allowed'}`;
    prevBtn.disabled = pagination.page <= 1;
    prevBtn.onclick = () => {
        if (pagination.page > 1) {
            state.currentLeaderboardPage = pagination.page - 1;
            fetchLeaderboard(false);
            document.getElementById('leaderboard-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };
    container.appendChild(prevBtn);

    const maxVisiblePages = 5;
    let startPage = Math.max(1, pagination.page - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(pagination.totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    if (startPage > 1) {
        container.appendChild(createPageButton(1, pagination.page === 1));
        if (startPage > 2) {
            const ellipsis = document.createElement('span');
            ellipsis.className = 'px-2 text-slate-500 font-bold';
            ellipsis.innerText = '...';
            container.appendChild(ellipsis);
        }
    }

    for (let i = startPage; i <= endPage; i++) {
        container.appendChild(createPageButton(i, i === pagination.page));
    }

    if (endPage < pagination.totalPages) {
        if (endPage < pagination.totalPages - 1) {
            const ellipsis = document.createElement('span');
            ellipsis.className = 'px-2 text-slate-500 font-bold';
            ellipsis.innerText = '...';
            container.appendChild(ellipsis);
        }
        container.appendChild(createPageButton(pagination.totalPages, pagination.page === pagination.totalPages));
    }

    // Next Button
    const nextBtn = document.createElement('button');
    nextBtn.innerHTML = '&raquo;';
    nextBtn.className = `px-4 py-2 rounded-xl text-lg font-bold transition-all border ${pagination.hasMore ? 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border-slate-600 hover:text-white cursor-pointer' : 'bg-slate-800/40 text-slate-500 border-slate-700 opacity-50 cursor-not-allowed'}`;
    nextBtn.disabled = !pagination.hasMore;
    nextBtn.onclick = () => {
        if (pagination.hasMore) {
            state.currentLeaderboardPage = pagination.page + 1;
            fetchLeaderboard(false);
            document.getElementById('leaderboard-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };
    container.appendChild(nextBtn);
}

export function createPageButton(pageNum, isActive) {
    const btn = document.createElement('button');
    btn.innerText = pageNum;

    if (isActive) {
        if (state.leaderboardMode === 'blitz') {
            btn.className = 'px-4 py-2 rounded-xl text-lg font-bold transition-all border bg-purple-600/20 text-purple-400 border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.3)] scale-110';
        } else {
            btn.className = 'px-4 py-2 rounded-xl text-lg font-bold transition-all border bg-rose-600/20 text-rose-400 border-rose-500/50 shadow-[0_0_15px_rgba(225,29,72,0.3)] scale-110';
        }
    } else {
        btn.className = 'px-4 py-2 rounded-xl text-lg font-bold transition-all border bg-slate-800/80 hover:bg-slate-700 text-slate-300 border-slate-600 hover:border-slate-400 hover:text-white cursor-pointer';
        btn.onclick = () => {
            state.currentLeaderboardPage = pageNum;
            fetchLeaderboard(false);
            document.getElementById('leaderboard-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
        };
    }
    return btn;
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
