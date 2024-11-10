// routes/reset-password.js
const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();
const db = require('../../../SpyGame/backend/db');

router.get('/:token', (req, res) => {
    const query = 'SELECT * FROM users WHERE reset_token = ? AND reset_token_expiration > ?';
    db.query(query, [req.params.token, Date.now()], (err, results) => {
        if (err || results.length === 0) {
            req.flash('errorMessage', 'Invalid or expired reset token.');
            return res.redirect('/forgot-password');
        }
        res.render('reset-password', { token: req.params.token });
    });
});

router.post('/:token', async (req, res) => {
    const { password, confirmPassword } = req.body;

    if (password !== confirmPassword) {
        req.flash('errorMessage', "Passwords don't match!");
        return res.redirect(`/reset-password/${req.params.token}`);
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const query = 'UPDATE users SET password = ?, reset_token = NULL, reset_token_expiration = NULL WHERE reset_token = ?';

    db.query(query, [hashedPassword, req.params.token], (err) => {
        if (err) {
            req.flash('errorMessage', 'Error resetting password. Please try again.');
            return res.redirect(`/reset-password/${req.params.token}`);
        }
        req.flash('successMessage', 'Password reset successful. Please log in.');
        res.redirect('/login');
    });
});

module.exports = router;
