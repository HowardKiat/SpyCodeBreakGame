// test/game.test.js
import chai from 'chai';
import request from 'supertest';
import { io } from 'socket.io-client';
import app from '../server'; // Assuming your server file is 'server.js'

const { expect } = chai;

describe('Snakes and Ladders Game Tests', function () {
    it('should create a room and allow a player to join', async function () {
        const response = await request(app)
            .post('/game/join')
            .send({ username: 'Player1', roomId: 'room123' });

        expect(response.status).to.equal(200);
        expect(response.body.username).to.equal('Player1');
        expect(response.body.roomId).to.equal('room123');
    });

    it('should allow multiple players to join the game room', function (done) {
        const socket = io('http://localhost:3000');

        socket.emit('join', { name: 'Player1', roomId: 'room123' });
        socket.emit('join', { name: 'Player2', roomId: 'room123' });

        socket.on('playersUpdated', function (players) {
            expect(players.length).to.equal(2); // 2 players joined
            done();
        });
    });

    it('should roll the dice and update the player position', function (done) {
        const socket = io('http://localhost:3000');

        socket.emit('join', { name: 'Player1', roomId: 'room123' });
        socket.emit('rollDice', { roomId: 'room123', num: 4 });

        socket.on('diceRolled', function (data) {
            expect(data.num).to.be.at.least(1);
            expect(data.num).to.be.at.most(6);
            expect(data.pos).to.be.greaterThan(0); // Player's position should increase
            done();
        });
    });

    it('should alternate turns between players', function (done) {
        const socket = io('http://localhost:3000');

        socket.emit('join', { name: 'Player1', roomId: 'room123' });
        socket.emit('join', { name: 'Player2', roomId: 'room123' });

        socket.emit('rollDice', { roomId: 'room123', num: 4 });

        socket.on('turnChanged', function (player) {
            expect(player.username).to.equal('Player2');
            done();
        });
    });

    it('should end the game and declare a winner', function (done) {
        const socket = io('http://localhost:3000');

        socket.emit('join', { name: 'Player1', roomId: 'room123' });
        socket.emit('rollDice', { roomId: 'room123', num: 6 });

        socket.on('gameOver', function (data) {
            expect(data.winner).to.equal('Player1');
            done();
        });
    });
});
