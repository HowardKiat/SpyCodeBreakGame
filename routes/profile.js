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

// Get profile page
router.get('/', checkAuth, async (req, res) => {
    const userId = req.session.user.user_id;
    try {
        const user = await db.query('SELECT * FROM users WHERE user_id = ?', [userId]);
        res.render('profile', { user: user[0] });
    } catch (error) {
        console.error('Error retrieving user profile:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Get edit profile page
router.get('/edit', checkAuth, async (req, res) => {
    const userId = req.session.user.user_id;
    try {
        const user = await db.query('SELECT * FROM users WHERE user_id = ?', [userId]);
        res.render('editProfile', { user: user[0] });
    } catch (error) {
        console.error('Error retrieving user profile for editing:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Update profile
router.post('/update', checkAuth, async (req, res) => {
    const { username, email, profile_pic } = req.body;
    const userId = req.session.user.user_id;
    try {
        await db.query('UPDATE users SET username = ?, email = ?, profile_pic = ?, updated_at = NOW() WHERE user_id = ?', [username, email, profile_pic, userId]);
        res.redirect('/profile');
    } catch (error) {
        console.error('Error updating user profile:', error);
        res.status(500).send('Internal Server Error');
    }
});

module.exports = router;