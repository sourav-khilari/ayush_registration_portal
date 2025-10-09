import express from "express";
import {
  getRequirementsBySector,
  getCommonRequirements,
} from "../controllers/requirementController.js";

const router = express.Router();

// Example: GET /api/requirements/ayurveda/startup_registration
router.get("/:sector/:application_type", getRequirementsBySector);
router.get("/:sector/:application_type/common", getCommonRequirements);

export default router;
