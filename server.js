// Dependencies
const express = require('express');
const path = require('path');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const fs = require("fs");
const bodyParser = require('body-parser');
const uuid = require('uuid');

app.set('port', 5000);
app.use('/static', express.static(__dirname + '/static')); // Routing
app.use(bodyParser.urlencoded({ extended: true }));
// app.use(bodyParser.json());


console.log('init')

app.get('/', function (req, res) {
	res.sendFile(path.join(__dirname, 'static/html/index.html'));
});

app.get('/edit', (req, res) => {
	if(!req.query.code){
		res.redirect('/edit?code='+getCode(4));
		return;
	}

	res.sendFile(path.join(__dirname, 'static/html/board-editor.html'));
})

app.get('/board-set', (req, res) => {
	let code = req.query.code;
	console.log('load board', req.body, code)
	// load saved board
	let allBoards = JSON.parse(fs.readFileSync(`./board_data/boards.json`));
	if(code in allBoards){ res.send(allBoards[code]) }
	//make random board
	else res.send(makeRandomBoard())
});

app.post('/save-board', bodyParser.json(), (req,res) => {
	console.log('save', req.body);

	fs.readFile('./board_data/boards.json', 'utf-8', (err, data) => {
		console.log(data);
		data = JSON.parse(data);
		data[req.body.code] = req.body.board;
		fs.writeFileSync('./board_data/boards.json', JSON.stringify(data), 'utf-8');
	});
});


app.get('/host', (req, res) => {
	res.sendFile(path.join(__dirname, 'static/html/host.html'));
});

class Player {
	constructor(id, name){
		this.id = id;
		this.name = name;
		this.score = 0;
	}
}

function makeRandomBoard() {
	console.log('make board')
	const boardData = []; let catLabel, clues;
	const requiredValues = [...Array(5)].map((_,i) => (i+1)*100);

	while(boardData.length < 6) {
		while(true){
			catLabel = allCategories[Math.floor(allCategories.length * Math.random())];
			clues = allQuestions[catLabel].filter(clue => clue.round == 'Jeopardy!');
			let clueValues = clues.map(clue => clue.value);
			if(requiredValues.every(value => clueValues.indexOf(value) >= 0)) break;
		}

		boardData.push({
			label: catLabel,
			clues: [...Array(5)].map((_,i) => {
				while(true) {
					let clue = clues[Math.floor(clues.length * Math.random())];
					if(clue.value == (i+1)*100) return clue;
				}
			})
		});
	}
	return boardData;
}

function getCode (length) {
	return 'x'.repeat(length).replace(/[x]/g, function(c) {
		var r = (Math.random() * 26 | 0) + 10
		return r.toString(36).toUpperCase();
	});
}

function addRing(newRing) {
	if(ring == null){
		io.sockets.emit('buzzState', false);
		ring = newRing;
		setTimeout(() => {
			currentPlayer = ring.player;
			if(host != null) host.emit('buzz', ring.player.name);
			ring = null;
		}, 300);
	} else {
		if(newRing.time < ring.time){
			ring = newRing;
		}
	}
}

function sendScores() {
	const ranked = [...players].sort((a,b) => b.score - a.score);
	ranked.forEach(player => {
		sockets.get(player.id).emit('score', player.score);
	});

	if(host != null) {
		host.emit('scores', ranked);
	}
}

function addHostListeners(){

}

const allQuestions = JSON.parse(fs.readFileSync('./categories2.json'));
const allCategories = Object.keys(allQuestions);

const games = new Map();
const sockets = new Map();
const players = [];
const catagories = [];
var board;
var host = null
var ring = null;
var question = null;
var currentPlayer = null;
var hasStarted = false;

// Add the WebSocket handlers
io.of('/host').on('connection', function(socket) {
	var gameCode = getCode(6);
	console.log('new host: ' + gameCode)
	socket.join(gameCode)
	var board = null;
	socket.emit('connected', gameCode);
	
	socket.on('board-code', code => {
		let boards = JSON.parse(fs.readFileSync('./board_data/boards.json', 'utf-8'));
		console.log(code)
		board = boards[code];
		let labels = board.map(cat => cat.label);
		console.log('labels: ' + labels);
		socket.emit('labels', labels);


	});

	socket.on('start', () => {
		console.log('start')
	});
});

io.on('', socket => {
	console.log('connection')
	var isHost = false;
	var hasReadied = false;
	var player = null;
	sockets.set(socket.id, socket);
	socket.emit('players', players, host != null);

	function addHostListeners(){

		socket.on('square chosen', (catagory, index) => {
			console.log(catagory, index)
			question = board[catagory][index]
			socket.emit('question', question);
			io.sockets.emit('buzzState', true);
		});

		socket.on('score change', (id, delta) => {
			let player = players.find(player => player.id == id)
			player.score += +delta;
			sendScores();
		});

		socket.on('correct', () => {
			currentPlayer.score += question.value;
			sendScores();
		});

		socket.on('incorrect', () => {
			io.sockets.emit('buzzState', true);
			currentPlayer.score -= question.value;
			sendScores()
		});

		socket.on('back', () => {
			socket.emit('board', Object.keys(board), players);
		});
	}

	//TODO: add listener on start, not ready
	function addPlayerListeners(){
		socket.on('buzz', date => {
			addRing({'player': player, 'time': date});
			socket.emit('buzzState', false);
		});
	}

	socket.on('ready', name => {
		console.log(name, name == 'host');

		// if(hasReadied){
		// 	isHost = false;
		// 	players.splice(players.indexOf(player));
		// 	player = null;
		// }

		hasReadied = true;

		if(name != 'host'){
			player = new Player(socket.id, name);
			players.push(player);

			socket.on('buzz', date => {
				addRing({'player': player, 'time': date});
				socket.emit('buzzState', false);
			});

			if(hasStarted) {
				socket.emit('start');
				socket.emit('buzzState', false)
				sendScores()
			}
		} else {
			isHost = true;
			host = socket;
	
			socket.on('start', () => {
				console.log('start');

				hasStarted = true;
				addHostListeners();
	
				io.sockets.emit('start', Object.keys(board));
				io.sockets.emit('buzzState', false);
				sendScores();
			});
		}

		socket.on('disconnect', () => {
			if(!isHost) {
				console.log(player.name + 'left with $' + player.score);
				players.splice(players.indexOf(player));
			} else {
				host = null;
				console.log('host left')
			}
			io.sockets.emit('players', players, host != null);
		});

		io.sockets.emit('players', players, host != null);
	});
});

// Starts the server.
server.listen(5000, function () {
	console.log('Starting server on port 5000: http://localhost:5000');
});