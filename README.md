# InstantMessage
A chat application to test what real-time messaging would be like, complete with deleting and simultaneous chatting.
You are paired with the next person to join the chat room, and can simply start typing to send a message.  This application
was meant to simulate in-person conversations as much as possible, but in text form.  For example, there's no text box -
just type anywhere to have your speech bubble sent instantly.  If you take a pause, a new speech bubble will automatically
be created for you.  You can also delete anything you have typed, even in past bubbles.  And if both users are typing
at the same time, you'll see both your and your buddy's chat bubbles updating at the same time, similar to two people
talking to each other at the same time in person.

To run this project, just download and enter "npm start" to start the server.  This project relies on socket.io to
communicate between the different chat clients.
