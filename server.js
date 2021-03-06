var express = require('express')
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var port = process.env.PORT || 8080;


// Make a ChatStore instance to handle all user pairing and
// chat configuration.
var ChatStore = require("./chatStore.js");
var chatStore = new ChatStore();


app.use(express.static('public'));


// Handlers for Socket.io events
io.on('connection', function(socket) {

	// Triggered when a new user joins.  Attempt
	// to pair them with another chat buddy.
	socket.on('init', function(name, buddyCallback) {
		chatStore.registerUser(name, buddyCallback, socket);
	});

	// Triggered when an in-chat user types something
	// new - send this new text to their chat buddy.
	socket.on('chat add', function(msg) {
		chatStore.handleChatAdd(socket, msg);
	});

	// Triggered when an in-chat user deletes already-typed
	// text.  Send along the number of characters deleted
	// to their buddy.
	socket.on('chat delete', function() {
		chatStore.handleChatDelete(socket);
	});

	// Triggered when a user closes the chat page.  Clean
	// up all info about this user/their chat, and attempt
	// to repair their chat buddy (if any) with another idle user.
	socket.on('disconnect', function() {
		chatStore.handleDisconnect(socket);
	});

});


// Start our server
http.listen(port, function() {
	console.log('listening on *:' + port);
});