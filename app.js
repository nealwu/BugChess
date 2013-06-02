PORT = 8000;
ROOM = 'room';

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
    res.sendfile(app.get('views') + '/game.html');
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
    io.sockets.in(ROOM + gameID).emit('update', validators);
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

io.sockets.on('connection', function(socket) {
    socket.on('start', function(URL) {
        var slash = URL.lastIndexOf('/');
        var gameID = parseInt(URL.substring(slash + 1));

        if (isNaN(gameID)) {
            console.log('Invalid gameID in URL! Setting to 0...');
            gameID = 0;
        }

        console.log('This is ' + this.id);
        socket_to_game[this.id] = gameID;
        this.join(ROOM + gameID);

        loadGame(gameID, function(validators) {
            sendUpdate(gameID, validators);
        });
    });

    socket.on('make_move', function(move) {
        console.log('ID: ' + this.id);
        var gameID = socket_to_game[this.id];
        console.log('Make move in game ' + gameID);

        loadGame(gameID, function(validators) {
            if (!move) {
                console.log('No move received!');
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

    })
});