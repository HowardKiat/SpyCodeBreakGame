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
        this.ctx.strokeStyle = '#000';
        this.ctx.lineWidth = 1;

        // Draw horizontal lines
        for (let i = 0; i <= this.boardSize; i++) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, i * this.cellSize);
            this.ctx.lineTo(this.canvas.width, i * this.cellSize);
            this.ctx.stroke();
        }

        // Draw vertical lines
        for (let i = 0; i <= this.boardSize; i++) {
            this.ctx.beginPath();
            this.ctx.moveTo(i * this.cellSize, 0);
            this.ctx.lineTo(i * this.cellSize, this.canvas.height);
            this.ctx.stroke();
        }
    }

    numberCells() {
        this.ctx.font = `${this.cellSize / 4}px Arial`;
        this.ctx.fillStyle = '#000';
        this.ctx.textAlign = 'center';

        let number = 100;
        let goingLeft = true;

        for (let row = 0; row < this.boardSize; row++) {
            if (goingLeft) {
                for (let col = 0; col < this.boardSize; col++) {
                    this.ctx.fillText(
                        number.toString(),
                        (col + 0.5) * this.cellSize,
                        (row + 0.3) * this.cellSize
                    );
                    number--;
                }
            } else {
                for (let col = this.boardSize - 1; col >= 0; col--) {
                    this.ctx.fillText(
                        number.toString(),
                        (col + 0.5) * this.cellSize,
                        (row + 0.3) * this.cellSize
                    );
                    number--;
                }
            }
            goingLeft = !goingLeft;
        }
    }

    drawSnakesAndLadders() {
        // Draw Snakes
        this.ctx.lineWidth = 3;
        for (const [start, end] of Object.entries(this.snakes)) {
            const startPos = this.getCoordinates(parseInt(start));
            const endPos = this.getCoordinates(parseInt(end));

            // Draw snake
            this.ctx.strokeStyle = '#FF0000';
            this.ctx.beginPath();
            this.ctx.moveTo(startPos.x, startPos.y);
            this.ctx.lineTo(endPos.x, endPos.y);
            this.ctx.stroke();

            // Draw snake head
            this.ctx.fillStyle = '#FF0000';
            this.ctx.beginPath();
            this.ctx.arc(startPos.x, startPos.y, 5, 0, Math.PI * 2);
            this.ctx.fill();
        }

        // Draw Ladders
        for (const [start, end] of Object.entries(this.ladders)) {
            const startPos = this.getCoordinates(parseInt(start));
            const endPos = this.getCoordinates(parseInt(end));

            // Draw ladder
            this.ctx.strokeStyle = '#00FF00';
            this.ctx.beginPath();
            this.ctx.moveTo(startPos.x, startPos.y);
            this.ctx.lineTo(endPos.x, endPos.y);
            this.ctx.stroke();

            // Draw rungs
            const dx = (endPos.x - startPos.x) / 4;
            const dy = (endPos.y - startPos.y) / 4;
            for (let i = 1; i < 4; i++) {
                const x = startPos.x + dx * i;
                const y = startPos.y + dy * i;
                this.ctx.beginPath();
                this.ctx.moveTo(x - 10, y);
                this.ctx.lineTo(x + 10, y);
                this.ctx.stroke();
            }
        }
    }

    getCoordinates(position) {
        position--; // Convert to 0-based index
        const row = Math.floor(position / this.boardSize);
        let col = position % this.boardSize;

        // Reverse column for odd rows (going right to left)
        if (row % 2 === 1) {
            col = this.boardSize - 1 - col;
        }

        return {
            x: (col + 0.5) * this.cellSize,
            y: (row + 0.5) * this.cellSize
        };
    }

    movePlayer(playerId, position) {
        this.playerPositions.set(playerId, position);
        this.redrawPlayers();
    }

    redrawPlayers() {
        // Clear previous player positions
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Redraw board
        this.initializeBoard();

        // Draw all players
        let i = 0;
        for (const [playerId, position] of this.playerPositions.entries()) {
            const coords = this.getCoordinates(position);
            const color = this.playerColors[i % this.playerColors.length];

            // Draw player token
            this.ctx.fillStyle = color;
            this.ctx.beginPath();
            this.ctx.arc(coords.x, coords.y, this.cellSize / 4, 0, Math.PI * 2);
            this.ctx.fill();

            // Draw player ID
            this.ctx.fillStyle = '#000';
            this.ctx.font = `${this.cellSize / 5}px Arial`;
            this.ctx.textAlign = 'center';
            this.ctx.fillText(playerId, coords.x, coords.y + 5);

            i++;
        }
    }

    checkSnakesAndLadders(position) {
        // Check if position has a snake
        if (this.snakes[position]) {
            return this.snakes[position];
        }
        // Check if position has a ladder
        if (this.ladders[position]) {
            return this.ladders[position];
        }
        return position;
    }
}

export default SnakeAndLadder;