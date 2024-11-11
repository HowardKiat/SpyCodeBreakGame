class SnakeAndLadder {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.boardSize = 10; // 10x10 grid
        this.cellSize = canvas.width / this.boardSize;

        // Define snakes and ladders
        this.snakes = {
            16: 6,   // Snake from 16 to 6
            47: 26,  // Snake from 47 to 26
            49: 11,  // Snake from 49 to 11
            56: 53,  // Snake from 56 to 53
            62: 19,  // Snake from 62 to 19
            64: 60,  // Snake from 64 to 60
            87: 24,  // Snake from 87 to 24
            93: 73,  // Snake from 93 to 73
            95: 75,  // Snake from 95 to 75
            98: 78   // Snake from 98 to 78
        };

        this.ladders = {
            1: 38,   // Ladder from 1 to 38
            4: 14,   // Ladder from 4 to 14
            9: 31,   // Ladder from 9 to 31
            21: 42,  // Ladder from 21 to 42
            28: 84,  // Ladder from 28 to 84
            36: 44,  // Ladder from 36 to 44
            51: 67,  // Ladder from 51 to 67
            71: 91,  // Ladder from 71 to 91
            80: 100  // Ladder from 80 to 100
        };

        this.playerPositions = new Map(); // Store player positions
        this.playerColors = [
            '#FF5733', // Orange-Red
            '#33FF57', // Lime Green
            '#3357FF', // Blue
            '#FF33F5', // Pink
            '#33FFF5', // Cyan
            '#F5FF33'  // Yellow
        ];
    }

    initializeBoard() {
        this.drawGrid();
        this.numberCells();
        this.drawSnakesAndLadders();
    }

    drawGrid() {
        this.ctx.lineWidth = 2;
        for (let i = 0; i <= this.boardSize; i++) {
            this.ctx.beginPath();
            this.ctx.moveTo(i * this.cellSize, 0);
            this.ctx.lineTo(i * this.cellSize, this.canvas.height);
            this.ctx.moveTo(0, i * this.cellSize);
            this.ctx.lineTo(this.canvas.width, i * this.cellSize);
            this.ctx.stroke();
        }
    }

    numberCells() {
        this.ctx.font = '20px Arial';
        this.ctx.fillStyle = 'black';
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                const cellNumber = row * this.boardSize + col + 1;
                this.ctx.fillText(cellNumber, col * this.cellSize + this.cellSize / 3, row * this.cellSize + this.cellSize / 2);
            }
        }
    }

    drawSnakesAndLadders() {
        this.drawLadders();
        this.drawSnakes();
    }

    drawSnakes() {
        Object.entries(this.snakes).forEach(([start, end]) => {
            const startCoords = this.getCoordinates(start);
            const endCoords = this.getCoordinates(end);
            this.ctx.strokeStyle = 'red';
            this.ctx.lineWidth = 4;
            this.ctx.beginPath();
            this.ctx.moveTo(startCoords.x, startCoords.y);
            this.ctx.lineTo(endCoords.x, endCoords.y);
            this.ctx.stroke();
        });
    }

    drawLadders() {
        Object.entries(this.ladders).forEach(([start, end]) => {
            const startCoords = this.getCoordinates(start);
            const endCoords = this.getCoordinates(end);
            this.ctx.strokeStyle = 'green';
            this.ctx.lineWidth = 6;
            this.ctx.beginPath();
            this.ctx.moveTo(startCoords.x, startCoords.y);
            this.ctx.lineTo(endCoords.x, endCoords.y);
            this.ctx.stroke();
        });
    }

    getCoordinates(cell) {
        const row = Math.floor((cell - 1) / this.boardSize);
        const col = (cell - 1) % this.boardSize;
        return {
            x: col * this.cellSize + this.cellSize / 2,
            y: row * this.cellSize + this.cellSize / 2
        };
    }

    movePlayer(playerId, position) {
        const playerCoords = this.getCoordinates(position);
        this.ctx.beginPath();
        this.ctx.arc(playerCoords.x, playerCoords.y, 10, 0, 2 * Math.PI);
        this.ctx.fillStyle = this.playerColors[this.players.indexOf(playerId)];
        this.ctx.fill();
    }

    checkSnakesAndLadders(position) {
        if (this.snakes[position]) {
            return this.snakes[position];
        } else if (this.ladders[position]) {
            return this.ladders[position];
        }
        return position;
    }
}

// public/js/game.js
document.addEventListener('DOMContentLoaded', () => {
    // Get URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const roomId = urlParams.get('roomId');
    const username = urlParams.get('username');

    // Initialize socket connection
    const socket = io();

    // Initialize game elements
    const canvas = document.getElementById('gameBoard');
    const diceButton = document.getElementById('rollDice');
    const diceDisplay = document.getElementById('dice');
    const currentPlayerDisplay = document.getElementById('currentPlayer');
    const playersListDisplay = document.getElementById('playersList');
    const questionModal = document.getElementById('questionModal');
    const gameOverModal = document.getElementById('gameOverModal');

    // Set canvas size
    canvas.width = 600;
    canvas.height = 600;

    // Initialize game board
    const game = new SnakeAndLadder(canvas);
    game.initializeBoard();

    let currentTurn = null;
    let players = [];
    let isMyTurn = false;

    // Join game room
    socket.emit('join', { name: username, roomId });

    // Socket event handlers
    socket.on('joined', (roomPlayers) => {
        players = roomPlayers;
        updatePlayersList();
        if (players.length === 1) {
            currentTurn = socket.id;
            isMyTurn = true;
            diceButton.disabled = false;
        }
    });

    socket.on('playersUpdated', (updatedPlayers) => {
        players = updatedPlayers;
        updatePlayersList();
    });

    socket.on('diceRolled', (data) => {
        const { id, pos, num } = data;
        animateDice(num);

        // Update player position
        const player = players.find(p => p.id === id);
        if (player) {
            // Check for snakes and ladders
            const finalPosition = game.checkSnakesAndLadders(pos);
            setTimeout(() => {
                game.movePlayer(id, finalPosition);
                player.pos = finalPosition;
                updatePlayersList();
            }, 1000);
        }
    });

    socket.on('turnChanged', (nextPlayer) => {
        currentTurn = nextPlayer.id;
        isMyTurn = nextPlayer.id === socket.id;
        diceButton.disabled = !isMyTurn;
        updateCurrentPlayer();
    });

    socket.on('gameOver', (data) => {
        showGameOver(data.winner);
    });

    socket.on('restart', () => {
        location.reload();
    });

    // Dice roll handler
    diceButton.addEventListener('click', () => {
        if (!isMyTurn) return;

        const num = Math.floor(Math.random() * 6) + 1;
        socket.emit('rollDice', { roomId, num });
        diceButton.disabled = true;
    });

    // Helper functions
    function updatePlayersList() {
        playersListDisplay.innerHTML = '';
        players.forEach((player, index) => {
            const playerDiv = document.createElement('div');
            playerDiv.textContent = `${player.name} - Position: ${player.pos}`;
            playersListDisplay.appendChild(playerDiv);
        });
    }

    function updateCurrentPlayer() {
        currentPlayerDisplay.textContent = `Current Player: ${players.find(p => p.id === currentTurn).name}`;
    }

    function animateDice(num) {
        diceDisplay.textContent = `Rolled: ${num}`;
    }

    function showGameOver(winner) {
        gameOverModal.style.display = 'block';
        gameOverModal.querySelector('.winner').textContent = winner;
    }
});
