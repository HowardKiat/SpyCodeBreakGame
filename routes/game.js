// routes/game.js

const express = require('express');
const router = express.Router();
const db = require('../db');
const { v4: uuidv4 } = require('uuid');

// Store game rooms in memory
const gameRooms = new Map();

// Middleware to check if room exists
const checkRoom = async (req, res, next) => {
    const roomId = req.params.roomId || req.body.roomId || req.query.roomId;
    const room = gameRooms.get(roomId);

    if (!room) {
        return res.status(404).json({ success: false, message: 'Room not found' });
    }
    req.gameRoom = room;
    next();
};

// Create a new game room
router.post('/create', async (req, res) => {
    const userId = req.session.user.id;
    const roomId = uuidv4();

    try {
        // Create room in memory
        gameRooms.set(roomId, {
            id: roomId,
            host: userId,
            players: [{
                id: userId,
                username: req.session.user.username,
                isHost: true
            }],
            status: 'waiting',
            createdAt: new Date()
        });

        // Create room in database
        await db.promise().query(
            'INSERT INTO game_rooms (room_id, creator_id, status) VALUES (?, ?, ?)',
            [roomId, userId, 'waiting']
        );

        res.json({
            success: true,
            roomId: roomId
        });
    } catch (error) {
        console.error('Error creating game room:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create game room'
        });
    }
});

// Join a game room
router.post('/join', checkRoom, async (req, res) => {
    const userId = req.session.user.id;
    const { roomId } = req.body;
    const room = req.gameRoom;

    try {
        // Check if game is already in progress
        if (room.status !== 'waiting') {
            return res.status(400).json({
                success: false,
                message: 'Game is already in progress'
            });
        }

        // Check if player is already in the room
        if (room.players.some(p => p.id === userId)) {
            return res.json({
                success: true,
                message: 'Already in room',
                room: room
            });
        }

        // Check if room is full (max 4 players)
        if (room.players.length >= 4) {
            return res.status(400).json({
                success: false,
                message: 'Room is full'
            });
        }

        // Add player to room
        room.players.push({
            id: userId,
            username: req.session.user.username,
            isHost: false
        });

        // Update database
        await db.promise().query(
            'INSERT INTO room_players (room_id, user_id, position) VALUES (?, ?, ?)',
            [roomId, userId, 1]
        );

        res.json({
            success: true,
            room: room
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
router.post('/start', checkRoom, async (req, res) => {
    const userId = req.session.user.id;
    const room = req.gameRoom;

    try {
        // Check if user is host
        if (room.host !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Only the host can start the game'
            });
        }

        // Check minimum players (2)
        if (room.players.length < 2) {
            return res.status(400).json({
                success: false,
                message: 'Need at least 2 players to start'
            });
        }

        // Update room status
        room.status = 'active';

        // Update database
        await db.promise().query(
            'UPDATE game_rooms SET status = ? WHERE room_id = ?',
            ['active', room.id]
        );

        res.json({
            success: true,
            room: room
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
router.get('/room/:roomId', checkRoom, (req, res) => {
    res.json({
        success: true,
        room: req.gameRoom
    });
});

module.exports = router;