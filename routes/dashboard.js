const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');

// Dashboard Route (Protected)
router.get('/', authMiddleware, (req, res) => {
    res.render('dashboard', { user: req.session.user });
});

// Serve the game page if needed
router.get('/game', authMiddleware, (req, res) => {
    res.render('game', { user: req.session.user });
});

module.exports = router;
