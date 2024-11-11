const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');

router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const query = 'SELECT * FROM users WHERE username = ?';
        req.app.locals.db.query(query, [username], async (error, results) => {
            if (error) {
                console.error('Login error:', error);
                return res.render('login', { error: 'An error occurred' });
            }

            if (results.length === 0) {
                return res.render('login', { error: 'Invalid username or password' });
            }

            const user = results[0];
            const validPassword = await bcrypt.compare(password, user.password);

            if (!validPassword) {
                return res.render('login', { error: 'Invalid username or password' });
            }

            // Store user in session
            req.session.userId = user.user_id;
            req.session.user = user;

            console.log('Session after login:', {
                sessionID: req.sessionID,
                session: req.session
            });

            req.session.save((err) => {
                if (err) {
                    console.error('Session save error:', err);
                    return res.render('login', { error: 'An error occurred' });
                }
                res.redirect('/dashboard');
            });
        });
    } catch (error) {
        console.error('Login error:', error);
        res.render('login', { error: 'An error occurred' });
    }
});

router.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Logout error:', err);
        }
        res.redirect('/login');
    });
});

module.exports = router;