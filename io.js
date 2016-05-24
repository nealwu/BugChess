var io = require('socket.io').listen();
var db = require('./db');
var ChessValidatorJS = require('./public/javascripts/ChessValidator');

// io.configure(function() {
//     io.set('transports', ['xhr-polling']);
//     io.set('polling duration', 1);
// });

var PRIVATE_ID = 1000000;
var GAME_PREFIX = 'game';

function sendUpdate(gameID, validators) {
  console.log('Updating game ' + gameID);

  // Killing the links between the two validators is necessary so that when socket.io tries to convert them to JSON objects, there isn't a cycle
  ChessValidatorJS.killLinks(validators[0], validators[1]);
  io.sockets.in(GAME_PREFIX + gameID).emit('update', validators);
  ChessValidatorJS.makeLinks(validators[0], validators[1]);
}

// Socket.io stuff
var gameSeatToSocket = {};
var gameSeatToName = {};

var chatsForGame = {};

function socketSit(socketID, gameID, position, name) {
  if (!gameSeatToSocket[gameID]) {
    gameSeatToSocket[gameID] = {};
    gameSeatToName[gameID] = {};
  }

  // Can't sit in already taken seat
  if (gameSeatToSocket[gameID][position]) {
    return false;
  }

  // Can't sit if you're already sitting on the other team
  var otherBoard = position[0] === '0' ? '1' : '0';
  var otherSide = position[2] === 'W' ? 'B' : 'W';
  var otherTeam1 = otherBoard + '_' + position[2];
  var otherTeam2 = position[0] + '_' + otherSide;

  if (gameSeatToSocket[gameID][otherTeam1] === socketID || gameSeatToName[gameID][otherTeam1] === name) {
    return false;
  }

  if (gameSeatToSocket[gameID][otherTeam2] === socketID || gameSeatToName[gameID][otherTeam2] === name) {
    return false;
  }

  gameSeatToSocket[gameID][position] = socketID;
  gameSeatToName[gameID][position] = name;
  return true;
}

function socketPermission(socketID, gameID, position, name) {
  if (gameSeatToSocket[gameID] === undefined || gameSeatToName[gameID] === undefined) {
    return false;
  }

  return gameSeatToSocket[gameID][position] === socketID || gameSeatToName[gameID][position] === name;
}

db.ensureIndices();

io.sockets.on('connection', function(socket) {
  socket.on('connect_to_game', function(gameID) {
    if (isNaN(gameID)) {
      console.log('Invalid gameID in URL! Setting to 0...');
      gameID = 0;
    }

    console.log('This is ' + socket.id);
    socket.join(GAME_PREFIX + gameID);

    db.loadGame(gameID, function(validators) {
      sendUpdate(gameID, validators);
    });

    if (gameSeatToSocket[gameID]) {
      var seatToSocket = gameSeatToSocket[gameID];
      var seatToName = gameSeatToName[gameID];

      for (var position in seatToSocket) {
        var socketID = seatToSocket[position];
        var name = seatToName[position];
        socket.emit('sit', {socketID: socketID, position: position, name: name});
      }
    }

    if (gameID in chatsForGame) {
      for (var i = 0; i < chatsForGame[gameID].length; i++) {
        var chatObj = chatsForGame[gameID][i];
        socket.emit('chat', chatObj.username, chatObj.date, chatObj.message);
      }
    }
  });

  socket.on('make_move', function(gameID, move, username) {
    console.log('ID: ' + socket.id);
    console.log('Make move in game ' + gameID);

    db.loadGame(gameID, function(validators) {
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

      if (Object.keys(gameSeatToSocket[gameID]).length !== 4) {
        console.log('This game does not have all four seats taken');
        return;
      }

      if (!validators[number].makeMove(move)) {
        console.log('Illegal move!');
        return;
      }

      console.log('Legal move!');
      db.saveGame(gameID, validators, true);
      sendUpdate(gameID, validators);
    });
  });

  socket.on('game_over', function() {

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

          if (doc.gameID < PRIVATE_ID && !doc.started) {
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
          if (gameIDs[i] !== i) {
            gameID = i;
            break;
          }
        }

        if (gameID === -1) {
          gameID = gameIDs.length;
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