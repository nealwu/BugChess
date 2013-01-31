ROOM = 'room';

var app = require('http').createServer(handler),
    io = require('socket.io').listen(app),
    fs = require('fs');

app.listen(80);

function handler(req, res) {
    console.log(req + ' ' + res);
    fs.readFile(__dirname + '/index.html',
    function(err, data) {
        if (err) {
            res.writeHead(500);
            return res.end('Error loading index.html');
        }

        res.writeHead(200);
        res.end(data);
    });
}

io.sockets.on('connection', function(socket) {
    socket.join(ROOM);

    socket.on('make_move', function(data) {
        io.sockets.in(ROOM).emit('make_move', data);
    });
});