var io = require('socket.io').listen();
var db = require('./db');
var ChessEngineJS = require('./public/javascripts/ChessEngine');

// io.configure(function() {
//     io.set('transports', ['xhr-polling']);
//     io.set('polling duration', 1);
// });

var PRIVATE_ID = 1000000;
var GAME_PREFIX = 'game';

db.ensureIndices();

var gameSeatToName = {};
var chatsForGame = {};

db.loadObject('gameSeatToName', function(object) {
  if (object) {
    gameSeatToName = object;
  }
});

function sendUpdate(gameID, engines) {
  console.log('Updating game ' + gameID);

  // Killing the links between the two engines is necessary so that when socket.io tries to convert them to JSON objects, there isn't a cycle
  ChessEngineJS.killLinks(engines[0], engines[1]);
  io.sockets.in(GAME_PREFIX + gameID).emit('update', engines);
  ChessEngineJS.makeLinks(engines[0], engines[1]);
}

function socketSit(socketID, gameID, position, name) {
  if (!(gameID in gameSeatToName)) {
    gameSeatToName[gameID] = {};
  }

  // Can't sit in already taken seat
  if (position in gameSeatToName[gameID]) {
    return false;
  }

  // Can't sit if you're already sitting on the other team
  var otherBoard = position[0] === '0' ? '1' : '0';
  var otherSide = position[2] === 'W' ? 'B' : 'W';
  var otherTeam1 = otherBoard + '_' + position[2];
  var otherTeam2 = position[0] + '_' + otherSide;

  if (gameSeatToName[gameID][otherTeam1] === name) {
    return false;
  }

  if (gameSeatToName[gameID][otherTeam2] === name) {
    return false;
  }

  gameSeatToName[gameID][position] = name;
  db.saveObject('gameSeatToName', gameSeatToName);
  return true;
}

function socketPermission(socketID, gameID, position, name) {
  return gameID in gameSeatToName && gameSeatToName[gameID][position] === name;
}

io.sockets.on('connection', function(socket) {
  socket.on('connect_to_game', function(gameID) {
    if (isNaN(gameID)) {
      console.log('Invalid gameID in URL! Setting to 0...');
      gameID = 0;
    }

    console.log('This is ' + socket.id);
    socket.join(GAME_PREFIX + gameID);

    db.loadGame(gameID, function(engines, chats) {
      sendUpdate(gameID, engines);

      if (!(gameID in chatsForGame)) {
        chatsForGame[gameID] = chats;
      }

      if (gameID in gameSeatToName) {
        var seatToName = gameSeatToName[gameID];

        for (var position in seatToName) {
          var name = seatToName[position];
          socket.emit('sit', {position: position, name: name});
        }
      }

      if (gameID in chatsForGame) {
        for (var i = 0; i < chatsForGame[gameID].length; i++) {
          var chatObj = chatsForGame[gameID][i];
          socket.emit('chat', chatObj.username, chatObj.date, chatObj.message);
        }
      }
    });
  });

  socket.on('make_move', function(gameID, move, username) {
    console.log('ID: ' + socket.id);
    console.log('Make move in game ' + gameID);

    db.loadGame(gameID, function(engines) {
      if (!move) {
        console.log('No move received!');
        return;
      }

      var position = move.substring(0, 3);

      if (!socketPermission(socket.id, gameID, position, username)) {
        console.log('This socket does not have permission to move this position');
        return;
      }

      console.log('Server received: ' + move);
      var number = parseInt(move[0]);
      move = move.substring(2, move.length);

      if (number !== 0 && number !== 1) {
        console.log('Illegal move!');
        return;
      }

      if (Object.keys(gameSeatToName[gameID]).length !== 4) {
        console.log('This game does not have all four seats taken');
        return;
      }

      if (!engines[number].makeMove(move)) {
        console.log('Illegal move!');
        return;
      }

      console.log('Legal move!');
      db.saveGame(gameID, engines, true);
      sendUpdate(gameID, engines);
    });
  });

  socket.on('game_over', function(gameID) {
    // Add a 100 ms delay in order to avoid a race condition where the client runs out of time slightly before the server
    setTimeout(function() {
      db.loadGame(gameID, function(engines) {
        engines[0].updateBothTimers();
        engines[1].updateBothTimers();
        var time = (new Date()).getTime();

        if (engines[0].getWinner() || engines[1].getWinner()) {
          engines[0].setFinishedTime(time);
          engines[1].setFinishedTime(time);
          db.saveGame(gameID, engines, true);
          db.markGameAsFinished(gameID);
          sendUpdate(gameID, engines);
        } else {
          console.error(new Error('Game ' + gameID + ' claims to be over when it isn\'t'));
        }
      });
    }, 100);
  });

  socket.on('get_games', function() {
    db.getAllGames(function(error, docs) {
      if (!error && docs) {
        socket.emit('games', docs);
      }
    });
  });

  socket.on('sit', function(gameID, data) {
    var position = data.position;
    var name = data.name;
    console.log(name + ' (' + socket.id + ') wants to sit in position ' + position +
    ' in game ' + gameID);

    if (socketSit(socket.id, gameID, position, name)) {
      console.log(name + ' (' + socket.id + ') approved for position ' + position +
      ' in game ' + gameID);
      io.sockets.in(GAME_PREFIX + gameID).emit('sit', {
        socketID: socket.id,
        position: position,
        name: name
      });
    }
  });

  socket.on('chat', function(gameID, username, message) {
    var date = new Date();

    if (!(gameID in chatsForGame)) {
      chatsForGame[gameID] = [];
    }

    chatsForGame[gameID].push({username: username, date: date.getTime(), message: message});
    io.sockets.in(GAME_PREFIX + gameID).emit('chat', username, date.getTime(), message);
    db.updateChats(gameID, chatsForGame[gameID]);
  });

  socket.on('new_public_game', function() {
    db.getAllGames(function(error, docs) {
      var gameID = -1;
      var gameIDs = [];

      if (!error && docs) {
        docs.forEach(function(doc) {
          gameIDs.push(doc.gameID);

          if (doc.gameID < PRIVATE_ID && !doc.started && (gameID === -1 || doc.gameID < gameID)) {
            gameID = doc.gameID;
          }
        });
      }

      if (gameID === -1) {
        // Sort numerically
        gameIDs.sort(function(a, b) {
          return a - b;
        });

        for (var i = 0; i < gameIDs.length; i++) {
          if (gameIDs[i] !== i + 1) {
            gameID = i + 1;
            break;
          }
        }

        if (gameID === -1) {
          gameID = gameIDs.length + 1;
        }
      }

      socket.emit('go_to_game', gameID);
    });
  });

  socket.on('new_private_game', function() {
    var gameID = Math.floor(PRIVATE_ID + PRIVATE_ID * Math.random());
    socket.emit('go_to_game', gameID);
  });
});

module.exports = io;
