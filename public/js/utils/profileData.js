export const categoryPalettes = {
    cheater: { accent: 'bg-red-500', title: 'text-red-400', border: 'border-red-500/30', bg: 'bg-red-500/5', label: 'Cheater', tip: 'Flagged for suspicious input — scripted, spoofed, or bot-like behavior', text: 'text-red-400', glow: 'shadow-[0_0_15px_rgba(239,68,68,0.3)]' },
    rare: { accent: 'bg-fuchsia-500', title: 'text-fuchsia-400', border: 'border-fuchsia-500/30', bg: 'bg-fuchsia-500/5', label: 'Rare', tip: 'Exclusive profiles from unique actions — hard to trigger, flex-worthy', text: 'text-fuchsia-400', glow: 'shadow-[0_0_15px_rgba(217,70,239,0.3)]' },
    easter: { accent: 'bg-amber-500', title: 'text-amber-400', border: 'border-amber-500/30', bg: 'bg-amber-500/5', label: 'Easter Egg', tip: 'Hidden profiles triggered by secret typed words or sequences', text: 'text-amber-400', glow: 'shadow-[0_0_15px_rgba(245,158,11,0.3)]' },
    gamer: { accent: 'bg-purple-500', title: 'text-purple-400', border: 'border-purple-500/30', bg: 'bg-purple-500/5', label: 'Gamer', tip: 'Gaming-related key combos — WASD, arrow keys, macro patterns, etc.', text: 'text-purple-400', glow: 'shadow-[0_0_15px_rgba(168,85,247,0.3)]' },
    nerd: { accent: 'bg-sky-500', title: 'text-sky-400', border: 'border-sky-500/30', bg: 'bg-sky-500/5', label: 'Nerd', tip: 'Developer and tech key patterns — Vim, terminal shortcuts, regex, hex', text: 'text-sky-400', glow: 'shadow-[0_0_15px_rgba(14,165,233,0.3)]' },
    keyboard: { accent: 'bg-emerald-500', title: 'text-emerald-400', border: 'border-emerald-500/30', bg: 'bg-emerald-500/5', label: 'Keyboard', tip: 'Based on which keyboard zones you favor — top row, bottom row, left hand, right hand, etc.', text: 'text-emerald-400', glow: 'shadow-[0_0_15px_rgba(16,185,129,0.3)]' },
    pacing: { accent: 'bg-orange-500', title: 'text-orange-400', border: 'border-orange-500/30', bg: 'bg-orange-500/5', label: 'Pacing', tip: 'Based on your typing speed and rhythm — slow start, bursts, AFK, or constant pressure', text: 'text-orange-400', glow: 'shadow-[0_0_15px_rgba(249,115,22,0.3)]' },
    default: { accent: 'bg-slate-500', title: 'text-slate-400', border: 'border-slate-500/30', bg: 'bg-slate-500/5', label: 'Other', tip: 'Miscellaneous profile', text: 'text-slate-400', glow: 'shadow-[0_0_15px_rgba(100,116,139,0.3)]' },
};

