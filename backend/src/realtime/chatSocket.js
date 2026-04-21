import { Server } from "socket.io";
import jwt from "jsonwebtoken";

export function attachChatSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"] },
    path: "/socket.io",
  });

  // userId -> number of active socket connections
  const onlineCounts = new Map();
  const isOnline = (userId) => (onlineCounts.get(String(userId)) || 0) > 0;

  io.use((socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace("Bearer ", "");
      if (!token) return next(new Error("Unauthorized"));
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = String(decoded.id);
      next();
    } catch (e) {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    const userRoom = `user:${socket.userId}`;
    socket.join(userRoom);
    const before = onlineCounts.get(socket.userId) || 0;
    onlineCounts.set(socket.userId, before + 1);
    if (before === 0) {
      io.emit("presence:update", { userId: socket.userId, online: true });
    }

    socket.on("conversation:join", ({ conversationId }) => {
      if (!conversationId) return;
      socket.join(`conversation:${conversationId}`);
    });

    socket.on("conversation:leave", ({ conversationId }) => {
      if (!conversationId) return;
      socket.leave(`conversation:${conversationId}`);
    });

    socket.on("chat:typing", ({ conversationId, typing }) => {
      if (!conversationId) return;
      socket.to(`conversation:${conversationId}`).emit("chat:typing", {
        conversationId,
        userId: socket.userId,
        typing: Boolean(typing),
      });
    });

    socket.on("presence:list", () => {
      const users = Array.from(onlineCounts.keys()).filter((id) => isOnline(id));
      socket.emit("presence:list", { users });
    });

    socket.on("disconnect", () => {
      const before = onlineCounts.get(socket.userId) || 0;
      const next = Math.max(0, before - 1);
      if (next === 0) onlineCounts.delete(socket.userId);
      else onlineCounts.set(socket.userId, next);
      if (before > 0 && next === 0) {
        io.emit("presence:update", { userId: socket.userId, online: false });
      }
    });
  });

  return io;
}

