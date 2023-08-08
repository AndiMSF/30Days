
const { ObjectId } = require('mongoose').Types;

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
const connectDB = async () => {
  try {
    const conn = await mongoose.connect('mongodb+srv://'+process.env.DB_USERNAME+':'+process.env.DB_PASSWORD+'@cluster0.vqcsdra.mongodb.net/30Days',{useNewUrlParser:true,useUnifiedTopology:true})
      console.log("MongoDB Connected: "+conn.connection.host)
  }catch (error){
    console.log(error);
  }
}


// Buat schema dan collectionnya
// const postSchema = new mongoose.Schema({
//   title: String,
//   content: String
// })

const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  posts: [{ title: String, content: String }]
});

//  Passport Local Mongoose
userSchema.plugin(passportLocalMongoose)

// const Post = mongoose.model("Post",postSchema)
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
app.get('/journal',async function(req,res){

  try {
    if(req.isAuthenticated()) {
      const userId = req.user.id; // Assuming the authenticated user ID is available in req.user._id
      await User.findById(userId, (err,user) => {
        console.log("User = "+user);
        if(err)
        {
          console.log(err);
        }
        const userPosts = user.posts;
        console.log(userPosts);
        res.render("journal", {
          posts: userPosts
        })
      })
    }  else {
      res.redirect('/login')
    }
  } catch (err){
  console.log(err);
  }
  
 
})

// userhome route
app.get('/home',function(req,res){
  User.find({}, function(err, posts){
    res.render("userHome", {});
  });
})

// home route
app.get("/", function(req, res){

  User.find({}, function(err, posts){
    res.render("home", {});
  });
});

app.get("/compose", function(req, res){
  res.render("compose");
});


app.post("/compose", function(req, res) {
  // Assuming the user is already authenticated using Passport.js and Express Session
  if (req.isAuthenticated()) {
    // Assuming the user is already authenticated, you can access the user ID from the session or request.
    const userId = req.user.id; // Assuming the authenticated user ID is available in req.user._id
    const postData = {
      title: req.body.postTitle,
      content: req.body.postBody
    };

    User.findById(userId, (err, user) => {
      if (err) {
        console.log("Error finding user! " + err);
      }

      if (!user) {
        console.log("No User!");
      }
      console.log("Ini data User : "+user);
      user.posts.push(postData); // Assuming there is a "posts" array field in the User schema
      user.save((err) => {
        if (err) {
          console.log("Error saving post! " + err);
        } else {
          res.redirect('/journal')
          console.log("Post saved successfully!");
        }
      });
    });
  } else {
    // Handle the case when the user is not authenticated
    res.redirect("/login"); // Redirect the user to the login page or show an error message
  }
});


  app.get("/posts/:postId", function (req, res) {
    User.find(
      { "_id": ObjectId(req.user.id) },
      { posts: { $elemMatch: { _id: ObjectId(req.params.postId) } } },
      function (err, user) {
        if (err) {
          // Handle the error here, if necessary
          console.error(err);
          return res.status(500).json({ error: "Something went wrong" });
        }
  
        // Check if the user and the posts array exist
        if (!user || !user[0].posts || user[0].posts.length === 0) {
          return res.status(404).json({ error: "Post not found" });
        }
  
        // Get the first element of the "posts" array (assuming there's only one post with the given ID)
        const post = user[0].posts[0];
        const { title, content } = post;

        res.render("post", {
          title: title,
          content: content
        })
      }
    );
  });

app.get("/about", function(req, res){
  res.render("about", {about: aboutContent});
});

app.get("/contact", function(req, res){
  res.render("contact", {contact: contactContent});
});

app.post('/delete',  function(req,res){
  const checkedItemById = req.body.checkbox
  const userId = req.user.id
 
   User.updateOne(
  { "_id": userId }, // The main document's filter
  { $pull: { "posts": { "_id": checkedItemById } } }
).then(() => {
  res.redirect('/journal')
})

})

// app.post('/update/:postId',function(req,res){
//   User.find({"_id":req.user.id},{$set:{"posts.title" : req.body.}})
// })

connectDB().then(() => {
  app.listen(3000, function() {
    console.log("Server started on port 3000");
  });
})
