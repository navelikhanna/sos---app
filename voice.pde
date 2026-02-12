import processing.net.*;

Server server;
String latestCommand = "";

void setup() {
  size(400, 200);
  server = new Server(this, 8080);
  println("Listening on port 8080...");
}

void draw() {
  background(30);
  fill(255);
  textSize(16);
  textAlign(CENTER, CENTER);
  
  // Display the latest command on screen
  text("Latest command: " + latestCommand, width / 2, height / 2);

  // Check if the latest command is "help" and display help text
  if (latestCommand.equals("help")) {
    text("To use the app: \n1. Send SOS \n2. View Heart Rate", width / 2, height / 2 + 40);
  }

  // Handle incoming client requests
  Client client = server.available();
  if (client != null) {
    String request = client.readString();
    println("Request received: " + request);

    if (request != null && request.indexOf("GET /command?msg=") != -1) {
      int start = request.indexOf("msg=") + 4;
      int end = request.indexOf(" ", start);
      String msg = request.substring(start, end);
      latestCommand = msg;
      println("Command Received: " + msg);

      // Send response back to the client
      client.write("HTTP/1.1 200 OK\r\n");
      client.write("Content-Type: text/plain\r\n");
      client.write("Access-Control-Allow-Origin: *\r\n");
      client.write("Content-Length: 2\r\n");
      client.write("\r\n");
      client.write("OK");
    }
    client.stop();
  }
}
