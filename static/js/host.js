console.log('init')
const socket = io('/host');
const code = window.location.search.substr(window.location.search.length - 4);
var labels = null;
console.log(code);

$(document).on('ready', () => {
    console.log('ready')
});

show('lobby');


function show(id){
    $('screen').each((_, el) => {
        if(el.id == id) $(el).show(); else $(el).hide();
    });
}

function startGame() {
    console.log('start game')
    socket.off('start')
    socket.off('players')

    socket.on('board', showBoard);
    socket.on('scores', loadRankings);


    $('#rankings').show();
    loadBoard(labels);
    loadQuestion();
    showBoard(board);
}

function loadQuestion() {

    function setValidation(isDisabled){
        $('.validation').each( (_, el) => $(el).prop('disabled', isDisabled));
    }

    function showQuestion(question){
    
        setValidation(true)
    
        $('#correct').click(() => {
            socket.emit('correct');
            showAnswer(question.answer);
            setValidation(true);
        });
        
        $('#back').val('Show Answer').unbind().click(() => showAnswer(question.answer));
        
        let words = question.question.split('');
        let interval = setInterval(() => {
            $('#q').append(words.shift());
            if(words.length == 0) clearInterval(interval);
        }, 60)
    
        show('question');
    }

    function showAnswer(answer) {
        console.log('show answer', answer)
        $('#a').text(answer);
        setValidation(true)
        $('#back').val('Back to Board').unbind().click(() => socket.emit('back') );
    }

    $('#incorrect').click(() => {
        socket.emit('incorrect');
        setValidation(true);
    });

    socket.on('buzz', name => {
        alert(name + " has buzzed in");
        setValidation(false);
    });

    socket.on('question', showQuestion)
}

function loadRankings(){
    var currentScores = [];

    function updateRankings(scores){
        if(currentScores.length == scores.length){
            updateValues(scores)
        } else {
            updateNames(scores)
        }
        currentScores = scores
    }

    function updateValues(scores) {
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

    function updateNames(scores){
        let list = $('#rankings ul').empty();
        let add = $('<input type="button" value="+" class="money-control add btn btn-success">');
        let sub = $('<input type="button" value="-" class="money-control add btn btn-danger">');
    
        scores.forEach(player => {
            list.append($(`<li class="list-group-item" player=${player.id}></li>`)
                .append(add.clone().click(e => changeScore(e, 100)))
                .append(`<div><h5>${player.name}</h5><h5>$${player.score}</h5><div>`)
                .append(sub.clone().click(e => changeScore(e, -100)))
            )
        });
    }

    socket.removeListener('scores', loadRankings);
    socket.on('scores', updateRankings);
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

socket.emit('board-code', code)

$('#start').on('click', () => {
    console.log('start');
    socket.emit('start');
})

socket.on('start', startGame);

socket.on('connected', (gameCode) => {
    console.log('connected', gameCode);

    $('#code').text(gameCode);
});


socket.on('labels', _labels => {
    labels = _labels;
    let els = _labels.map(l => $(`<li class="list-group-item">${l}</li>`))
    els.forEach(el => $('ul#cat-list').append(el));
});

socket.on('players', labels => {
    let els = labels.map(l => $(`<li class="list-group-item">${l}</li>`));
    $('ul#player-list').empty();
    els.forEach(player => $('ul#player-list').append(player.name));
});