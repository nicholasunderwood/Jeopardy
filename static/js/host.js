console.log('init')
const socket = io('/host');
const code = window.location.search.substr(window.location.search.length - 4);
console.log(code)

$('#start').click(() => {
    console.log('start');
    socket.emit('start');
})

socket.on('connected', (gameCode) => {
    console.log('connected', gameCode);

    $('#code').text(gameCode);
});


socket.emit('board-code', code)

socket.on('labels', labels => {
    let els = labels.map(l => $(`<li class="list-group-item">${l}</li>`))
    els.forEach(el => $('ul#cat-list').append(el));
});