// src/controllers/authController.js
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { 
  asyncHandler, 
  ValidationError, 
  AuthenticationError, 
  ConflictError 
} from "../middleware/errorHandler.js";

const JWT_SECRET = process.env.JWT_SECRET || "changeit";
const JWT_EXPIRES = "7d";

async function register(req, res) {
  const { name, email, password, phone_number, role } = req.body;
  
  if (!name || !email || !password) {
    throw new ValidationError("Name, email and password are required");
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new ValidationError("Invalid email format");
  }

  // Validate password strength
  if (password.length < 6) {
    throw new ValidationError("Password must be at least 6 characters long");
  }

  const existing = await User.findOne({ email });
  if (existing) {
    throw new ConflictError("Email already exists");
  }

  const hashed = await bcrypt.hash(password, 10);
  const user = await User.create({
    name,
    email,
    password: hashed,
    phone_number,
    role,
  });

  const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES,
  });

  res.status(201).json({ 
    success: true,
    message: "User registered successfully", 
    user, 
    token 
  });
}

async function login(req, res) {
  const { email, password } = req.body;
  
  if (!email || !password) {
    throw new ValidationError("Email and password are required");
  }

  const user = await User.findOne({ email });
  if (!user) {
    throw new AuthenticationError("Invalid credentials");
  }

  const ok = await bcrypt.compare(password, user.password || "");
  if (!ok) {
    throw new AuthenticationError("Invalid credentials");
  }

  const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES,
  });
  
  user.last_login_at = new Date();
  await user.save();
  
  res.json({
    success: true,
    message: "Login successful",
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      role_verified: user.role_verified,
    },
  });
}

// Wrap functions with asyncHandler
const registerAsync = asyncHandler(register);
const loginAsync = asyncHandler(login);

export { registerAsync as register, loginAsync as login };
