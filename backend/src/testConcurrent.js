import { io } from "socket.io-client";
import dotenv from "dotenv";

dotenv.config();

const SERVER_URL = process.env.SERVER_URL || "http://localhost:5000";

// Test concurrent order acceptance (race condition)
const testConcurrentAcceptance = async (token1, token2, orderId) => {
  console.log(`\n Testing Concurrent Order Acceptance`);

  let partner1Socket, partner2Socket;
  let partner1Result = null;
  let partner2Result = null;

  try {
    // Create Two partner connection
    partner1Socket = io(SERVER_URL, {
      auth: { token: token1 },
      transports: ["websocket"],
    });

    partner2Socket = io(SERVER_URL, {
      auth: { token: token2 },
      transports: ["websocket"],
    });

    // Wait for both connections
    await Promise.all([
      new Promise((resolve) => partner1Socket.on("connect", resolve)),
      new Promise((resolve) => partner2Socket.on("connect", resolve)),
    ]);

    console.log("✅ Both partners connected");
    console.log(`   Partner 1: ${partner1Socket.id}`);
    console.log(`   Partner 2: ${partner2Socket.id}`);

    // Set up event listeners
    partner1Socket.on("order:accepted-success", (data) => {
      partner1Result = "SUCCESS";
      console.log("\n Partner 1: Order accepted successfully!");
      console.log(`   Order ID: ${data.orderId}`);
    });

    partner1Socket.on("order:accept-failed", (data) => {
      partner1Result = "FAILED";
      console.log("\n Partner 1: Failed to accept order");
      console.log(`   Reason: ${data.reason}`);
      console.log(`   Message: ${data.message}`);
    });

    partner2Socket.on("order:accepted-success", (data) => {
      partner2Result = "SUCCESS";
      console.log("\n Partner 2: Order accepted successfully!");
      console.log(`   Order ID: ${data.orderId}`);
    });

    partner2Socket.on("order:accept-failed", (data) => {
      partner2Result = "FAILED";
      console.log("\n Partner 2: Failed to accept order");
      console.log(`   Reason: ${data.reason}`);
      console.log(`   Message: ${data.message}`);
    });

    // Both try to accept at the SAME TIME
    console.log("\n Both partners trying to accept order simultaneously...");
    console.log(`   Order ID: ${orderId}\n`);

    partner1Socket.emit("order:accept", { orderId });
    partner2Socket.emit("order:accept", { orderId });

    // Wait for responses
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Analyze results
    console.log("\n📊 Test Results:");

    console.log(`Partner 1: ${partner1Result || "NO RESPONSE"}`);
    console.log(`Partner 2: ${partner2Result || "NO RESPONSE"}`);

    if (partner1Result === "SUCCESS" && partner2Result === "FAILED") {
      console.log("\n TEST PASSED: Partner 1 won the race!");
      console.log("   Order locking mechanism working correctly.");
      return true;
    } else if (partner1Result === "FAILED" && partner2Result === "SUCCESS") {
      console.log("\n TEST PASSED: Partner 2 won the race!");
      console.log("   Order locking mechanism working correctly.");
      return true;
    } else if (partner1Result === "SUCCESS" && partner2Result === "SUCCESS") {
      console.log("\n TEST FAILED: Both partners accepted the order!");
      console.log("   CRITICAL: Race condition detected!");
      return false;
    } else {
      console.log("\n  TEST INCONCLUSIVE: Unexpected results");
      return false;
    }
  } catch (error) {
    console.error("\n Test error:", error.message);
    return false;
  } finally {
    // Cleanup
    if (partner1Socket) partner1Socket.disconnect();
    if (partner2Socket) partner2Socket.disconnect();
  }
};

// Run Multiple times to ensure consistency
const runMultipleTests = async (token1, token2, orderIds) => {
  console.log(" Running Multiple Concurrent Acceptance Tests");
  console.log(`Number of test orders: ${orderIds.length}\n`);

  let passed = 0;
  let failed = 0;

  for (let i = 0; i < orderIds.length; i++) {
    console.log(`\n--- Test ${i + 1}/${orderIds.length} ---`);
    const result = await testConcurrentAcceptance(token1, token2, orderIds[i]);

    if (result) {
      passed++;
    } else {
      failed++;
    }

    // Wait between tests
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  console.log("\n\n Final Results");

  console.log(`Total Tests: ${orderIds.length}`);
  console.log(
    `Passed: ${passed} (${((passed / orderIds.length) * 100).toFixed(1)}%)`,
  );
  console.log(
    `Failed: ${failed} (${((failed / orderIds.length) * 100).toFixed(1)}%)`,
  );

  if (failed === 0) {
    console.log("\n All tests passed! Order locking is working perfectly!");
  } else {
    console.log("\n Some tests failed. Review order locking mechanism.");
  }
};

// Main function
const main = async () => {
  const args = process.argv.slice(2);

  if (args.length < 3) {
    console.log(
      "Usage: node testConcurrent.js <PARTNER1_TOKEN> <PARTNER2_TOKEN> <ORDER_ID> [ORDER_ID2] [ORDER_ID3] ...",
    );
    console.log("\nExample:");
    console.log(
      'node src/testConcurrent.js "token1" "token2" "order1" "order2"',
    );
    console.log("\nNote: You need at least 2 pending orders to test properly.");
    process.exit(1);
  }

  const token1 = args[0];
  const token2 = args[1];
  const orderIds = args.slice(2);

  if (orderIds.length === 1) {
    // Single test
    await testConcurrentAcceptance(token1, token2, orderIds[0]);
  } else {
    //   multiple tests
    await runMultipleTests(token1, token2, orderIds);
  }

  process.exit(0);
};

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  //   main(); //wont run on windows machine
}

main();

export { testConcurrentAcceptance, runMultipleTests };
