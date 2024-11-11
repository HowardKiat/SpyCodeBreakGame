// routes/game.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const { v4: uuidv4 } = require('uuid');

// Get random question from the database
async function getRandomQuestion() {
    try {
        const [rows] = await db.promise().query(
            'SELECT * FROM questions ORDER BY RAND() LIMIT 1'
        );
        return rows[0];
    } catch (error) {
        console.error('Error fetching question:', error);
        return null;
    }
}

// Create a new game room
router.post('/create', async (req, res) => {
    const { user_id } = req.body;
    const roomId = uuidv4();

    try {
        const [result] = await db.promise().query(
            'INSERT INTO game_rooms (room_id, creator_id, status) VALUES (?, ?, ?)',
            [roomId, user_id, 'waiting']
        );

        // Add creator as first player
        await db.promise().query(
            'INSERT INTO room_players (room_id, user_id, position) VALUES (?, ?, ?)',
            [roomId, user_id, 1]
        );

        res.json({
            success: true,
            room: {
                id: roomId,
                status: 'waiting'
            }
        });
    } catch (error) {
        console.error('Error creating game room:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create game room'
        });
    }
});

// Join an existing game room
router.post('/join', async (req, res) => {
    const { room_id, user_id } = req.body;

    try {
        // Check if room exists and is in waiting status
        const [rooms] = await db.promise().query(
            'SELECT * FROM game_rooms WHERE room_id = ? AND status = ?',
            [room_id, 'waiting']
        );

        if (rooms.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Room not found or game already started'
            });
        }

        // Check if player already in room
        const [existingPlayer] = await db.promise().query(
            'SELECT * FROM room_players WHERE room_id = ? AND user_id = ?',
            [room_id, user_id]
        );

        if (existingPlayer.length > 0) {
            return res.json({
                success: true,
                message: 'Already in room',
                room: rooms[0]
            });
        }

        // Check number of players
        const [playerCount] = await db.promise().query(
            'SELECT COUNT(*) as count FROM room_players WHERE room_id = ?',
            [room_id]
        );

        if (playerCount[0].count >= 6) {
            return res.status(400).json({
                success: false,
                message: 'Room is full'
            });
        }

        // Add player to room
        await db.promise().query(
            'INSERT INTO room_players (room_id, user_id, position) VALUES (?, ?, ?)',
            [room_id, user_id, 1]
        );

        res.json({
            success: true,
            message: 'Joined room successfully',
            room: rooms[0]
        });
    } catch (error) {
        console.error('Error joining game room:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to join game room'
        });
    }
});

// Start game
router.post('/start', async (req, res) => {
    const { room_id } = req.body;

    try {
        // Update room status
        await db.promise().query(
            'UPDATE game_rooms SET status = ? WHERE room_id = ?',
            ['active', room_id]
        );

        // Get all players in room
        const [players] = await db.promise().query(
            'SELECT user_id, position FROM room_players WHERE room_id = ?',
            [room_id]
        );

        res.json({
            success: true,
            message: 'Game started',
            players: players
        });
    } catch (error) {
        console.error('Error starting game:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to start game'
        });
    }
});

// Get room info
router.get('/room/:roomId', async (req, res) => {
    const { roomId } = req.params;

    try {
        const [room] = await db.promise().query(
            'SELECT * FROM game_rooms WHERE room_id = ?',
            [roomId]
        );

        if (room.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Room not found'
            });
        }

        const [players] = await db.promise().query(
            `SELECT rp.*, u.username 
             FROM room_players rp 
             JOIN users u ON rp.user_id = u.id 
             WHERE rp.room_id = ?`,
            [roomId]
        );

        res.json({
            success: true,
            room: {
                ...room[0],
                players: players
            }
        });
    } catch (error) {
        console.error('Error fetching room info:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch room info'
        });
    }
});

// Get random question
router.get('/question', async (req, res) => {
    try {
        const question = await getRandomQuestion();
        if (!question) {
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch question'
            });
        }

        res.json({
            success: true,
            question: question
        });
    } catch (error) {
        console.error('Error fetching question:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch question'
        });
    }
});

module.exports = router;