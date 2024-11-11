const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Only .png, .jpg and .jpeg format allowed!'));
    }
});

// Authentication middleware
const isAuthenticated = (req, res, next) => {
    console.log('Session in isAuthenticated:', req.session);

    // Check if user exists in session
    if (!req.session || !req.session.user || !req.session.user.user_id) {
        console.log('No user in session, redirecting to login');
        return res.redirect('/login');
    }

    // Use the user from session
    req.user = req.session.user;
    next();
};

// Profile page route
router.get('/profile', isAuthenticated, (req, res) => {
    console.log('GET /profile - User:', req.user);
    res.render('profile', {
        user: req.user,
        profilePicUrl: req.user.profile_pic ? `/uploads/${req.user.profile_pic}` : null
    });
});

// Update profile route
router.post('/profile', isAuthenticated, upload.single('profile_pic'), (req, res) => {
    const { username, email, password } = req.body;
    const profilePic = req.file ? req.file.filename : null;

    const updateData = { username, email };
    if (password) {
        // Add password hashing here if not already done elsewhere
        updateData.password = password;
    }
    if (profilePic) {
        updateData.profile_pic = profilePic;
    }

    req.app.locals.db.query('UPDATE users SET ? WHERE user_id = ?', [updateData, req.user.user_id], (error) => {
        if (error) {
            console.error('Error updating profile:', error);
            return res.render('profile', {
                error: 'Error updating profile',
                user: { ...req.user, ...req.body },
                profilePicUrl: req.user.profile_pic ? `/uploads/${req.user.profile_pic}` : null
            });
        }

        // Update session user data
        req.session.user = { ...req.user, ...updateData };
        req.session.save((err) => {
            if (err) {
                console.error('Session save error:', err);
            }
            res.redirect('/profile');
        });
    });
});

module.exports = router;