var db = require('mongojs')('bugchess', ['games', 'users', 'data']);
var ChessEngineJS = require('./public/javascripts/ChessEngine');
var ChessEngine = ChessEngineJS.ChessEngine;

function ensureIndices() {
  db.users.ensureIndex({username: 1}, {unique: true});
  db.users.ensureIndex({email: 1}, {unique: true});
  db.games.ensureIndex({gameID: 1}, {unique: true});
  db.data.ensureIndex({id: 1}, {unique: true});
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

function saveGame(gameID, engines, started) {
  doesGameExist(gameID, function(exists) {
    ChessEngineJS.killLinks(engines[0], engines[1]);

    if (exists) {
      db.games.update({gameID: gameID}, {$set: {game: JSON.stringify(engines), started: started}});
    } else {
      db.games.save({gameID: gameID, game: JSON.stringify(engines), started: started, chats: []});
    }

    ChessEngineJS.makeLinks(engines[0], engines[1]);
  });
}
module.exports.saveGame = saveGame;

function markGameAsFinished(gameID) {
  db.games.update({gameID: gameID}, {$set: {finished: true}});
}
module.exports.markGameAsFinished = markGameAsFinished;

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
    var engines = null;
    var chats = null;

    // If there's a game, try to load it
    if (!error && docs && docs.length > 0) {
      console.log('Found game ' + gameID + ' in DB! Loading...');
      engines = JSON.parse(docs[0].game);
      ChessEngineJS.fixPrototypes(engines[0]);
      ChessEngineJS.fixPrototypes(engines[1]);
      ChessEngineJS.makeLinks(engines[0], engines[1]);
      chats = docs[0].chats;
    } else {
      console.log('Game ' + gameID + ' not found in DB! Creating new game...');
      engines = [new ChessEngine(), new ChessEngine()];
      saveGame(gameID, engines, false);
    }

    if (!chats) {
      chats = [];
    }

    callback(engines, chats);
  });
}
module.exports.loadGame = loadGame;

function saveObject(identifier, object) {
  db.data.find({id: identifier}, function(error, docs) {
    if (!error && docs && docs.length > 0) {
      db.data.update({id: identifier}, {$set: {object: object}});
    } else {
      db.data.save({id: identifier, object: object});
    }
  });
}
module.exports.saveObject = saveObject;

function loadObject(identifier, callback) {
  db.data.find({id: identifier}, function(error, docs) {
    if (!error && docs && docs.length > 0) {
      callback(docs[0].object);
    } else {
      callback(null);
    }
  });
}
module.exports.loadObject = loadObject;
