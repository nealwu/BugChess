function reverse(list) {
    var n = list.length;

    for (var i = 0, j = n - 1; i < j; i++, j--) {
        var temp = list[i];
        list[i] = list[j];
        list[j] = temp;
    }
}

var socket;

$(document).ready(function() {
    // Set up socket.io
    if (document.URL.indexOf('localhost') == -1) {
        socket = io.connect('http://nealwu.com:8000');
    } else {
        socket = io.connect('http://localhost:8000');
    }

    socket.on('games', function(docs) {
        reverse(docs);
        var max_id = -1;
        docs.forEach(function(doc) {
            var gameID = doc.gameID;
            var link = $('<a>').attr('href', document.URL + 'game/' + gameID).html('Game ' + gameID);
            var link_div = $('<div>').append(link);
            $('#games').append(link_div);
            max_id = Math.max(max_id, gameID);
        });
        $('#create_games').click(function(btn) {
            window.location.href='game/' + (max_id + 1);
        })
    });

    socket.emit('get_games');
});