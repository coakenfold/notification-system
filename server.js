const port = 3000;
const express = require('express');
const mongoose = require('mongoose');
const config = require('./config');
const bodyParser = require('body-parser');
const Event = require('./models/event');
const Subscription = require('./models/subscription');
//const path = require('path');
const nodemailer = require('nodemailer');
const _ = require('underscore');
const passport = require('passport');
const GitHubApi = require("github");
const GitHubStrategy = require('passport-github2').Strategy;
const SpotifyStrategy = require('passport-spotify').Strategy;

const spotifyApi = require('./spotify');
const UserSpotify = require('./models/UserSpotify')
const session = require('express-session');
const accountType = {
    user: 'user',
    creator: 'creator',
    admin: 'admin'
  }
  const github = new GitHubApi({
      // optional
      debug: true,
      protocol: "https",
      host: "api.github.com", // should be api.github.com for GitHub
      headers: {
          "user-agent": "@coakenfold-Notification-System" // GitHub is happy with a unique user agent
      },
      timeout: 5000
  })

// Passport session setup.
//   To support persistent login sessions, Passport needs to be able to
//   serialize users into and deserialize users out of the session.  Typically,
//   this will be as simple as storing the user ID when serializing, and finding
//   the user by ID when deserializing.  However, since this example does not
//   have a database of user records, the complete GitHub/Spotify profile is serialized
//   and deserialized.
passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  done(null, obj);
});


// Use the GitHubStrategy within Passport.
//   Strategies in Passport require a `verify` function, which accept
//   credentials (in this case, an accessToken, refreshToken, and GitHub
//   profile), and invoke a callback with a user object.
passport.use(new GitHubStrategy({
    clientID: config.github.clientId,
    clientSecret: config.github.clientSecret,
    callbackURL: "http://localhost:3000/auth/github/callback"
  },
  function(accessToken, refreshToken, profile, done) {
    // asynchronous verification, for effect...
    process.nextTick(function () {
      
      // To keep the example simple, the user's GitHub profile is returned to
      // represent the logged-in user.  In a typical application, you would want
      // to associate the GitHub account with a user record in your database,
      // and return that user instead.
      return done(null, profile);
    });
  }
));

// Use the SpotifyStrategy within Passport.
//   Strategies in Passport require a `verify` function, which accept
//   credentials (in this case, an accessToken, refreshToken, and spotify
//   profile), and invoke a callback with a user object.
passport.use(new SpotifyStrategy({
  clientID : config.spotify.clientId,
  clientSecret : config.spotify.clientSecret,
  callbackURL : config.spotify.redirectUri
  },
  function(accessToken, refreshToken, profile, done) {

      return done(null, profile);

    // To keep the example simple, the user's spotify profile is returned to
    // represent the logged-in user. In a typical application, you would want
    // to associate the spotify account with a user record in your database,
    // and return that user instead.
    // User.findOrCreate({ spotifyId: profile.id }, function (err, user) {
    //   return done(err, user);
    // });
    //console.log(profile);
  }
  ));


mongoose.connect(config.mongoURL);
const db = mongoose.connection;
db.on('error', function(){
	console.log('Error: Could not connect to MongoDb. Did you forget to run `mongod`?');
});

const app = express();

// set the view engine to ejs
app.set('view engine', 'ejs');

//app.use('/public', express.static(path.join(__dirname,'./public')));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use(session({ secret: config.sessionSecret, resave: false, saveUninitialized: false }));

// Initialize Passport!  Also use passport.session() middleware, to support
// persistent login sessions (recommended).
app.use(passport.initialize());
app.use(passport.session());

app.use(function(err, req, res, next) {
 if (err.name === "UnauthorizedError") {
	res.status(401);
	res.json({"message": err.name + ":" + err.message});
 }
});

app.get('/home', ensureAuthenticated, function(req, res) {
	res.render('home',  {
      "user": req.session.user
    });
});


app.get('/events', ensureAuthenticated, function(req, res) {
	Event.find(function (err, events) {
		if (err) {
			res.render('events', {
				"events": [],
				"error": err
			});
		}
		console.log('events', { "events": events});
		res.render('events', { "events": events});
	});
});
app.get('/events/:id', ensureAuthenticated, function(req, res, next) {
	Event.find({_id: req.params.id}, function(err, eve) {
		if (err) {
			res.render('events', {
				"events": [],
				"error": err
			});
		}
		res.render('events', { "events": eve});
	})
});

app.get('/api/github', function(req, res, next){
     github.users.getFollowingForUser({
         username: req.session.user.userName
     }, function(err, response) {
        res.json(response);
     });
});

app.get('/api/events', function(req,res, next) {
	Event.find(function (err, events) {
		if (err) {
			res.json({"status":0, "message": err.name + ":" + err.message, "error": err});
		}
		res.json({
			"status": 1,
			"events": events
		});
	});
});

