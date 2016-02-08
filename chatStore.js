/* CLASS: ChatStore
-------------------------
A ChatStore is an object that keeps track of all currently-active
users and all currently-active chat sessions.  It does this using 3
data structures:

socketIDNameMap - a map of socketIDs to user names
socketIDChatMap - a map of socketIDs to socketIDs.  The value is the other
					socketID that user is currently chatting with.  Chats are
					stored in both directions; in other words, if user 1 is
					chatting with user 2, then this map will contain entries
					mapping 1->2 and 2->1.
idleSocketID - keeps track of any user currently waiting for another chat buddy.
				There can only ever be one idle socketID at a time, since if there
				are 2 idle socketIDs those IDs are paired together in a chat and are
				no longer idle.

The methods on ChatStore allow for registering and unregistering 
users given their sockets, and for forwarding along add and delete messages
from one user to the other user in the chat.  It also supports repairing a
user with another idle user if their chat buddy disconnects.
-------------------------
*/


function SocketStore() {
	this.socketIDNameMap = {};
	this.socketIDChatMap = {};
	this.idleSocketID = null;
}


/* METHOD: printState
-----------------------
Parameters: NA
Returns: NA

Prints out the current socket-name maps, ongoing chats, and idle user (if any).
-----------------------
*/
SocketStore.prototype.printState = function() {
	console.log("------------- STATE --------------");

	console.log("Names: " + JSON.stringify(this.socketIDNameMap));

	// Create a list of all chats, where a chat is a length-2 array containing
	// the names of the chat participants.  Iterates through all chat key-value
	// pairs and converts the pair to usernames.  Then, since our ID map contains
	// both "directions" (aka user1->user2 and user2->user1) we must dedup socketIDs
	// by keeping a running set of all socketIDs we've seen so far.
	var chats = [];
	var seenIDs = new Set();
	for(var key in this.socketIDChatMap) {
		if(this.socketIDChatMap.hasOwnProperty(key)) {
			var value = this.socketIDChatMap[key];

			// Only add this chat if it's a new user pair we haven't seen yet
			if(!seenIDs.has(key) && !seenIDs.has(value)) {
				chats.push([this.socketIDNameMap[key], this.socketIDNameMap[value]]);
				seenIDs.add(key);
				seenIDs.add(value);
			}
		}
	}
	console.log("Chats: " + JSON.stringify(chats));
	
	// Print out the currently-waiting user (if any)
	if(this.idleSocketID) {
		console.log("Idle: " + this.socketIDNameMap[this.idleSocketID]);
	} else {
		console.log("Idle: none!");
	}

	console.log("------------- STATE --------------");
}


/* METHOD: registerUser
---------------------------
Parameters:
	name - the name of the user to register.  Must be non-null, non-empty
	buddyCallback - the callback to be executed if a chat buddy is found
					for this user.  If called, it's passed the name of the
					new chat buddy.
	socket - the socket the user is communicating over.  We store a mapping
			from this socket's ID to the user's name for future socket
			communication and communicate back when a buddy has been found.

Returns: NA

Registers the given user name in the Socket Store and attempts
to pair them with another user to chat.
---------------------------
*/
SocketStore.prototype.registerUser = function(name, buddyCallback, socket) {
	this.socketIDNameMap[socket.id] = name;

	var buddySocketID = this.findBuddyForSocketID(socket.id, socket);
	if(buddySocketID) {
		buddyCallback(this.socketIDNameMap[buddySocketID]);
	}

	this.printState();
}


