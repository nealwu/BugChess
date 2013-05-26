PORT = 8000;
ROOM = 'room';
GAME_ID = 0;

var express = require('express'),
    app     = express(),
    server  = require('http').createServer(app),
    io      = require('socket.io').listen(server),
    path    = require('path'),
    db      = require('mongojs').connect('bughouse', ['games', 'users']);

var ChessValidatorJS = require('./public/javascripts/ChessValidator');
var ChessValidator = ChessValidatorJS.ChessValidator, fixPrototypes = ChessValidatorJS.fixPrototypes;

var validators = [new ChessValidator(), new ChessValidator()];
makeLinks();

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
    loadGame();
    res.sendfile(__dirname + '/views/game.html');
});

app.get('/game/:gameID', function(req, res) {
    // TODO: make sure gameID is an integer
    GAME_ID = parseInt(req.params.gameID);

    if (isNaN(GAME_ID))
        GAME_ID = 0;

    loadGame();
    res.sendfile(__dirname + '/views/game.html');
});

server.listen(app.get('port'));

function makeLinks() {
    validators[0].otherValidator = validators[1];
    validators[1].otherValidator = validators[0];
}

function killLinks() {
    validators[0].otherValidator = validators[1].otherValidator = null;
}

function sendUpdate() {
    killLinks();
    io.sockets.in(ROOM).emit('update', validators);
    makeLinks();
}

function loadGame() {
    // If there's a game, try to load it
    db.games.find({gameID: GAME_ID}, function(error, docs) {
        if (docs && docs.length > 0) {
            console.log('Found game in DB! Loading...');
            validators = JSON.parse(docs[0].game);
            fixPrototypes(validators[0]);
            fixPrototypes(validators[1]);
            makeLinks();
        } else {
            console.log('Game not found in DB! Creating new game...');
            killLinks();
            db.games.save({gameID: GAME_ID, game: JSON.stringify(validators)});
            makeLinks();
        }
    });  
}

io.sockets.on('connection', function(socket) {
    socket.join(ROOM);

    socket.on('request_update', function() {
        sendUpdate();
    });

    socket.on('make_move', function(move) {
        console.log('ID: ' + socket.id);

        if (!move) {
            console.log('No move received!');
            return false;
        }

        console.log('Server received: ' + move);
        var number = parseInt(move[0]);
        move = move.substring(2, move.length);

        if (number != 0 && number != 1) {
            console.log('Illegal move!');
            return false;
        }

        if (!validators[number].makeMove(move)) {
            console.log('Illegal move!');
            return false;
        }

        console.log('Legal move!');
        killLinks();
        db.games.update({gameID: GAME_ID}, {$set: {game: JSON.stringify(validators)}});
        makeLinks();
        sendUpdate();
        return true;
    });

    socket.on('game_over', function() {

    })
});