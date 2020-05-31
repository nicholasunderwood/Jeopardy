const socket = io();
var name = '';
var isHost = false;
var client, players, showAnswer;

function show(id){
    $('body>div').each((_, el) => {
        el.id == id ? $(el).show() : $(el).hide();
    });
}

function startGame(categories, _players) {
    
    if(!isHost){
        console.log('load buzzer')
        loadBuzzer();
        return;
    }

    players = _players;
    socket.on('question', showQuestion);
    socket.on('board', showBoard);
    socket.on('scores', loadRankings);

    loadBoard(categories);
    loadQuestion();
    showBoard(board);
}

function loadBoard(categories) {

    categories.forEach( category => {
        $('#board thead').append($(`<th>${category}</th>`));
    });

    for(let row = 0; row < 5; row++ ){
        let tr = $('<tr></tr>');
        for(let i = 0; i < 5; i++){
            tr.append(`<td cat=${categories[row]} index=${i} enabled>${(row+1) * 100}</td>`);
        }
        $('#board tbody').append(tr);
    }

    $('td').click(event => {
        socket.emit('square chosen', $(event.target).attr('cat'), $(event.target).attr('index'));
        $('td').unbind();
    });
}

function showBoard(board) {
    
    $('#board td').click(event => {
        socket.emit('square chosen', $(event.target).attr('cat'), +$(event.target).attr('index'));
        $('td').unbind();
    });
    
    show('board')
}

function changeScore(event, delta) {
    console.log('change score', $(event.target), $(event.target).attr('player'))
    socket.emit('score change', $($(event.target).parent()).attr('player'), delta);
}

function loadRankings(scores){
    console.log('load rankings', scores)
    
    let list = $('#rankings ul');
    let add = $('<input type="button" value="+" class="money-control add btn btn-success">');
    let sub = $('<input type="button" value="-" class="money-control add btn btn-danger">');

	scores.forEach(player => {
        console.log(player)
        list.append(
            $(`<li class="list-group-item" player=${player.id}></li>`)
                .append(add.clone().click(e => changeScore(e, 100)))
                .append(`<div><h5>${player.name}</h5><h5>$${player.score}</h5><div>`)
                .append(sub.clone().click(e => changeScore(e, -100)))
        )
    });

    socket.removeListener('scores', loadRankings);
    socket.on('scores', updateRankings);
}

function updateRankings(scores) {
    console.log('update rankings', scores)
    $('#rankings li div h5').each((i,el) => {
        let player = scores[Math.floor(i/2)];
        if(i % 2 == 0){
            console.log(player.name)
            $(`#rankings li:nth-child(${Math.floor(i/2)+1})`).attr('player', player.id);
            $(el).text(player.name);
        } else {
            console.log(player.score);
            $(el).text('$' + player.score);
        }
    })

}

function loadQuestion() {

    $('#incorrect').click(() => { socket.emit('incorrect'); });

    $('#correct').click(() => {
        socket.emit('correct');
        showAnswer();
    });

    socket.on('buzz', name => {
        alert(name + " has buzzed in");
        $('.validation').each( (_, el) => $(el).prop('disabled', false));
    });
}

function showQuestion(question){
    console.log(question)

    showAnswer = () => {
        $('#a').text(question.answer);
        $('.validation').each((_,el) => $(el).prop('disabled', true));
        $('#back').val('Back to Board');
        $('#back').click(() => socket.emit('back') );
    }

    $('.validation').each( (_, el) => $(el).prop('disabled', true));
    
    $('#back').click(() => {
        console.log(showAnswer);
        showAnswer();
    }).val('Show Answer');
    
    $('#q').text(question.question);
    show('question');
}

function showAnswer(answer) {

}

function loadBuzzer() {
    let button = $('#buzzer>input');
    
    function setButton(enabled){
        button.prop('disabled',!enabled);
    }

    socket.on('buzzerState', setButton);

    socket.on('score', (score, rank) => {
        console.log("score", score, rank);
        let digit = rank % 10;
        $('#score').text('$' + score);
        $('#rank').text('' + rank + digit == 1 ? "st" : digit == 2 ? 'nd' : digit == 3 ? 'rd' : 'th');
    })

    $('#buzzer>input').click(() => {
        socket.emit('buzz', new Date());
        button.prop('disabled', true);
    });

    show('buzzer');
}

$( document ).ready( () => {

    $('#start-div').hide();
    $('#list-div').hide();
    show('login');
    $('.clientType').click(event => {
        let btn = $(event.target);
        if(btn.hasClass('btn-outline-dark')) {
            $('.clientType')
                .toggleClass('btn-outline-dark')
                .toggleClass('btn-dark')
                .attr('selected', (_, attr) => attr == 'true' ? 'false' : 'true' );
            $('#name-group').slideToggle();
        }
    });

    $('#login form').submit((e) => {
        e.preventDefault();
        isHost = $('#isHost').hasClass("btn-dark");
        name = isHost ? 'host' : $('#name').val();
        socket.emit('ready', name);
        console.log('ready', isHost);
        socket.on('start', startGame);
        
        if(isHost) {
            $('#start').click(() => {
                socket.emit('start');
            }).prop('disabled', false);
            $('#start-div').slideDown();
        }
    });

    socket.on('players', (players, hasHost) => {
        console.log(players, hasHost, isHost);
        $('#isHost').prop('disabled', hasHost && !isHost);
        $('#players-list').empty();

        console.log('players', players);
        players.forEach((player) => {
            $('#players-list').append($(`<li class='list-group-item'>${player.name}</li>`));
        });
    });
});