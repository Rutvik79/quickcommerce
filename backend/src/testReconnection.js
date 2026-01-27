import { io } from "socket.io-client";
import dotenv from "dotenv";

dotenv.config();

const SERVER_URL = process.env.SERVER_URL || "http://localhost:5000";

// Test WebSocket reconnection
const testReconnection = async (TokenExpiredError, userName = "Test User") => {
  console.log("\n🔄 Testing WebSocket Reconnection");

  return new Promise((resolve) => {
    let socket;
    let connectCount = 0;
    let disconnectCount = 0;
    let reconnectAttempts = 0;

    socket = io(SERVER_URL, {
      auth: { token },
      transports: ["websoceket"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    socket.on("connect", () => {
      connectCount++;
      console.log(`Connected (#${connectCount}) - Socket ID: ${socket.id}`);

      if (connectCount === 1) {
        console.log(`\n Simulating disconnect in 2 seconds...`);
        setTimeout(() => {
          console.log(`Forcing disconnect...`);
          socket.disconnect();
        }, 2000);
      } else if (connectCount === 2) {
        console.log("\n🎉 Reconnection successful!");
        console.log("\n📊 Test Summary:");
        console.log(`   Total Connects: ${connectCount}`);
        console.log(`   Total Disconnects: ${disconnectCount}`);
        console.log(`   Reconnect Attempts: ${reconnectAttempts}`);
        console.log("\n✅ TEST PASSED: Reconnection working correctly");

        socket.disconnect();
        resolve(true);
      }
    });

    socket.on("disconnect", (reason) => {
      disconnectCount++;
      console.log(` Disconnected (#${disconnectCount}) - Reason: ${reason}`);

      if (reason === "io client disconnect") {
        console.log(" Client will attempt to reconnect...");
      }
    });

    socket.on("reconnect_attempt", (attemptNumber) => {
      reconnectAttempts = attemptNumber;
      console.log(`Reconnection attempt ${attemptNumber}...`);
    });

    socket.on("reconnect_error", (error) => {
      console.error(" Reconnection error:", error.message);
    });

    socket.on("reconnect_failed", () => {
      console.error(" All reconnection attempts failed");
      socket.disconnect();
      resolve(false);
    });

    socket.on("connect_error", (error) => {
      console.error(" Connection error:", error.message);
      socket.disconnect();
      resolve(false);
    });

    // Timeout after 15 seconds
    setTimeout(() => {
      console.log("\n Test timeout");
      socket.disconnect();
      resolve(false);
    }, 15000);
  });
};

// Test connection stability
const testConnectionStability = async (token, duration = 10000) => {
  console.log("\n Testing Connection Stability");
  console.log(`Duration: ${duration / 1000} seconds\n`);

  return new Promise((resolve) => {
    let socket;
    let pingSent = 0;
    let pongReceived = 0;
    let errors = 0;

    socket = io(SERVER_URL, {
      auth: { token },
      transports: ["websocket"],
    });

    socket.on("connect", () => {
      console.log(` Connected - Socket ID: ${socket.id}`);

      // Send ping every second
      const pingInterval = setInterval(() => {
        pingSent++;
        socket.emit("ping");
        console.log(` Ping sent (${pingSent})`);
      }, 1000);

      // Stop after duration
      setTimeout(() => {
        clearInterval(pingInterval);

        console.log("\n Stability Test Results:");

        console.log(`Pings Sent: ${pingSent}`);
        console.log(`Pongs Received: ${pongReceived}`);
        console.log(
          `Success Rate: ${((pongReceived / pingSent) * 100).toFixed(1)}%`,
        );
        console.log(`Errors: ${errors}`);

        if (pongReceived === pingSent && errors === 0) {
          console.log("\n TEST PASSED: Connection is stable");
          resolve(true);
        } else {
          console.log("\n  Connection issues detected");
          resolve(false);
        }

        socket.disconnect();
      }, duration);
    });

    socket.on("pong", (data) => {
      pongReceived++;
      const latency = Date.now() - data.latency;
      console.log(` Pong received (${pongReceived}) - Latency: ${latency}ms`);
    });

    socket.on("error", (error) => {
      errors++;
      console.error(` Error: ${error.message}`);
    });

    socket.on("disconnect", (reason) => {
      console.log(` Disconnected: ${reason}`);
      resolve(false);
    });
  });
};

// test event persistence after reconnection
const testEventPersistence = async (token) => {
  console.log("\n Testing Event Persistence After Reconnection");
  console.log("================================================\n");

  return new Promise((resolve) => {
    let socket;
    let eventsBeforeDisconnect = [];
    let eventsAfterReconnect = [];
    let phase = 1;

    socket = io(SERVER_URL, {
      auth: { token },
      transports: ["websocket"],
      reconnection: true,
    });

    // Track all events
    const trackEvent = (eventName, data) => {
      const event = { name: eventName, timestamp: new Date() };
      if (phase === 1) {
        eventsBeforeDisconnect.push(event);
      } else {
        eventsAfterReconnect.push(event);
      }
    };

    socket.on("connect", () => {
      console.log(` Connected - Socket ID: ${socket.id}`);

      if (phase === 1) {
        console.log("\n Phase 1: Listening for events...");

        // Trigger some events
        socket.emit("ping");
        socket.emit("heartbeat");

        setTimeout(() => {
          console.log("\n Phase 2: Forcing disconnect...");
          phase = 2;
          socket.disconnect();

          setTimeout(() => {
            console.log("\n Phase 3: Reconnecting...");
            socket.connect();
          }, 2000);
        }, 2000);
      } else {
        console.log("\n Reconnected successfully!");

        // Trigger same events after reconnection
        socket.emit("ping");
        socket.emit("heartbeat");

        setTimeout(() => {
          console.log("\n Event Persistence Results:");

          console.log(
            `Events before disconnect: ${eventsBeforeDisconnect.length}`,
          );
          console.log(`Events after reconnect: ${eventsAfterReconnect.length}`);

          if (eventsAfterReconnect.length > 0) {
            console.log("\n TEST PASSED: Events working after reconnection");
            resolve(true);
          } else {
            console.log("\n TEST FAILED: No events after reconnection");
            resolve(false);
          }

          socket.disconnect();
        }, 2000);
      }
    });

    socket.on("pong", (data) => {
      console.log(`    Received: pong (Phase ${phase})`);
      trackEvent("pong", data);
    });

    socket.on("heartbeat:ack", (data) => {
      console.log(`    Received: heartbeat:ack (Phase ${phase})`);
      trackEvent("heartbeat:ack", data);
    });

    socket.on("disconnect", (reason) => {
      console.log(`Disconnected: ${reason}`);
    });
  });
};

//  Run all reconnection tests
const runAllTests = async (token, userName) => {
  console.log(" WebSocket Reconnection & Stability Test Suite");

  const results = [];

  // Test 1: Basic Reconnection
  console.log("\n--- Test 1: Basic Reconnection ---");
  results.push(await testReconnection(token, userName));
  await new Promise((r) => setTimeout(r, 1000));

  // Test 2: Connection Stability
  console.log("\n--- Test 2: Connection Stability ---");
  results.push(await testConnectionStability(token, 10000));
  await new Promise((r) => setTimeout(r, 1000));

  // Test 3: Event Persistence
  console.log("\n--- Test 3: Event Persistence ---");
  results.push(await testEventPersistence(token));

  // Summary
  const passed = results.filter((r) => r).length;
  const total = results.length;

  console.log("\n\n Test Suite Summary");

  console.log(`Total Tests: ${total}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${total - passed}`);
  console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);

  if (passed === total) {
    console.log("\n All reconnection tests passed!");
  } else {
    console.log("\n  Some tests failed.");
  }
};

// Main function
const main = async () => {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log("Usage: node testReconnection.js <JWT_TOKEN> [userName]");
    console.log("\nExample:");
    console.log('node src/testReconnection.js "eyJhbGc..." "Test User"');
    process.exit(1);
  }

  const token = args[0];
  const userName = args[1] || "Test User";

  await runAllTests(token, userName);
  process.exit(0);
};

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main(); // this wont run on window machine
}

// main();

export {
  testReconnection,
  testConnectionStability,
  testEventPersistence,
  runAllTests,
};
