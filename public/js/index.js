// Making Connection
const socket = io.connect("http://localhost:3000");
socket.on("connect", () => {
    console.log("Connected to server:", socket.connected);
});

socket.emit("joined");

let players = []; // All players in the game
let currentPlayer; // Player object for individual players

let canvas = document.getElementById("canvas");
canvas.width = document.documentElement.clientHeight * 0.9;
canvas.height = document.documentElement.clientHeight * 0.9;
let ctx = canvas.getContext("2d");

const redPieceImg = "../images/red_piece.png";
const bluePieceImg = "../images/blue_piece.png";
const yellowPieceImg = "../images/yellow_piece.png";
const greenPieceImg = "../images/green_piece.png";

const side = canvas.width / 10;
const offsetX = side / 2;
const offsetY = side / 2 + 20;

const images = [redPieceImg, bluePieceImg, yellowPieceImg, greenPieceImg];

const ladders = [
    [2, 23], [4, 68], [6, 45], [20, 59], [30, 96], [52, 72], [57, 96], [71, 92],
];

const snakes = [
    [98, 40], [84, 58], [87, 49], [73, 15], [56, 8], [50, 5], [43, 17],
];

class Player {
    constructor(id, name, pos, img) {
        this.id = id;
        this.name = name;
        this.pos = pos;
        this.img = img;
    }

    draw() {
        let xPos =
            Math.floor(this.pos / 10) % 2 == 0
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

        for (let i = 0; i < ladders.length; i++) {
            if (ladders[i][0] == pos) {
                newPos = ladders[i][1];
                break;
            }
        }

        for (let i = 0; i < snakes.length; i++) {
            if (snakes[i][0] == pos) {
                newPos = snakes[i][1];
                break;
            }
        }

        return newPos;
    }
}

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

document.getElementById("roll-button").addEventListener("click", () => {
    const num = rollDice();
    console.log("Dice rolled:", num);
    currentPlayer.updatePos(num);
    console.log("Current player new position:", currentPlayer.pos);
    socket.emit("rollDice", {
        num: num,
        id: currentPlayer.id,
        pos: currentPlayer.pos,
    });
});

function rollDice() {
    const number = Math.ceil(Math.random() * 6);
    return number;
}

function drawPins() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    console.log("Drawing player pins on the board");

    players.forEach((player, index) => {
        // If player is undefined, create a default player with default values.
        if (!player) {
            console.log(`Undefined player at index ${index}. Using default values.`);
            player = {
                name: `Player ${index + 1}`,
                pos: 0,
                img: images[0], // Default image if player data is missing
            };
        }

        console.log("Drawing player:", player.name, "at position:", player.pos);
        player.draw();
    });
}


// Listen for events
socket.on("join", (data) => {
    console.log("New player joined:", data);

    // Provide default values if player data is missing.
    const name = data.name || `Player ${players.length + 1}`;
    const pos = data.pos >= 0 ? data.pos : 0;
    const img = data.img || images[0];

    players.push(new Player(players.length, name, pos, img));

    // Display player in the table
    document.getElementById("players-table").innerHTML += `
        <tr><td>${name}</td><td><img src="${img}" height="50" width="40"></td></tr>
    `;

    // Update the board view
    drawPins();
});


socket.on("joined", (data) => {
    console.log("Players currently in the game:", data);

    // Clear the player list
    document.getElementById("players-table").innerHTML = '';

    // Initialize players with default values if necessary
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

    // If player is undefined, create a default player
    let player = players[data.id];
    if (!player) {
        console.log(`Player with ID ${data.id} is undefined, creating default.`);
        player = new Player(data.id, `Player ${data.id + 1}`, 0, images[0]);
        players[data.id] = player; // Ensure player is added to the list
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

    // Check for winner
    let winner;
    for (let i = 0; i < players.length; i++) {
        if (players[i].pos === 99) {
            winner = players[i];
            break;
        }
    }

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
