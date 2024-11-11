const express = require('express');
const router = express.Router();
const db = require('../db');

// Middleware to check if user is authenticated
function checkAuth(req, res, next) {
    if (req.session.user) {
        next();
    } else {
        res.redirect('/login');
    }
}

// Get settings page
router.get('/', checkAuth, async (req, res) => {
    const userId = req.session.user.user_id;
    try {
        const user = await db.query('SELECT * FROM users WHERE user_id = ?', [userId]);
        res.render('settings', { user: user[0] });
    } catch (error) {
        console.error('Error retrieving user settings:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Update settings
router.post('/update', checkAuth, async (req, res) => {
    const { email, password } = req.body;
    const userId = req.session.user.user_id;
    try {
        await db.query('UPDATE users SET email = ?, password = ?, updated_at = NOW() WHERE user_id = ?', [email, password, userId]);
        res.redirect('/settings');
    } catch (error) {
        console.error('Error updating user settings:', error);
        res.status(500).send('Internal Server Error');
    }
});

module.exports = router;