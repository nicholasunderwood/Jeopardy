// Dependencies
var express = require('express');
var http = require('http');
var path = require('path');
var socketIO = require('socket.io');
var app = express();
var server = http.Server(app);
var io = socketIO(server);
var fs = require("fs");
app.set('port', 5000);
app.use('/static', express.static(__dirname + '/static'));// Routing
app.get('/', function (request, response) {
	response.sendFile(path.join(__dirname, 'game.html'));
});

// Starts the server.
server.listen(5000, function () {
	console.log('Starting server on port 5000: http://localhost:5000');
});

class Player {
	constructor(id, name){
		this.id = id;
		this.name = name;
		this.score = 0;
	}
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

const sockets = new Map();
const players = [];
const catagories = [];
var board;
var host = null
var ring = null;
var question = null;
var currentPlayer = null;
var hasStarted = false;

fs.readFile("questions.json", 'utf8', (err, data) => {
	if (err) throw err;
	board = JSON.parse(data)
	for(key in board){
		catagories.push(key);
	}
});

// Add the WebSocket handlers
io.on('connection', socket => {
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