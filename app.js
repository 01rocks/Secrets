//jshint esversion:6
require('dotenv').config()
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const app = express();
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require("mongoose-findOrCreate");
const FacebookStrategy = require("passport-facebook").Strategy;


app.use(express.static("public"));
app.set("view engine","ejs");

app.use(bodyParser.urlencoded({extended:true}));

app.use(session({
  secret:"i am chandan.",
  resave: false,
  saveUninitialized:false
}));
app.use(passport.initialize());
app.use(passport.session());



mongoose.connect("mongodb://localhost:27017/userDB");

const userSchema=new mongoose.Schema({
  email:String,
  password:String,
  googleId:String,
  facebookId:String,
  secret:String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User",userSchema);
passport.use(User.createStrategy());

// used to serialize the user for the session
passport.serializeUser(function(user, done) {
    done(null, user.id);
   // where is this user.id going? Are we supposed to access this anywhere?
});

// used to deserialize the user
passport.deserializeUser(function(id, done) {
    User.findById(id, function(err, user) {
        done(err, user);
    });
});


passport.use(new GoogleStrategy({ // google ka ek tarah ka mera pahchan hai taki google humko pahchan sake and jo data request kiya gya hai usse mujhe bhej de
  clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL:"https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) { //
    console.log(profile);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      console.log(user);
      console.log("e");


      return cb(err, user);
    });
  }
));

passport.use(new FacebookStrategy({
    clientID: process.env.CLIENT_ID_FB,
    clientSecret: process.env.CLIENT_SECRET_FB,
    callbackURL: "http://localhost:3000/auth/facebook/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log("facebook se data aaya");
    User.findOrCreate({ facebookId: profile.id }, function (err, user) {

      console.log(profile);

      return cb(err, user);
    });
  }
));



app.get("/",function(req,res){
  console.log("a");
  res.render("home");

});

app.get("/auth/google",
  passport.authenticate('google',{scope:["profile"]})
);


app.get("/auth/google/secrets",
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {

    console.log("d");

    // Successful authentication, redirect secrets.
    res.redirect("/secrets");
  });


  app.get("/auth/facebook",
  passport.authenticate('facebook'));

app.get("/auth/facebook/secrets",
  passport.authenticate('facebook', { failureRedirect: '/login' }),
  function(req, res) {
    console.log("facebook se call aya");
    // Successful authentication, redirect home.
    res.redirect('/secrets');
  });




app.get("/login",function(req,res){
  res.render("login");
});

app.get("/secrets",function(req,res){

User.find({"secret":{$ne:null}},function(err,foundUser){
  if(err){
    console.log(err);
  }
  else{
    if(foundUser){
    console.log(foundUser.secret);
      res.render("secrets",{userWithSecret:foundUser})
    }
  }

})
});



app.get("/register",function(req,res){
  console.log("b");
  res.render("register");
});

app.post("/register",function(req,res){
  User.register({username:req.body.username},req.body.password,function(err,user){
    if(err){

    console.log(err);
    res.redirect("/register");
    }
    else{
      passport.authenticate("local")(req,res,function(){ //
        res.redirect("/secrets");
      });
    }
  });


});






app.post("/login",function(req,res){

  const user = new User ({   // mongoose ke liye nya database create hai
  username:req.body.username,
  password:req.body.password

});
req.login(user,function(err){ //login ka session create karta hai
  if(err){
    console.log(err);
  }
  else{
    passport.authenticate("local")(req,res,function(){ // to send the cookie and tell the browser to hold the cookie that contains information about user to be login
      res.redirect("/secrets");
    });

  }
})

});
app.get("/logout",function(req,res){
  req.logout(); // deauthenticate karta hai
  res.redirect("/");
});
app.get("/submit",function(req,res){
  if(req.isAuthenticated()){
    res.render("submit");

  }
  else{
    res.render("login");
  }
});
app.post("/submit",function(req,res){
const submittedSecret = req.body.secret;
User.findById(req.user.id,function(err,foundUser){
  if(err){
    console.log(err);

  }
  else{
    if(foundUser){
      foundUser.secret=submittedSecret;
      foundUser.save(function(){
        res.redirect("/secrets");
      })
    }
  }
})



})


app.listen(3000,function(){
  console.log("server has started on port no 3000");
});
