import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
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

async function createApp() {
  const app = express();

  // -------------------
  // Middleware
  // -------------------
  app.use(cors());
  app.use(express.json());
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));

  // Serve uploaded files statically
  app.use(
    "/uploads",
    express.static(
      path.join(__dirname, "..", process.env.UPLOAD_DIR || "public/uploads")
    )
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
  // Handle 404 for undefined routes
  app.use(notFoundHandler);

  // Global error handler (must be last)
  app.use(errorHandler);

  return app;
}

export default createApp;
