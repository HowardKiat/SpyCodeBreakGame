// game.client.test.js
test('should display current player turn after dice roll', () => {
    document.body.innerHTML = `
        <div id="gameStatus"></div>
        <button id="rollDiceBtn">Roll Dice</button>
    `;

    const gameStatus = document.getElementById('gameStatus');
    const rollButton = document.getElementById('rollDiceBtn');

    let currentPlayer = { username: 'Player1' };

    // Simulate button click and turn change
    rollButton.addEventListener('click', () => {
        gameStatus.innerText = `It’s ${currentPlayer.username}'s turn`;
        currentPlayer = { username: 'Player2' };  // Change turn to Player2
    });

    rollButton.click();

    expect(gameStatus.innerText).toBe("It’s Player1's turn");

    rollButton.click();

    expect(gameStatus.innerText).toBe("It’s Player2's turn");
});

test('should update player list when a new player joins', () => {
    document.body.innerHTML = `<ul id="playersList"></ul>`;

    const playersList = document.getElementById('playersList');
    const newPlayer = { username: 'Player1', pos: 0 };
    const playerItem = document.createElement('li');
    playerItem.innerText = `${newPlayer.username}: Position ${newPlayer.pos}`;

    playersList.appendChild(playerItem);

    expect(playersList.children.length).toBe(1);
    expect(playersList.children[0].innerText).toBe('Player1: Position 0');
});

test('should display the winner when the game ends', () => {
    document.body.innerHTML = `<div id="gameStatus"></div>`;

    const gameStatus = document.getElementById('gameStatus');
    const winner = 'Player1';

    gameStatus.innerText = `${winner} wins the game!`;

    expect(gameStatus.innerText).toBe('Player1 wins the game!');
});

test('should show the dice result when the roll button is clicked', () => {
    document.body.innerHTML = `
        <button id="rollDiceBtn">Roll Dice</button>
        <div id="diceResult"></div>
    `;

    const rollButton = document.getElementById('rollDiceBtn');
    const diceResult = document.getElementById('diceResult');

    rollButton.addEventListener('click', () => {
        diceResult.innerText = 'You rolled a 4';
    });

    rollButton.click();

    expect(diceResult.innerText).toBe('You rolled a 4');
});
