var currentUser = null;
var buddyUser = null;

var socket = null; // This client's current socket


// Runs on document load - show the modal name popup
$(function() {
    var currentUserName = "";
    do {
        currentUserName = prompt("Hello!  What's your name?");
    } while (currentUserName == null || currentUserName == "");

    configureChatWithUserName(currentUserName);
});


/* FUNCTION: configureChatWithUserName
-------------------------------
Parameters:
    currentUserName - the name of the user to set up to chat

Returns: NA

Sets up a chat session for the current user, with currentUserName.
Registers this user with the chat server, and awaits a buddy pairing
to begin chatting.  Also adds our keyUp event handler to start forwarding
messages.
-------------------------------
*/

function configureChatWithUserName(currentUserName) {

    if (!currentUserName) {
        console.log("ERROR: No user name");
        return;
    }

    // Make a new user object for this user, specifying that they have
    // precedence (meaning their bubble should always be the lowest when
    // they're typing).
    currentUser = new ChatUser(currentUserName, "bubble bubble--alt", true);

    socket = io();

    // Clears old bubbles, creates new ChatUser when we get a new buddy
    function showBuddyName(name) {
        $(".bubble").fadeOut("fast", function() {
            $(this).remove();
        });
        buddyUser = new ChatUser(name, "bubble buddy", false);
        $('#buddyName').html("Chatting with " + buddyUser.userName);
    }

    // Buddy change handlers
    socket.on('buddy-assigned', showBuddyName);
    socket.on('buddy-left', function() {
        buddyUser = null;
        $('#buddyName').html("Looking for chat buddy...");
    });

    // Handlers for when our buddy types or deletes
    socket.on('chat add', function(character) {
        messageAdd(character, buddyUser, currentUser);
    });
    socket.on('chat delete', function() {
        messageDelete(buddyUser);
    });

    // Add key handler and click handler to always focus on the text field.
    // We listen for keypress events for typed letters, and keyup only for
    // delete.
    $("#invisibleTextField").focus().keypress(handleKeyPress);
    $("#invisibleTextField").keyup(function(e) {
        if (e.which == 8) handleKeyPress(e);
    });
    $(window).click(function() {
        $("#invisibleTextField").focus();
    });

    // Initialize the chat - the callback is called if we paired successfully
    // with another chat buddy
    socket.emit('init', currentUser.userName, showBuddyName);
}


/* FUNCTION: handleKeyPress
------------------------------
Parameters:
    e - the key press event object

Returns: NA

Handles the key press event for this user.  Does nothing if we're not chatting
with anyone.  If the user pressed delete, sends a delete event to the server.
Otherwise, forwards along the letter pressed to the server.  Additionally,
updates the current user to reflect that they are still typing.
-------------------------------
*/
function handleKeyPress(e) {
    $("#invisibleTextField").val("");
    if (!buddyUser) return;
    
    // Handle the key press
    if (e.which == 8) {
        messageDelete(currentUser);
        socket.emit('chat delete');
    } else {
        var charToAdd = String.fromCharCode(e.which);
        messageAdd(charToAdd, currentUser, buddyUser); 
        socket.emit('chat add', charToAdd);
    }
}


/* FUNCTION: messageAdd
-----------------------------
Parameters:
    character - the character the user typed
    user - the user that typed the character we're adding
    secondaryUser - the other user that didn't type

Returns: NA

Adds character to one of the existing bubble conversations, either the user's
or the buddy's, depending on the given user (either currentUser or
buddyUser).  The logic flow is as follows:

if we were the last to type:
    add to the last bubble

else if the other user is not typing:
    add a new bubble

else if we have precedence:
    add a new bubble

else:
    add to the last bubble
-----------------------------
*/
function messageAdd(character, user, secondaryUser) {
    var userTypedLast = $(user.jQueryClassName).last().is(":last-child");
    
    // If this user was the last one to type, just add this character to their
    // last message
    if (userTypedLast && user.isTyping) {
        var bubbleSpan = $(user.jQueryClassName).last().find("span");
        bubbleSpan.text(bubbleSpan.text() + character);
    } else if (userTypedLast || !secondaryUser.isTyping || user.hasPrecedence) {
        var newElem = "<div class=\"" + user.bubbleClassName + "\">" + 
            "<b>" + user.userName + ": </b> <span>" + character + "</span></div>";
        $(newElem).hide().appendTo($(".container")).fadeIn("fast");
        $(".container").children().last()[0].scrollIntoView();
    } else {
        var bubbleSpan = $(user.jQueryClassName).last().find("span");
        bubbleSpan.text(bubbleSpan.text() + character);
    }

    user.userDidType();
}


/* FUNCTION: messageDelete
----------------------------
Parameters:
    user - the user to delete a character from the bubbles of

Returns: NA

Removes a character from the most recent bubble of the given user.  If
that bubble is now empty, fades out the whole bubble.
-----------------------------
*/
function messageDelete(user) {
    var lastUserBubble = $(user.jQueryClassName).last();
    if (lastUserBubble.length == 0) return;

    var bubbleSpan = lastUserBubble.find("span");
    var bubbleText = bubbleSpan.text();
    
    // Delete a character from this bubble.  If this makes the bubble empty,
    // remove it (fade out)
    var newBubbleText = bubbleText.substring(0, bubbleText.length - 1);
    if (newBubbleText.length == 0) {
        lastUserBubble.fadeOut("fast", function() {
            $(this).remove();
        });
    } else {
        bubbleSpan.text(newBubbleText);
    }
    
    user.userDidType();
}






