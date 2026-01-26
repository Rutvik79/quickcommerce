// Enable debug mode to log all socket events
// Usage: enableSocketDebug(socket)
export const enableSocketDebug = (socket) => {
  if (!socket || process.env.NODE_ENV !== "development") return;

  const originalEmit = socket.emit;
  const originalOn = socket.on;

  // Log all emits
  socket.emit = function (...args) {
    console.log("📤 [Socket Emit]", args[0], args[1]);
    return originalEmit.apply(socket, args);
  };

  // Log all received events
  socket.on = function (event, callback) {
    const wrappedCallback = (...args) => {
      console.log("📥 [Socket Received]", event, args[0]);
      return callback(...args);
    };
    return originalOn.call(socket, event, wrappedCallback);
  };

  console.log("🐛 Socket debug mode enabled");
};

// Pretty print socket info
export const logSocketInfo = (socket) => {
  if (!socket) {
    console.log("❌ Socket not initialized");
    return;
  }

  console.log("🔌 Socket Info:");
  console.log("  ID:", socket.id);
  console.log("  Connected:", socket.connected);
  console.log("  Disconnected:", socket.disconnected);
  console.log("  Active:", socket.active);
  console.log("  Transport:", socket.io?.engine?.transport?.name);
};
