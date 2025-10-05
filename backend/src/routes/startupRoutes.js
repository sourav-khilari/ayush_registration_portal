// src/routes/startupRoutes.js
const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const ctr = require("../controllers/startupController");

router.post("/", auth, ctr.createStartup);
router.get("/mine", auth, ctr.getMyStartups);
router.get("/:id", auth, ctr.getStartupById);
router.put("/:id", auth, ctr.updateStartup);
router.delete("/:id", auth, ctr.deleteStartup);

module.exports = router;
