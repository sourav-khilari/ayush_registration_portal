import express from "express";
import auth from "../middleware/authMiddleware.js";
import {
  createInvestment,
  listMyInvestments,
} from "../controllers/investmentController.js";

const router = express.Router();

// Logged-in investors can create and view their investments
router.post("/", auth, createInvestment);
router.get("/my", auth, listMyInvestments);

export default router;

