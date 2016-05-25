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

  socket.on('games', function(docs) {
    reverse(docs);
    console.log(docs);
    docs.forEach(function(doc) {
      var gameID = doc.gameID;
      var link = $('<a>').attr('href', document.URL + 'game/' + gameID).html('Game ' + gameID);
      var linkDiv = $('<div>').append(link);
      $('#games').append(linkDiv);
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
