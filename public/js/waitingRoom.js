document.addEventListener('DOMContentLoaded', () => {
    const socket = io();
    const roomId = document.getElementById('roomId').textContent.split(': ')[1];
    const username = '#{user.username}';
    let players = [];

    // Join room
    socket.emit('join', { name: username, roomId });

    // Update players list when server sends updated list
    socket.on('playersUpdated', (updatedPlayers) => {
        players = updatedPlayers;
        updatePlayersList();
        checkStartGame();
    });

    socket.on('error', (error) => {
        console.error('WebSocket error:', error);
        alert('An error occurred. Please try again later.');
    });

    function updatePlayersList() {
        const playersList = document.getElementById('playersList');
        playersList.innerHTML = '';
        players.forEach(player => {
            const playerElement = document.createElement('div');
            playerElement.className = 'player-item';
            playerElement.innerHTML = `
                <i class="fas fa-user"></i>
                <span>${player.username}</span>
            `;
            playersList.appendChild(playerElement);
        });
    }

    function checkStartGame() {
        const startButton = document.getElementById('startGame');
        startButton.disabled = players.length < 2;
    }

    function copyRoomId() {
        navigator.clipboard.writeText(roomId)
            .then(() => alert('Room ID copied to clipboard!'))
            .catch(err => console.error('Failed to copy:', err));
    }

    function leaveRoom() {
        socket.emit('leaveRoom', { roomId, username });
        window.location.href = '/dashboard';
    }

    const startGameButton = document.getElementById('startGame');
    if (startGameButton) {
        startGameButton.addEventListener('click', () => {
            window.location.href = `/game?roomId=${roomId}&username=${username}`;
        });
    }

    document.getElementById('copyRoomId').addEventListener('click', copyRoomId);
    document.querySelector('.leave-button').addEventListener('click', leaveRoom);

    // Handle name availability check and user addition
    const joinGameButton = document.getElementById('joinGame');
    if (joinGameButton) {
        joinGameButton.addEventListener('click', () => {
            const name = document.getElementById('name-input').value.trim();
            $.ajax({
                url: '/api/users/check-name',
                method: 'POST',
                data: { name },
                success: function (response) {
                    if (response.message === 'Name is available') {
                        $.ajax({
                            url: '/api/users/add-user',
                            method: 'POST',
                            data: { name },
                            success: function (addResponse) {
                                console.log(addResponse.message);
                            }
                        });
                    } else {
                        console.log(response.message);
                    }
                }
            });
        });
    }

    // Fetch players every 2 seconds
    function fetchPlayers() {
        $.ajax({
            url: `/api/players/${roomId}`,
            method: 'GET',
            success: function (data) {
                let playersList = '';
                data.forEach(player => {
                    playersList += `<li>☺ ${player.name}</li>`;
                });
                $('#playersList').html(playersList);
            },
            error: function (xhr, status, error) {
                console.error('Error fetching players:', error);
            }
        });
    }

    setInterval(fetchPlayers, 2000);

    $('#joinGameButton').click(function () {
        const gameId = $('#gameIdInput').val().trim();
        if (gameId) {
            socket.emit('joinGame', { name: username, roomId: gameId }, (success) => {
                if (success) {
                    window.location.href = `/game?roomId=${gameId}&username=${username}`;
                } else {
                    alert('Invalid game ID. Please try again.');
                }
            });
        }
    });

    // Handle QR code scanning
    const qrCodeImg = document.querySelector('.qr-code');
    if (qrCodeImg) {
        qrCodeImg.addEventListener('click', () => {
            const scannedRoomId = qrCodeImg.src.split('=')[1];
            socket.emit('joinGame', { name: username, roomId: scannedRoomId }, (success) => {
                if (success) {
                    window.location.href = `/game?roomId=${scannedRoomId}&username=${username}`;
                } else {
                    alert('Invalid room ID. Please try again.');
                }
            });
        });
    }

    // Fetch and display QR code for the room
    $.get(`/api/qrcode?roomId=${roomId}`, (data) => {
        if (data.qrCodeUrl) {
            $('#qrCodeImage').attr('src', data.qrCodeUrl);
        } else {
            console.error('Failed to load QR code');
        }
    });

    // Fetch players for the room on page load
    fetchPlayers();
});
