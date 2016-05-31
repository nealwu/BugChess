var db = require('mongojs')('bugchess', ['games', 'users']);
var ChessValidatorJS = require('./public/javascripts/ChessValidator');
var ChessValidator = ChessValidatorJS.ChessValidator;

function ensureIndices() {
  db.users.ensureIndex({username: 1}, {unique: true});
  db.users.ensureIndex({email: 1}, {unique: true});
}
module.exports.ensureIndices = ensureIndices;

function findByUsername(username, fn) {
  db.users.find({username: username}, function(error, docs) {
    if (!error && docs && docs.length > 0) {
      fn(null, docs[0]);
    } else {
      fn(null, null);
    }
  });
}
module.exports.findByUsername = findByUsername;

function findByEmail(email, fn) {
  db.users.find({email: email}, function(error, docs) {
    if (!error && docs && docs.length > 0) {
      fn(null, docs[0]);
    } else {
      fn(null, null);
    }
  });
}
module.exports.findByEmail = findByEmail;

function saveUser(user, callback) {
  db.users.save(user, callback);
}
module.exports.saveUser = saveUser;

function doesUserExist(username, callback) {
  db.users.find({username: username}, function(error, docs) {
    callback(!error && docs && docs.length > 0);
  });
}
module.exports.doesUserExist = doesUserExist;

function doesGameExist(gameID, callback) {
  db.games.find({gameID: gameID}, function(error, docs) {
    callback(!error && docs && docs.length > 0);
  });
}
module.exports.doesGameExist = doesGameExist;

function getAllGames(callback) {
  db.games.find(callback);
}
module.exports.getAllGames = getAllGames;

function saveGame(gameID, validators, started) {
  doesGameExist(gameID, function(exists) {
    ChessValidatorJS.killLinks(validators[0], validators[1]);

    if (exists) {
      db.games.update({gameID: gameID}, {$set: {game: JSON.stringify(validators), started: started}});
    } else {
      db.games.save({gameID: gameID, game: JSON.stringify(validators), started: started, chats: []});
    }

    ChessValidatorJS.makeLinks(validators[0], validators[1]);
  });
}
module.exports.saveGame = saveGame;

function updateChats(gameID, chats) {
  doesGameExist(gameID, function(exists) {
    if (exists) {
      db.games.update({gameID: gameID}, {$set: {chats: chats}});
    } else {
      db.games.save({gameID: gameID, chats: chats});
    }
  });
}
module.exports.updateChats = updateChats;

function loadGame(gameID, callback) {
  db.games.find({gameID: gameID}, function(error, docs) {
    var validators = null;

    // If there's a game, try to load it
    if (!error && docs && docs.length > 0) {
      console.log('Found game ' + gameID + ' in DB! Loading...');
      validators = JSON.parse(docs[0].game);
      ChessValidatorJS.fixPrototypes(validators[0]);
      ChessValidatorJS.fixPrototypes(validators[1]);
      ChessValidatorJS.makeLinks(validators[0], validators[1]);
    } else {
      console.log('Game ' + gameID + ' not found in DB! Creating new game...');
      validators = [new ChessValidator(), new ChessValidator()];
      saveGame(gameID, validators, false);
    }

    callback(validators);
  });
}
module.exports.loadGame = loadGame;
