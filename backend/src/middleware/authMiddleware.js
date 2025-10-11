// src/middleware/authMiddleware.js
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { AuthenticationError } from "./errorHandler.js";

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    if (!token) {
      throw new AuthenticationError("No token provided");
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      throw new AuthenticationError("User not found");
    }

    req.user = user; // attach user to request
    next();
  } catch (error) {
    next(error);
  }
};

export default authMiddleware;
