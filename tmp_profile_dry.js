const fs = require('fs');
const BaseProfileEngine = require('./utils/BaseProfileEngine');
const ClassicProfileEngine = require('./utils/ClassicProfileEngine');
const BlitzProfileEngine = require('./utils/BlitzProfileEngine');

const classicProfs = ClassicProfileEngine.RAW_PROFILES;
const blitzProfs = BlitzProfileEngine.RAW_PROFILES;

// Identify shared profiles
const blitzTitles = new Set(blitzProfs.map(p => p.title));
const sharedTitles = new Set(classicProfs.filter(p => blitzTitles.has(p.title)).map(p => p.title));

console.log(`Found ${sharedTitles.size} shared profiles.`);

// We need to extract the raw string representations of the profile objects from ClassicProfileEngine.js.
// Since JavaScript formatting varies, we will do a careful bracket-matching extraction.

function extractProfilesRaw(filePath) {
    let source = fs.readFileSync(filePath, 'utf8');
    const profilesStart = source.indexOf('const PROFILES = [');
    const startIdx = source.indexOf('[', profilesStart);

    // Find the matching closing bracket for the PROFILES array
    let braceCount = 0;
    let endIdx = -1;
    for (let i = startIdx; i < source.length; i++) {
        if (source[i] === '[') braceCount++;
        if (source[i] === ']') braceCount--;
        if (braceCount === 0) {
            endIdx = i;
            break;
        }
    }

    const arrayContent = source.substring(startIdx + 1, endIdx).trim();

    // Now we need to split this array content into individual profile strings. 
    // They are separated by commas, but commas exist inside the functions and flavors too.
    // We'll use curly brace matching to isolate each { ... } object.

    let profilesStrings = [];
    let currentObjectStart = -1;
    let objBraceCount = 0;
    let inString = false;
    let stringChar = '';

    for (let i = 0; i < arrayContent.length; i++) {
        const char = arrayContent[i];

        // Handle strings so we don't count braces inside them
        if ((char === '"' || char === "'" || char === '`') && arrayContent[i - 1] !== '\\') {
            if (!inString) {
                inString = true;
                stringChar = char;
            } else if (inString && char === stringChar) {
                inString = false;
            }
        }

        if (!inString) {
            if (char === '{') {
                if (objBraceCount === 0) {
                    currentObjectStart = i;
                }
                objBraceCount++;
            }
            if (char === '}') {
                objBraceCount--;
                if (objBraceCount === 0 && currentObjectStart !== -1) {
                    profilesStrings.push(arrayContent.substring(currentObjectStart, i + 1));
                    currentObjectStart = -1;
                }
            }
        }
    }

    return profilesStrings;
}

const classicRawProfiles = extractProfilesRaw('./utils/ClassicProfileEngine.js');
const blitzRawProfiles = extractProfilesRaw('./utils/BlitzProfileEngine.js');

// Parse titles out of raw strings to categorize them
function getTitleFromRaw(raw) {
    const match = raw.match(/title:\s*["']([^"']+)["']/);
    return match ? match[1] : null;
}

let sharedRawCode = [];
let classicOnlyRawCode = [];
let blitzOnlyRawCode = [];

// Filter Classic
for (let raw of classicRawProfiles) {
    let t = getTitleFromRaw(raw);
    if (sharedTitles.has(t)) {
        sharedRawCode.push(raw);
    } else {
        classicOnlyRawCode.push(raw);
    }
}

// Filter Blitz (only for Blitz exclusives)
for (let raw of blitzRawProfiles) {
    let t = getTitleFromRaw(raw);
    if (!sharedTitles.has(t)) {
        blitzOnlyRawCode.push(raw);
    }
}

console.log(`Classic unique: ${classicOnlyRawCode.length}`);
console.log(`Blitz unique: ${blitzOnlyRawCode.length}`);

// 1. UPDATE BASE PROFILE ENGINE
let baseSrc = fs.readFileSync('./utils/BaseProfileEngine.js', 'utf8');
const baseInjection = `
BaseProfileEngine.SHARED_PROFILES = [
${sharedRawCode.join(',\n')}
];
`;
// Insert right before module.exports
baseSrc = baseSrc.replace(/module\.exports = BaseProfileEngine;/, baseInjection + '\nmodule.exports = BaseProfileEngine;');
fs.writeFileSync('./utils/BaseProfileEngine.js', baseSrc);

// 2. UPDATE CLASSIC PROFILE ENGINE
let classicSrc = fs.readFileSync('./utils/ClassicProfileEngine.js', 'utf8');
const classicReplace = `const PROFILES = [
    ...BaseProfileEngine.SHARED_PROFILES,
    // CLASSIC SPECIFIC PROFILES:
${classicOnlyRawCode.join(',\n')}
];`;
// Regex to replace the entire const PROFILES = [ ... ]; block
classicSrc = classicSrc.replace(/const PROFILES = \[[\s\S]*?\];/, classicReplace);
fs.writeFileSync('./utils/ClassicProfileEngine.js', classicSrc);

// 3. UPDATE BLITZ PROFILE ENGINE
let blitzSrc = fs.readFileSync('./utils/BlitzProfileEngine.js', 'utf8');
const blitzReplace = `const PROFILES = [
    ...BaseProfileEngine.SHARED_PROFILES,
    // BLITZ SPECIFIC PROFILES:
${blitzOnlyRawCode.join(',\n')}
];`;
blitzSrc = blitzSrc.replace(/const PROFILES = \[[\s\S]*?\];/, blitzReplace);
fs.writeFileSync('./utils/BlitzProfileEngine.js', blitzSrc);

console.log("Extraction and rewrite completed successfully.");
