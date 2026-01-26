import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext";
import { enableSocketDebug } from "../utils/socketDebug";

const SocketContext = createContext(null);

export const useSocket = () => {
  const ctx = useContext(SocketContext);
  if (!ctx) {
    throw new Error("useSocket must be used within SocketProvider");
  }
  return ctx;
};

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || "http://localhost:5000";

export const SocketProvider = ({ children }) => {
  const { token, isAuthenticated } = useAuth();

  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);

  // CONNECT SOCKET
  // Runs only when token becomes available

  useEffect(() => {
    if (!isAuthenticated || !token) return;

    // Prevent duplicate connections
    if (socketRef.current?.connected) return;

    console.log("🔌 Connecting to WebSocket...");

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ["websocket"],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    // Enable debug in development
    if (process.env.REACT_APP_NODE_ENV === "development") {
      enableSocketDebug(socket);
    }

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("WebSocket connected:", socket.id);
      setConnected(true);
      setError(null);
    });

    socket.on("connected", (data) => {
      console.log("Server welcome:", data);
    });

    socket.on("disconnect", (reason) => {
      console.log("WebSocket disconnected:", reason);
      setConnected(false);
    });

    socket.on("connect_error", (err) => {
      console.error("WebSocket error:", err.message);
      setError(err.message);
      setConnected(false);
    });

    // IMPORTANT: cleanup listeners only
    return () => {
      socket.off("connect");
      socket.off("connected");
      socket.off("disconnect");
      socket.off("connect_error");
    };
  }, [token, isAuthenticated]);

  //  DISCONNECT ON LOGOUT ONLY

  useEffect(() => {
    if (!isAuthenticated && socketRef.current) {
      console.log("🔌 Logging out — disconnecting WebSocket");

      socketRef.current.disconnect();
      socketRef.current = null;
      setConnected(false);
    }
  }, [isAuthenticated]);

  // Emit helper
  const emit = useCallback((event, data) => {
    const socket = socketRef.current;
    if (!socket || !socket.connected) {
      console.warn("Socket not connected. Emit skipped:", event);
      return false;
    }
    socket.emit(event, data);
    return true;
  }, []);

  // Subscribe helper

  const on = useCallback((event, callback) => {
    const socket = socketRef.current;
    if (!socket) return () => {};
    socket.on(event, callback);
    return () => socket.off(event, callback);
  }, []);

  // Rooms
  const joinRoom = (roomName) => emit("room:join", { roomName });
  const leaveRoom = (roomName) => emit("room:leave", { roomName });
  const joinOrder = (orderId) => emit("order:join", { orderId });
  const leaveOrder = (orderId) => emit("order:leave", { orderId });

  const value = {
    socket: socketRef.current,
    connected,
    error,
    emit,
    on,
    joinRoom,
    leaveRoom,
    joinOrder,
    leaveOrder,
  };

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
};

export default SocketContext;
