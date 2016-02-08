// Constants specifying the two chat members.  Used as class names
// for their respective chat bubbles.
var BUDDY_USER = ".bubble.buddy";
var CURRENT_USER = ".bubble.bubble--alt";
var currentUserName = null;
var buddyUserName = null;

var socket = null; // This client's current socket


// Runs on document load - show the modal name popup
$(function() {
    do {
        currentUserName = prompt("Hello!  What's  your name?");
    } while (currentUserName == null || currentUserName == "");

    configureChat();
});


/* FUNCTION: configureChatWithUserName
-------------------------------
Parameters: NA
Returns: NA

Sets up a chat session for the current user, with currentUserName.
Registers this user with the chat server, and awaits a buddy pairing
to begin chatting.  Also configures the message input field to be
in focus, and adds our keyUp event handler to it to start forwarding
messages.
-------------------------------
*/

function configureChat() {

    if (!currentUserName) {
        console.log("ERROR: No user name");
        return;
    }

    socket = io();

    // Clears old bubbles, sets new buddy name
    function showBuddyName(name) {
        $(".bubble").fadeOut("fast", function() {
            $(this).remove();
        });
        buddyUserName = name;
        $('#buddyName').html("Chatting with " + name);
    }

    // Buddy change handlers
    socket.on('buddy-assigned', showBuddyName);
    socket.on('buddy-left', function() {
        buddyUserName = null;
        $('#buddyName').html("Looking for chat buddy...");
    });

    // Handlers for when our buddy types or deletes
    socket.on('chat add', function(character) {
        messageAdd(character, BUDDY_USER, buddyUserName);
    });
    socket.on('chat delete', function() {
        messageDelete(BUDDY_USER);
    });

    // Add key press handler - thanks to http://jsfiddle.net/7SP2n/1/
    // for the hint that I can add a keypress handler to the whole window
    $(window).keypress(function(e) {
        if (!buddyUserName) return;
        
        var ev = e || window.event;
        if (ev.which == 8) {
            messageDelete(CURRENT_USER);
        } else {
            messageAdd(String.fromCharCode(ev.which), 
                CURRENT_USER, currentUserName); 
        }
    });

    // Initialize the chat
    socket.emit('init', currentUserName, showBuddyName);
}


/* FUNCTION: messageAdd
-----------------------------
Parameters:
    character - the character the user typed
    userBubbleClass - the class name for the bubbles to add this character to
    userName - the name of the user that added this character

Returns: NA

Adds character to one of the existing bubble conversations, either the user's
or the buddy's, depending on the given userBubbleClass (either CURRENT_USER or
BUDDY_USER).  If this user wasn't the last person to type, then adds a new 
speech bubble with this text.  Otherwise, appends this text to the 
most recent speech bubble.
-----------------------------
*/
function messageAdd(character, userBubbleClass, userName) {
    
    // If this user was the last one to type, just add this character to their
    // last message
    if ($(userBubbleClass).last().is(":last-child")) {
        var bubbleSpan = $(userBubbleClass).last().find("span");
        bubbleSpan.text(bubbleSpan.text() + character);
    } else {
        var newElem = "<div class=\"" + userBubbleClass.replace(/\./g, " ") + "\">" + 
            "<b>" + userName + ": </b> <span>" + character + "</span></div>";
        $(newElem).hide().appendTo($(".container")).fadeIn("fast");
    }

    if (userBubbleClass == CURRENT_USER && buddyUserName) {
        socket.emit('chat add', character);
    }
}


/* FUNCTION: messageDelete
----------------------------
Parameters:
    user - the user to delete a character from the bubbles of

Returns: NA

Removes a character from the most recent bubble of the given user.
-----------------------------
*/
function messageDelete(user) {

}
