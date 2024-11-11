const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();
const db = require('../db');
const passwordValidator = require('password-validator');

// Define password schema
const schema = new passwordValidator();
schema
    .is().min(8)                                    // Minimum length 8
    .is().max(100)                                  // Maximum length 100
    .has().uppercase()                              // Must have uppercase letters
    .has().lowercase()                              // Must have lowercase letters
    .has().digits(1)                                // Must have at least 1 digit
    .has().not().spaces()                           // Should not have spaces
    .has().symbols();                               // Must have at least 1 symbol

router.get('/', (req, res) => {
    res.render('register');
});

router.post('/', async (req, res) => {
    const { username, email, password, confirmPassword } = req.body;

    // Password Validation
    if (!schema.validate(password)) {
        return res.json({ success: false, message: 'Password must be at least 8 characters, include an uppercase letter, a lowercase letter, a digit, and a special character.' });
    }

    if (password !== confirmPassword) {
        return res.json({ success: false, message: "Passwords don't match!" });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const query = 'INSERT INTO users (username, email, password) VALUES (?, ?, ?)';

        const [results] = await db.promise().query(query, [username, email, hashedPassword]);

        // After successful registration, create a session
        req.session.user = { user_id: results.insertId, username, email };

        res.json({ success: true, message: 'Registration successful! Please log in.' });
    } catch (err) {
        console.error(err);
        res.json({ success: false, message: 'Registration failed. Please try again.' });
    }
});

module.exports = router;
