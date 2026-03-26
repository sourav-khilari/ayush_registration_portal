import "dotenv/config";
import mongoose from "mongoose";
import createApp from "./src/app.js";
import { attachSignalingServer } from "./src/webrtc/signalingServer.js";
import {
  handleUnhandledRejection,
  handleUncaughtException,
} from "./src/middleware/errorHandler.js";
import http from "http";

const PORT = process.env.PORT || 5002;
const MONGO_URI = process.env.MONGO_URI;

let server;

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
    attachSignalingServer(server);

    server.on("error", (err) => {
      if (err && err.code === "EADDRINUSE") {
        console.error(`❌ Port ${PORT} is already in use.`);
        process.exit(1);
      }
      console.error("❌ Server error:", err?.message || err);
      process.exit(1);
    });

    server.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ DB Connection Error:", err.message);
    process.exit(1);
  });

async function shutdown(signal) {
  console.log(`\n🛑 Shutting down (${signal})...`);

  await new Promise((resolve) => {
    if (!server) return resolve();
    server.close(() => resolve());
  });

  await mongoose.connection.close(false);
  process.exit(0);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.once("SIGUSR2", () => shutdown("SIGUSR2"));
