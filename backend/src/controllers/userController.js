// src/controllers/userController.js
import User from "../models/User.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import Document from "../models/Document.js";
import { uploadToLocal } from "../utils/storage.js";
import { 
  asyncHandler, 
  ValidationError, 
  AuthenticationError, 
  ConflictError,
  NotFoundError 
} from "../middleware/errorHandler.js";

// Register a new user
async function registerUser(req, res) {
  const { name, email, password, role } = req.body;
  
  if (!name || !email || !password) {
    throw new ValidationError("Name, email, and password are required");
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

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new ConflictError("User already exists");
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await User.create({
    name,
    email,
    password: hashedPassword,
    role,
  });

  const token = jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    {
      expiresIn: "7d",
    }
  );

  res.status(201).json({ 
    success: true,
    message: "User registered successfully", 
    user, 
    token 
  });
}

// Login user
async function loginUser(req, res) {
  const { email, password } = req.body;
  
  if (!email || !password) {
    throw new ValidationError("Email and password are required");
  }

  const user = await User.findOne({ email });
  if (!user) {
    throw new AuthenticationError("Invalid credentials");
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new AuthenticationError("Invalid credentials");
  }

  const token = jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    {
      expiresIn: "7d",
    }
  );

  res.json({ 
    success: true,
    message: "Login successful", 
    user, 
    token 
  });
}

// Get profile (requires authMiddleware)
async function getProfile(req, res) {
  const user = await User.findById(req.user._id).populate("verification_docs");
  if (!user) {
    throw new NotFoundError("User");
  }
  
  res.json({
    success: true,
    user
  });
}

// Update profile (requires authMiddleware)
async function updateProfile(req, res) {
  const allowed = [
    "name",
    "phone_number",
    "organization",
    "investment_sector",
    "designation",
    "department",
    "profile_meta",
    "avatar_url",
  ];

  const updates = {};
  for (const k of Object.keys(req.body)) {
    if (allowed.includes(k)) updates[k] = req.body[k];
  }

  if (Object.keys(updates).length === 0) {
    throw new ValidationError("No valid fields to update");
  }

  const user = await User.findByIdAndUpdate(req.user._id, updates, {
    new: true,
  });

  if (!user) {
    throw new NotFoundError("User");
  }

  res.json({ 
    success: true,
    message: "Profile updated successfully", 
    user 
  });
}

// Upload a verification document to user's profile (e.g., gov_official proof)
async function uploadVerificationDoc(req, res) {
  const file = req.file;
  if (!file) {
    throw new ValidationError("File is required");
  }

  // Validate file size (e.g., 5MB limit for verification docs)
  const maxFileSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxFileSize) {
    throw new ValidationError("File size exceeds 5MB limit");
  }

  // Validate file type
  const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
  if (!allowedTypes.includes(file.mimetype)) {
    throw new ValidationError("Only PDF, JPEG, and PNG files are allowed");
  }

  const fileUrl = await uploadToLocal(file.path, file.originalname);
  const doc = await Document.create({
    uploaded_by: req.user._id,
    doc_category_declared: "user_verification",
    document_name: file.originalname,
    fileUrl,
    filename: file.originalname,
    file_size: file.size,
  });
  
  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $addToSet: { verification_docs: doc._id } },
    { new: true }
  ).populate("verification_docs");
  
  res.status(201).json({ 
    success: true,
    message: "Verification document uploaded successfully", 
    user, 
    document: doc 
  });
}

// Admin verifies a gov_official user
async function verifyGovOfficial(req, res) {
  const { user_id } = req.params;
  
  const user = await User.findById(user_id);
  if (!user) {
    throw new NotFoundError("User");
  }
  
  if (user.role !== "gov_official") {
    throw new ValidationError("User is not a government official");
  }
  
  user.role_verified = true;
  await user.save();
  
  res.json({ 
    success: true,
    message: "Government official verified successfully", 
    user 
  });
}

// Wrap functions with asyncHandler
const registerUserAsync = asyncHandler(registerUser);
const loginUserAsync = asyncHandler(loginUser);
const getProfileAsync = asyncHandler(getProfile);
const updateProfileAsync = asyncHandler(updateProfile);
const uploadVerificationDocAsync = asyncHandler(uploadVerificationDoc);
const verifyGovOfficialAsync = asyncHandler(verifyGovOfficial);

export { 
  registerUserAsync as registerUser, 
  loginUserAsync as loginUser, 
  getProfileAsync as getProfile, 
  updateProfileAsync as updateProfile, 
  uploadVerificationDocAsync as uploadVerificationDoc, 
  verifyGovOfficialAsync as verifyGovOfficial 
};
