var express = require('express');
var app = express();
var fs = require('fs');
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var port = process.env.PORT || 2000;
var loopLimit = 0;

server.listen(port, function () {
  console.log('Server running on:', port);
});

app.use(express.static(__dirname + '/client'));

app.get('/client/splash.html', function(req, res) {
  res.send('About this wiki');
});


var gameCollection =  new function() {
  this.totalGameCount = 0,
  this.gameList = []
};

function buildGame(socket) {

     var gameObject = {};
     gameObject.id = (Math.random()+1).toString(36).slice(2, 18);
     gameObject.playerOne = socket.username;
     gameObject.playerTwo = null;
     gameCollection.totalGameCount ++;
     gameCollection.gameList.push({gameObject});

     console.log("Game Created by "+ socket.username + " with id: " + gameObject.id);
    io.emit('gameCreated', {
      username: socket.username,
      gameId: gameObject.id
    });
}

function gameSeeker (socket) {
    ++loopLimit;
    if (( gameCollection.totalGameCount == 0) || (loopLimit >= 20)) {

    buildGame(socket);
    loopLimit = 0;

    } else {
    var rndPick = Math.floor(Math.random() * gameCollection.totalGameCount);
    if (gameCollection.gameList[rndPick]['gameObject']['playerTwo'] == null)
    {
      gameCollection.gameList[rndPick]['gameObject']['playerTwo'] = socket.username;
      socket.emit('joinSuccess', {
        gameId: gameCollection.gameList[rndPick]['gameObject']['id'] });

      console.log( socket.username + " has been added to: " + gameCollection.gameList[rndPick]['gameObject']['id']);

    } else {

      gameSeeker(socket);
    }
  }
}

// Chatroom

var numUsers = 0;

io.on('connection', function (socket) {
  var addedUser = false;

  // when the client emits 'new message', this listens and executes
  socket.on('new message', function (data) {
    // we tell the client to execute 'new message'
    socket.broadcast.emit('new message', {
      username: socket.username,
      message: data
    });
  });

  // when the client emits 'add user', this listens and executes
  socket.on('add user', function (username) {
    if (addedUser) return;

    // we store the username in the socket session for this client
    socket.username = username;
    ++numUsers;
    addedUser = true;
    socket.emit('login', {
      numUsers: numUsers
    });
    // echo globally (all clients) that a person has connected
    socket.broadcast.emit('user joined', {
      username: socket.username,
      numUsers: numUsers
    });
  });

  // when the client emits 'typing', we broadcast it to others
  socket.on('typing', function () {
    socket.broadcast.emit('typing', {
      username: socket.username
    });
  });

  // when the client emits 'stop typing', we broadcast it to others
  socket.on('stop typing', function () {
    socket.broadcast.emit('stop typing', {
      username: socket.username
    });
  });

  socket.on('disconnect', function () {
    if (addedUser) {
      --numUsers;

      // echo globally that this client has left
      socket.broadcast.emit('user left', {
        username: socket.username,
        numUsers: numUsers
      });
    }
  });

  socket.on('lockedup', function () {
     var locked = (Math.random()+1).toString(36).slice(2, 18);
     console.log("Player Locked In: "+ socket.username);
     gameCollection.gameList.playerOne = socket.username;
    io.emit('lockedin', {
      username: socket.username,
    });
  });

  socket.on('joinGame', function (){
    console.log(socket.username + " wants to join a game");

    var alreadyInGame = false;

    for(var i = 0; i < gameCollection.totalGameCount; i++){
    var plyr1Tmp = gameCollection.gameList[i]['gameObject']['playerOne'];
    var plyr2Tmp = gameCollection.gameList[i]['gameObject']['playerTwo'];
    if (plyr1Tmp == socket.username || plyr2Tmp == socket.username){
    alreadyInGame = true;
    console.log(socket.username + " already has a Game!");

    socket.emit('alreadyJoined', {
    gameId: gameCollection.gameList[i]['gameObject']['id']
    });
     }
    }
    if (alreadyInGame == false){
    gameSeeker(socket);
    }
    });
});
