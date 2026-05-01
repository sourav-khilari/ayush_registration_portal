import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "path";
import { fileURLToPath } from "url";
import "dotenv/config";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// -------------------
// Import Routes
// -------------------
import userRoutes from "./routes/userRoutes.js";
import startupRoutes from "./routes/startupRoutes.js";
import documentRoutes from "./routes/documentRoutes.js";
import applicationRoutes from "./routes/applicationRoutes.js";
import requirementRoutes from "./routes/requirementRoutes.js"; // ✅ NEW
import productRoutes from "./routes/productRoutes.js";
import investmentRoutes from "./routes/investmentRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js"; // ✅ Dashboard
import conversationRoutes from "./routes/conversationRoutes.js"; // ✅ Chat/Video
import meetingRoutes from "./routes/meetingRoutes.js";
import mediaUploadRoutes from "./routes/mediaUploadRoutes.js";

async function createApp() {
  const app = express();

  // -------------------
  // Middleware
  // -------------------
  // Security headers
  app.use(helmet());
  // CORS (kept as before)
  app.use(cors());

  // Limit request body size to avoid large payload abuse
  app.use(express.json({ limit: "100kb" }));
  app.use(bodyParser.json({ limit: "100kb" }));
  app.use(bodyParser.urlencoded({ extended: true, limit: "100kb" }));

  // Basic rate limiting for API routes to mitigate abusive clients
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, 
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests, please try again later." },
  });

  // Apply rate limiter to API routes only
  app.use("/api/", apiLimiter);

  // Serve uploaded files statically
  app.use(
    "/uploads",
    express.static(path.join(__dirname, "..", "uploads")),
  );

  app.use(
    "/uploads",
    express.static(
      path.join(__dirname, "..", process.env.UPLOAD_DIR || "public/uploads"),
    ),
  );

  // Serve generated certificates statically
  app.use(
    "/certificates",
    express.static(path.join(__dirname, "..", "public/certificates")),
  );
  app.use(
    "/chat_uploads",
    express.static(path.join(__dirname, "..", "public/chat_uploads")),
  );

  // -------------------
  // Load models to register them with Mongoose
  // -------------------
  const modelNames = [
    "User",
    "Startup",
    "Application",
    "Document",
    "DocumentRequirement",
    "DocumentTemplate",
    "Product",
    "Investment",
    "Investor",
    "GovernmentOfficial",
    "Session",
    "YogaTutorial",
    "YogaPoseFeedback",
    "StartupProfile",
    "MetricEntry",
    "MeetingRequest",
  ];

  for (const modelName of modelNames) {
    await import(`./models/${modelName}.js`);
  }

  // -------------------
  // Use Routes
  // -------------------
  app.use("/api/users", userRoutes);
  app.use("/api/startups", startupRoutes);
  app.use("/api/documents", documentRoutes);
  app.use("/api/applications", applicationRoutes);
  app.use("/api/requirements", requirementRoutes); // ✅ NEW
  app.use("/product", productRoutes);
  app.use("/api/investments", investmentRoutes);
  app.use("/api", dashboardRoutes); // ✅ Dashboard
  app.use("/api/conversations", conversationRoutes); // ✅ Chat/Video
  app.use("/api/meet", meetingRoutes);
  app.use(mediaUploadRoutes);
  // -------------------
  // Health Check Route
  // -------------------
  app.get("/health", (req, res) => {
    res.json({
      status: "OK",
      message: "Server & DB connected, models loaded 🚀",
    });
  });

  // -------------------
  // Error Handling Middleware
  // -------------------
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export default createApp;
