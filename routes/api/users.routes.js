const express = require('express');
const router = express.Router();

module.exports = (db) => {
    // Check if name is available
    router.post('/check-name', (req, res) => {
        const { name } = req.body;
        db.collection('users').findOne({ name }, (err, user) => {
            if (err) return res.status(500).send(err);
            if (user) {
                return res.json({ message: 'Name already exists' });
            } else {
                return res.json({ message: 'Name is available' });
            }
        });
    });

    // Add a new user
    router.post('/add-user', (req, res) => {
        const { name } = req.body;
        db.collection('users').insertOne({ name }, (err, result) => {
            if (err) return res.status(500).send(err);
            return res.json({ message: 'User added successfully' });
        });
    });

    return router;
};
