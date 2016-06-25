/* globals $, io, console */

function reverse(list) {
  var n = list.length;

  for (var i = 0, j = n - 1; i < j; i++, j--) {
    var temp = list[i];
    list[i] = list[j];
    list[j] = temp;
  }
}

var socket = null;

$(document).ready(function() {
  // Set up socket.io
  socket = io.connect();

  socket.on('games', function(games) {
    reverse(games);

    games.forEach(function(game) {
      var gameID = game.gameID;
      var link = $('<a>').attr('href', document.URL + 'game/' + gameID).html('Game ' + gameID);
      var linkDiv = $('<div>').append(link);

      if (!game.started) {
        $('#new-games').append(linkDiv);
      } else if (!game.finished) {
        $('#started-games').append(linkDiv);
      } else {
        $('#finished-games').append(linkDiv);
      }
    });
  });

  socket.emit('get_games');

  $('#new-public-game').click(function() {
    socket.emit('new_public_game');
  });

  $('#new-private-game').click(function() {
    socket.emit('new_private_game');
  });

  socket.on('go_to_game', function(gameID) {
    window.location.href = '/game/' + gameID;
  });
});
