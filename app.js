/* globals require, console, process, __dirname */

var flash = require('connect-flash');
var express = require('express');
var expressSession = require('express-session');
var path = require('path');
// var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var methodOverride = require('method-override');
var errorHandler = require('errorhandler');
var app = express();

var env = process.env.NODE_ENV || 'development';

if (env === 'development') {
  app.use(errorHandler({ showStack: true, dumpExceptions: true }));
  app.use(logger('dev'));
  app.locals.pretty = true;
}

app.set('views', path.join(__dirname, 'views'));
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

var passport = require('./routes/middlewares/passport-setup');
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
