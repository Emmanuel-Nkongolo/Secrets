//jshint esversion:6
require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const encrypt = require("mongoose-encryption")


const app = express();


app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended: true}));

mongoose.connect("mongodb://127.0.0.1:27017/userDB");

/////////////create new schema/////////////
///////////// create a new mongoose schema with encrytionusing their method
const userSchema = new mongoose.Schema ({
    email: String,
    password: String
});
/////////////create a secret for encryption method/////////////

userSchema.plugin(encrypt, {secret: process.env.SECRET , encryptedFields: ["password"]}); 

/////////////create mongoose model/////////////
const User = new mongoose.model("User", userSchema);





app.get("/",function(req, res){
    res.render("home");
});

app.get("/login",function(req, res){
    res.render("login");
});

app.get("/register",function(req, res){
    res.render("register");
});

/////////////create post route for the register/////////////
app.post("/register", function(req, res){
    const newUser = new User({
        email: req.body.username,
        password: req.body.password
});
newUser.save()
.then(userInfo =>{
res.render("secrets")
})
.catch(err=>{
console.log(err);
});
});

/////////////create post route for the login/////////////
app.post("/login", function(req, res){
    const username = req.body.username;
    const password = req.body.password;
User.findOne({email: username})
.then(foundUser =>{
    if(foundUser){
        if(foundUser.password === password){
            res.render("secrets");
        } else {
            res.send('<h1 style="font-size: 160px; text-transform: uppercase; text-align: center;">OZA MOHIBI</h1>');


        }
    }
})

});

app.listen(3000,function(){
    console.log("Server's ON on port 3000");
})