// routes/profileRoutes.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const multer = require('multer');
const path = require('path');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads/profiles')
    },
    filename: function (req, file, cb) {
        cb(null, `${req.session.user.id}-${Date.now()}${path.extname(file.originalname)}`)
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5000000 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);
        if (extname && mimetype) {
            return cb(null, true);
        }
        cb(new Error('Only .png, .jpg and .jpeg format allowed!'));
    }
});

// Get profile page
router.get('/', async (req, res) => {
    try {
        const [userStats] = await db.query(
            `SELECT us.*, 
             (SELECT COUNT(*) FROM game_sessions WHERE creator_id = ? OR 
              session_id IN (SELECT session_id FROM session_players WHERE user_id = ?)) as total_games,
             (SELECT COUNT(*) FROM game_sessions WHERE winner_id = ?) as games_won
            FROM user_stats us 
            WHERE user_id = ?`,
            [req.session.user.id, req.session.user.id, req.session.user.id, req.session.user.id]
        );

        const [recentGames] = await db.query(
            `SELECT gs.*, 
             IF(gs.winner_id = ?, true, false) as won,
             gs.created_at as date
             FROM game_sessions gs
             WHERE gs.creator_id = ? OR 
             gs.session_id IN (SELECT session_id FROM session_players WHERE user_id = ?)
             ORDER BY gs.created_at DESC LIMIT 5`,
            [req.session.user.id, req.session.user.id, req.session.user.id]
        );

        res.render('profile', {
            user: req.session.user,
            stats: userStats[0],
            recentGames: recentGames
        });
    } catch (error) {
        console.error('Profile error:', error);
        res.status(500).render('error', { message: 'Error loading profile' });
    }
});

// Update profile
router.post('/update', upload.single('profilePic'), async (req, res) => {
    try {
        const { username, email } = req.body;
        let updates = [];
        let values = [];

        if (username) {
            updates.push('username = ?');
            values.push(username);
        }
        if (email) {
            updates.push('email = ?');
            values.push(email);
        }
        if (req.file) {
            updates.push('profile_pic_url = ?');
            values.push(`/uploads/profiles/${req.file.filename}`);
        }

        values.push(req.session.user.id);

        if (updates.length > 0) {
            await db.query(
                `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
                values
            );

            // Update session with new user info
            const [updatedUser] = await db.query(
                'SELECT * FROM users WHERE id = ?',
                [req.session.user.id]
            );
            req.session.user = {
                id: updatedUser[0].id,
                username: updatedUser[0].username,
                email: updatedUser[0].email,
                profilePicUrl: updatedUser[0].profile_pic_url
            };
        }

        req.flash('successMessage', 'Profile updated successfully');
        res.redirect('/profile');
    } catch (error) {
        console.error('Profile update error:', error);
        req.flash('errorMessage', 'Failed to update profile');
        res.redirect('/profile');
    }
});

module.exports = router;