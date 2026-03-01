// utils/BaseProfileEngine.js
const wasdZone = new Set([
    'KeyW', 'KeyA', 'KeyS', 'KeyD',
    'KeyQ', 'KeyE'
]);

const numpadZone = new Set([
    'Numpad0', 'Numpad1', 'Numpad2', 'Numpad3', 'Numpad4',
    'Numpad5', 'Numpad6', 'Numpad7', 'Numpad8', 'Numpad9',
    'NumpadAdd', 'NumpadSubtract', 'NumpadMultiply',
    'NumpadDivide', 'NumpadEnter', 'NumpadDecimal'
]);

const rows = [
    new Set(['KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT', 'KeyY', 'KeyU', 'KeyI', 'KeyO', 'KeyP']),
    new Set(['KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyH', 'KeyJ', 'KeyK', 'KeyL', 'Semicolon']),
    new Set(['KeyZ', 'KeyX', 'KeyC', 'KeyV', 'KeyB', 'KeyN', 'KeyM', 'Comma', 'Period'])
];

const arrowZone = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);

const vowels = new Set(['KeyA', 'KeyE', 'KeyI', 'KeyO', 'KeyU']);
const fKeys = new Set(['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12']);
const punctuation = new Set(['Comma', 'Period', 'Slash', 'Semicolon', 'Quote', 'BracketLeft', 'BracketRight', 'Minus', 'Equal', 'Backquote', 'Backslash']);
const deletes = new Set(['Backspace', 'Delete']);
const enters = new Set(['Enter', 'NumpadEnter']);
const modifiers = new Set(['ShiftLeft', 'ShiftRight', 'ControlLeft', 'ControlRight', 'AltLeft', 'AltRight', 'MetaLeft', 'MetaRight']);

const copyPasteKeys = new Set(['KeyC', 'KeyV', 'ControlLeft', 'ControlRight', 'MetaLeft']);
const mathOperators = new Set(['NumpadAdd', 'NumpadSubtract', 'NumpadMultiply', 'NumpadDivide', 'Equal', 'Minus']);
const konamiCode = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'KeyB', 'KeyA'];

const mobaZone = new Set(['KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyD', 'KeyF']);
const vimZone = new Set(['KeyH', 'KeyJ', 'KeyK', 'KeyL', 'Escape']);
const osZone = new Set(['MetaLeft', 'MetaRight', 'OSLeft', 'OSRight']);
const mediaZone = new Set(['MediaTrackNext', 'MediaTrackPrevious', 'MediaStop', 'MediaPlayPause', 'AudioVolumeMute', 'AudioVolumeDown', 'AudioVolumeUp']);
const dpadFaceZone = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyZ', 'KeyX', 'KeyC', 'KeyA', 'KeyS', 'KeyD']);



