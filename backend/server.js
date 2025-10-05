// server.js
require("dotenv").config();
const mongoose = require("mongoose");
const app = require("./src/app");

const PORT = process.env.PORT || 5002;
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error("MONGO_URI missing in .env");
  process.exit(1);
}

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB Connected");
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ DB Connection Error:", err.message);
    process.exit(1);
  });
