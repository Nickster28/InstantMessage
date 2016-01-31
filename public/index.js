var socket = null; // This client's current socket
var lastMessage = ""; // The full message just typed by the user

// Runs on document load
$(function() {
    setUpModal();
});


/* Function: setUpModal
------------------------
Configures the modal name window that appears on page load,
prompting the user to enter their name.  After the user confirms their name,
the chat socket is initialized.
------------------------
*/
function setUpModal() {

    // Focus on name text field when modal appears
    $('#nameModal').on('shown.bs.modal', function() {
        $('#nameInput').focus();
    });

    // Disallow closing the modal with ESC
    $('#nameModal').modal({
        keyboard: false,
        backdrop: 'static'
    });

    // Pressing enter is the same as clicking 'Start Chatting'
    $('#nameInput').keyup(function(e) {
        if(e.which == 13) {
            $('#nameModal').modal('hide');
        }
    });

    // Only dismiss the modal on click if the user entered a valid name
    $('#nameModalDismissButton').click(function() {
        var name = $('#nameInput').val();
        if(name != "") {
            $('#nameModal').modal('hide');
        }
    });

    // Set up the chat on dismiss
    $('#nameModal').on('hidden.bs.modal', function(e) {
        var name = $('#nameInput').val();
        configureChatWithUserName(name);
    });
}


/* FUNCTION: configureChatWithUserName
-------------------------------
Parameters:
    name - the name of the user to configure chat for.

Returns: NA

Sets up a chat session for the current user with the given name.
Registers this user with the chat server, and awaits a buddy pairing
to begin chatting.  Also configures the message input field to be
in focus, and adds our keyUp event handler to it to start forwarding
messages.
-------------------------------
*/

function configureChatWithUserName(name) {
    $('#ownName').html(name);

    socket = io();

    function showBuddyName(name) {
        $('#buddyName').html(name);
    }

    socket.on('buddy-assigned', showBuddyName);

    socket.on('buddy-left', function() {
        $('#buddyName').html("Looking for chat buddy...");
    });

    $('#m').focus();
    $('#m').keyup(handleKeyUp);

    socket.on('chat add', function(msg) {
      var currText = $('.buddyMessage').text();
      $('.buddyMessage').text(currText + msg);
    });

    socket.on('chat delete', function(numCharsDeleted) {
      var currText = $('.buddyMessage').text();
      $('.buddyMessage').text(currText.substring(0, currText.length - numCharsDeleted));
    });

    socket.emit('init', name, showBuddyName);
}


/* FUNCTION: handleKeyUp
---------------------------
Parameters:
    keyUpEvent - the key up event we should handle

Returns: NA

Handler for the message input field's key up event.  If the
user has typed additional characters since we last handled a
key up event, send those to our chat server to route to our
chat buddy.  Otherwise, if the user has deleted characters
since we last handled a key up event, forward along how many
characters were deleted to our chat server to route to our chat
buddy.
--------------------------
*/
function handleKeyUp(keyUpEvent) {
    var messageText = $('#m').val();

    if(messageText == "" && lastMessage == "") return;

    // If delete was pressed, send # deleted chars to server.
    // Otherwise, send text that was typed since last keyUp.
    if(keyUpEvent.keyCode == 8) {
        var deletedLength = lastMessage.length - messageText.length;
        if(deletedLength == 0) return;
        socket.emit('chat delete', deletedLength);
    } else {
        var addedLength = messageText.length - lastMessage.length;
        var addedSection = messageText.substring(messageText.length - addedLength, 
            messageText.length);
        if(addedSection == "") return;
        socket.emit('chat add', addedSection);
    }

    lastMessage = messageText;
}