class BaseProfileEngine {
    static calculateStats(keyHistory, expectedTicks, gameSeconds) {
        let s = {
            totalKeys: 0,
            wasdHits: 0,
            numpadHits: 0,
            spaceHits: 0,
            arrowHits: 0,
            uniqueKeysSet: new Set(),
            metronomeCheats: 0,
            maxRowSmashInSingleTick: 0,
            untrustedHits: 0,
            vowelHits: 0,
            fKeyHits: 0,
            punctuationHits: 0,
            deleteHits: 0,
            enterHits: 0,
            modifierHits: 0,
            escHits: 0,
            topRowHits: 0,
            bottomRowHits: 0,
            keyCounts: {},
            mobaHits: 0,
            vimHits: 0,
            osHits: 0,
            mediaHits: 0,
            dpadFaceHits: 0,
            touchHits: 0,
            typedString: "",
            tickTimestamps: [],
            hasAlt: false,
            hasF4: false,
            copyPasteHits: 0,
            tabHits: 0,
            capsLockHits: 0,
            mathHits: 0,
            printScreenHits: 0,
            pauseHits: 0,
            scrollLockHits: 0,
            insertHits: 0,
            konamiIndex: 0,
            konamiAchieved: false,
            firstHitTick: -1,
            lastHitTick: -1,
            firstActiveTickAfterStart: -1,
            currentTickIndex: 0,
            leftHits: 0,
            rightHits: 0,
            centerHits: 0,
            regexHits: 0,
            fastStart: 0,
            lateStart: 0,
            maxGap: 0,
            isHex: true,
            expectedTicks: expectedTicks,
            gameSeconds: gameSeconds
        };

        const leftSideKeys = new Set(['KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT', 'KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyZ', 'KeyX', 'KeyC', 'KeyV', 'KeyB']);
        const rightSideKeys = new Set(['KeyY', 'KeyU', 'KeyI', 'KeyO', 'KeyP', 'KeyH', 'KeyJ', 'KeyK', 'KeyL', 'KeyN', 'KeyM']);

        for (const tick of keyHistory) {
            s.currentTickIndex++;
            if (!Array.isArray(tick)) continue;

            const tickCount = tick.length;
            if (tickCount === 0) continue;

            if (s.currentTickIndex > 1 && s.firstActiveTickAfterStart === -1) {
                s.firstActiveTickAfterStart = s.currentTickIndex;
            }

            s.totalKeys += tickCount;
            s.tickTimestamps.push(s.currentTickIndex);

            let rowCounts = [0, 0, 0];

            for (let key of tick) {
                if (typeof key === 'string' && key.startsWith('Untrusted_')) {
                    s.untrustedHits++;
                    key = key.replace('Untrusted_', '');
                }

                s.uniqueKeysSet.add(key);
                s.keyCounts[key] = (s.keyCounts[key] || 0) + 1;

                if (wasdZone.has(key)) s.wasdHits++;
                if (numpadZone.has(key)) s.numpadHits++;
                if (key === 'Space') s.spaceHits++;
                if (arrowZone.has(key)) s.arrowHits++;

                if (vowels.has(key)) s.vowelHits++;
                if (fKeys.has(key)) s.fKeyHits++;
                if (punctuation.has(key)) s.punctuationHits++;
                if (deletes.has(key)) s.deleteHits++;
                if (enters.has(key)) s.enterHits++;
                if (modifiers.has(key)) s.modifierHits++;
                if (key === 'Escape') s.escHits++;

                if (mobaZone.has(key)) s.mobaHits++;
                if (vimZone.has(key)) s.vimHits++;
                if (osZone.has(key)) s.osHits++;
                if (mediaZone.has(key)) s.mediaHits++;
                if (dpadFaceZone.has(key)) s.dpadFaceHits++;

                if (typeof key === 'string' && key.startsWith('Touch_')) s.touchHits++;

                if (key.startsWith('Key')) s.typedString += key.charAt(3);
                if (key === 'Space') s.typedString += ' ';
                if (key.startsWith('Digit')) s.typedString += key.charAt(5);
                if (key.startsWith('Numpad') && key.length === 7) s.typedString += key.charAt(6);

                if (key === 'Tab') s.tabHits++;
                if (key === 'CapsLock') s.capsLockHits++;
                if (mathOperators.has(key)) s.mathHits++;
                if (key === 'PrintScreen') s.printScreenHits++;
                if (key === 'Pause') s.pauseHits++;
                if (key === 'ScrollLock') s.scrollLockHits++;
                if (key === 'Insert') s.insertHits++;

                if (key === 'AltLeft' || key === 'AltRight') s.hasAlt = true;
                if (key === 'F4') s.hasF4 = true;
                if (copyPasteKeys.has(key)) s.copyPasteHits++;

                if (!s.konamiAchieved) {
                    if (key === konamiCode[s.konamiIndex]) {
                        s.konamiIndex++;
                        if (s.konamiIndex === konamiCode.length) s.konamiAchieved = true;
                    } else if (key === konamiCode[0]) {
                        s.konamiIndex = 1;
                    } else {
                        s.konamiIndex = 0;
                    }
                }

                if (rows[0].has(key)) { rowCounts[0]++; s.topRowHits++; }
                if (rows[1].has(key)) { rowCounts[1]++; }
                if (rows[2].has(key)) { rowCounts[2]++; s.bottomRowHits++; }

                if (leftSideKeys.has(key)) s.leftHits++;
                if (rightSideKeys.has(key)) s.rightHits++;
            }

            if (s.firstHitTick === -1) s.firstHitTick = s.currentTickIndex;
            s.lastHitTick = s.currentTickIndex;

            const maxInTick = Math.max(...rowCounts);
            if (maxInTick > s.maxRowSmashInSingleTick) {
                s.maxRowSmashInSingleTick = maxInTick;
            }

            if (tickCount > 10) {
                s.metronomeCheats++;
            }
        }

        s.uniqueKeys = s.uniqueKeysSet.size;

        s.maxSingleKeyCount = 0;
        s.mostRepeatedKey = '';
        for (let k in s.keyCounts) {
            if (s.keyCounts[k] > s.maxSingleKeyCount) {
                s.maxSingleKeyCount = s.keyCounts[k];
                s.mostRepeatedKey = k;
            }
        }

        let entropy = 0;
        if (s.totalKeys > 0) {
            for (const key in s.keyCounts) {
                const probability = s.keyCounts[key] / s.totalKeys;
                entropy -= probability * Math.log2(probability);
            }
        }
        s.normalizedEntropy = Math.min((entropy / 6.0) * 100, 100).toFixed(1);
        s.ent = parseFloat(s.normalizedEntropy);
        s.kps = s.totalKeys / s.gameSeconds;

        s.centerHits = (s.keyCounts['KeyG'] || 0) + (s.keyCounts['KeyH'] || 0) + (s.keyCounts['KeyY'] || 0) + (s.keyCounts['KeyB'] || 0);
        s.regexHits = (s.keyCounts['Digit6'] || 0) + (s.keyCounts['Digit4'] || 0) + (s.keyCounts['Digit8'] || 0) + (s.keyCounts['NumpadMultiply'] || 0) + (s.keyCounts['Equal'] || 0) + (s.keyCounts['NumpadAdd'] || 0) + (s.keyCounts['Slash'] || 0) + (s.keyCounts['Backslash'] || 0);

        s.isHex = s.typedString.length > 5;
        const hexChars = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'B', 'C', 'D', 'E', 'F'];
        for (let i = 0; i < s.typedString.length; i++) {
            if (!hexChars.includes(s.typedString[i])) s.isHex = false;
        }

