var express = require('express'),
    app     = express(),
    server  = require('http').createServer(app),
    io      = require('socket.io').listen(server),
    path    = require('path');

var ChessValidator = require('./public/javascripts/ChessValidator');

var validators = [new ChessValidator(), new ChessValidator()];
makeLinks();

app.configure(function() {
    app.set('port', process.env.PORT || 8000);
    app.set('views', __dirname + '/views');
    // app.set('view engine', 'jade');
    app.use(express.favicon());
    app.use(express.logger('dev'));
    app.use(express.bodyParser());
    app.use(express.methodOverride());
    app.use(app.router);
    app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function() {
    app.use(express.errorHandler({ showStack: true, dumpExceptions: true }));
});

app.get('/', function(req, res) {
    res.sendfile(__dirname + '/views/index.html');
});

server.listen(app.get('port'));

ROOM = 'room';

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

io.sockets.on('connection', function(socket) {
    socket.join(ROOM);

    socket.on('request_update', function() {
        sendUpdate();
    });

    socket.on('make_move', function(data) {
        if (data === undefined || data.move === undefined) {
            console.log('No move received!');
            return false;
        }

        var move = data.move;

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
        sendUpdate();
        return true;
    });
});