// Map every profile title to its category
export const profileCategoryMap = {
    // Cheater / Suspicious
    'The Script Kiddie': 'cheater', 'The Hardware Spoof': 'cheater',
    'Suspected Cheater': 'cheater', 'The Overloader': 'cheater',
    // Rare / Exclusive
    'The Minimalist': 'rare', 'The Rage Quitter': 'rare', 'The Plagiarist': 'rare', 'The Glitch': 'rare',
    'The Konami Coder': 'rare', 'The Spacebar Supremacist': 'rare', 'The Start Menu Sommelier': 'rare', 'The Mobile Smasher': 'rare',
    // Easter Eggs
    'The Accidental Potato': 'easter', 'The SQL Dropper': 'easter', 'The Sudo Override': 'easter', 'The Git Pusher': 'easter',
    'The Calculator Kid': 'easter', 'The Upside Down Genius': 'easter', 'The Satanist Calculator': 'easter',
    'The 69er': 'easter', 'The Botanist': 'easter', 'The 2013 Throwback': 'easter', 'The Yeet Lord': 'easter',
    'The HackerMan': 'easter', 'The Console Logger': 'easter', 'The Lorem Ipsum': 'easter', 'The Any% Speedrunner': 'easter',
    'The Dark Souls Veteran': 'easter', 'The Hopeful Romantic': 'easter', 'The Confused': 'easter', 'The Drama Queen': 'easter',
    'The Trash Talker': 'easter', 'The Disrespectful One': 'easter', 'The Swear Jar': 'easter', 'The Instagram User': 'easter',
    'The Meta Gamer': 'easter', 'The Cry for Help': 'easter', 'The Polite Menace': 'easter', 'The 1337 Fossil': 'easter',
    'The Keyboard Tourist': 'easter', 'The E-Sports Veteran': 'easter', 'The Home Row Devotee': 'easter', 'The Nice Guy': 'easter',
    'The Creator': 'easter', 'The Perfectionist': 'easter', 'The Pi Calculator': 'easter', 'The Fibonacci Sequence': 'easter',
    'The Palindrome': 'easter', 'The Typewriter': 'easter', 'The Alphabet Tourist': 'easter', 'The Roll Call': 'easter',
    'Nice': 'easter',
    'The Rick Roll': 'easter', 'The Matrix': 'easter', 'The Crypto Bro': 'easter',
    'The Password': 'easter', 'The Rage Typer': 'easter', 'The Philosopher': 'easter',
    'The Hybrid': 'gamer', 'The Forearm Sweep': 'gamer', 'The Silverback': 'gamer', 'The Single-Key Murderer': 'gamer',
    'The Center of Attention': 'gamer', 'The BIOS Tech': 'gamer', 'The Flash Gamer': 'gamer',
    'The Arrow Key Boomer': 'gamer', 'The Left-Handed Boomer': 'gamer', 'The MOBA Toxic': 'gamer',
    'The Osu! Addict': 'gamer', 'The Fighting Game Scrub': 'gamer', 'The MMO Raider': 'gamer',
    'The Crouch Spammer': 'gamer', 'The Bunny Hopper': 'gamer', 'The Sweaty Tryhard': 'gamer', 'The Alt-Tabber': 'gamer',
    'The Pianist': 'gamer', 'The Precision Striker': 'gamer', 'The Drummer': 'gamer', 'The Stenographer': 'gamer',
    // Nerd / Tech
    'The Vim Escaper': 'nerd', 'The HTML Hacker': 'nerd', 'The Regex Nightmare': 'nerd', 'The Hexadecimal': 'nerd',
    'The Terminal Typist': 'nerd', 'The Mad Scientist': 'nerd', 'The Angry Accountant': 'nerd',
    'The F-Key Summoner': 'nerd', 'The Binary Bot': 'nerd', 'The Reverse Engineer': 'nerd',
    // Keyboard Zones
    'The Bottom Feeder': 'keyboard', 'The Top Row Tyrant': 'keyboard', 'The Vowel Enthusiast': 'keyboard',
    'The Consonant Crusader': 'keyboard', 'The Vowel Vulture': 'keyboard', 'The Left-Handed Demon': 'keyboard',
    'The Right-Handed Menace': 'keyboard', 'The Escape Artist': 'keyboard', 'The Typosquatter': 'keyboard',
    'The Executioner': 'keyboard', 'The Punctuation Pedant': 'keyboard',
    'The Screamer': 'keyboard', 'The IT Support': 'keyboard', 'The Windows Key Victim': 'keyboard',
    'The Screenshot Hoarder': 'keyboard', 'The System Interrupter': 'keyboard', 'The Scroll Lock Champion': 'keyboard',
    'The Toggle Archaeologist': 'keyboard', 'The Mod Squad': 'keyboard',
    'The Numpad Astronaut': 'keyboard', 'The Shift Warrior': 'keyboard', 'The Tab Destroyer': 'keyboard',
    'The Backspace Poet': 'keyboard', 'The Perfect Balance': 'keyboard', 'The Number Cruncher': 'keyboard',
    'The Home Row Anchor': 'keyboard',
    // Pacing / Timing / Entropy
    'The Two-Finger Peck': 'pacing', 'The Stutterer': 'pacing', 'The Novelist': 'pacing',
    'The Pacifist': 'pacing', 'The AFK': 'pacing', 'The Early Bird': 'pacing', 'The Decaf Drinker': 'pacing',
    'The Anime Comeback': 'pacing', 'The Distracted': 'pacing', 'The Sloth': 'pacing',
    'The Heartbeat': 'pacing', 'The Chaotic Evil': 'pacing', 'The Lawful Good': 'pacing',
    'The Overclocker': 'pacing', 'The Rhythm Gamer': 'pacing', 'The Mechanical Switch Tester': 'pacing',
    'The Countdown': 'pacing', 'The Speed Demon': 'pacing',
    'The Sniper': 'pacing', 'The Sprinter': 'pacing', 'The Marathon Runner': 'pacing',
    'The Lag Spike': 'pacing', 'The Warm-Up Act': 'pacing',
    // Gamer (continued)
    'The Pure Smasher': 'gamer',
};

export function getProfileCategory(title) {
    return profileCategoryMap[title] || 'default';
}

export function getProfilePalette(title) {
    return categoryPalettes[getProfileCategory(title)];
}