app.get('/api/events/:id', function(req, res, next) {
	Event.find({_id: req.params.id}, function(err, eve) {
		if (err) {
			res.json({"status":0, "message": err.name + ":" + err.message, "error": err});
		}
		res.json({
			"status": 1,
			"event": eve
		});
	})
});

app.post('/api/events', function(req,res,next) {
	var ev, upObj = {};
	//Event Update
	if (req.body.verb === 'put') {
		if (req.body.name) { upObj.name = req.body.name;}
		if (req.body.description) { upObj.description = req.body.description;}
		if (req.body.url) { upObj.url = req.body.url;}

		Event.findOneAndUpdate({_id: req.body.eventId}, upObj, function(err, eve) {
			if (err) {
				res.json({"status":0, "message": err.name + ":" + err.message, "error": err});
			}
			res.json({
				"status": 1, 
				"message": "Updated event with _id = " + req.body.eventId
			});
		});
	// Event Delete
	} else if (req.body.verb === "delete") {
		Event.remove({ _id: req.body.eventId }, function(err, eve) {
			if (err) {
				res.json({"status":0, "message": err.name + ":" + err.message, "error": err});
			}
			res.json({
				"status": 1, 
				"message": "Deleted event with _id = " + req.body.eventId
			});
		})
	// Event Create
	} else {
		ev = new Event({
			name: req.body.name,
			description: req.body.description,
			url: req.body.url
		});
		ev.save(function(err, eve) {
			if (err) {
				res.json({"status":0, "message": err.name + ":" + err.message, "error": err});
			}
			res.json({
				"status": 1, 
				"message": "Created event = " + eve
			});
		})
	}
});


app.get('/subscriptions', function(req, res) { 
	Subscription.find(function (err, subs) {
		if (err) {
			res.render('subscriptions', {
				"subscriptions": [],
				"error": err
			});
		}
		res.render('subscriptions', {"subscriptions": subs});
	});
});

app.get('/subscriptions/:id', function(req, res) { 
	Subscription.find({_id: req.params.id}, function(err, sub) {
		if (err) {
			res.render('subscriptions', {
				"subscriptions": [],
				"error": err
			});
		}
		res.render('subscriptions', {"subscriptions": sub});
	});
});

app.get('/api/subscriptions', function(req, res) { 
	Subscription.find(function (err, subs) {
		if (err) {
			res.json({"status":0, "message": err.name + ":" + err.message, "error": err});
		}
		res.json({
			"status": 1, 
			"subscriptions": subs
		});
	});
});

app.get('/api/subscriptions/:id', function(req, res) { 
	Subscription.find({_id: req.params.id}, function(err, sub) {
		if (err) {
			res.json({"status":0, "message": err.name + ":" + err.message, "error": err});
		}
		res.json({
			"status": 1, 
			"subscriptions": sub
		});
	});
});

app.post('/api/subscriptions', function(req, res) { 
	var sub, upObj = {};
	// Subscription Update
	if (req.body.verb === 'put') {
		if (req.body.eventId) { upObj.eventId = req.body.eventId;}
		if (req.body.userEmail) { upObj.userEmail = req.body.userEmail;}
		Subscription.findOneAndUpdate({_id: req.body.subscriptionId}, upObj, function(err, sub) {
			if (err) {
				res.json({"status":0, "message": err.name + ":" + err.message, "error": err});
			}
			res.json({
				"status": 1, 
				"message": "Updated subscription with _id = " + req.body.subscriptionId
			});
		});
	// Subscription Delete
	} else if (req.body.verb === "delete") {
		Subscription.remove({ _id: req.body.subscriptionId }, function(err, syb) {
			if (err) {
				res.json({"status":0, "message": err.name + ":" + err.message, "error": err});
			}
			res.json({
				"status": 1, 
				"message": "Deleted subscription with _id = " + req.body.subscriptionId
			});
		})
	// Subscription Create
	} else {
		sub = new Subscription({
			eventId: req.body.eventId,
			userEmail: req.body.userEmail
		});
		sub.save(function(err, su) {
			if (err) {
				res.json({"status":0, "message": err.name + ":" + err.message, "error": err});
			}
			res.json({
				"status": 1, 
				"message": "Created subscription = " + su
			});
		});
	}
});

