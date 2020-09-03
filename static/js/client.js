const socket = io();
var name = '';
var isHost = false;
var currentScores = null;
var currentQuestion = null;

// localstorage.setItem('uUID', Math.random().toString(24) + new Date());
// socket.emit('userLogin', localstorage.getItem('uUID'));

function show(id){
    $('.screen').each((_, el) => {
        if(el.id == id) $(el).show(); else $(el).hide();
    });
}

function startGame(categories) {
    console.log('start game')
    socket.off('start')
    socket.off('players')

    socket.on('question', showQuestion);
    socket.on('board', showBoard);
    socket.on('scores', loadRankings);

    $('#rankings').show();
    loadBoard(categories);
    loadQuestion();
    showBoard(board);
}

function loadRankings(scores){
    let list = $('#rankings ul').empty();
    let add = $('<input type="button" value="+" class="money-control add btn btn-success">');
    let sub = $('<input type="button" value="-" class="money-control add btn btn-danger">');

    scores.forEach(player => {
        list.append(
            $(`<li class="list-group-item" player=${player.id}></li>`)
                .append(add.clone().click(e => changeScore(e, 100)))
                .append(`<div><h5>${player.name}</h5><h5>$${player.score}</h5><div>`)
                .append(sub.clone().click(e => changeScore(e, -100)))
        )
    });

    socket.removeListener('scores', loadRankings);
    socket.on('scores', updateRankings);
    currentScores = scores
}

function updateRankings(scores) {
    if(scores.length != currentScores.length){
        loadRankings(scores)
        return;
    }

    $('#rankings li div h5').each((i,el) => {
        let player = scores[Math.floor(i/2)];
        if(i % 2 == 0){
            $(`#rankings li:nth-child(${Math.floor(i/2)+1})`).attr('player', player.id);
            $(el).text(player.name);
        } else {
            $(el).text((player.score < 0 ? '-$' : '$') + Math.abs(player.score));
        }
    })
}

function loadBoard(categories) {

    categories.forEach( category => {
        $('#board thead').append($(`<th>${category}</th>`));
    });

    for(let row = 0; row < 5; row++ ){
        let tr = $('<tr></tr>')
        for(let col = 0; col < 5; col++){
            tr.append(`<td cat='${categories[col]}' index='${row}' answered='false'>${(row+1) * 100}</td>`);
        }
        $('#board tbody').append(tr);
    }

    $('#board td').click(event => {
        let td = $(event.target);
        td.addClass('answered');
        td.unbind('click');
        socket.emit('square chosen', td.attr('cat'), td.attr('index'));
    });
}

function showBoard() {
    $('#a','#q').text('');
    console.log('show board');
    $('#q').text('');
    $('#a').text('');
    show('board');
}

function changeScore(event, delta) {
    socket.emit('score change', $($(event.target).parent()).attr('player'), delta);
}

function setValidation(isDisabled){
    $('.validation').each( (_, el) => $(el).prop('disabled', isDisabled));
}

function loadQuestion() {

    $('#incorrect').click(() => {
        socket.emit('incorrect');
        setValidation(true);
    });

    socket.on('buzz', name => {
        alert(name + " has buzzed in");
        setValidation(false);
    });
}

function showQuestion(question){
    currentQuestion = question

    setValidation(true)

    $('#correct').click(() => {
        socket.emit('correct');
        showAnswer(question.answer);
        setValidation(true);
    });
    
    $('#back').unbind().click(() => {
        showAnswer(question.answer);
    }).val('Show Answer');
    
    
    // $('#q').text(question.question);
    let words = question.question.split('');
    let span = $('#q');
    let interval = setInterval(() => {
        span.text(span.text() + words.shift());
        if(words.length == 0){
            clearInterval(interval);
        }
    }, 60)

    show('question');
}

function showAnswer(answer) {
    console.log('show answer', answer)
    $('#a').text(answer);
    $('.validation').each((_,el) => $(el).prop('disabled', true));
    $('#back').val('Back to Board');
    $('#back').unbind().click(() => socket.emit('back') );
}

function loadBuzzer(name) {

    function getEnding(score) {
        if(score > 3 && score < 21) return 'th';
        if(score % 10 == 1) return 'st';
        if(score % 10 == 2) return 'nd';
        if(score % 10 == 3) return 'rd';
        return 'th'
    }

    function setScore(score){
        $('#score-display').text((score < 0 ? '-$' : '$') + Math.abs(score));
    }

    function setButton(enabled){
        button.prop('disabled',!enabled);
    }
    
    socket.off('start'); socket.off('players');
    socket.on('buzzState', setButton);
    socket.on('score', setScore);
    
    let button = $('#buzzer>input');

    button.click(() => {
        socket.emit('buzz', new Date());
        setButton(false);
    });
    
    setScore(0)
    $('#name-display').text(name)
    show('buzzer');
}

$( document ).ready( () => {
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
        $('#start-div').hide();
        e.preventDefault();
        isHost = $('#isHost').hasClass('btn-dark');
        name = isHost ? 'host' : $('#name').val();
        if(!name) return;

        socket.emit('ready', name);

        $('#submit').prop('disabled', true);
        $('#name').change(() => $('#submit').prop('disabled', false))
        
        if(isHost) {
            $('#start').click(() => {
                socket.emit('start');
            }).prop('disabled', false);
            $('#start-div').slideDown();

            socket.on('start', startGame);
        } else {
            socket.on('start', () => { loadBuzzer(name) });
        }
    });

    socket.on('players', (players, hasHost) => {
        console.log("players", isHost, players)
        $('#lst-div').show();
        $('#isHost').prop('disabled', hasHost && !isHost);
        $('#start').prop('disabled', players.length < 2);
        $('#players-list').empty();
        players.forEach((player) => {
            $('#players-list').append($(`<li class='list-group-item'>${player.name}</li>`));
        });
    });
});