var router = require('express').Router();
var privileges = require('./middlewares/privileges');

router.get('/account', privileges.ensureAuthenticated, function(req, res) {
  res.render('account', {
    route: 'account',
    user: req.user
  });
});

module.exports = router;
