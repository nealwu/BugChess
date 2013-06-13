PORT = 8000;
GAME_PREFIX = 'game';

var express = require('express'),
    app     = express(),
    server  = require('http').createServer(app),
    io      = require('socket.io').listen(server),
    path    = require('path'),
    db      = require('mongojs').connect('bughouse', ['games', 'users']);

var ChessValidatorJS = require('./public/javascripts/ChessValidator');
var ChessValidator = ChessValidatorJS.ChessValidator, fixPrototypes = ChessValidatorJS.fixPrototypes;

app.configure(function() {
    app.set('port', process.env.PORT || PORT);
    app.set('views', __dirname + '/views');
    // app.set('view engine', 'jade');
    app.use(express.favicon());
    app.use(express.logger('dev'));
    app.use(express.bodyParser());
    app.use(express.methodOverride());
    app.use(app.router);
    app.use(express.static(path.join(__dirname, 'public')));

    // Don't output debug logs
    io.set('log level', 2);
});

app.configure('development', function() {
    app.use(express.errorHandler({ showStack: true, dumpExceptions: true }));
});

app.get('/', function(req, res) {
    res.sendfile(app.get('views') + '/index.html');
});

app.get('/game/:gameID', function(req, res) {
    res.sendfile(app.get('views') + '/game.html');
});

server.listen(app.get('port'));

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

function saveGame(gameID, validators) {
    doesGameExist(gameID, function(exists) {
        killLinks(validators);

        if (exists) {
            db.games.update({gameID: gameID}, {$set: {game: JSON.stringify(validators)}});
        } else {
            db.games.save({gameID: gameID, game: JSON.stringify(validators)});
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
            saveGame(gameID, validators);
        }

        callback(validators);
    });
}

var socket_to_game = {};
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

function socketPermission(socketID, gameID, position) {
    if (!game_seat_to_socket[gameID]) {
        return false;
    }

    console.log(game_seat_to_socket[gameID][position] + ' ' + socketID);
    return game_seat_to_socket[gameID][position] == socketID;
}

io.sockets.on('connection', function(socket) {

    socket.on('start_game', function(URL) {
        var slash = URL.lastIndexOf('/');
        var gameID = parseInt(URL.substring(slash + 1));

        if (isNaN(gameID)) {
            console.log('Invalid gameID in URL! Setting to 0...');
            gameID = 0;
        }

        console.log('This is ' + socket.id);
        socket_to_game[socket.id] = gameID;
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

    socket.on('make_move', function(move) {
        console.log('ID: ' + socket.id);
        var gameID = socket_to_game[socket.id];
        console.log('Make move in game ' + gameID);

        loadGame(gameID, function(validators) {
            if (!move) {
                console.log('No move received!');
                return;
            }

            var position = move.substring(0, 3);

            if (!socketPermission(socket.id, gameID, position)) {
                console.log('This socket does not have permission to move this position');
                sendUpdate(gameID, validators);
                return;
            }

            console.log('Server received: ' + move);
            var number = parseInt(move[0]);
            move = move.substring(2, move.length);

            if (number != 0 && number != 1) {
                console.log('Illegal move!');
                return;
            }

            if (!validators[number].makeMove(move)) {
                console.log('Illegal move!');
                return;
            }

            console.log('Legal move!');
            saveGame(gameID, validators);
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

    socket.on('sit', function(data) {
        var position = data.position;
        var name = data.name;
        var gameID = socket_to_game[socket.id];
        console.log(name + ' (' + socket.id + ') wants to sit in position ' + position + ' in game ' + gameID);

        if (socketSit(socket.id, gameID, position, name)) {
            console.log(name + ' (' + socket.id + ') approved for position ' + position + ' in game ' + gameID);
            io.sockets.in(GAME_PREFIX + gameID).emit('sit', {socketID: socket.id, position: position, name: name});
        }
    })
});