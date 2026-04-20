import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { AuthenticationError } from "./errorHandler.js";

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      throw new AuthenticationError("No token provided");
    }

    let decoded;

    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        throw new AuthenticationError("Token expired, please login again");
      }
      throw new AuthenticationError("Invalid token");
    }

    const user = await User.findById(decoded.id);

    if (!user) {
      throw new AuthenticationError("User not found");
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

export default authMiddleware;
