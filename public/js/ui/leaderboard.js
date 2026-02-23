// public/js/ui/leaderboard.js
import { state } from '../core/state.js';
import { socket } from '../core/socket.js';
import { timeAgo } from '../utils/time.js';
import { showToast } from './toast.js';

// Render Leaderboard Items
export function renderLeaderboard(data, append = false, currentSession = null) {
    const list = document.getElementById('leaderboard-list');
    if (!append) list.innerHTML = '';

    // If we have a current session to highlight, inject it at the very top as a special "YOUR RUN" card
    if (currentSession && !append) {
        const li = document.createElement('li');
        li.className = "flex justify-between items-center p-4 md:p-5 rounded-2xl bg-white/10 border-2 border-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.3)] group relative overflow-hidden mb-6 transform scale-[1.02] z-20";

        let medalHtml = `<span class="text-yellow-400 font-black font-mono text-xl w-10 text-center bg-black/50 py-1 rounded-lg">#${currentSession.rank}</span>`;
        if (currentSession.rank === 1) medalHtml = `<span class="text-4xl drop-shadow-[0_0_10px_rgba(250,204,21,0.6)]">🥇</span>`;
        if (currentSession.rank === 2) medalHtml = `<span class="text-4xl drop-shadow-[0_0_10px_rgba(203,213,225,0.6)]">🥈</span>`;
        if (currentSession.rank === 3) medalHtml = `<span class="text-4xl drop-shadow-[0_0_10px_rgba(217,119,6,0.6)]">🥉</span>`;

        const themeColor = state.leaderboardMode === 'blitz' ? 'purple' : 'rose';
        li.innerHTML = `
            <div class="absolute inset-0 bg-gradient-to-r from-yellow-400/20 via-transparent to-yellow-400/10 pointer-events-none opacity-50 border-white"></div>
            <div class="absolute top-0 left-6 bg-yellow-400 text-black text-[10px] font-black tracking-widest px-3 py-1 rounded-b-md shadow-md z-20 uppercase">YOUR RUN</div>
            <div class="flex items-center gap-4 md:gap-6 z-10 w-full mt-5">
                <div class="flex items-center justify-center w-12">${medalHtml}</div>
                <div class="flex flex-col flex-grow">
                    <span class="font-black text-xl md:text-2xl tracking-wide text-yellow-300 drop-shadow-md uppercase">${currentSession.name} <span class="text-xs text-white/50">(Current)</span></span>
                    <span class="text-xs font-bold text-yellow-200/70 tracking-widest uppercase flex items-center gap-1 mt-1">
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        ${timeAgo(new Date().toISOString())}
                    </span>
                </div>
                <div class="text-right z-10 flex flex-col items-end justify-center">
                    <span class="font-mono font-black text-4xl leading-none text-yellow-300 drop-shadow-[0_0_15px_rgba(250,204,21,0.8)] transition-all" title="Total Keys Smashed">${currentSession.score}</span>
                    <div class="flex gap-2 mt-2">
                        <span class="text-xs font-bold text-sky-300 bg-sky-900/50 px-2 py-0.5 rounded-sm border border-sky-500/30 shadow-[0_0_10px_rgba(14,165,233,0.3)] cursor-help" title="Keys Per Second (Speed)">⚡ ${currentSession.kps || '0.0'} KPS</span>
                        <span class="text-xs font-bold text-rose-300 bg-rose-900/50 px-2 py-0.5 rounded-sm border border-rose-500/30 shadow-[0_0_10px_rgba(244,63,94,0.3)] cursor-help" title="Entropy (Input Chaos Level)">🌪️ ${currentSession.entropy || '0'}%</span>
                    </div>
                </div>
            </div>
        `;
        list.appendChild(li);
    }

    if (data.length === 0 && !append && !currentSession) {
        list.innerHTML = `<li class="text-center p-8 text-slate-500 font-bold uppercase tracking-widest bg-black/30 rounded-2xl border border-white/5">No records found.</li>`;
        return;
    }

    data.forEach((player, index) => {
        // Absolute rank across pagination: (page - 1) * limit + index + 1
        const rank = (state.currentLeaderboardPage - 1) * 10 + index + 1;

        let medalHtml = `<span class="text-slate-500 font-mono text-xl w-10 text-center bg-slate-800/80 py-1 rounded-lg">#${rank}</span>`;
        if (rank === 1) medalHtml = `<span class="text-4xl drop-shadow-[0_0_10px_rgba(250,204,21,0.6)]">🥇</span>`;
        if (rank === 2) medalHtml = `<span class="text-4xl drop-shadow-[0_0_10px_rgba(203,213,225,0.6)]">🥈</span>`;
        if (rank === 3) medalHtml = `<span class="text-4xl drop-shadow-[0_0_10px_rgba(217,119,6,0.6)]">🥉</span>`;

        const themeColor = state.leaderboardMode === 'blitz' ? 'purple' : 'rose';
        const nameColor = rank === 1 ? (state.leaderboardMode === 'blitz' ? 'text-purple-400' : 'text-yellow-400') :
            rank === 2 ? 'text-slate-200' :
                rank === 3 ? (state.leaderboardMode === 'blitz' ? 'text-fuchsia-400' : 'text-amber-500') : 'text-slate-300';

        const li = document.createElement('li');
        li.className = "flex justify-between items-center p-4 md:p-5 rounded-2xl bg-black/40 hover:bg-black/60 transform hover:scale-[1.01] transition-all duration-300 border border-white/5 hover:border-white/10 shadow-lg group relative overflow-hidden";

        // Background hover effect
        li.innerHTML = `
            <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 pointer-events-none"></div>
            <div class="flex items-center gap-4 md:gap-6 z-10 w-full">
                <div class="flex items-center justify-center w-12">${medalHtml}</div>
                <div class="flex flex-col flex-grow">
                    <span class="font-black text-xl md:text-2xl tracking-wide ${nameColor} drop-shadow-md uppercase">${player.name}</span>
                    <span class="text-xs font-bold text-slate-500 tracking-widest uppercase flex items-center gap-1 mt-1">
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        ${timeAgo(player.created_at)}
                    </span>
                </div>
                <div class="text-right z-10 flex flex-col items-end justify-center">
                    <span class="font-mono font-black text-3xl md:text-4xl leading-none text-${themeColor}-500 group-hover:text-${themeColor}-400 group-hover:drop-shadow-[0_0_15px_rgba(var(--color-${themeColor}-500),0.8)] transition-all" title="Total Keys Smashed">${player.score}</span>
                    <div class="flex gap-2 mt-2">
                        <span class="text-xs font-bold text-sky-400 bg-black/40 px-2 py-0.5 rounded-sm border border-sky-500/50 cursor-help" title="Keys Per Second (Speed)">⚡ ${player.kps || '0.0'}</span>
                        <span class="text-xs font-bold text-rose-400 bg-black/40 px-2 py-0.5 rounded-sm border border-rose-500/50 cursor-help" title="Entropy (Input Chaos Level)">🌪️ ${player.entropy || '0'}%</span>
                    </div>
                </div>
            </div>
        `;
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
export async function fetchLeaderboard(append = false, currentSession = null) {
    if (state.isLeaderboardLoading) return;
    state.isLeaderboardLoading = true;

    try {
        const url = `/api/leaderboard?mode=${state.leaderboardMode}&page=${state.currentLeaderboardPage}&limit=10&search=${encodeURIComponent(state.currentLeaderboardSearch)}`;
        const res = await fetch(url);
        const json = await res.json();

        state.hasMoreLeaderboard = json.pagination.hasMore;
        renderLeaderboard(json.data, append, currentSession);
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

    // Real-Time Leaderboard Update (Fallback if page 1 & no search)
    socket.on('updateLeaderboard', () => {
        // Only auto-refresh if we are looking at the default view
        if (state.currentLeaderboardPage === 1 && state.currentLeaderboardSearch === '') {
            fetchLeaderboard(false);
        }
    });
}
