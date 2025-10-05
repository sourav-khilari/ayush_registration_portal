const express = require("express");
const router = express.Router();
const {
  getRequirementsBySector,
  getCommonRequirements,
} = require("../controllers/requirementController");

// Example: GET /api/requirements/ayurveda/startup_registration
router.get("/:sector/:application_type", getRequirementsBySector);
router.get("/:sector/:application_type/common", getCommonRequirements);

module.exports = router;