        const fastEndTick = Math.floor(s.expectedTicks * 0.1);
        for (let i = 0; i < fastEndTick && i < keyHistory.length; i++) {
            if (Array.isArray(keyHistory[i])) s.fastStart += keyHistory[i].length;
        }

        const lateStartTick = Math.floor(s.expectedTicks * 0.4);
        for (let i = lateStartTick; i < keyHistory.length; i++) {
            if (Array.isArray(keyHistory[i])) s.lateStart += keyHistory[i].length;
        }

        if (s.tickTimestamps.length > 1) {
            for (let i = 1; i < s.tickTimestamps.length; i++) {
                let gap = s.tickTimestamps[i] - s.tickTimestamps[i - 1];
                if (gap > s.maxGap) s.maxGap = gap;
            }
        }

        return s;
    }

    static analyze(keyHistory, profilesArray, expectedTicks, gameSeconds) {
        if (!keyHistory || keyHistory.length === 0) {
            return {
                profiles: [],
                entropy: 0.0,
                isCheater: false
            };
        }

        const stats = this.calculateStats(keyHistory, expectedTicks, gameSeconds);

        if (stats.totalKeys === 0) {
            return {
                profiles: [],
                entropy: 0.0,
                isCheater: false
            };
        }

        let matched = [];
        let isCheaterRun = false;

        for (const profile of profilesArray) {
            if (profile.condition(stats)) {
                let flavorText = typeof profile.flavor === 'function' ? profile.flavor(stats) : profile.flavor;

                let matchedProfile = { title: profile.title, flavor: flavorText };
                if (profile.isCheater) {
                    isCheaterRun = true;
                    matchedProfile.isCheater = true;
                }

                matched.push(matchedProfile);

                if (profile.isExclusive) {
                    break;
                }
            }
        }

        if (isCheaterRun && !matched.some(p => p.title === "Suspected Cheater")) {
            matched.push({ title: "Suspected Cheater", flavor: "Your inputs were flagged by the anti-cheat system.", isCheater: true });
        }

        return {
            profiles: matched,
            entropy: stats.normalizedEntropy,
            isCheater: isCheaterRun
        };
    }

    // Now dynamically computed. We filter to unique titles since "Suspected Cheater" is in PROFILES multiple times
}


BaseProfileEngine.rows = rows;
BaseProfileEngine.vowels = vowels;
BaseProfileEngine.fKeys = fKeys;
BaseProfileEngine.punctuation = punctuation;
BaseProfileEngine.deletes = deletes;
BaseProfileEngine.enters = enters;
BaseProfileEngine.modifiers = modifiers;
BaseProfileEngine.copyPasteKeys = copyPasteKeys;
BaseProfileEngine.mathOperators = mathOperators;
BaseProfileEngine.konamiCode = konamiCode;
BaseProfileEngine.wasdZone = wasdZone;
BaseProfileEngine.numpadZone = numpadZone;
BaseProfileEngine.arrowZone = arrowZone;
BaseProfileEngine.mobaZone = mobaZone;
BaseProfileEngine.vimZone = vimZone;
BaseProfileEngine.osZone = osZone;
BaseProfileEngine.mediaZone = mediaZone;
BaseProfileEngine.dpadFaceZone = dpadFaceZone;

module.exports = BaseProfileEngine;
