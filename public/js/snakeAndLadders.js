let player = [];
var gamers = [];
let dice;
var buttonPressed = false;
let currentPlayer = 0;
let questions;
let askedQuestion = [];
var currentQuestion;
var snakeLadder = {
    snakeBite: [48, 67, 74, 79, 83, 96],
    snakeLand: [28, 24, 52, 59, 19, 76],
    ladderClimb: [8, 18, 27, 60, 68],
    ladderLand: [13, 65, 46, 61, 89]
}

var color = ['red', 'green', 'yellow', 'blue', 'pink', 'black']

function init() {
    var board = document.getElementById("board")
    var table = document.getElementById("table-board")
    var count = 100;

    var boxClr = getRandomColor();

    for (var i = 0; i < 5; i++) {
        let tr = document.createElement('tr')

        for (var j = 0; j < 10; j++) {
            let td = document.createElement('td')


            td.id = `box${count}`
            td.append(`${count}`)
            td.append(generateCircle())
            count = count - 1;
            if (count % 2 === 0) {
                td.style.backgroundColor = '#ececfc'
            }
            else {
                td.style.backgroundColor = boxClr
            }
            tr.append(td)
        }
        count = count - 9;

        let tr2 = document.createElement('tr')

        for (var j = 0; j < 10; j++) {

            let td = document.createElement('td')
            td.id = `box${count}`
            td.append(`${count}`)
            td.append(generateCircle())
            count = count + 1;
            if (count % 2 === 0) {
                td.style.backgroundColor = '#ececfc'
            }
            else {
                td.style.backgroundColor = boxClr
            }
            tr2.append(td)
        }

        count = count - 11;

        table.append(tr)
        table.append(tr2)

    }
}

