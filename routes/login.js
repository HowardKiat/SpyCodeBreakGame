const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();
const db = require('../../../SpyGame/backend/db'); // Adjust the path as necessary

// Login Route (GET)
router.get('/', (req, res) => {
    res.render('login');
});

// Login Route (POST)
router.post('/', async (req, res) => {
    const { email, password, rememberMe } = req.body;

    if (!email || !password) {
        req.flash('errorMessage', 'Email and password are required.');
        return res.redirect('/login');
    }

    const query = 'SELECT * FROM users WHERE email = ?';

    try {
        const [results] = await db.promise().query(query, [email]);

        if (results.length === 0) {
            console.log('No user found with that email.');
            req.flash('errorMessage', 'Incorrect email or password.');
            return res.redirect('/login');
        }

        const user = results[0];
        const passwordMatch = await bcrypt.compare(password, user.password);

        if (!passwordMatch) {
            console.log('Password does not match.');
            req.flash('errorMessage', 'Incorrect email or password.');
            return res.redirect('/login');
        }

        // Login successful
        req.session.user = user;

        if (rememberMe) {
            req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
        } else {
            req.session.cookie.expires = false; // Session expires when the browser closes
        }

        req.flash('successMessage', `Welcome back, ${user.username}!`);
        res.redirect('/dashboard');
    } catch (err) {
        console.error('Database query error:', err);
        req.flash('errorMessage', 'An error occurred during login.');
        res.redirect('/login');
    }
});

module.exports = router;
