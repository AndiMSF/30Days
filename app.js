

const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const _ = require("lodash");
const mongoose = require('mongoose')
const dotenv = require('dotenv')
// Auth
const session = require('express-session')
const passport = require('passport')
const passportLocalMongoose = require('passport-local-mongoose')
var GoogleStrategy = require('passport-google-oauth20').Strategy;

const app = express();
app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static(__dirname+ "/public"));
dotenv.config()

// Session 1
app.use(session({
  secret: "Our little secret.",
  resave: false,
  saveUninitialized: false
}))

// Passort 2
app.use(passport.initialize())
app.use(passport.session())

// Database
mongoose.set('strictQuery',false)
mongoose.connect('mongodb+srv://'+process.env.DB_USERNAME+':'+process.env.DB_PASSWORD+'@cluster0.vqcsdra.mongodb.net/30Days',{useNewUrlParser:true,useUnifiedTopology:true}, function(err){
  if(err){
    console.log(err);
  } else {
    console.log("Database terhubung");
  }
})

// Buat schema dan collectionnya
const postSchema = new mongoose.Schema({
  title: String,
  content: String
})

const userSchema = new mongoose.Schema({
  username: String,
  password: String
})

//  Passport Local Mongoose
userSchema.plugin(passportLocalMongoose)

const Post = mongoose.model("Post",postSchema)
const User = mongoose.model("User",userSchema)

//  Passport Local Mongoose
passport.use(User.createStrategy())

passport.serializeUser(function(user, cb) {
    process.nextTick(function() {
      cb(null, { id: user.id, username: user.username, name: user.name });
    });
  });
  
  passport.deserializeUser(function(user, cb) {
    process.nextTick(function() {
      return cb(null, user);
    });
  });

// Login Route
app.get('/login',function(req,res){
  res.render('login')
})

app.post('/login', function(req,res){
  const user = new User({
    username : req.body.username,
    password: req.body.password

  })

  req.login(user,function(err){
    if(err){
      console.log(err)
    } else {
      passport.authenticate('local')(req,res,function(){
        res.redirect('/home')
      })
    }
  })
})



// Logout
app.get('/logout',function(req,res){
  req.logout(function(err){
    if(err)
    {
      return next(err)
    }
  })
  res.redirect('/')
})

// Register Route 

app.get('/register',function(req,res){
  res.render('register')
})

app.post('/register',function(req,res){
  User.register({username: req.body.username}, req.body.password, function(err,user){
    if (err) {
      console.log(err);
      res.redirect('/register')
    } else {
      passport.authenticate('local')(req,res,function(){
        res.redirect('/login')
      })
    }
  })
})

// Journal Route
app.get('/journal',function(req,res){

  if(req.isAuthenticated()){
    Post.find({}, function(err, posts){
      res.render("journal", {
       
        posts: posts
        });
    });
  } else {
    res.redirect('/login')
  }
})

// userhome route
app.get('/home',function(req,res){
  res.render('userhome')
})

// home route
app.get("/", function(req, res){

  Post.find({}, function(err, posts){
    res.render("home", {});
  });
});

app.get("/compose", function(req, res){
  res.render("compose");
});

app.post("/compose", function(req, res){
  const post = new Post({
    title: req.body.postTitle,
    content: req.body.postBody
  });


  post.save(function(err){
    if (!err){
        res.redirect("/journal");
    }
  });
});

app.get("/posts/:postId", function(req, res){

const requestedPostId = req.params.postId;

  Post.findOne({_id: requestedPostId}, function(err, post){
    res.render("post", {
      title: post.title,
      content: post.content
    });
  });

});

app.get("/about", function(req, res){
  res.render("about", {about: aboutContent});
});

app.get("/contact", function(req, res){
  res.render("contact", {contact: contactContent});
});

app.post('/delete',function(req,res){
  const checkedItemById = req.body.checkbox 
  
  Post.findByIdAndRemove(checkedItemById,function(err){
    if(!err){
      console.log("Success Deleted Item");
      res.redirect('/journal')
    }
  })
})






app.listen(3000, function() {
  console.log("Server started on port 3000");
});
