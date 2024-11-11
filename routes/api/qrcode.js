const express = require('express');
const qrcode = require('qrcode');
const router = express.Router();

router.get('/', async (req, res) => {
    const { roomId } = req.query;
    if (!roomId) {
        return res.status(400).send('Missing roomId parameter');
    }

    try {
        const qrCodeDataUrl = await qrcode.toDataURL(`http://localhost:3000/game?roomId=${roomId}`);
        res.send(qrCodeDataUrl);
    } catch (error) {
        console.error('Error generating QR code:', error);
        res.status(500).send('Error generating QR code');
    }
});

module.exports = router;