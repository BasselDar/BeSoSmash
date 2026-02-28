const fs = require('fs');
const engineContent = fs.readFileSync('utils/ProfileEngine.js', 'utf8');
const dataContent = fs.readFileSync('public/js/utils/profileData.js', 'utf8');

const engineTitles = [...engineContent.matchAll(/title:\s*["']([^"']+)["']/g)].map(m => m[1]);

const undefinedProfiles = [];
engineTitles.forEach(title => {
    if (!dataContent.includes(`'${title}':`) && !dataContent.includes(`"${title}":`)) {
        undefinedProfiles.push(title);
    }
});

fs.writeFileSync('missing.json', JSON.stringify(undefinedProfiles, null, 2), 'utf8');
