var express = require('express'),
    app     = express(),
    server  = require('http').createServer(app),
    io      = require('socket.io').listen(server),
    path    = require('path');

var ChessValidator = require('./public/javascripts/ChessValidator');

var validators = [new ChessValidator(), new ChessValidator()];
validators[0].otherValidator = validators[1];
validators[1].otherValidator = validators[0];

app.configure(function() {
    app.set('port', process.env.PORT || 80);
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

io.sockets.on('connection', function(socket) {
    socket.join(ROOM);

    socket.on('make_move', function(data) {
        var move = data.move;

        if (move === undefined) {
            return false;
        }

        console.log('Server received: ' + move);
        var number = parseInt(move[0]);
        move = move.substring(2, move.length);

        if (number < 0 || number > 1) {
            return false;
        }

        if (!validators[number].makeMove(move)) {
            return false;
        }

        io.sockets.in(ROOM).emit('make_move', data);
        return true;
    });
});