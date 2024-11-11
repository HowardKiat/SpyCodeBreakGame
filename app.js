const express = require('express');
const session = require('express-session');
const path = require('path');
const flash = require('connect-flash');
const multer = require('multer');
const QRCode = require('qrcode');
const socket = require("socket.io");
const http = require("http");
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const jsQR = require('jsqr');
const { createCanvas, loadImage } = require('canvas');

const db = require('./db');

const app = express();
const server = http.createServer(app);
const upload = multer({ dest: 'uploads/' });

// Socket setup
const io = socket(server);
let users = [];
let gameRooms = {};

io.on('connection', (socket) => {
    console.log('Made socket connection', socket.id);

    socket.on('join', (data) => {
        const { name, roomId } = data;
        if (!gameRooms[roomId]) {
            gameRooms[roomId] = { players: [], currentTurn: 0 };
        }

        socket.join(roomId);
        const newUser = { id: socket.id, username: name, pos: 0, roomId };
        gameRooms[roomId].players.push(newUser);

        io.to(roomId).emit('playersUpdated', gameRooms[roomId].players);
        socket.emit('joined', gameRooms[roomId].players);
    });

    socket.on('rollDice', (data) => {
        const user = gameRooms[data.roomId]?.players.find(u => u.id === socket.id);
        if (user) {
            user.pos += data.num;
            io.to(data.roomId).emit('diceRolled', { id: user.id, pos: user.pos, num: data.num });

            if (user.pos >= 99) {
                io.to(data.roomId).emit('gameOver', { winner: user.username });
            }

            const nextTurn = (gameRooms[data.roomId].currentTurn + 1) % gameRooms[data.roomId].players.length;
            gameRooms[data.roomId].currentTurn = nextTurn;
            io.to(data.roomId).emit('turnChanged', gameRooms[data.roomId].players[nextTurn]);
        }
    });

    socket.on('restart', () => {
        users = [];
        gameRooms = {};
        io.emit('restart');
    });

    socket.on('disconnect', () => {
        for (let roomId in gameRooms) {
            gameRooms[roomId].players = gameRooms[roomId].players.filter(user => user.id !== socket.id);
            io.to(roomId).emit('playersUpdated', gameRooms[roomId].players);
        }
    });
});

// QR Code Route
app.get('/generateQR', (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    const roomId = uuidv4();
    const url = `http://localhost:3000/game?roomId=${roomId}&username=${req.session.user.username}`;

    QRCode.toDataURL(url, (err, qrCodeUrl) => {
        if (err) return res.status(500).send('Error generating QR code');
        res.render('waitingRoom', { qrCodeUrl });
    });
});

// Handle QR code image upload
app.post('/uploadQR', upload.single('qrImage'), (req, res) => {
    console.log('Uploading QR code image'); // Added logging
    if (!req.file) {
        req.flash('errorMessage', 'No file uploaded.');
        return res.redirect('/generateQR');
    }

    const qrImagePath = path.join(__dirname, req.file.path);

    loadImage(qrImagePath).then((image) => {
        const canvas = createCanvas(image.width, image.height);
        const context = canvas.getContext('2d');
        context.drawImage(image, 0, 0, image.width, image.height);
        const imageData = context.getImageData(0, 0, image.width, image.height);
        const code = jsQR(imageData.data, image.width, image.height);

        if (code) {
            console.log('QR Code Data:', code.data); // Added logging
            req.flash('successMessage', `QR Code Data: ${code.data}`);
        } else {
            req.flash('errorMessage', 'Failed to decode QR code.');
        }

        fs.unlinkSync(qrImagePath);

        res.redirect('/generateQR');
    }).catch((err) => {
        console.error('Error loading image:', err); // Added logging
        req.flash('errorMessage', 'Error processing the image.');
        res.redirect('/generateQR');
    });
});

function checkAuth(req, res, next) {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    next();
}

// Routes setup
const registerRoutes = require('./routes/register');
const loginRoutes = require('./routes/login');
const dashboardRoutes = require('./routes/dashboard');
const homeRoutes = require('./routes/home');
const forgotPasswordRoutes = require('./routes/forgot-password');
const resetPasswordRoutes = require('./routes/reset-password');
const gameRoutes = require('./routes/game');
const profileRoutes = require('./routes/profile');
const settingsRoutes = require('./routes/settings');

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, './views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: 'spykey',
    resave: false,
    saveUninitialized: true
}));

app.use(flash());

app.use((req, res, next) => {
    res.locals.successMessage = req.flash('successMessage');
    res.locals.errorMessage = req.flash('errorMessage');
    res.locals.user = req.session.user;
    next();
});

app.use('/register', registerRoutes);
app.use('/login', loginRoutes);
app.use('/dashboard', checkAuth, dashboardRoutes);
app.use('/forgot-password', forgotPasswordRoutes);
app.use('/reset-password', resetPasswordRoutes);
app.use('/', homeRoutes);
app.use('/game', gameRoutes);
app.use('/profile', profileRoutes);
app.use('/settings', settingsRoutes);

app.get('/', (req, res) => {
    res.redirect('/home');
});

app.get('/waitingRoom', (req, res) => {
    console.log('Accessing /waitingRoom'); // Added logging
    if (!req.session.user) {
        console.log('No session user, redirecting to /login'); // Added logging
        return res.redirect('/login');
    }
    res.render('waitingRoom');
});

app.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) return res.redirect('/dashboard');
        res.clearCookie('connect.sid');
        res.redirect('/login');
    });
});

app.get('/test', (req, res) => {
    res.send('Test route is working!');
});

app.get('/game', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    const { roomId, username } = req.query;
    res.sendFile(path.join(__dirname, 'public', 'game.html'));
});

server.listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
});

module.exports = { app, server };