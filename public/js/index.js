// Establish connection to the server
const socket = io.connect("http://localhost:3000");
socket.on("connect", () => {
    console.log("Connected to server:", socket.connected);
});

socket.emit("joined");

let players = []; // Array to store all players in the game
let currentPlayer; // Object to store the current player's data

// Set up the canvas
let canvas = document.getElementById("canvas");
canvas.width = document.documentElement.clientHeight * 0.9;
canvas.height = document.documentElement.clientHeight * 0.9;
let ctx = canvas.getContext("2d");

// Image paths for player pieces
const images = [
    "../images/red_piece.png",
    "../images/blue_piece.png",
    "../images/yellow_piece.png",
    "../images/green_piece.png"
];

const side = canvas.width / 10;
const offsetX = side / 2;
const offsetY = side / 2 + 20;

// Ladders and snakes positions
const ladders = [
    [2, 23], [4, 68], [6, 45], [20, 59], [30, 96], [52, 72], [57, 96], [71, 92]
];

const snakes = [
    [98, 40], [84, 58], [87, 49], [73, 15], [56, 8], [50, 5], [43, 17]
];

// Player class to manage player data and actions
class Player {
    constructor(id, name, pos, img) {
        this.id = id;
        this.name = name;
        this.pos = pos;
        this.img = img;
    }

    draw() {
        let xPos = Math.floor(this.pos / 10) % 2 === 0
            ? (this.pos % 10) * side - 15 + offsetX
            : canvas.width - ((this.pos % 10) * side + offsetX + 15);
        let yPos = canvas.height - (Math.floor(this.pos / 10) * side + offsetY);

        let image = new Image();
        image.src = this.img;
        ctx.drawImage(image, xPos, yPos, 30, 40);
    }

    updatePos(num) {
        if (this.pos + num <= 99) {
            this.pos += num;
            this.pos = this.isLadderOrSnake(this.pos) - 1;
        }
    }

    isLadderOrSnake(pos) {
        let newPos = pos;

        ladders.forEach(([start, end]) => {
            if (start === pos) newPos = end;
        });

        snakes.forEach(([start, end]) => {
            if (start === pos) newPos = end;
        });

        return newPos;
    }
}

// Event listener for the start button
document.getElementById("start-btn").addEventListener("click", () => {
    const name = document.getElementById("name").value;
    console.log("Player joining with name:", name);
    document.getElementById("name").disabled = true;
    document.getElementById("start-btn").hidden = true;
    document.getElementById("roll-button").hidden = false;
    currentPlayer = new Player(players.length, name, 0, images[players.length]);
    console.log("Current Player initialized:", currentPlayer);
    socket.emit("join", currentPlayer);
});

// Event listener for the roll button
document.getElementById("roll-button").addEventListener("click", () => {
    const num = rollDice();
    console.log("Dice rolled:", num);
    currentPlayer.updatePos(num);
    console.log("Current player new position:", currentPlayer.pos);
    socket.emit("rollDice", {
        num: num,
        id: currentPlayer.id,
        pos: currentPlayer.pos
    });
});

// Function to roll the dice
function rollDice() {
    return Math.ceil(Math.random() * 6);
}

// Function to draw player pieces on the board
function drawPins() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    console.log("Drawing player pins on the board");

    players.forEach((player, index) => {
        if (!player) {
            console.log(`Undefined player at index ${index}. Using default values.`);
            player = new Player(index, `Player ${index + 1}`, 0, images[0]);
        }
        console.log("Drawing player:", player.name, "at position:", player.pos);
        player.draw();
    });
}

// Socket event listeners
socket.on("join", (data) => {
    console.log("New player joined:", data);
    const name = data.name || `Player ${players.length + 1}`;
    const pos = data.pos >= 0 ? data.pos : 0;
    const img = data.img || images[0];

    players.push(new Player(players.length, name, pos, img));

    document.getElementById("players-table").innerHTML += `
        <tr><td>${name}</td><td><img src="${img}" height="50" width="40"></td></tr>
    `;

    drawPins();
});

socket.on("joined", (data) => {
    console.log("Players currently in the game:", data);
    document.getElementById("players-table").innerHTML = '';

    data.forEach((player, index) => {
        const name = player.name || `Player ${index + 1}`;
        const pos = player.pos >= 0 ? player.pos : 0;
        const img = player.img || images[0];

        players.push(new Player(index, name, pos, img));

        document.getElementById("players-table").innerHTML += `
            <tr><td>${name}</td><td><img src="${img}" height="50" width="40"></td></tr>
        `;
    });

    drawPins();
});

socket.on("rollDice", (data, turn) => {
    console.log("Dice roll event received:", data);
    let player = players[data.id];
    if (!player) {
        console.log(`Player with ID ${data.id} is undefined, creating default.`);
        player = new Player(data.id, `Player ${data.id + 1}`, 0, images[0]);
        players[data.id] = player;
    }

    player.updatePos(data.num);
    console.log("Player updated position:", player.pos);
    document.getElementById("dice").src = `./images/dice/dice${data.num}.png`;
    drawPins();

    if (turn !== currentPlayer.id) {
        document.getElementById("roll-button").hidden = true;
        document.getElementById("current-player").innerHTML = `<p>It's ${players[turn].name}'s turn</p>`;
    } else {
        document.getElementById("roll-button").hidden = false;
        document.getElementById("current-player").innerHTML = `<p>It's your turn</p>`;
    }
    console.log("Turn set to player:", players[turn].name);

    let winner;
    players.forEach(player => {
        if (player.pos === 99) {
            winner = player;
        }
    });

    if (winner) {
        console.log("Game won by:", winner.name);
        document.getElementById("current-player").innerHTML = `<p>${winner.name} has won!</p>`;
        document.getElementById("roll-button").hidden = true;
        document.getElementById("dice").hidden = true;
        document.getElementById("restart-btn").hidden = false;
    }
});

// Restart the game
document.getElementById("restart-btn").addEventListener("click", () => {
    console.log("Restart button clicked, emitting restart event...");
    socket.emit("restart");
});

socket.on("restart", () => {
    players = [];
    currentPlayer = null;
    window.location.reload();
});
