import { io } from "socket.io-client";
import dotenv from "dotenv";

dotenv.config();

const SERVER_URL = process.env.SERVER_URL || "http://localhost:5000";

// Test Socket.io connection
const testSocketConnection = async (token, userName = "Test User") => {
  console.log("\n Testing Socket.io Connection");

  //   Create Socket connection
  const socket = io(SERVER_URL, {
    auth: {
      token: token,
    },
    transports: ["websocket", "polling"],
  });

  //   Connection events
  socket.on("connect", () => {
    console.log(`Connected to server - Socket ID: ${socket.id}`);
  });

  socket.on("connected", (data) => {
    console.log('\n Received "connected" event:');
    console.log(JSON.stringify(data, null, 2));
  });

  socket.on("connect_error", (error) => {
    console.error("Connection error:", error.message);
  });

  socket.on("disconnect", (reason) => {
    console.log(`\nDisconnected - Reason: ${reason}`);
  });

  // Test events
  socket.on("order:created", (data) => {
    console.log("\n New order created:");
    console.log(JSON.stringify(data, null, 2));
  });

  socket.on("order:accepted", (data) => {
    console.log("\n Order accepted:");
    console.log(JSON.stringify(data, null, 2));
  });

  socket.on("order:status-updated", (data) => {
    console.log("\n Order status updated:");
    console.log(JSON.stringify(data, null, 2));
  });

  socket.on("delivery:location", (data) => {
    console.log("\n Delivery location update:");
    console.log(JSON.stringify(data, null, 2));
  });

  socket.on("error", (data) => {
    console.error("\n Error event:", data);
  });

  socket.on("pong", (data) => {
    const latency = Date.now() - data.latency;
    console.log(`\n Pong received - Latency: ${latency}ms`);
  });

  // Wait a bit for connection
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Test ping
  console.log("\n Sending ping...");
  socket.emit("ping");

  // Wait for response
  await new Promise((resolve) => setTimeout(resolve, 1000));

  console.log("\n Socket.io test completed");
  console.log(" Keep this running to receive real-time events");
  console.log("Press Ctrl+C to exit\n");

  // Keep alive
  setInterval(() => {
    socket.emit("heartbeat");
  }, 30000);

  return socket;
};

// Main function
const main = async () => {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log("Usage: node testSocket.js <JWT_TOKEN> [userName]");
    console.log("\nExample:");
    console.log(
      'node src/testSocket.js "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." "Customer 1"',
    );
    process.exit(1);
  }

  const token = args[0];
  const userName = args[1] || "Test User";

  try {
    console.log("runnint test socket connection");
    await testSocketConnection(token, userName);
  } catch (error) {
    console.error("Test failed:", error);
    process.exit(1);
  }
};

// Run if called directly
console.log(import.meta.url);
console.log(`file://${process.argv[1]}`);
if (import.meta.url === `file://${process.argv[1]}`) {
  // this does not work in windows system because of the '/' and '\' difference
  console.log("calling main function");
}
main();

export { testSocketConnection };
