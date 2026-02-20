// routes/gameRoutes.js
const express = require('express');
const router = express.Router();
const httpController = require('../controllers/httpController');

// Redirect base URL to classic
router.get('/', (req, res) => res.redirect('/classic'));

router.get('/classic', httpController.renderClassic);
router.get('/blitz', httpController.renderBlitz);

module.exports = router;