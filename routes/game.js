var router = require('express').Router();
var privileges = require('./middlewares/privileges');

router.get('/game/:gameID', privileges.ensureAuthenticated, function(req, res) {
  res.render('game', {
    route: 'game',
    user: req.user
  });
});

module.exports = router;
