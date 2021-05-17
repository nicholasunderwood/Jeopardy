var code;
var selected = null;
var boardData;

$(document).ready(() => {
	console.log('ready')
	code = window.location.search.substr(window.location.search.length - 4);
	console.log(code)
	$('#code').text(code);

	populateTable();
	$('textarea').focus(handleSelection);
	loadBoard();

	$('#save').click(save);
});

function populateTable() {
	const cell = $('#template').removeAttr('id');
	const tbody = $('tbody');

	for (let row = 0; row < 5; row++) {
		let tr = $('<tr>').append(`<th scope='row'>$${(row + 1) * 100}</th>`)
		for (let col = 0; col < 6; col++) {
			tr.append(cell.clone(false));
		}
		tbody.append(tr);
	}
}

function handleSelection() {
	if (selected) selected.removeAttr('selected', false)
	selected = $(this).parent('td');
	selected.attr('selected', true);
	console.log(selected[0]);
}

function loadBoard() {
	$.get('/board-set', { code: code }, function (board) {
		console.log('return', board)
		boardData = board;

		fillBoard(board);
	});
}

function fillBoard(boardData){
	board.forEach((cat, col) => {
		$(`th:nth-child(${col + 2})>.cat`).val(cat.label);
		console.log(cat.clues)
		cat.clues.forEach((clue, row) => {
			clue = clue[0]
			let [q, a] = $(`tbody>tr:nth-child(${row + 2})>td:nth-child(${col + 2})`).children('textarea');
			console.log(q,a, clue, clue.question, clue.answer)
			$(q).text(clue.question)
				// .css({ "height": "auto", "overflow-y": "hidden" })
				// .height(q.scrollHeight);

			$(a).text(clue.answer)
				// .css({ "height": "auto", "overflow-y": "hidden" })
				// .height(a.scrollHeight);

			console.log($(a).val());
		});
	});
}


function getRandom(arr, n) {
	var result = new Array(n), len = arr.length, taken = new Array(len);
	n = Math.min(n, arr.length)
	while (n--) {
		var x = Math.floor(Math.random() * len);
		result[n] = arr[x in taken ? taken[x] : x];
		taken[x] = --len in taken ? taken[len] : len;
		console.log(result, taken);
	}
	return result;
}

function save() {

	const newBoard = $('thead th:not(:first-child) input').toArray().map(v => {
		return {
			label: v.value,
			clues: [...Array(5)].map(_ => [])
		}
	});

	for (let col = 0; col < 6; col++) {
		let cat = newBoard[col];
		for (let row = 0; row < 5; row++) {
			let [q, a] = $(`tbody>tr:nth-child(${row + 2})>td:nth-child(${col + 2})`).children('textarea');
			cat.clues[row].push({ 'question': q.value, 'answer': a.value, 'value': (row + 1) * 100 })
		}
	}

	console.log({ code: code, board: newBoard })

	$.ajax({
		type: 'post'
		, url: '/save-board'
		, data: JSON.stringify({ code: code, board: newBoard })
		, contentType: 'application/json'
	});

}