/* METHOD: findBuddyForSocketID
------------------------------------------
Parameters:
	socketID - the socketID of the user we need to find a buddy for.
	socket - a socket object to use to communicate back with users.

Returns: NA

Attempts to pair the given socket ID with another idle
user.  If it pairs successfully, it returns the socket ID of the new buddy.
Otherwise, returns null.  Also notifies the OTHER user (not the one passed in)
that they have a new buddy.
------------------------------------------
*/
SocketStore.prototype.findBuddyForSocketID = function(socketID, socket) {
	var name = this.socketIDNameMap[socketID];

	// If there's noone available to chat, make this person the new idle user
	// and wait.  Otherwise, pair this user with the currently idle user.
	if(!this.idleSocketID) {
		this.idleSocketID = socketID;
		console.log("No other users for " + name + " to chat with yet.");
		return null;
	} else {
		var newBuddyID = this.idleSocketID;
		var newBuddyName = this.socketIDNameMap[newBuddyID];

		// Pair the idle and given user in a chat
		this.idleSocketID = null;
		this.socketIDChatMap[socketID] = newBuddyID;
		this.socketIDChatMap[newBuddyID] = socketID;

		console.log(name + " can chat with " + newBuddyName + "!");

		// Send a message to the idle user telling them they have a buddy
		socket.broadcast.to(newBuddyID).emit('buddy-assigned', name);

		return newBuddyID;
	}
}


/* METHOD: handleChatAdd
----------------------------
Parameters:
	socket - the socket sending the chat message
	msg - the message being sent.

Returns: NA

Given a socket and a message from that socket, forwards along the
message to whomever that socket's user is currently chatting with.
If this socket is not currently chatting with any user, does nothing.
----------------------------
*/
SocketStore.prototype.handleChatAdd = function(socket, msg) {
	var chatBuddySocketID = this.socketIDChatMap[socket.id];
	if(!chatBuddySocketID) {
		console.log("Error: got message from non-registered user.");
	} else {
		socket.broadcast.to(chatBuddySocketID).emit('chat add', msg);
	}
}


/* METHOD: handleChatDelete
------------------------------
Parameters:
	socket - the socket sending the delete message

Returns: NA

Given a socket and a delete message from that socket (meaning
that user has deleted one character from their message), forwards along
the data to whomever that socket's user is currently chatting with.
If this socket is not currently chatting with any user, does nothing.
------------------------------
*/
SocketStore.prototype.handleChatDelete = function(socket) {
	var chatBuddySocketID = this.socketIDChatMap[socket.id];
	if(!chatBuddySocketID) {
		console.log("Error: got message from non-registered user.");
	} else {
		socket.broadcast.to(chatBuddySocketID).emit('chat delete');
	}
}


/* METHOD: handleDisconnect
------------------------------
Parameters:
	socket - the socket that was disconnected

Returns: NA

Unregisters the user associated with the given socket.  If the
user was idle, then just sets the idle user to null.  Otherwise,
it stops and removes the chat this user is currently in, and removes
all associated data from socketIDNameMap and socketIDChatMap.  If possible,
it also tries to re-pair the buddy of this now-disconnected user with
someone else, if another idle user is available.  Otherwise, sets their buddy
as the idle user.
------------------------------
*/
SocketStore.prototype.handleDisconnect = function(socket) {
	if(!this.socketIDNameMap[socket.id]) {
		return;
	}

	/* If this person is idle, just remove them from the idle list.
	 * Otherwise, we need to remove them from our chat list,
	 * and remove their buddy from the chat list, and try
     * to re-pair the buddy with someone else.
     */
	if(socket.id == this.idleSocketID) {
		console.log(this.socketIDNameMap[socket.id] + "(idle) disconnected");
		this.idleSocketID = null;
	} else {
		console.log(this.socketIDNameMap[socket.id] + "(chatting) disconnected");

		var chatBuddySocketID = this.socketIDChatMap[socket.id];
		delete this.socketIDChatMap[socket.id];
		delete this.socketIDChatMap[chatBuddySocketID];

		socket.broadcast.to(chatBuddySocketID).emit('buddy-left');
		
		// Try to repair this user's chat buddy with someone else
		var newBuddyID = this.findBuddyForSocketID(chatBuddySocketID, socket);
		if(newBuddyID) {
			socket.broadcast.to(chatBuddySocketID).emit('buddy-assigned', 
				this.socketIDNameMap[newBuddyID]);
		}
	}

	delete this.socketIDNameMap[socket.id];

	this.printState();
}

module.exports = SocketStore;