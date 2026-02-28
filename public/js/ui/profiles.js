// public/js/ui/profiles.js — Profile card rendering, expand/collapse, and helpers

import { categoryPalettes, profileCategoryMap, getProfilePalette, getProfileCategory } from '../utils/profileData.js';

export function buildProfileCard(p) {
    const pal = getProfilePalette(p.title);
    const cat = categoryPalettes[getProfileCategory(p.title)];
    const flavorText = p.flavor || "You did something weird.";
    return `
    <div class="flex items-start rounded-lg ${pal.bg} border ${pal.border} p-3 gap-3 transition-all duration-150">
        <div class="${pal.accent} w-1 shrink-0 self-stretch rounded-full"></div>
        <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2">
                <span class="font-black text-xs uppercase tracking-wider ${pal.title}">${p.title}</span>
                <span class="text-[9px] px-1.5 py-0.5 rounded ${pal.bg} border ${pal.border} ${pal.title} font-bold uppercase tracking-wide shrink-0 cursor-help" title="${cat.tip}">${cat.label}</span>
            </div>
            <div class="text-[11px] text-slate-400/80 mt-1 leading-snug italic">"${flavorText}"</div>
        </div>
    </div>`;
}

export function isCheater(profiles) {
    return profiles && profiles.some(p => p.title === 'Suspected Cheater');
}

export const cheaterBadgeHtml = `<span class="text-[10px] px-2 py-0.5 rounded bg-red-500/20 border border-red-500/40 text-red-400 font-black uppercase tracking-wider animate-pulse shrink-0" title="This player has been flagged for suspicious input patterns">⚠️ FLAGGED</span>`;

export function buildProfilesHtml(profiles, id, _totalProfilesOverride = 0) {
    if (!profiles || profiles.length === 0) return '';

    // Filter out cheater — it's shown as a flag badge on the name, not a profile card
    const displayProfiles = profiles.filter(p => p.title !== 'Suspected Cheater');
    if (displayProfiles.length === 0) return '';

    // Sort profiles by category first, then alphabetically
    const sortedProfiles = displayProfiles.sort((a, b) => {
        const catA = getProfileCategory(a.title);
        const catB = getProfileCategory(b.title);
        if (catA !== catB) return catA.localeCompare(catB);
        return a.title.localeCompare(b.title);
    });
    const totalProfiles = _totalProfilesOverride > 0 ? _totalProfilesOverride : Object.keys(profileCategoryMap).filter(k => profileCategoryMap[k] !== 'cheater').length;
    const isCompletionist = totalProfiles > 0 && displayProfiles.length >= totalProfiles;
    const encodedProfiles = btoa(unescape(encodeURIComponent(JSON.stringify(sortedProfiles))));

    // Calculate incremental collector medals
    let collectorMedals = '';
    if (displayProfiles.length >= 110 && !isCompletionist) collectorMedals = `<img src="/assets/icons/medals/gold.png" alt="Gold Medal" class="h-8 w-8 ml-2 drop-shadow-[0_0_10px_rgba(250,204,21,0.5)] cursor-help transition-transform hover:scale-110" title="Legendary Collector (${displayProfiles.length}+ Profiles) - Flawless!" />`;
    else if (displayProfiles.length >= 70 && !isCompletionist) collectorMedals = `<img src="/assets/icons/medals/silver.png" alt="Silver Medal" class="h-7 w-7 ml-2 drop-shadow-md cursor-help transition-transform hover:scale-110" title="Master Collector (${displayProfiles.length}+ Profiles) - Almost there!" />`;
    else if (displayProfiles.length >= 25 && displayProfiles.length < 70) collectorMedals = `<img src="/assets/icons/medals/bronze.png" alt="Bronze Medal" class="h-7 w-7 ml-2 drop-shadow-md cursor-help transition-transform hover:scale-110" title="Novice Collector (${displayProfiles.length}+ Profiles) - Keep exploring!" />`;
    else if (displayProfiles.length < 25) collectorMedals = `<img src="/assets/icons/medals/noob.png" alt="Noob Medal" class="h-7 w-7 ml-2 drop-shadow-md cursor-help transition-transform hover:scale-110 filter grayscale opacity-70" title="Noob Collector (<25 Profiles) - Keep smashing!" />`;

    const headerHtml = isCompletionist
        ? `<div class="flex items-center justify-center gap-3 mb-3 py-2 px-4 rounded-lg bg-gradient-to-r from-yellow-500/20 via-amber-500/10 to-yellow-500/20 border border-yellow-400/30 shadow-[0_0_20px_rgba(250,204,21,0.15)]">
               <img src="/assets/icons/medals/completionist.png" alt="Completionist Trophy" class="h-9 w-9 drop-shadow-[0_0_15px_rgba(250,204,21,0.8)]" title="Completionist Collector" />
               <span class="text-xs font-black text-yellow-400 uppercase tracking-[0.2em] animate-pulse">COMPLETIONIST — ALL ${totalProfiles} PROFILES COLLECTED!</span>
               <img src="/assets/icons/medals/completionist.png" alt="Completionist Trophy" class="h-9 w-9 drop-shadow-[0_0_15px_rgba(250,204,21,0.8)]" title="Completionist Collector" />
           </div>`
        : `<div class="flex items-center gap-2 mb-3">
               <div class="h-px flex-grow bg-gradient-to-r from-fuchsia-500/50 to-transparent"></div>
               <span class="text-[10px] font-black text-fuchsia-500/70 uppercase tracking-[0.2em] flex items-center justify-center cursor-help" title="Players collect hidden profiles by playing differently!">
                   Collected Profiles (${displayProfiles.length}${totalProfiles > 0 ? '/' + totalProfiles : ''})
                   ${collectorMedals}
               </span>
               <div class="h-px flex-grow bg-gradient-to-l from-fuchsia-500/50 to-transparent"></div>
           </div>`;

    const searchHtml = displayProfiles.length > 6
        ? `<div class="mb-3">
               <input type="text" placeholder="Search profiles..." class="profile-search-input w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-sm text-slate-300 placeholder-slate-600 focus:outline-none focus:border-fuchsia-500/50 transition-colors" />
           </div>`
        : '';

    return `
        <div id="profiles-${id}" class="profiles-expand" data-profiles="${encodedProfiles}" data-total="${totalProfiles}" data-search="" style="max-height: 0; overflow: hidden; transition: max-height 0.35s ease;">
            <div class="pt-4 mt-4 border-t border-white/10">
                ${headerHtml}
                ${searchHtml}
                <div class="profile-scroll-area" style="max-height: 420px; overflow-y: auto; scrollbar-width: thin; scrollbar-color: rgba(168,85,247,0.3) transparent;">
                    <div class="profile-grid grid grid-cols-1 md:grid-cols-2 gap-2 pr-1"></div>
                </div>
                <div class="profile-count text-center mt-2 pb-1"></div>
            </div>
        </div>
    `;
}

