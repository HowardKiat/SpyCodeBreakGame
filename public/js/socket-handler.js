const db = require('../../db');

class GameState {
    constructor(roomId) {
        this.roomId = roomId;
        this.players = new Map();
        this.currentTurn = null;
        this.gameStarted = false;
        this.lastRoll = null;
    }

    addPlayer(playerId, username) {
        this.players.set(playerId, {
            id: playerId,
            username: username,
            position: 1
        });
        if (!this.currentTurn) this.currentTurn = playerId;
    }

    removePlayer(playerId) {
        this.players.delete(playerId);
        if (this.currentTurn === playerId) {
            this.nextTurn();
        }
    }

    nextTurn() {
        const playerIds = Array.from(this.players.keys());
        const currentIndex = playerIds.indexOf(this.currentTurn);
        this.currentTurn = playerIds[(currentIndex + 1) % playerIds.length];
        return this.currentTurn;
    }

    updatePosition(playerId, newPosition) {
        const player = this.players.get(playerId);
        if (player) {
            player.position = newPosition;
            return true;
        }
        return false;
    }

    getState() {
        return {
            roomId: this.roomId,
            players: Array.from(this.players.values()),
            currentTurn: this.currentTurn,
            gameStarted: this.gameStarted
        };
    }
}

const gameStates = new Map();

function setupSocketHandlers(io) {
    io.on('connection', (socket) => {
        console.log('New client connected:', socket.id);

        socket.on('joinGame', async ({ roomId, username }) => {
            try {
                // Join socket room
                socket.join(roomId);

                // Get or create game state
                let gameState = gameStates.get(roomId);
                if (!gameState) {
                    gameState = new GameState(roomId);
                    gameStates.set(roomId, gameState);
                }

                // Add player to game state
                gameState.addPlayer(socket.id, username);

                // Notify all players in room
                io.to(roomId).emit('gameState', gameState.getState());
                io.to(roomId).emit('playerJoined', {
                    id: socket.id,
                    username: username
                });
            } catch (error) {
                console.error('Error joining game:', error);
                socket.emit('error', { message: 'Failed to join game' });
            }
        });

        socket.on('rollDice', async ({ roomId }) => {
            try {
                const gameState = gameStates.get(roomId);
                if (!gameState || gameState.currentTurn !== socket.id) return;

                const diceValue = Math.floor(Math.random() * 6) + 1;
                const player = gameState.players.get(socket.id);
                let newPosition = player.position + diceValue;

                // Check for snakes and ladders
                newPosition = checkSnakesAndLadders(newPosition);

                // Update player position
                gameState.updatePosition(socket.id, newPosition);

                // Broadcast dice roll and movement
                io.to(roomId).emit('diceRolled', {
                    playerId: socket.id,
                    value: diceValue,
                    newPosition: newPosition
                });

                // Check for win condition
                if (newPosition >= 100) {
                    io.to(roomId).emit('gameOver', {
                        id: socket.id,
                        username: player.username
                    });

                    // Update game statistics
                    await updateGameStats(socket.id, roomId);
                } else {
                    // Send question if landed on special square
                    if (isSpecialSquare(newPosition)) {
                        const question = await getRandomQuestion();
                        socket.emit('questionReceived', question);
                    } else {
                        // Move to next turn
                        const nextPlayer = gameState.nextTurn();
                        io.to(roomId).emit('turnUpdate', nextPlayer);
                    }
                }
            } catch (error) {
                console.error('Error processing dice roll:', error);
                socket.emit('error', { message: 'Failed to process dice roll' });
            }
        });

        socket.on('submitAnswer', async ({ roomId, answer }) => {
            try {
                const gameState = gameStates.get(roomId);
                if (!gameState) return;

                const isCorrect = await validateAnswer(answer);
                socket.emit('answerResult', { correct: isCorrect });

                const nextPlayer = gameState.nextTurn();
                io.to(roomId).emit('turnUpdate', nextPlayer);
            } catch (error) {
                console.error('Error processing answer:', error);
                socket.emit('error', { message: 'Failed to process answer' });
            }
        });

        socket.on('disconnect', () => {
            for (const [roomId, gameState] of gameStates.entries()) {
                if (gameState.players.has(socket.id)) {
                    gameState.removePlayer(socket.id);
                    io.to(roomId).emit('gameState', gameState.getState());
                    io.to(roomId).emit('playerLeft', socket.id);

                    // Clean up empty rooms
                    if (gameState.players.size === 0) {
                        gameStates.delete(roomId);
                    }
                }
            }
        });
    });
}

// Helper functions
function checkSnakesAndLadders(position) {
    const snakes = {
        16: 6, 47: 26, 49: 11, 56: 53, 62: 19,
        64: 60, 87: 24, 93: 73, 95: 75, 98: 78
    };

    const ladders = {
        1: 38, 4: 14, 9: 31, 21: 42, 28: 84,
        36: 44, 51: 67, 71: 91, 80: 100
    };

    return snakes[position] || ladders[position] || position;
}

function isSpecialSquare(position) {
    // Define special squares that trigger questions
    const specialSquares = [
        16, 47, 49, 56, 62, 64, 87, 93, 95, 98, // Snakes
        1, 4, 9, 21, 28, 36, 51, 71, 80        // Ladders
    ];
    return specialSquares.includes(position);
}

async function getRandomQuestion() {
    try {
        const [rows] = await db.promise().query(
            'SELECT * FROM questions ORDER BY RAND() LIMIT 1'
        );
        return rows[0];
    } catch (error) {
        console.error('Error fetching question:', error);
        return null;
    }
}

async function validateAnswer(answer) {
    // Implement answer validation logic
    return true; // Placeholder
}

async function updateGameStats(userId, roomId) {
    try {
        await db.promise().query(
            'UPDATE user_stats SET games_won = games_won + 1 WHERE user_id = ?',
            [userId]
        );
    } catch (error) {
        console.error('Error updating game stats:', error);
    }
}

module.exports = setupSocketHandlers;