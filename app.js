//jshint esversion:6
require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
/////////require passport////////
const passport = require("passport");
/////////require passport mongoose///////
const passportLocalMongoose = require("passport-local-mongoose");
//////require the googleStrategy///////
const GoogleStrategy = require('passport-google-oauth20').Strategy;
///////require findorcreate package/////////
const findOrCreate= require("mongoose-findorcreate");
const { stringify } = require('querystring');
const { profile } = require('console');
///////require facbook passport strategy////////
const FacebookStrategy = require("passport-facebook").Strategy

const app = express();

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended: true}));
//////set up the session///////
app.use(session({
    secret: "Our little secret.",       
    resave: false,
    saveUninitialized: false
}));
//////////initialize session///////
app.use(passport.initialize());
////////tell the app to use passport to set up our session///////
app.use(passport.session());

mongoose.connect("mongodb://127.0.0.1:27017/userDB");

/////////////create new schema/////////////
///////////// create a new mongoose schema with encrytionusing their method
const userSchema = new mongoose.Schema ({
    email: String,
    password: String,
    googleId: String,
    facebookId: String,
    secret: String
});

//////set up passport-local by adding it the the mongoose schema as a plugin.//////
userSchema.plugin(passportLocalMongoose);
////////add an other plugin to enable findorcreate///////
userSchema.plugin(findOrCreate)


const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());
passport.serializeUser(function(user, done){
    done(null, user.id);
});
passport.deserializeUser(function(id, done) {
    User.findById(id)
      .then(user => {
        done(null, user);
      })
      .catch(err => {
        done(err, null);
      });
  });
//////use of the google oauth and this always goes below the serialize and deserialize///////
passport.use(new GoogleStrategy({
    ///////call the env method to get the details stored////////
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
///////add the callback route from google///////
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    ////////////////use of findorcreate mongoose package////////
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));
////////use of passport-facebook///////////
passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_ID,
    clientSecret: process.env.FACEBOOK_SECRET,
    callbackURL: "http://localhost:3000/auth/facebook/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
    /////////use of findorcreate mongoose package/////////
    User.findOrCreate({ facebookId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));
app.get("/",function(req, res){
    res.render("home");
});
////////make a route for /auth/google//////
app.get("/auth/google", function(req, res){
    passport.authenticate("google", { scope: ["profile"]})(req, res);
});
////////make route for the after auth/google(when google authenticate you)////////
app.get("/auth/google/secrets", 
  passport.authenticate("google", { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect secrets.
    res.redirect("/secrets");
  });
  //////make a route for the auth/facebook////////
  app.get("/auth/facebook",
  passport.authenticate("facebook"));

app.get("/auth/facebook/secrets",
  passport.authenticate('facebook', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect to secrets.
    res.redirect("/secrets");
  });
app.get("/login",function(req, res){
    res.render("login");
});

app.get("/register",function(req, res){
    res.render("register");
});

////////make a route for /secrets//////////
app.get("/secrets", function(req, res){
  ///////look through the secret field and pick up the users where the secret field is not equal to null////////
    User.find({"secret": {$ne: null}})
    .then(foundUsers =>{
if(foundUsers){
  //////render the secret page and pass in a variable///////
  res.render("secrets", {usersWithSecrets: foundUsers})
} 
    })
    .catch(error =>{
      console.log(error);
    })
});
////////route for the secret submission//////
app.get("/submit", function(req, res){
    if(req.isAuthenticated()){
        res.render("submit");                    
         } else {
            res.redirect("/login");
         } 
});
///////route for the post submit///////
app.post("/submit", function (req, res) {
    if (req.isAuthenticated()){
        console.log(req.user.id)
//////create a const to save user post///////
const submittedSecret = req.body.secret;
////link this const to the original user from the dataBase (thanks to passport giving access to user)//////
User.findById(req.user.id)
.then(foundUser =>{
    if (foundUser){
        foundUser.secret = submittedSecret;
    ///////////saving user with the post/////////
        foundUser.save()
        .then( function() {
            res.redirect("/secrets");    
        })}
    })
.catch(err =>{
    console.log(err);
});
}});

app.get("/logout", function(req, res){
    req.logout(function(err){
        if (err) {
            console.log(err);
        }
        res.redirect("/");
    });
    
});

//////create app.post for the register page//////
app.post("/register", function(req, res) {
    User.register({ username: req.body.username }, req.body.password, function(err, user) {
      if (err) {
        console.log(err);
        res.redirect("/register");
      } else {
        passport.authenticate("local")(req, res, function() {
          res.redirect("/secrets");
        });
      }
    });
  });
  
  app.post("/login",function(req, res){
    const user = new User({
        username: req.body.username,
        password: req.body.password
    });
req.login(user, function(err){
    if (err) {
        console.log(err);
        res.redirect("/login")
    } else {
        passport.authenticate("local")(req, res, function(){
            res.redirect("/secrets");
        })
    }
});

  });





app.listen(3000,function(){
    console.log("Server's ON on port 3000");
})