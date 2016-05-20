var router = require('express').Router();
var db = require('../db');

router.get('/register', function(req, res) {
  res.render('register', {
    route: 'register',
    user: req.user
  });
});

router.post('/register', function(req, res) {
  var user = req.body;

  db.doesUserExist(user.username, function(exists) {
    if (exists) {
      req.flash('message', 'User already exists.');
      res.redirect('/login');
    } else {
      db.saveUser(user, function() {
        req.flash('message', 'Successfully registered! Please login.');
        res.redirect('/login');
      });
    }
  });
});

module.exports = router;
