// controllers/httpController.js
const ScoreModel = require('../models/scoreModel');

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
        res.json(result);
    } catch (err) {
        console.error("API error fetching leaderboard:", err);
        res.status(500).json({ error: "Failed to fetch leaderboard" });
    }
};