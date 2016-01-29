var passport = require('passport')
var LocalStrategy = require('passport-local').Strategy;
var db = require('mongojs')('bughouse', ['games', 'users']);

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
          } else if (user.password !== password) {
            return done(null, false, {message: 'Invalid password!'});
          } else {
            return done(null, user);
          }
        });
      });
    }
  ));

  module.exports = passport;
