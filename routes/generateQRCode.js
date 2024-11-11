const QRCode = require('qrcode');

const gameUrl = 'http://localhost:3000/game';

QRCode.toFile('qr_code.png', gameUrl, {
    color: {
        dark: '#010599FF',
        light: '#FFFFFFFF'
    }
}, (err) => {
    if (err) {
        console.error('Error generating QR code:', err);
    } else {
        console.log('QR code generated successfully!');
    }
});