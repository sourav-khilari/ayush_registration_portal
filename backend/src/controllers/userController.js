// src/controllers/userController.js
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const Document = require("../models/Document");
const { uploadToLocal } = require("../utils/storage");

// Register a new user
async function registerUser(req, res) {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ message: "Name, email, and password are required" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
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

    res.status(201).json({ message: "User registered", user, token });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Registration failed", error: err.message });
  }
}

// Login user
async function loginUser(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    res.json({ message: "Login successful", user, token });
  } catch (err) {
    res.status(500).json({ message: "Login failed", error: err.message });
  }
}

// Get profile (requires authMiddleware)
async function getProfile(req, res) {
  const u = await User.findById(req.user._id).populate("verification_docs");
  res.json(u);
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

  const user = await User.findByIdAndUpdate(req.user._id, updates, {
    new: true,
  });

  res.json({ message: "Profile updated", user });
}

// Upload a verification document to user's profile (e.g., gov_official proof)
async function uploadVerificationDoc(req, res) {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ message: "File required" });
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
    res.status(201).json({ message: "Verification doc uploaded", user, document: doc });
  } catch (err) {
    res.status(500).json({ message: "Upload failed", error: err.message });
  }
}

// Admin verifies a gov_official user
async function verifyGovOfficial(req, res) {
  try {
    const { user_id } = req.params;
    const user = await User.findById(user_id);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.role !== "gov_official") {
      return res.status(400).json({ message: "User is not a gov_official" });
    }
    user.role_verified = true;
    await user.save();
    res.json({ message: "Gov official verified", user });
  } catch (err) {
    res.status(500).json({ message: "Verification update failed", error: err.message });
  }
}

module.exports = { registerUser, loginUser, getProfile, updateProfile, uploadVerificationDoc, verifyGovOfficial };
