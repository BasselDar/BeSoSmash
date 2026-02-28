const ScoreModel = require('../models/scoreModel');
const ClassicProfileEngine = require('../utils/ClassicProfileEngine');
const BlitzProfileEngine = require('../utils/BlitzProfileEngine');

exports.renderHome = async (req, res) => {
    const globalSmashCount = await ScoreModel.getGlobalSmashCount();
    res.render('home', {
        activePage: 'home',
        globalSmashCount
    });
};

exports.renderClassic = (req, res) => {
    res.render('classic', {
        activePage: 'classic'
    });
};

exports.renderBlitz = (req, res) => {
    res.render('blitz', {
        activePage: 'blitz'
    });
};

exports.getLeaderboardApi = async (req, res) => {
    try {
        const mode = req.query.mode || 'classic';
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || '';

        const result = await ScoreModel.getPaginatedLeaderboard(mode, page, limit, search);

        // Inject flavor text back into the profiles (DB only stores titles to save space)
        if (result && result.data) {
            result.data.forEach(row => {
                let profiles = [];
                try {
                    profiles = typeof row.profiles === 'string' ? JSON.parse(row.profiles) : (row.profiles || []);
                } catch (e) { }

                const engine = mode === 'blitz' ? BlitzProfileEngine : ClassicProfileEngine;
                profiles.forEach(p => {
                    const engineProfile = engine.RAW_PROFILES.find(ep => ep.title === p.title);
                    if (engineProfile && !p.flavor) {
                        p.flavor = engineProfile.flavor;
                    }
                });
                row.profiles = JSON.stringify(profiles); // Leaderboard frontend expects stringified JSON
            });
        }

        res.json(result);
    } catch (err) {
        console.error("API error fetching leaderboard:", err);
        res.status(500).json({ error: "Failed to fetch leaderboard" });
    }
};