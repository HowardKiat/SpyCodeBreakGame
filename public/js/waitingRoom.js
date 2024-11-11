const socket = io();
let roomId = document.getElementById('roomId').textContent.split(': ')[1];

// Copy Room ID functionality
document.getElementById('copyRoomId').addEventListener('click', () => {
    navigator.clipboard.writeText(roomId).then(() => {
        alert('Room ID copied to clipboard!');
    });
});

// Handle Start Game button
document.getElementById('startGame').addEventListener('click', () => {
    socket.emit('startGame', { roomId });
});

// Handle Leave Room button
document.querySelector('.leave-button').addEventListener('click', () => {
    window.location.href = '/dashboard';  // Redirect to dashboard
});

// Join Game button functionality
document.getElementById('joinGameButton').addEventListener('click', () => {
    const gameId = document.getElementById('gameIdInput').value.trim();
    if (gameId) {
        window.location.href = `/game?roomId=${gameId}`;
    }
});

// Socket event listeners
socket.on('connect', () => {
    // Join the room
    socket.emit('joinRoom', { roomId });
});

socket.on('playerJoined', (data) => {
    updatePlayersList(data.players);
    // Enable start button if there are enough players
    const startButton = document.getElementById('startGame');
    startButton.disabled = data.players.length < 2;
});

socket.on('playerLeft', (data) => {
    updatePlayersList(data.players);
    // Disable start button if not enough players
    const startButton = document.getElementById('startGame');
    startButton.disabled = data.players.length < 2;
});

socket.on('gameStarted', (data) => {
    window.location.href = `/game?roomId=${data.roomId}`;
});

socket.on('error', (error) => {
    alert(error.message);
});

// Update players list
function updatePlayersList(players) {
    const playersList = document.getElementById('playersList');
    playersList.innerHTML = players
        .map(player => `
            <li class="player-item">
                <i class="fas fa-user"></i>
                <span>${player.username}</span>
                ${player.isHost ? '<span class="host-badge">Host</span>' : ''}
            </li>
        `).join('');
}