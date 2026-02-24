// public/js/ui/pagination.js — Pagination controls for the leaderboard

import { state } from '../core/state.js';
import { fetchLeaderboard } from './leaderboard.js';

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

function createPageButton(pageNum, isActive) {
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