app.post('/api/signals', function(req, res) {
  console.log('/api/signals'); 
	Subscription.find(function (err, subs) {
		var mailOpts,
			matches,
			opts,
			smtpTransport;

		if (err) {
			res.json({"status":0, "message": err.name + ":" + err.message, "error": err});
		}

		matches = _.filter(subs, function(sub) {
			return sub.eventId === req.body.eventId;
		});

		_.each(matches, function(sub) {
			 opts = {
				from: 'localhost',
				to: sub.userEmail,
				subject: 'A test notification',
				body: "This is a notification"
			}

			smtpTransport = nodemailer.createTransport({
				service: 'Gmail',
				auth: {
					user:  config.emailAddress,
					pass: config.emailPassword
				}
			});

			mailOpts = {
				from: opts.from,
				replyTo: opts.from,
				to: opts.to,
				subject: opts.subject,
				html: opts.body
			};

			smtpTransport.sendMail(mailOpts, function (error, response) {
				if (error) {
					res.json({"status":0, "message": error.name + ":" + error.message, "error": error});
				}else {
					res.json({
						"status": 1, 
						"message": "Message sent"
					});
				}
				smtpTransport.close();
			});
		});
	});
});

app.get('/', function(req, res) {
  res.render('index');
});

// GET /auth/github
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  The first step in GitHub authentication will involve redirecting
//   the user to github.com.  After authorization, GitHub will redirect the user
//   back to this application at /auth/github/callback
app.get('/auth/github',
  passport.authenticate('github', { scope: [ 'user:email' ,'public_repo'] }),
  function(req, res){
    // The request will be redirected to GitHub for authentication, so this
    // function will not be called.
  });

// GET /auth/github/callback
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  If authentication fails, the user will be redirected back to the
//   login page.  Otherwise, the primary route function will be called,
//   which, in this example, will redirect the user to the home page.
app.get('/auth/github/callback', 
  passport.authenticate('github', { failureRedirect: '/' }),
  function(req, res) {
    var userObj, userCheck, userCheck2;

     // req.user._json.email set only if publically viewable
     // we could call https://api.github.com/user/emails to get the private but that may mean different scope
    userObj = {
        "displayName": req.user.displayName,
        "userName": req.user.username,
        "email": req.user._json.email,
        "accountType": accountType.user
      };

    // Is user a Creator?
    //try email
    userCheck = _.filter(config.user.creator, function(user) {
      return user === userObj.email;
    });
    //try username
     if (userCheck.length === 0) {
      userCheck = _.filter(config.user.creator, function(user) {
        return user === userObj.userName;
      });
    }
    // set creator
    if (userCheck.length !== 0) {
      userObj.accountType = accountType.creator;
    }

    // Is user an admin?
    //try email
    userCheck = _.filter(config.user.admin, function(user) {
      return user === userObj.email;
    });
    //try username
     if (userCheck.length === 0) {
      userCheck = _.filter(config.user.admin, function(user) {
        return user === userObj.userName;
      });
    }
    // set admin
    if (userCheck.length !== 0) {
      userObj.accountType = accountType.admin;
    }

    req.session.user = userObj;
    //console.log('req.session.user', req.session.user);
    res.redirect('/home');
  });

app.get('/logout', function(req, res){
  req.logout();
  res.redirect('/');
});


// GET /auth/spotify
//   Use passport.authenticate() as route middleware to authenticate the
//   request. The first step in spotify authentication will involve redirecting
//   the user to spotify.com. After authorization, spotify will redirect the user
//   back to this application at /auth/spotify/callback
app.get('/auth/spotify',
  passport.authenticate('spotify', {scope: ['user-read-email', 'user-read-private'], showDialog: true}),
  function(req, res){
// The request will be redirected to spotify for authentication, so this
// function will not be called.
});

// GET /auth/spotify/callback
//   Use passport.authenticate() as route middleware to authenticate the
//   request. If authentication fails, the user will be redirected back to the
//   login page. Otherwise, the primary route function function will be called,
//   which, in this example, will redirect the user to the home page.
app.get('/spotify/playlist/auth-response',
  passport.authenticate('spotify', { failureRedirect: '/login' }),
  function(req, res) {

  //  req.session.userSpotify = userObj;
    console.log('SPOTIFY req.user', req.user);
    res.redirect('/spotify/playlist');

    // UserSpotify.find({id: profile.id}, function(err, userSpotify) {
    //   if (err) {
    //     // res.render('events', {
    //     //   "events": [],
    //     //   "error": err
    //     // });
    // console.log('error: UserSpotify');
    //   }
    //   console.log('Authenticated Spotify');
    //   res.render('spotify', { "userSpotify": userSpotify});
    // })

    // Get Elvis' albums
//   spotifyApi.getArtistAlbums('43ZHCT0cAZBISjO8DG9PnE')
//   .then(function(data) {
//     console.log('Artist albums', data.body);
//   }, function(err) {
//     console.error(err);
//   });

  });

app.get('/spotify/playlist', ensureAuthenticated, function(req, res, next) {
    res.render('spotify', { "req":req});
});

app.listen(port, function(){
	console.log('listening on port ' + port);
});


// Simple route middleware to ensure user is authenticated.
//   Use this route middleware on any resource that needs to be protected.  If
//   the request is authenticated (typically via a persistent login session),
//   the request will proceed.  Otherwise, the user will be redirected to the
//   login page.
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  res.redirect('/');
}