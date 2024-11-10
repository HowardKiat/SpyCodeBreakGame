const express = require('express');
const router = express.Router();
const db = require('../../../SpyGame/backend/db');

// Route to create a new game session
router.post('/create', (req, res) => {
    const { session_name, user_id } = req.body; // Assuming the user's ID is passed in the body

    // Validate that session_name and user_id are provided
    if (!session_name || !user_id) {
        return res.status(400).json({ message: 'Session name and user ID are required' });
    }

    // Insert new game session into the game_sessions table
    const query = 'INSERT INTO game_sessions (session_name, status) VALUES (?, ?)';
    db.query(query, [session_name, 'active'], (error, results) => {
        if (error) {
            console.error('Error creating game session:', error);
            return res.status(500).json({ message: 'Error creating game session' });
        }

        const session_id = results.insertId; // Get the newly created session's ID

        // Insert the user as the first participant in the user_sessions table
        const userSessionQuery = 'INSERT INTO user_sessions (user_id, session_id) VALUES (?, ?)';
        db.query(userSessionQuery, [user_id, session_id], (error) => {
            if (error) {
                console.error('Error adding user to game session:', error);
                return res.status(500).json({ message: 'Error adding user to session' });
            }

            const newSession = { session_id, session_name, status: 'active' };
            res.json({
                message: 'Game session created successfully, user added',
                session: newSession
            });
        });
    });
});

// Route to join an existing game session
router.post('/join', (req, res) => {
    const { user_id, session_id } = req.body;

    // Validate that both user_id and session_id are provided
    if (!user_id || !session_id) {
        return res.status(400).json({ message: 'User ID and Session ID are required' });
    }

    // Insert the user into the user_sessions table
    const query = 'INSERT INTO user_sessions (user_id, session_id) VALUES (?, ?)';
    db.query(query, [user_id, session_id], (error) => {
        if (error) {
            console.error('Error joining game session:', error);
            return res.status(500).json({ message: 'Error joining game session' });
        }

        // Fetch the session details
        const sessionQuery = 'SELECT * FROM game_sessions WHERE session_id = ?';
        db.query(sessionQuery, [session_id], (error, results) => {
            if (error) {
                console.error('Error fetching session:', error);
                return res.status(500).json({ message: 'Error fetching session' });
            }

            const session = results[0];
            res.json({
                message: 'User joined the session successfully',
                session: session
            });
        });
    });
});

// Route to get all active game sessions
router.get('/sessions', (req, res) => {
    const query = 'SELECT * FROM game_sessions WHERE status = ?';

    db.query(query, ['active'], (error, results) => {
        if (error) {
            console.error('Error fetching game sessions:', error);
            return res.status(500).json({ message: 'Error fetching game sessions' });
        }

        res.json(results);
    });
});

// Route to get all users in a specific session
router.get('/session/:id/users', (req, res) => {
    const { id } = req.params;

    const query = 'SELECT u.user_id, u.created_at FROM user_sessions u WHERE u.session_id = ?';

    db.query(query, [id], (error, results) => {
        if (error) {
            console.error('Error fetching users for session:', error);
            return res.status(500).json({ message: 'Error fetching users for session' });
        }

        res.json(results);
    });
});

module.exports = router;
