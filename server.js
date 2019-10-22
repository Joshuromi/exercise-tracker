const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const cors = require('cors');
const shortid = require('shortid');
const mongoose = require('mongoose');
var MongoClient = require('mongodb').MongoClient;

var mongourl = "mongodb+srv://joshuromi:myluv4u@cluster0-ghnhc.mongodb.net/admin?retryWrites=true&w=majority";

app.use(cors());
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

app.use(express.static('public'));
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

app.post('/api/exercise/new-user', function(req, res){
  var user = req.body.username;
  if (user.length > 20 || user.length < 4){
    res.send("username must be from 4 to 20 characters");
  }else{
  MongoClient.connect(mongourl,function(err, db){
    if (err) throw err;
    var dbo = db.db("userdata");
    dbo.collection("users").findOne({username: user},function(err, result) {
    if (err) throw err;
    if (result){
      res.send("username already taken");
    }else{
    var random = function(){
      var num = Math.floor(Math.random()*user.length);
      var arr = user.toUpperCase().split('');
      return arr[num];
    };
    var userid = user.toUpperCase().split('').reverse().slice(0,5).join(random());//generates unique user_id
    dbo.collection("users").insertOne({"_id": userid,"username": user}, function(err, result){
      if (err) throw err;
      res.json({"username": user, "_id": userid}); 
      db.close();
      });
      }
    });
  });
  }
});

app.post('/api/exercise/add', function(req, res){
  if (req.body.date == '') req.body.date = new Date().toDateString();
  var userid = req.body.userId; 
  MongoClient.connect(mongourl,function(err, db){
    if (err) throw err;
    var dbo = db.db("userdata");
   
    var data = {
      "_id": req.body.userId,
      "excercises":[{
      "description": req.body.description,
      "duration": req.body.duration,
      "date": req.body.date
      }]
    };
    dbo.collection("users").findOne({"_id": userid}, function(err, result){
      if (err) throw err;
      if (!result) res.send("user Id does not exist");
    });
    dbo.collection("exercises").findOne({"_id": userid},function(err, result){
      if (err) throw err;
      if (!result){
        dbo.collection("exercises").insertOne(data, function(err){
          if(err) throw err;
          console.log("document inserted");
        });
      }else{
      dbo.collection("exercises").updateOne({"_id": userid}, {$push:{"excercises":{
      "description": req.body.description,
      "duration": req.body.duration,
      "date": req.body.date}}}, function(err){
          if(err) throw err;
        console.log("doument updated");
        });
      }
    });
    dbo.collection("users").findOne({"_id": userid}, function(err, result){
      if (err) throw err;
      res.json({
      "_id": userid,
      "username": result.username,
      "description": req.body.description,
      "duration": req.body.duration + " min.",
      "date": req.body.date
      });
      db.close();
    })
  });
});

app.get('/api/exercise/users', function(req, res){
  MongoClient.connect(mongourl,function(err, db){
    if (err) throw err;
    var dbo = db.db("userdata");
    dbo.collection("users").find().toArray(function(err, result){
      if (err) throw err;
      res.send(result);
      db.close();
    })
  });
});

app.get('/api/exercise/log/:userid', function(req, res){
  var userid = req.params.userid;
  console.log(userid);
  MongoClient.connect(mongourl,function(err, db){
    if (err) throw err;
    var dbo = db.db("userdata");
    dbo.collection("exercises").findOne({"_id": userid}, function(err,result){
      if (err) throw err;
      if (!result){
        res.send("invalid user Id or no excercise log found");
      }else{
          res.send(result);
        db.close();
      }
    });
  });
});

// Not found middleware
app.use((req, res, next) => {
  return next({status: 404, message: 'not found'})
});

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage;

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors);
    // report the first validation error
    errMessage = err.errors[keys[0]].message;
  } else {
    // generic or custom error
    errCode = err.status || 500;
    errMessage = err.message || 'Internal Server Error';
  }
  res.status(errCode).type('txt')
    .send(errMessage);
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
