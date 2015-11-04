/* globals require, console, process, __dirname */

var PRIVATE_ID = 1000000;

var PORT = 8000;
var GAME_PREFIX = 'game';

var flash         = require('connect-flash'),
    express       = require('express'),
    path          = require('path'),
    favicon       = require('serve-favicon'),
    logger        = require('morgan'),
    cookieParser  = require('cookie-parser'),
    bodyParser    = require('body-parser'),
    methodOverride= require('method-override'),
    passport      = require('passport'),
    LocalStrategy = require('passport-local').Strategy,
    errorHandler  = require('errorhandler'),
    app           = express(),
    server        = require('http').createServer(app),
    io            = require('socket.io').listen(server),
    mongojs       = require('mongojs')
    db            = mongojs('bughouse', ['games', 'users']);

var ChessValidatorJS = require('./public/javascripts/ChessValidator');
var ChessValidator = ChessValidatorJS.ChessValidator;
var fixPrototypes = ChessValidatorJS.fixPrototypes;

// Passport code BEGIN

db.users.ensureIndex({username: 1}, {unique: true});
db.users.ensureIndex({email: 1}, {unique: true});

function findByUsername(username, fn) {
    db.users.find({username: username}, function(error, docs) {
        if (!error && docs && docs.length > 0) {
            fn(null, docs[0]);
        } else {
            fn(null, null);
        }
    });
}

function findByEmail(email, fn) {
    db.users.find({email: email}, function(error, docs) {
        if (!error && docs && docs.length > 0) {
            fn(null, docs[0]);
        } else {
            fn(null, null);
        }
    });
}

// Passport session setup.
//   To support persistent login sessions, Passport needs to be able to
//   serialize users into and deserialize users out of the session.  Typically,
//   this will be as simple as storing the user ID when serializing, and finding
//   the user by ID when deserializing.
passport.serializeUser(function(user, done) {
    done(null, user.username);
});

passport.deserializeUser(function(username, done) {
    findByUsername(username, function(err, user) {
        done(err, user);
    });
});

// Use the LocalStrategy within Passport.
//   Strategies in passport require a `verify` function, which accept
//   credentials (in this case, a username and password), and invoke a callback
//   with a user object.  In the real world, this would query a database;
//   however, in this example we are using a baked-in set of users.
passport.use(new LocalStrategy(
    function(username, password, done) {
        // asynchronous verification, for effect...
        process.nextTick(function() {
            // Find the user by username.  If there is no user with the given
            // username, or the password is not correct, set the user to `false` to
            // indicate failure and set a flash message.  Otherwise, return the
            // authenticated `user`.
            findByUsername(username, function(err, user) {
                if (err) {
                    return done(err);
                } else if (!user) {
                    return done(null, false,
                        {message: 'Unknown user ' + username + '!'});
                } else if (user.password != password) {
                    return done(null, false, {message: 'Invalid password!'});
                } else {
                    return done(null, user);
                }
            });
        });
    }
));
// Passport code END

var env = process.env.NODE_ENV || 'development';

app.set('port', process.env.PORT || PORT);
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
// app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(methodOverride());
app.use(require('express-session')({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: false
}));
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());

// io.configure(function() {
//     io.set('transports', ['xhr-polling']);
//     io.set('polling duration', 1);
// });

app.get('/', ensureAuthenticated, function(req, res) {
    res.render('home');
});

app.get('/game/:gameID', ensureAuthenticated, function(req, res) {
    res.render('game', {user: req.user});
});

// Simple route middleware to ensure user is authenticated.
//   Use this route middleware on any resource that needs to be protected.  If
//   the request is authenticated (typically via a persistent login session),
//   the request will proceed.  Otherwise, the user will be redirected to the
//   login page.
function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }

    res.redirect('/login');
}

app.get('/login', function(req, res) {
    var message = req.flash('message') + req.flash('error');

    if (message.length === 0) {
        message = ['Welcome to Bugchess.com! To get started, login and then start playing right away! Or register for an account above.'];
    }

    res.render('login', {
        user: req.user,
        message: message
    });
});

app.get('/register', function(req, res) {
    res.render('register', { user: req.user });
});

// POST /login
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  If authentication fails, the user will be redirected back to the
//   login page.  Otherwise, the primary route function function will be called,
//   which, in this example, will redirect the user to the home page.
//
//   curl -v -d "username=bob&password=secret" http://127.0.0.1:3000/login
app.post('/login', passport.authenticate('local', {
        failureRedirect: '/login',
        failureFlash: 'Invalid username or password.'
    }),
    function(req, res) {
        res.redirect('/');
    }
);

app.post('/register', function(req, res) {
    var user = req.body;

    doesUserExist(user.username, function(exists) {
        if (exists) {
            req.flash('message', 'User already exists.');
            res.redirect('/login');
        } else {
            db.users.save(user, function() {
                req.flash('message', 'Successfully registered! Please login.');
                res.redirect('/login');
            });
        }
    });
});

app.get('/account', ensureAuthenticated, function(req, res) {
    res.render('account', { user: req.user });
});

app.get('/logout', function(req, res) {
    req.logout();
    res.redirect('/');
});

server.listen(app.get('port'));

app.use(express.static(path.join(__dirname, 'public')));
// Don't output debug logs
// io.set('log level', 2);

if ('development' == env) {
   app.use(errorHandler({ showStack: true, dumpExceptions: true }));
}

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
