var router = require('express').Router();

router.get('/register', function(req, res) {
  res.render('register', { user: req.user });
});

router.post('/register', function(req, res) {
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

module.exports = router;
