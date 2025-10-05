const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

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
[
  "User",
  "Startup",
  "Application",
  "Document",
  "DocumentRequirement",
  "Product",
  "Investment",
  "Investor",
  "GovernmentOfficial",
  "Session",
  "YogaTutorial",
  "YogaPoseFeedback",
].forEach((model) => require(`./models/${model}`));

// -------------------
// Import Routes
// -------------------
const userRoutes = require("./routes/userRoutes");
const startupRoutes = require("./routes/startupRoutes");
const documentRoutes = require("./routes/documentRoutes");
const applicationRoutes = require("./routes/applicationRoutes");
const requirementRoutes = require("./routes/requirementRoutes"); // ✅ NEW

// -------------------
// Use Routes
// -------------------
app.use("/api/users", userRoutes);
app.use("/api/startups", startupRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/applications", applicationRoutes);
app.use("/api/requirements", requirementRoutes); // ✅ NEW

// -------------------
// Health Check Route
// -------------------
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    message: "Server & DB connected, models loaded 🚀",
  });
});

module.exports = app;
