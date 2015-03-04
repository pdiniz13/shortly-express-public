var express = require('express');
var util = require('./lib/utility');
var partials = require('express-partials');
var session = require('express-session');
var bodyParser = require('body-parser');
var bcrypt = require('bcrypt-nodejs');
var db = require('./app/config');
var Users = require('./app/collections/users');
var User = require('./app/models/user');
var Links = require('./app/collections/links');
var Link = require('./app/models/link');
var Click = require('./app/models/click');
var passport = require('passport');
var OAuth2 = require('passport-oauth').OAuth2Strategy;
var GitHubStrategy = require('passport-github').Strategy;

var app = express();

app.set('views', __dirname + '/public/views');
app.set('view engine', 'ejs');
app.use(partials());
passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  done(null, obj);
});

// app.use(express.cookieParser('secret string'));
app.use(session({
  secret: 'secret string',
  name: 'cookie_name',
  // store: sessionStore, // connect-mongo session store
  // proxy: true,
  resave: true,
  saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session());
// Parse JSON (uniform resource locators)
app.use(bodyParser.json());
// Parse forms (signup/login)
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static(__dirname + '/public'));


app.get('/', ensureAuthenticated, function(req, res) {
    return res.render('index');
});


app.get('/create', ensureAuthenticated, function(req, res) {
      return res.render('index');
    //res.render('index');
  }
);

app.get('/links', ensureAuthenticated,
  function(req, res) {
      new User({username: req.user}).fetch().then(function(user) {
        console.log(user.attributes.id);
        Links.reset().query('where', 'user_id', '=', user.attributes.id).fetch().then(function(links) {
          if (links) {
            console.log(links);
            res.send(200, links.models);
          }
          else {
            res.send(200);
          }
        });
      });
  }
);

app.post('/links', ensureAuthenticated,
  function(req, res) {
      var uri = req.body.url;

      if (!util.isValidUrl(uri)) {
        console.log('Not a valid url: ', uri);
        return res.send(404);
      }

      new Link({url: uri}).fetch().then(function(found) {
        if (found) {
          res.send(200, found.attributes);
        } else {
          util.getUrlTitle(uri, function(err, title) {
            if (err) {
              console.log('Error reading URL heading: ', err);
              return res.send(404);
            }

            new User({username: req.user}).fetch().then(function(user) {
              // console.log(user.attributes.id);
              var link = new Link({
                url: uri,
                user_id: user.attributes.id,
                title: title,
                base_url: req.headers.origin
              });

              link.save().then(function(newLink) {
                Links.add(newLink);
                res.send(200, newLink);
              });
            });
          });
        }
      });
  }
);

/************************************************************/
// Write your authentication routes here
/************************************************************/


passport.use(new GitHubStrategy({
    authorizationURL: 'https://github.com/login/oauth/authorize',
    tokenURL: 'https://github.com/login/oauth/access_token',
    clientID: 'urID',
    clientSecret: 'urSecret',
    callbackURL: 'http://localhost:8080/auth/github/callback',
    scope: 'user'
  },
  function(accessToken, refreshToken, profile, done) {
    process.nextTick(function (){
    var username = profile.username;
    var password = 'github';
    new User({username: username, password: password}).fetch().then(function(found) {
      if (found) {
        //found user
        return done(null, found.username);
      } else {
        console.log('profile username', username);
        var user = new User({
          username: username,
          password: password
        });
          user.save().then(function(newUser) {
          Users.add(newUser);
            console.log('newUser', newUser);
          console.log('username', newUser.username);
          return done(null, newUser.attributes.username);
        });
        //else {

      }
    });
      //console.log(profile.username);
    //return done(null, {accessToken: accessToken, profile: profile});
  })
  })
);
    //User.findOne({
    //  'username': profile.username
    //}, function(err, user, info) {
    //  if (err) {
    //    console.log(err);
    //    console.log(info);
    //    return done(error);
    //  }
    //  if (!user) {
    //    user = new User({
    //      username: profile.email,
    //      password: 'github'
    //    });
    //    user.save(function(err, info){
    //      if(err){
    //        console.log("line 145", err);
    //        return done(err, user, info);
    //      } else {
    //        return done(err, user, info);
    //      }
    //    });
    //  }
    //});
//  }
//));

app.get('/auth/github', passport.authenticate('github'));

app.get('/auth/github/callback', passport.authenticate('github', {
  successRedirect: "/index",
  failureRedirect: "/login"
  //failureFlash: true,
  //successFlash: 'Welcome!'
}), function(req,res){
  console.log('req', req);
  console.log('res', res);
  res.render('index');
});


app.get('/login', function(req, res) {
  res.render('login');
});

app.get('/index', ensureAuthenticated, function(req, res){
  res.render('index', { user: req.user });
});
//
//app.get('/signup', function(req, res) {
//  res.render('signup');
//});
//
//app.post('/login', function(req, res) {
//
//  var username = req.body.username;
//  var password = req.body.password;
//
//  Users.query("where", "username", "=", username).fetch().then(function(user) {
//    if (bcrypt.compareSync(password, user.models[0].attributes.password)) {
//      req.session.regenerate(function() {
//        req.session.user = username;
//        res.redirect('/');
//      });
//
//    } else {
//      res.render('login');
//    }
//  });
//});
//
app.get('/logout', function(req, res) {
  // console.log("you're at logout");
  req.logout();
  res.redirect('/');
});
//
//
//app.post('/signup', function(req, res) {
//
//  var username = req.body.username;
//  var password = req.body.password;
//  new User({username: username, password: password}).fetch().then(function(found) {
//    if (found) {
//      //found user
//      res.send(200, found.attributes);
//    } else {
//      var user = new User({
//        username: username,
//        password: password
//      });
//
//      user.save().then(function(newUser) {
//        Users.add(newUser);
//        res.render('login');
//        //send user to login
//      });
//      //else {
//
//    }
//  });
//  res.render('login');
//});


/************************************************************/
// Handle the wildcard route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

//app.get('/*', function(req, res) {
//  new Link({code: req.params[0]}).fetch().then(function(link) {
//    if (!link) {
//      res.redirect('/');
//    } else {
//      var click = new Click({
//        link_id: link.get('id')
//      });
//
//      click.save().then(function() {
//        db.knex('urls')
//          .where('code', '=', link.get('code'))
//          .update({
//            visits: link.get('visits') + 1
//          }).then(function() {
//            return res.redirect(link.get('url'));
//          });
//      });
//    }
//  });
//});

app.listen(process.env.port || 8080);
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  res.redirect('/login')
}