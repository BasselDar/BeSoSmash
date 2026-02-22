// routes/gameRoutes.js
const express = require('express');
const router = express.Router();
const httpController = require('../controllers/httpController');

// Render home page selection
router.get('/', httpController.renderHome);

router.get('/classic', httpController.renderClassic);
router.get('/blitz', httpController.renderBlitz);
router.get('/api/leaderboard', httpController.getLeaderboardApi);

module.exports = router;