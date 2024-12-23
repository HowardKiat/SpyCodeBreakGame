// register.js (Express route)
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
    try {
        const { username, email, password, confirmPassword } = req.body;

        // Check if all required fields are present
        if (!username || !email || !password || !confirmPassword) {
            return res.json({
                success: false,
                message: 'All fields are required.'
            });
        }

        // Trim the password to remove any leading/trailing spaces
        const trimmedPassword = password.trim();

        // Check if passwords match
        if (trimmedPassword !== confirmPassword) {
            return res.json({
                success: false,
                message: "Passwords don't match!"
            });
        }

        // Validate password against schema
        if (!schema.validate(trimmedPassword)) {
            return res.json({
                success: false,
                message: 'Password must be at least 8 characters, include an uppercase letter, a lowercase letter, a digit, and a special character.'
            });
        }

        // Check if user already exists
        const [existingUsers] = await db.promise().query(
            'SELECT * FROM users WHERE username = ? OR email = ?',
            [username, email]
        );

        if (existingUsers.length > 0) {
            return res.json({
                success: false,
                message: 'Username or email already exists.'
            });
        }

        // Hash password and create user
        const hashedPassword = await bcrypt.hash(trimmedPassword, 10);
        const query = 'INSERT INTO users (username, email, password) VALUES (?, ?, ?)';
        const [results] = await db.promise().query(query, [username, email, hashedPassword]);

        // Create session
        req.session.user = {
            user_id: results.insertId,
            username,
            email
        };

        res.json({
            success: true,
            message: 'Registration successful! Redirecting to login...'
        });

    } catch (err) {
        console.error('Registration error:', err);
        res.json({
            success: false,
            message: 'Registration failed. Please try again.'
        });
    }
});

module.exports = router;