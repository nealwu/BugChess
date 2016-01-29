var io = require('socket.io').listen();
var db = require('mongojs')('bughouse', ['games', 'users']);

// io.configure(function() {
//     io.set('transports', ['xhr-polling']);
//     io.set('polling duration', 1);
// });

var PRIVATE_ID = 1000000;

var GAME_PREFIX = 'game';

var ChessValidatorJS = require('./public/javascripts/ChessValidator');
var ChessValidator = ChessValidatorJS.ChessValidator;
var fixPrototypes = ChessValidatorJS.fixPrototypes;

function makeLinks(validators) {
    validators[0].otherValidator = validators[1];
    validators[1].otherValidator = validators[0];
}

function killLinks(validators) {
    validators[0].otherValidator = validators[1].otherValidator = null;
}

function sendUpdate(gameID, validators) {
    console.log('Updating game ' + gameID);
    killLinks(validators);
    io.sockets.in(GAME_PREFIX + gameID).emit('update', validators);
    makeLinks(validators);
}

function doesGameExist(gameID, callback) {
    db.games.find({gameID: gameID}, function(error, docs) {
        callback(!error && docs && docs.length > 0);
    });
}

function doesUserExist(username, callback) {
    db.users.find({username: username}, function(error, docs) {
        callback(!error && docs && docs.length > 0);
    });
}

function saveGame(gameID, validators, started) {
    doesGameExist(gameID, function(exists) {
        killLinks(validators);

        if (exists) {
            db.games.update({gameID: gameID}, {$set: {game: JSON.stringify(validators), started: started}});
        } else {
            db.games.save({gameID: gameID, game: JSON.stringify(validators), started: started});
        }

        makeLinks(validators);
    });
}

function loadGame(gameID, callback) {
    db.games.find({gameID: gameID}, function(error, docs) {
        var validators;

        // If there's a game, try to load it
        if (!error && docs && docs.length > 0) {
            console.log('Found game ' + gameID + ' in DB! Loading...');
            validators = JSON.parse(docs[0].game);
            fixPrototypes(validators[0]);
            fixPrototypes(validators[1]);
            makeLinks(validators);
        } else {
            console.log('Game ' + gameID + ' not found in DB! Creating new game...');
            validators = [new ChessValidator(), new ChessValidator()];
            saveGame(gameID, validators, false);
        }

        callback(validators);
    });
}

//Socket.io stuff
var game_seat_to_socket = {};
var game_seat_to_name = {};

function socketSit(socketID, gameID, position, name) {
    if (!game_seat_to_socket[gameID]) {
        game_seat_to_socket[gameID] = {};
        game_seat_to_name[gameID] = {};
    }

    // Can't sit in already taken seat
    if (game_seat_to_socket[gameID][position]) {
        return false;
    }

    game_seat_to_socket[gameID][position] = socketID;
    game_seat_to_name[gameID][position] = name;
    return true;
}

function socketPermission(socketID, gameID, position, name) {
    if (game_seat_to_socket[gameID] === undefined || game_seat_to_name[gameID] === undefined) {
        return false;
    }

    return game_seat_to_socket[gameID][position] === socketID || game_seat_to_name[gameID][position] === name;
}

io.sockets.on('connection', function(socket) {
    socket.on('start_game', function(gameID) {
        if (isNaN(gameID)) {
            console.log('Invalid gameID in URL! Setting to 0...');
            gameID = 0;
        }

        console.log('This is ' + socket.id);
        socket.join(GAME_PREFIX + gameID);

        loadGame(gameID, function(validators) {
            sendUpdate(gameID, validators);
        });

        if (game_seat_to_socket[gameID]) {
            var seat_to_socket = game_seat_to_socket[gameID];
            var seat_to_name = game_seat_to_name[gameID];

            for (var position in seat_to_socket) {
                var socketID = seat_to_socket[position];
                var name = seat_to_name[position];
                socket.emit('sit', {socketID: socketID, position: position, name: name});
            }
        }
    });

    socket.on('make_move', function(gameID, move, username) {
        console.log('ID: ' + socket.id);
        console.log('Make move in game ' + gameID);

        loadGame(gameID, function(validators) {
            if (!move) {
                console.log('No move received!');
                return;
            }

            var position = move.substring(0, 3);

            if (!socketPermission(socket.id, gameID, position, username)) {
                console.log('This socket does not have permission to move this position');
                sendUpdate(gameID, validators);
                return;
            }

            console.log('Server received: ' + move);
            var number = parseInt(move[0]);
            move = move.substring(2, move.length);

            if (number !== 0 && number !== 1) {
                console.log('Illegal move!');
                return;
            }

            if (!validators[number].makeMove(move)) {
                console.log('Illegal move!');
                return;
            }

            console.log('Legal move!');
            saveGame(gameID, validators, true);
            sendUpdate(gameID, validators);
        });
    });

    socket.on('game_over', function() {

    });

    socket.on('get_games', function() {
        db.games.find(function(error, docs) {
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
        io.sockets.in(GAME_PREFIX + gameID).emit('chat', username, message);
    });

    socket.on('new_public_game', function() {
        db.games.find(function(error, docs) {
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
                gameIDs.sort();

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
