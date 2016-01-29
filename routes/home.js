var router = require('express').Router();
var privileges = require('./middlewares/privileges');

router.get('/', privileges.ensureAuthenticated, function(req, res) {
  res.render('home');
});

module.exports = router;
