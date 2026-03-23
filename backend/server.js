// server.js
import "dotenv/config";
import mongoose from "mongoose";
import createApp from "./src/app.js";
import { handleUnhandledRejection, handleUncaughtException } from "./src/middleware/errorHandler.js";
import http from "http";
import { attachSignalingServer } from "./src/webrtc/signalingServer.js";

const PORT = process.env.PORT || 5002;
const MONGO_URI = process.env.MONGO_URI;
let server;
let wss;

// Handle uncaught exceptions and unhandled rejections
handleUncaughtException();
handleUnhandledRejection();

if (!MONGO_URI) {
  console.error("MONGO_URI missing in .env");
  process.exit(1);
}

mongoose
  .connect(MONGO_URI)
  .then(async () => {
    console.log("✅ MongoDB Connected");
    const app = await createApp();
    server = http.createServer(app);
    wss = attachSignalingServer(server);

    server.on("error", (err) => {
      if (err && err.code === "EADDRINUSE") {
        console.error(`❌ Port ${PORT} is already in use. Stop the other server first.`);
        process.exit(1);
      }
      console.error("❌ Server error:", err?.message || err);
      process.exit(1);
    });

    server.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📡 WebRTC signaling on ws://localhost:${PORT}/ws`);
    });
  })
  .catch((err) => {
    console.error("❌ DB Connection Error:", err.message);
    process.exit(1);
  });

async function shutdown(signal) {
  try {
    console.log(`\n🛑 Shutting down (${signal})...`);
  } catch (_) {}

  try {
    wss?.close?.();
  } catch (_) {}

  await new Promise((resolve) => {
    try {
      if (!server) return resolve();
      server.close(() => resolve());
    } catch (_) {
      resolve();
    }
  });

  try {
    await mongoose.connection.close(false);
  } catch (_) {}

  process.exit(0);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
// nodemon uses SIGUSR2 for restarts
process.once("SIGUSR2", () => shutdown("SIGUSR2"));
