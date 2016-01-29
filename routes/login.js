var router = require('express').Router();
var passport = require('./middlewares/users');

router.get('/login', function(req, res) {
    var message = req.flash('message') + req.flash('error');

    if (message.length === 0) {
        message = ['Welcome to Bugchess.com! To get started, login and then start playing right away! Or register for an account above.'];
    }

    res.render('login', {
        user: req.user,
        message: message
    });
});

// POST /login
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  If authentication fails, the user will be redirected back to the
//   login page.  Otherwise, the primary route function function will be called,
//   which, in this example, will redirect the user to the home page.
//
//   curl -v -d "username=bob&password=secret" http://127.0.0.1:3000/login
router.post('/login', passport.authenticate('local', {
        failureRedirect: '/login',
        failureFlash: 'Invalid username or password.'
    }),
    function(req, res) {
        res.redirect('/');
    }
);

module.exports = router;
