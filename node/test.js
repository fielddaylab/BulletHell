
var express = require('express');
var app = express()
  , http = require('http')
  , server = http.createServer(app)
  , io = require('socket.io').listen(server);

server.listen(3000);

// routing
app.get('/', function (req, res) {
  res.sendfile(__dirname + '/index.html');
});

// usernames which are currently connected to the chat
var pos = {};

io.sockets.on('connection', function (socket) {

  socket.on('mousepos', function(mouse_coords){
    pos = mouse_coords;
    console.log(mouse_coords.x, mouse_coords.y);
  });

  // when the user disconnects.. perform this
  socket.on('disconnect', function(){
   pos = {x: 0, y: 0};
  });
});