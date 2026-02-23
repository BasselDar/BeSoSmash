const fs = require('fs');
let code = fs.readFileSync('utils/ProfileEngine.js', 'utf8');

// Replace the buildResult declaration
code = code.replace(
    /const buildResult = \\(title, flavor\\) => \\(\\{\\s*profiles: \\[\\{ title, flavor \\}\\],\\s*entropy: normalizedEntropy\\s*\\}\\);/,
    `const matchedProfiles = [];
        const addProfile = (title, flavor) => {
            matchedProfiles.push({ title, flavor });
        };`
);

// Handle early returns for Ghost and Cheaters
code = code.replace(
    /return buildResult\\(\"The Minimalist\", \"(.*?)\"\\);/,
    `return { profiles: [{ title: "The Minimalist", flavor: "$1" }], entropy: normalizedEntropy };`
);

code = code.replace(
    /return buildResult\\(\"The Hardware Spoof\", \"(.*?)\"\\);/,
    `return { profiles: [{ title: "The Hardware Spoof", flavor: "$1" }], entropy: normalizedEntropy };`
);

code = code.replace(
    /return buildResult\\(\"The Metronome\", \"(.*?)\"\\);/,
    `return { profiles: [{ title: "The Metronome", flavor: "$1" }], entropy: normalizedEntropy };`
);

code = code.replace(
    /return buildResult\\(\"The Script Kiddie\", \"(.*?)\"\\);/,
    `return { profiles: [{ title: "The Script Kiddie", flavor: "$1" }], entropy: normalizedEntropy };`
);

// Replace all other buildResult returns
code = code.replace(/return buildResult\\(/g, 'addProfile(');

// Replace the end
const endTarget = `// --- 9. DEFAULT FALLBACK ---
        addProfile("The Panic Button", "Pure, unfiltered chaos. No strategy, no physical zones, just a terrifying blend of adrenaline and flailing fingers. We respect the panic.");
    }`;

const newEnd = `// --- 9. DEFAULT FALLBACK ---
        if (matchedProfiles.length === 0) {
            addProfile("The Panic Button", "Pure, unfiltered chaos. No strategy, no physical zones, just a terrifying blend of adrenaline and flailing fingers. We respect the panic.");
        }

        return {
            profiles: matchedProfiles,
            entropy: normalizedEntropy
        };
    }`;

code = code.replace(endTarget, newEnd);

fs.writeFileSync('utils/ProfileEngine.js', code, 'utf8');
console.log("Successfully updated ProfileEngine.js");
