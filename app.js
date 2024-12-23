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
const db = require('./db');  // Assuming db.js exports a valid database connection

const app = express();
const server = http.createServer(app);
const upload = multer({ dest: 'uploads/' });
const io = socket(server); // Initialize socket.io

let players = []; // List of all players
let gameRooms = {}; // Stores game room info
let currentTurn = 0; // To keep track of whose turn it is

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(flash());
app.use('/uploads', express.static('uploads'));

//Sockets
io.on('connection', (socket) => {
    console.log('Made socket connection', socket.id);

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

    // Handle dice roll
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

    // Handle game restart
    socket.on('restart', () => {
        players = []; // Reset players
        gameRooms = {}; // Reset game rooms
        io.emit('restart'); // Notify all clients to restart the game
    });

    // Handle player disconnection
    socket.on('disconnect', () => {
        for (let roomId in gameRooms) {
            gameRooms[roomId].players = gameRooms[roomId].players.filter(user => user.id !== socket.id);
            io.to(roomId).emit('playersUpdated', gameRooms[roomId].players);
        }
    });
});

// Generate QR code for game room
app.get('/api/qrcode', async (req, res) => {
    const { roomId } = req.query;
    if (!roomId) {
        return res.status(400).send('Missing roomId parameter');
    }

    try {
        const qrCodeDataUrl = await QRCode.toDataURL(`http://localhost:${process.env.PORT}/game?roomId=${roomId}`);
        res.send(qrCodeDataUrl);
    } catch (error) {
        console.error('Error generating QR code:', error);
        res.status(500).send('Error generating QR code');
    }
});

// QR Code Image Upload Handler
app.post('/uploadQR', upload.single('qrImage'), (req, res) => {
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

// Routes setup
const authRoutes = require('./routes/authenticate');
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

// Debug log sessions
app.use((req, res, next) => {
    console.log('Session ID:', req.sessionID);
    console.log('Session Data:', req.session);
    next();
});

// Local Db Access
app.locals.db = db;
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
    resave: true,
    saveUninitialized: true,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        httpOnly: true
    },
    name: 'sessionId'
}));


app.use((req, res, next) => {
    res.locals.successMessage = req.flash('successMessage');
    res.locals.errorMessage = req.flash('errorMessage');
    res.locals.user = req.session.user;
    next();
});

// Routes
app.use('authenticate', authRoutes)
app.use('/api/players', playersRoutes);
app.use('/api/users', usersRoutes);
app.use('/register', registerRoutes);
app.use('/login', loginRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/forgot-password', forgotPasswordRoutes);
app.use('/reset-password', resetPasswordRoutes);
app.use('/', homeRoutes);
app.use('/game', gameRoutes);
app.use('/', profileRoutes);
app.use('/settings', settingsRoutes);
app.use('/qrcode', qrCodeRoutes);
app.get('/', (req, res) => res.redirect('/home'));

app.get('/waitingRoom', checkAuth, (req, res) => {
    res.render('waitingRoom', { roomId: uuidv4(), user: req.session.user });
});

app.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) return res.redirect('/dashboard');
        res.clearCookie('connect.sid');
        res.redirect('/login');
    });
});

app.get('/game', checkAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'game.html'));
});

server.listen(3000, () => {
    console.log('Server is running on port http://localhost:3000/');
});

module.exports = { app, server };
