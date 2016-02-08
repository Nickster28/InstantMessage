/* CLASS: ChatUser
----------------------
Class to model one user in a chat session.  A ChatUser has the following
properties:

	userName 			- the name of the user

	bubbleClassName 	- the string that appears in the "class" field of every
						bubble <div> for this user

	jQueryClassName 	- the modified string to use when querying for bubbles for
						this user (identical to bubbleClassName except all
						class names are prefixed with a "." and concatenated
						without spaces.  So "class1 class2 class3" would
						become ".class1.class2.class3").

	isTyping 			- tracks whether this user is currently typing.  Call 
						userDidType() when this user types to update the
						state.  If the user has not typed in 1 second, isTyping is set
						to false.

	typingTimeoutFuncID - the stored return value from setTimeout, used to keep
						track of the timeout functions for setting
						isTyping.  Whenever the user types, we clear the
						previous timeout function and set a new timeout
						function for 1 sec. in the future to set isTyping
						to false.

	hasPrecedence 		- boolean indicating whether this user's bubbles should be
						lower than the bubbles of other users when talking
						simultaneously.
*/
function ChatUser(name, bubbleClassName, hasPrecedence) {
	this.userName = name;
	this.bubbleClassName = bubbleClassName;
	this.jQueryClassName = "." + bubbleClassName.replace(/\s/g, ".");
	this.isTyping = false;
	this.typingTimeoutFuncID = null;
	this.hasPrecedence = hasPrecedence;
}
ChatUser.typingTimeout = 1500;


/* METHOD: userDidType
-------------------------
Parameters: NA
Returns: NA

Sets this user's state as typing, clears past timeout functions, and
sets a new timout function for 1 second in the future to set isTyping to false.
In other words, unless userDidType is called again within 1 second, this user's
isTyping variable will be set to false.
-------------------------
*/
ChatUser.prototype.userDidType = function() {

	console.log(this.userName + " typed.");

	// Clear a previous timer function (if any)
	if (this.typingTimeoutFuncID) {
		clearTimeout(this.typingTimeoutFuncID);
		this.typingTimeoutFuncID = null;
	}

	this.isTyping = true;

	// Set a new timer function to set typing back to false
	var user = this;
	this.typingTimeoutFuncID = setTimeout(function() {
		console.log(user.userName + " stopped typing.");
		user.isTyping = false;
	}, ChatUser.typingTimeout);
}
