require('dotenv').config();
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
const bodyParser = require('body-parser');
const MySQLStore = require('express-mysql-session')(session);

const db = require('./db');

const app = express();
const server = http.createServer(app);
const upload = multer({ dest: 'uploads/' });

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const io = socket(server);
let users = [];
let gameRooms = {};

io.on('connection', (socket) => {
    console.log('Made socket connection', socket.id);
    // In your server.js
    io.on('connection', (socket) => {
        socket.on('join', (data) => {
            const { name } = data;
            const player = {
                id: socket.id,
                name,
                pos: 1
            };
            players.push(player);
            io.emit('joined', players);
        });

        socket.on('rollDice', (data) => {
            const { num } = data;
            const player = players.find(p => p.id === socket.id);
            if (player) {
                player.pos = calculateNewPosition(player.pos, num);
                io.emit('rollDice', { id: player.id, pos: player.pos, num });
            }
        });
    });
    // Handle player joining a room
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

    // Handle dice roll and player movement
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

    // Restart game (reset all rooms)
    socket.on('restart', () => {
        users = [];
        gameRooms = {};
        io.emit('restart');
    });

    // Handle user disconnection and cleanup
    socket.on('disconnect', () => {
        for (let roomId in gameRooms) {
            gameRooms[roomId].players = gameRooms[roomId].players.filter(user => user.id !== socket.id);
            io.to(roomId).emit('playersUpdated', gameRooms[roomId].players);
        }
    });
});

// Generate QR code
app.get('/api/qrcode', async (req, res) => {
    const { roomId } = req.query;
    if (!roomId) {
        return res.status(400).send('Missing roomId parameter');
    }

    try {
        const qrCodeDataUrl = await QRCode.toDataURL(`http://localhost:3000/game?roomId=${roomId}`);
        res.send(qrCodeDataUrl);
    } catch (error) {
        console.error('Error generating QR code:', error);
        res.status(500).send('Error generating QR code');
    }
});

// QR Code Image Upload Handler
app.post('/uploadQR', upload.single('qrImage'), (req, res) => {
    console.log('Uploading QR code image');
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
            console.log('QR Code Data:', code.data);
            req.flash('successMessage', `QR Code Data: ${code.data}`);
        } else {
            req.flash('errorMessage', 'Failed to decode QR code.');
        }

        fs.unlinkSync(qrImagePath);
        res.redirect('/generateQR');
    }).catch((err) => {
        console.error('Error loading image:', err);
        req.flash('errorMessage', 'Error processing the image.');
        res.redirect('/generateQR');
    });
});

// Authentication Middleware
function checkAuth(req, res, next) {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    next();
}

// Define generateRoomId function
function generateRoomId() {
    return Math.random().toString(36).substr(2, 9);
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
const qrCodeRoutes = require('./routes/api/qrcode');
const playersRoutes = require('./routes/api/players.routes')(db);
const usersRoutes = require('./routes/api/users.routes')(db);

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

const dbConfig = {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
};

// Configure session store
const sessionStore = new MySQLStore({
    ...dbConfig,
    clearExpired: true,
    checkExpirationInterval: 900000,
    expiration: 86400000,
    createDatabaseTable: true,
    schema: {
        tableName: 'sessions',
        columnNames: {
            session_id: 'session_id',
            expires: 'expires',
            data: 'data'
        }
    }
});

app.use(session({
    key: 'snake_ladder_sid',
    secret: process.env.SESSION_SECRET,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 86400000 // 24 hours
    }
}));

app.use(flash());

app.use((req, res, next) => {
    res.locals.successMessage = req.flash('successMessage');
    res.locals.errorMessage = req.flash('errorMessage');
    res.locals.user = req.session.user;
    next();
});

