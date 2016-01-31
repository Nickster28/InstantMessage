var socket = null; // This client's current socket
var lastMessage = ""; // The full message just typed by the user
var chatBuddyName = ""; // Name of other user we're chatting with

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

    // Clears old buddy text, sets new buddy name
    function showBuddyName(name) {
        $('#buddyMessage').empty();
        lastMessage = "";
        chatBuddyName = name;
        $('#buddyName').html(name);
    }

    socket.on('buddy-assigned', showBuddyName);

    socket.on('buddy-left', function() {
        chatBuddyName = "";
        $('#buddyName').html("Looking for chat buddy...");
    });

    $('#m').focus();
    $('#m').keyup(handleKeyUp);

    // Either add text to the existing last <p>, or append a new <p>
    // with the new text (the message is a string of <p>s and <del>s
    // representing typing and deletion).
    socket.on('chat add', function(msg) {
        var lastChild = $('#buddyMessage').children().last();
        if(!lastChild.is("p")) {
            $('#buddyMessage').append('<p>' + msg + '</p>');
        } else {
            var currText = lastChild.text();
            lastChild.text(currText + msg);
        }
    });

    socket.on('chat delete', deleteCharacters);

    socket.emit('init', name, showBuddyName);
}


/* FUNCTION: deleteCharacters
-------------------------------
Parameters:
    numCharsToDelete - # characters we should delete from the sender's message

Returns: NA

Deletes numCharsToDelete characters by crawling through the
children of the buddyMessage table row and removing characters
from back to front until we've removed numCharsToDelete of them.
The tricky part is the children are a mix of <p> and <del> elements,
so we have to iterate through all <p>s from back to front, removing
characters.  Then, we have to add those same characters to a <del>
element after the <p> we deleted them from.
-------------------------------
*/
function deleteCharacters(numCharsToDelete) {

    // Keep track of the last <p> we edit from so we can put the <del> 
    // element right after (with the same text we deleted, 
    // which we build up in deletedText)
    var lastEditedP = null;
    var deletedText = "";

    // Iterate through all <p>s from end to start (deleting goes back-to-front)
    // removing characters until we've removed numCharsToDelete.
    $($('#buddyMessage p').get().reverse()).each(function() {

        // Skip if we're done deleting
        if(numCharsToDelete == 0) return;

        // If this element needs to be consumed entirely, subtract out its length
        // and set its text to empty.  Otherwise, just take off however many
        // characters we need to.  Build up deletedText as well to track what
        // we delete.
        if($(this).text().length <= numCharsToDelete) {
            numCharsToDelete -= $(this).text.length;
            deletedText = $(this).text() + deletedText;
            $(this).text("");
        } else {
            deletedText = $(this).text().substring($(this).text().length - numCharsToDelete, 
                $(this).text().length) + deletedText;
            var newText = $(this).text().substring(0, $(this).text().length - numCharsToDelete);
            $(this).text(newText);
            numCharsToDelete = 0;
        }

        lastEditedP = $(this);
    });

    // Go to the next element to add back the chars we deleted, but in a <del>.
    // We append a new one if needed, or add to an existing one.
    var delToEdit = lastEditedP.next();
    if(!delToEdit.is("del")) {
        $('#buddyMessage').append('<del>' + deletedText + '</del>');
    } else {
        var currText = delToEdit.text();
        delToEdit.text(deletedText + currText);
    }

    // Delete empty <p> elements
    $('#buddyMessage p').each(function() {
        if($(this).text().length == 0) $(this).remove();
    });
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
buddy.  Does nothing if we're not chatting with anyone.
--------------------------
*/
function handleKeyUp(keyUpEvent) {
    if(chatBuddyName == "") return;

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