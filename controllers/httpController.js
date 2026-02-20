// controllers/httpController.js
const ScoreModel = require('../models/scoreModel');

exports.renderClassic = async (req, res) => {
    // We could make separate leaderboards later, but let's use the same one for now
    const leaders = await ScoreModel.getLeaderboard();
    res.render('classic', {
        leaders: leaders,
        activePage: 'classic'
    });
};

exports.renderBlitz = async (req, res) => {
    const leaders = await ScoreModel.getLeaderboard('blitz');
    res.render('blitz', {
        leaders: leaders,
        activePage: 'blitz'
    });
};