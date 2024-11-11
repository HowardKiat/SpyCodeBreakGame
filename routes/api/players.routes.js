const express = require('express');
const router = express.Router();

module.exports = (db) => {
    // Get all players in a specific room
    router.get('/:roomId', (req, res) => {
        const roomId = req.params.roomId;
        const query = `
            SELECT users.user_id, users.username, users.profile_pic
            FROM users
            JOIN room_players ON users.user_id = room_players.user_id
            WHERE room_players.room_id = ?;
        `;

        db.query(query, [roomId], (err, players) => {
            if (err) {
                console.error('Error fetching players:', err);
                return res.status(500).send('Error fetching players');
            }
            res.json(players);
        });
    });

    return router;
};
