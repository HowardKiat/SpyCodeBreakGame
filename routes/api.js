// routes/api.js
const express = require('express');
const QRCode = require('qrcode');
const router = express.Router();

// Generate QR Code for the room
router.get('/qrcode', async (req, res) => {
    const { roomId } = req.query;
    if (!roomId) return res.status(400).send('Room ID is required');

    try {
        const qrCodeUrl = await QRCode.toDataURL(roomId);
        res.json({ qrCodeUrl });
    } catch (error) {
        console.error('Error generating QR code:', error);
        res.status(500).send('Failed to generate QR code');
    }
});

// Fetch players in a game room
router.get('/players/:roomId', async (req, res) => {
    const roomId = req.params.roomId;

    try {
        const [players] = await req.db.execute(`
            SELECT users.user_id, users.username, users.profile_pic
            FROM users
            JOIN room_players ON users.user_id = room_players.user_id
            WHERE room_players.room_id = ?
        `, [roomId]);

        res.json(players);
    } catch (error) {
        console.error('Error fetching players:', error);
        res.status(500).json({ error: 'Error fetching players' });
    }
});

module.exports = router;
