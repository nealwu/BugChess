/* globals require, console, process, __dirname */

var flash          = require('connect-flash'),
    express        = require('express'),
    expressSession = require('express-session'),
    path           = require('path'),
    // favicon        = require('serve-favicon'),
    logger         = require('morgan'),
    cookieParser   = require('cookie-parser'),
    bodyParser     = require('body-parser'),
    methodOverride = require('method-override'),
    errorHandler   = require('errorhandler'),
    app            = express();

var env = process.env.NODE_ENV || 'development';

if (env === 'development') {
  app.use(errorHandler({ showStack: true, dumpExceptions: true }));
  app.use(logger('dev'));
  app.locals.pretty = true;
}

app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
// app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(methodOverride());
app.use(expressSession({
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: false
}));
app.use(flash());

passport = require('./routes/middlewares/users');
app.use(passport.initialize());
app.use(passport.session());

app.use(express.static('./public'));

var home = require('./routes/home');
app.use(home);

var game = require('./routes/game');
app.use(game);

var login = require('./routes/login');
app.use(login);

var register = require('./routes/register');
app.use(register);

var account = require('./routes/account');
app.use(account);

var logout = require('./routes/logout');
app.use(logout);

module.exports = app;
