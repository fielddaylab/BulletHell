
var express = require('express');
var app = express()
  , http = require('http')
  , server = http.createServer(app)
  , io = require('socket.io').listen(server, { log: true });

server.listen(3000);

app.use("/static", express.static(__dirname + '/static'));

// routing
app.get('/', function (req, res) {
  res.sendfile(__dirname + '/index.html');
});

app.get('/phone.html', function (req, res) {
  res.sendfile(__dirname + '/phone.html');
});

// usernames which are currently connected to the chat
var pos = {};

io.sockets.on('connection', function (socket) {

  socket.on('mousepos', function(mouse_coords){
    pos = mouse_coords;
   socket.broadcast.emit('mouse_broadcast', pos);
  });

  // when the user disconnects.. perform this
  socket.on('disconnect', function(){
   pos = {x: 0, y: 0};
  });
});