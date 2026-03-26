import express from "express";
import {
  createRequest,
  getRequests,
  acceptRequest,
  rejectRequest,
  getStatus,
} from "../controllers/meetingController.js";

import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/request", authMiddleware, createRequest);
router.get("/requests", authMiddleware, getRequests);
router.post("/accept/:id", authMiddleware, acceptRequest);
router.post("/reject/:id", authMiddleware, rejectRequest);
router.get("/status/:id", authMiddleware, getStatus);

export default router;