// Routes
app.use('/api/players', playersRoutes);
app.use('/api/users', usersRoutes);
app.use('/register', registerRoutes);
app.use('/login', loginRoutes);
app.use('/dashboard', checkAuth, dashboardRoutes);
app.use('/forgot-password', forgotPasswordRoutes);
app.use('/reset-password', resetPasswordRoutes);
app.use('/', homeRoutes);
app.use('/game', gameRoutes);
app.use('/profile', profileRoutes);
app.use('/settings', settingsRoutes);
app.use('/qrcode', qrCodeRoutes);
app.get('/', (req, res) => {
    res.redirect('/home');
});

app.get('/waitingRoom', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    res.render('waitingRoom', { roomId: generateRoomId(), user: req.session.user });
});

app.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) return res.redirect('/dashboard');
        res.clearCookie('connect.sid');
        res.redirect('/login');
    });
});


app.get('/api/players', (req, res) => {

    const players = [
        { name: 'Player 1' },
        { name: 'Player 2' },
        { name: 'Player 3' },
        { name: 'Player 4' }
    ];
    res.json(players);
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


// In your server.js file, update the socket.io section:

io.on('connection', (socket) => {
    console.log('Made socket connection', socket.id);

    // Handle joining a room
    socket.on('joinRoom', (data) => {
        const { roomId } = data;
        socket.join(roomId);

        const room = gameRooms.get(roomId);
        if (room) {
            io.to(roomId).emit('playerJoined', {
                players: room.players
            });
        }
    });

    // Handle starting the game
    socket.on('startGame', async (data) => {
        const { roomId } = data;
        const room = gameRooms.get(roomId);

        if (!room) {
            socket.emit('error', { message: 'Room not found' });
            return;
        }

        try {
            // Update room status
            room.status = 'active';
            await db.promise().query(
                'UPDATE game_rooms SET status = ? WHERE room_id = ?',
                ['active', roomId]
            );

            // Notify all players in the room
            io.to(roomId).emit('gameStarted', { roomId });
        } catch (error) {
            console.error('Error starting game:', error);
            socket.emit('error', { message: 'Failed to start game' });
        }
    });

    // Handle player leaving
    socket.on('disconnect', () => {
        // Find and remove player from their room
        for (const [roomId, room] of gameRooms.entries()) {
            const playerIndex = room.players.findIndex(p => p.socketId === socket.id);
            if (playerIndex !== -1) {
                room.players.splice(playerIndex, 1);

                // If room is empty, remove it
                if (room.players.length === 0) {
                    gameRooms.delete(roomId);
                } else {
                    // If host left, assign new host
                    if (!room.players.some(p => p.isHost)) {
                        room.players[0].isHost = true;
                    }

                    // Notify remaining players
                    io.to(roomId).emit('playerLeft', {
                        players: room.players
                    });
                }
                break;
            }
        }
    });

    // Handle game-specific events
    socket.on('join', (data) => {
        const { name, roomId } = data;
        socket.join(roomId);

        const room = gameRooms.get(roomId);
        if (room) {
            const player = {
                id: socket.id,
                username: name,
                pos: 0,
                socketId: socket.id
            };
            room.players.push(player);
            io.to(roomId).emit('playersUpdated', room.players);
        }
    });

    socket.on('rollDice', (data) => {
        const { roomId, num } = data;
        const room = gameRooms.get(roomId);

        if (room) {
            const player = room.players.find(p => p.socketId === socket.id);
            if (player) {
                player.pos += num;

                // Check for snakes and ladders
                player.pos = checkSnakesAndLadders(player.pos);

                io.to(roomId).emit('diceRolled', {
                    id: player.id,
                    pos: player.pos,
                    num: num
                });

                // Check for winner
                if (player.pos >= 99) {
                    io.to(roomId).emit('gameOver', {
                        winner: player.username
                    });
                }
            }
        }
    });
});

// Helper function to check for snakes and ladders
function checkSnakesAndLadders(position) {
    const snakes = {
        98: 40, 84: 58, 87: 49, 73: 15,
        56: 8, 50: 5, 43: 17
    };

    const ladders = {
        2: 23, 4: 68, 6: 45, 20: 59,
        30: 96, 52: 72, 57: 96, 71: 92
    };

    return snakes[position] || ladders[position] || position;
}