export function renderProfiles(panel) {
    const profiles = JSON.parse(decodeURIComponent(escape(atob(panel.dataset.profiles))));
    const search = (panel.dataset.search || '').toLowerCase();

    const filtered = search
        ? profiles.filter(p => {
            const f = p.flavor || "";
            return p.title.toLowerCase().includes(search) || f.toLowerCase().includes(search);
        })
        : profiles;

    const grid = panel.querySelector('.profile-grid');
    grid.innerHTML = filtered.length > 0
        ? filtered.map(p => buildProfileCard(p)).join('')
        : `<div class="col-span-2 text-center text-sm text-slate-600 py-4">No profiles match "${panel.dataset.search}"</div>`;

    const countEl = panel.querySelector('.profile-count');
    if (search && filtered.length !== profiles.length) {
        countEl.innerHTML = `<span class="text-[10px] text-slate-600">${filtered.length} of ${profiles.length} profiles</span>`;
    } else {
        countEl.innerHTML = '';
    }

    // Recalculate max-height
    panel.style.maxHeight = 'none';
    const h = panel.scrollHeight;
    panel.style.maxHeight = h + 'px';
}

// Toggle expand/collapse on a leaderboard entry
export function attachExpandHandler(li) {
    li.addEventListener('click', (e) => {
        if (e.target.closest('.profile-search-input') || e.target.closest('.profile-scroll-area')) return;

        const panel = li.querySelector('.profiles-expand');
        const chevrons = li.querySelectorAll('.chevron-icon');
        if (!panel) return;

        if (panel.style.maxHeight && panel.style.maxHeight !== '0px') {
            panel.style.maxHeight = '0px';
            chevrons.forEach(c => c.style.transform = 'rotate(0deg)');
        } else {
            panel.dataset.search = '';
            const searchInput = panel.querySelector('.profile-search-input');
            if (searchInput) searchInput.value = '';
            renderProfiles(panel);
            chevrons.forEach(c => c.style.transform = 'rotate(180deg)');
        }
    });

    // Search handler
    const searchInput = li.querySelector('.profile-search-input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            e.stopPropagation();
            const panel = li.querySelector('.profiles-expand');
            panel.dataset.search = e.target.value;
            renderProfiles(panel);
        });
        searchInput.addEventListener('click', (e) => e.stopPropagation());
    }
}

// Chevron SVG
export const chevronSvg = (extraClass = '') => `<svg class="w-5 h-5 shrink-0 transition-transform duration-300 chevron-icon ${extraClass}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>`;