function getRandomColor() {
    var letters = '0123456789ABCDEF';
    var color = '#';
    for (var i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

function generateCircle() {
    let circleHolder = document.createElement('div')
    let red = document.createElement('div')
    let green = document.createElement('div')
    let yellow = document.createElement('div')
    let blue = document.createElement('div')
    let pink = document.createElement('div')
    let black = document.createElement('div')

    red.classList.add('red')
    green.classList.add('green')
    yellow.classList.add('yellow')
    blue.classList.add('blue')
    pink.classList.add('pink')
    black.classList.add('black')

    red.style.display = 'none'
    green.style.display = 'none'
    yellow.style.display = 'none'
    blue.style.display = 'none'
    pink.style.display = 'none'
    black.style.display = 'none'

    circleHolder.classList.add('circleholder')

    circleHolder.append(red)
    circleHolder.append(green)
    circleHolder.append(yellow)
    circleHolder.append(blue)
    circleHolder.append(pink)
    circleHolder.append(black)

    return circleHolder;
}

function setTotalPlayers() {

    for (var i = 0; i < player.length; i++) {

        var totalPlayerDisplay = document.getElementById('total-player-display')
        var pbox = document.createElement('div')
        var pname = document.createElement('div')
        var namelabel = document.createElement('label')
        var pposi = document.createElement('div')
        var posilabel = document.createElement('label')

        namelabel.id = ('tplayer' + i)
        posilabel.id = ('tposi' + i)

        namelabel.innerHTML = player[i];
        posilabel.innerHTML = 1;

        pbox.classList.add('player-box')
        pname.classList.add('player-name')
        pposi.classList.add('player-posi')

        pposi.style.backgroundColor = color[i]

        pposi.append(posilabel)
        pname.append(namelabel)
        pbox.append(pname)
        pbox.append(pposi)
        totalPlayerDisplay.append(pbox)
    }
}

init()

function addPlayer(pname) {
    console.log("Vanakkam " + pname)

    player.push(pname);

    var pleft = 6 - player.length

    if (pleft === 0) {
        document.getElementById('player-name').disabled = true;
        document.getElementById('player-submit').disabled = true;
    }

    document.getElementById('player-name').value = ''

    document.getElementById('left-player').innerHTML = (pleft + " Players Left!")

    if (player.length > 0) {

        document.getElementById('start-btn').disabled = false;
        var loopname = "";
        for (var i = 0; i < player.length; i++) {
            loopname = loopname + player[i] + " ";
        }

        document.getElementById('added-players').innerHTML = loopname
    }
}

function startGame() {

    let gamer = {
        name: '',
        currentPosi: 1,
        diceCount: 0
    }

    for (var i = 0; i < player.length; i++) {
        gamers.push(Object.create(gamer))
    }

    for (var j = 0; j < player.length; j++) {

        gamers[j].name = player[j]
    }
    initFirstPosi()
    checkGame()
}

function initFirstPosi() {
    var box1 = document.getElementById('box1')

    for (var i = 0; i < player.length; i++) {
        box1.getElementsByClassName(color[i])[0].style.display = 'flex'
    }
}

function launchgame() {
    document.getElementById('addplayer').style.display = "none";
    document.getElementById('first-box').style.display = "none";
    setTotalPlayers()
    startGame()
}

function checkWinner(gamer) {
    if (gamer.currentPosi >= 100) {
        return true
    }
    return false;
}

function checkGame() {
    if (gamers.some(checkWinner)) {
        //winner found
        console.log("winner found")
        document.getElementById('btn-roll').disabled = true
        document.getElementById('first-box').style.display = 'flex'
        document.getElementById('winner-announce').style.display = 'block'
        document.getElementById('winner-name').innerHTML = "Winner is " + gamers[currentPlayer].name;

        for (var i = 0; i < player.length; i++) {

            if (i != currentPlayer) {

                var plbox = document.createElement('div')
                var plname = document.createElement('div')
                var plposi = document.createElement('div')
                var namepl = document.createElement('label')
                var posipl = document.createElement('label')

                plbox.classList.add('player-box')
                plname.classList.add('player-name')
                plposi.classList.add('player-posi')

                namepl.innerHTML = gamers[i].name
                posipl.innerHTML = gamers[i].currentPosi

                plname.append(namepl)
                plposi.append(posipl)
                plbox.append(plname)
                plbox.append(plposi)

                document.getElementById('announce-box').append(plbox)
            }
        }

        //game end
    } else {
        //startgame
        console.log('new game begins')
        generateQuestion()
        updateCurrentPlayer(currentPlayer)
    }
}

function updateCurrentPlayer(index) {
    document.getElementById('current-player').innerHTML = (gamers[index].name);
    document.getElementById('current-posi').innerHTML = "at " + (gamers[index].currentPosi);
}

function dicerollvalue() {

    dice = Math.floor(Math.random() * 6) + 1;

    document.getElementById('dice').src = './assets/dice-' + dice + '.png';

    gamers[currentPlayer].diceCount = dice;

    updateBoard(currentPlayer);
}

function updateBoard(curr) {

    var boxid = 'box' + (gamers[curr].currentPosi)
    var prevBox = document.getElementById(boxid)
    prevBox.getElementsByClassName(color[curr])[0].style.display = 'none'
    gamers[curr].currentPosi = gamers[curr].currentPosi + gamers[curr].diceCount;
    // checkSnakeLadder(curr)

    if (gamers[curr].currentPosi >= 100) {
        var winnerBox = document.getElementById('box100')
        winnerBox.getElementsByClassName(color[curr])[0].style.display = 'flex'
        checkGame()
    } else {
        checkSnakeLadder(curr)
    }
}

function checkSnakeLadder(curr) {
    for (var i = 0; i < snakeLadder.snakeBite.length; i++) {
        if (snakeLadder.snakeBite[i] == gamers[curr].currentPosi) {
            gamers[curr].currentPosi = snakeLadder.snakeLand[i]
            updateBoard(curr)
        }
    }

    for (var i = 0; i < snakeLadder.ladderClimb.length; i++) {
        if (snakeLadder.ladderClimb[i] == gamers[curr].currentPosi) {
            gamers[curr].currentPosi = snakeLadder.ladderLand[i]
            updateBoard(curr)
        }
    }
}

function generateQuestion() {
    // Load the questions from a file or an API here
    fetch('./questions.json') // assuming you have a questions.json file
        .then(response => response.json())
        .then(data => {
            questions = data.questions;  // Assuming the JSON contains an array of questions
            currentQuestion = questions[Math.floor(Math.random() * questions.length)];

            // Display the question
            document.getElementById('question-box').style.display = 'block';
            document.getElementById('question-text').innerHTML = currentQuestion.question;

            document.getElementById('submit-answer').onclick = function () {
                checkAnswer();
            };
        })
        .catch(error => {
            console.error("Error loading questions:", error);
        });
}

function checkAnswer() {
    let answer = document.getElementById('answer-input').value;
    if (answer.toLowerCase() === currentQuestion.answer.toLowerCase()) {
        alert('Correct Answer!');
        // Move to next player
        nextPlayer();
    } else {
        alert('Incorrect Answer!');
        nextPlayer();
    }
}

function nextPlayer() {
    currentPlayer = (currentPlayer + 1) % player.length;
    updateCurrentPlayer(currentPlayer);
}