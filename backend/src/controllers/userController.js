// src/controllers/userController.js
import User from "../models/User.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import Document from "../models/Document.js";
import VerificationOTP from "../models/VerificationOTP.js";
import GovernmentOfficial from "../models/GovernmentOfficial.js";
import Startup from "../models/Startup.js";
import Application from "../models/Application.js";
import Conversation from "../models/Conversation.js";
import MeetingRequest from "../models/MeetingRequest.js";
import Session from "../models/Session.js";
import Investor from "../models/Investor.js";
import Investment from "../models/Investment.js";
import YogaTutorial from "../models/YogaTutorial.js";
import YogaPoseFeedback from "../models/YogaPoseFeedback.js";
import crypto from "crypto";
import fetch from "node-fetch";
import {
  uploadToLocal,
  resolveFileUrlToPath,
  processDocumentForImages,
} from "../utils/storage.js";
import { processOCRAndExtract } from "../utils/ocrProcessor.js";
import { sendEmail } from "../utils/sendEmail.js";
import { 
  asyncHandler, 
  ValidationError, 
  AuthenticationError, 
  ConflictError,
  NotFoundError 
} from "../middleware/errorHandler.js";

const DEFAULT_SIGNUP_OTP_EMAIL = "anishpanj026@gmail.com";

// Register a new user
async function registerUser(req, res) {
  const { name, email, password, role, otp } = req.body;
  const panCardFile =
    req?.files?.pan_card_file?.[0] || req?.file || null;
  const govAadhaarFile = req?.files?.gov_aadhaar_file?.[0] || null;
  
  if (!name || !email || !password) {
    throw new ValidationError("Name, email, and password are required");
  }
  if (!otp) {
    throw new ValidationError("OTP is required for email verification");
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

  // Lock down admin registration to configured credentials
  if (role === "admin") {
    const allowedEmail = process.env.ADMIN_EMAIL;
    const allowedPassword = process.env.ADMIN_PASSWORD;
    if (allowedEmail && email !== allowedEmail) {
      throw new ValidationError(
        "Admins must use the configured admin email address"
      );
    }
    if (allowedPassword && password !== allowedPassword) {
      throw new ValidationError(
        "Invalid admin password. Please use the configured admin credentials."
      );
    }
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new ConflictError("User already exists");
  }

  const otpRecord = await VerificationOTP.findOne({
    email: DEFAULT_SIGNUP_OTP_EMAIL,
    used: false,
    "meta.purpose": "signup_email_verification",
    "meta.signupEmail": String(email).toLowerCase(),
  }).sort({ createdAt: -1 });

  if (!otpRecord) {
    throw new ValidationError("OTP not found. Please request a new OTP.");
  }

  if (otpRecord.expiresAt < new Date()) {
    throw new ValidationError("OTP expired. Please request a new OTP.");
  }

  const incomingOtpHash = crypto.createHash("sha256").update(String(otp)).digest("hex");
  if (incomingOtpHash !== otpRecord.otp_hash) {
    throw new ValidationError("Invalid OTP");
  }

  if (role === "investor" && !panCardFile) {
    throw new ValidationError("PAN card is required for investor registration");
  }
  if (role === "gov_official" && !govAadhaarFile) {
    throw new ValidationError("Aadhaar card is required for government official registration");
  }
  if (role === "investor" && panCardFile) {
    const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];
    if (!allowedTypes.includes(panCardFile.mimetype)) {
      throw new ValidationError("PAN card must be a PDF, JPEG, or PNG file");
    }
  }
  if (role === "gov_official" && govAadhaarFile) {
    const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];
    if (!allowedTypes.includes(govAadhaarFile.mimetype)) {
      throw new ValidationError("Aadhaar card must be a PDF, JPEG, or PNG file");
    }
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await User.create({
    name,
    email,
    password: hashedPassword,
    role,
  });

  otpRecord.used = true;
  await otpRecord.save();

  if (role === "investor" && panCardFile) {
    const { fileUrl, username } = await uploadToLocal(
      panCardFile.path,
      panCardFile.originalname,
      email
    );

    const panDoc = await Document.create({
      uploaded_by: user._id,
      doc_category_declared: "pan",
      document_name: "Investor PAN Card",
      fileUrl,
      filename: panCardFile.originalname,
      file_size: panCardFile.size,
      ocr_status: "pending",
      verified_status: "pending",
      meta: { signupUpload: true, role: "investor" },
    });

    try {
      const storedAbsPath = resolveFileUrlToPath(fileUrl);
      const pageImages = await processDocumentForImages(
        storedAbsPath,
        panCardFile.originalname,
        username
      );

      panDoc.page_images = pageImages;
      panDoc.page_count = pageImages.length;
      panDoc.ocr_status = "processing";
      await panDoc.save();

      const { ocrResults, extractedData: rawExtracted } = await processOCRAndExtract(
        pageImages,
        "pan"
      );
      const extractedData = rawExtracted || {};

      if (extractedData.ocr_failed || !ocrResults || ocrResults.length === 0) {
        panDoc.ocr_status = "failed";
        panDoc.verified_status = "error";
      } else {
        panDoc.ocr_status = "done";
      }

      panDoc.ocr_text = extractedData;
      panDoc.extracted_fields = {};
      for (const [key, value] of Object.entries(extractedData || {})) {
        panDoc.extracted_fields[key] = { value };
      }

      if (panDoc.ocr_status === "done") {
        const extractedPayload = {
          pan: extractedData.pan_number || extractedData.pan,
          name: extractedData.name,
          dob: extractedData.dob,
          ocr_confidence: extractedData.ocr_confidence || 0.8,
        };

        if (!extractedPayload.pan || !extractedPayload.name) {
          panDoc.verified_status = "rejected";
        } else {
          const verifyBase =
            process.env.DOC_VER_API_BASE ||
            "https://doc-ver-service.onrender.com/api/v1/verify";
          const verifyUrl = `${verifyBase}/pan`;

          try {
            const verifyResp = await fetch(verifyUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-api-key": process.env.DOC_VER_API_KEY,
              },
              body: JSON.stringify({
                request_id: `req-${panDoc._id}`,
                submitted_by: email,
                doc_type: "PAN",
                extracted: extractedPayload,
              }),
            });

            if (verifyResp.ok) {
              const verifyData = await verifyResp.json();
              panDoc.verified_status =
                verifyData?.status === "VERIFIED" ? "verified" : "rejected";
              panDoc.verification_response = verifyData;
            } else {
              const errText = await verifyResp.text();
              panDoc.verified_status = "error";
              panDoc.verification_response = { error: errText };
            }
          } catch (verifyErr) {
            panDoc.verified_status = "error";
            panDoc.verification_response = { error: verifyErr.message };
          }
        }
      }

      await panDoc.save();
    } catch (err) {
      panDoc.ocr_status = "failed";
      panDoc.verified_status = "error";
      panDoc.verification_response = { error: err.message };
      await panDoc.save();
    }

    user.verification_docs = [...(user.verification_docs || []), panDoc._id];
    user.role_verified = panDoc.verified_status === "verified";
    await user.save();

    if (user.role_verified) {
      await sendEmail({
        email: "anishpanj026@gmail.com",
        subject: "Investor verification successful",
        message:
          "Your PAN verification is successful. You are now marked as a genuine investor and can access the investor section.",
      });
    }
  }

  if (role === "gov_official" && govAadhaarFile) {
    const { fileUrl, username } = await uploadToLocal(
      govAadhaarFile.path,
      govAadhaarFile.originalname,
      email
    );

    const aadhaarDoc = await Document.create({
      uploaded_by: user._id,
      doc_category_declared: "aadhaar",
      document_name: "Government Official Aadhaar",
      fileUrl,
      filename: govAadhaarFile.originalname,
      file_size: govAadhaarFile.size,
      ocr_status: "pending",
      verified_status: "pending",
      meta: { signupUpload: true, role: "gov_official" },
    });

    try {
      const storedAbsPath = resolveFileUrlToPath(fileUrl);
      const pageImages = await processDocumentForImages(
        storedAbsPath,
        govAadhaarFile.originalname,
        username
      );

      aadhaarDoc.page_images = pageImages;
      aadhaarDoc.page_count = pageImages.length;
      aadhaarDoc.ocr_status = "processing";
      await aadhaarDoc.save();

      const { ocrResults, extractedData: rawExtracted } = await processOCRAndExtract(
        pageImages,
        "aadhaar"
      );
      const extractedData = rawExtracted || {};

      if (extractedData.ocr_failed || !ocrResults || ocrResults.length === 0) {
        aadhaarDoc.ocr_status = "failed";
        aadhaarDoc.verified_status = "error";
      } else {
        aadhaarDoc.ocr_status = "done";
      }

      aadhaarDoc.ocr_text = extractedData;
      aadhaarDoc.extracted_fields = {};
      for (const [key, value] of Object.entries(extractedData || {})) {
        aadhaarDoc.extracted_fields[key] = { value };
      }

      if (aadhaarDoc.ocr_status === "done") {
        const extractedPayload = {
          aadhaar_last4:
            extractedData.aadhaar_last4 ||
            (extractedData.document_number
              ? String(extractedData.document_number).slice(-4)
              : undefined),
          name: extractedData.name,
          dob: extractedData.dob,
          ocr_confidence: extractedData.ocr_confidence || 0.8,
        };

        if (!extractedPayload.aadhaar_last4 || !extractedPayload.name) {
          aadhaarDoc.verified_status = "rejected";
        } else {
          const verifyBase =
            process.env.DOC_VER_API_BASE ||
            "https://doc-ver-service.onrender.com/api/v1/verify";
          const verifyUrl = `${verifyBase}/aadhaar`;

          try {
            const verifyResp = await fetch(verifyUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-api-key": process.env.DOC_VER_API_KEY,
              },
              body: JSON.stringify({
                request_id: `req-${aadhaarDoc._id}`,
                submitted_by: email,
                doc_type: "AADHAAR",
                extracted: extractedPayload,
              }),
            });

            if (verifyResp.ok) {
              const verifyData = await verifyResp.json();
              aadhaarDoc.verified_status =
                verifyData?.status === "VERIFIED" ? "verified" : "rejected";
              aadhaarDoc.verification_response = verifyData;
            } else {
              const errText = await verifyResp.text();
              aadhaarDoc.verified_status = "error";
              aadhaarDoc.verification_response = { error: errText };
            }
          } catch (verifyErr) {
            aadhaarDoc.verified_status = "error";
            aadhaarDoc.verification_response = { error: verifyErr.message };
          }
        }
      }

      await aadhaarDoc.save();
    } catch (err) {
      aadhaarDoc.ocr_status = "failed";
      aadhaarDoc.verified_status = "error";
      aadhaarDoc.verification_response = { error: err.message };
      await aadhaarDoc.save();
    }

    user.verification_docs = [...(user.verification_docs || []), aadhaarDoc._id];
    user.role_verified = false; // always requires admin approval after OCR verification
    await user.save();

    await GovernmentOfficial.updateOne(
      { user_id: user._id },
      { $set: { user_id: user._id }, $addToSet: { verification_docs: aadhaarDoc._id } },
      { upsert: true }
    );
  }

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

async function sendSignupOtp(req, res) {
  const signupEmail = String(req.body?.signupEmail || req.body?.email || "")
    .trim()
    .toLowerCase();

  if (!signupEmail) {
    throw new ValidationError("Signup email is required");
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(signupEmail)) {
    throw new ValidationError("Invalid email format");
  }

  const existingUser = await User.findOne({ email: signupEmail });
  if (existingUser) {
    throw new ConflictError("User already exists");
  }

  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const otpHash = crypto.createHash("sha256").update(otp).digest("hex");
  const expiryMinutes = parseInt(process.env.OTP_EXPIRY_MINUTES || "5", 10);
  const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

  await VerificationOTP.create({
    email: DEFAULT_SIGNUP_OTP_EMAIL,
    otp_hash: otpHash,
    expiresAt,
    meta: {
      purpose: "signup_email_verification",
      signupEmail,
    },
  });

  await sendEmail({
    email: DEFAULT_SIGNUP_OTP_EMAIL,
    subject: "AYUSH signup verification OTP",
    message: `Your OTP for AYUSH signup is ${otp}. It expires in ${expiryMinutes} minutes.`,
  });

  res.json({
    success: true,
    message: `OTP sent to ${DEFAULT_SIGNUP_OTP_EMAIL}`,
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

  // Extra safety: admin logins must use configured admin email and password
  if (user.role === "admin") {
    const allowedEmail = process.env.ADMIN_EMAIL;
    if (allowedEmail && user.email !== allowedEmail) {
      throw new AuthenticationError("Invalid credentials");
    }
    // Admin password from env must match (admin is not stored with bcrypt in env)
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (adminPassword && password !== adminPassword) {
      throw new AuthenticationError("Invalid credentials");
    }
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

// Admin lists government officials (for verification)
async function listGovOfficials(req, res) {
  const { verified } = req.query; // optional filter: true/false
  
  const filter = { role: "gov_official" };
  if (verified !== undefined) {
    filter.role_verified = verified === "true";
  }
  
  const officials = await User.find(filter)
    .select("_id name email role role_verified createdAt verification_docs")
    .populate({
      path: "verification_docs",
      select: "document_name fileUrl createdAt"
    })
    .sort({ createdAt: -1 })
    .lean();
  
  res.json({ 
    success: true,
    officials 
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

  await GovernmentOfficial.updateOne(
    { user_id: user._id },
    {
      $set: {
        user_id: user._id,
        verified_by: req.user?._id || null,
        verified_at: new Date(),
      },
    },
    { upsert: true }
  );
  
  res.json({ 
    success: true,
    message: "Government official verified successfully", 
    user 
  });
}

// Admin rejects a gov_official user (revokes approval)
async function rejectGovOfficial(req, res) {
  const { user_id } = req.params;

  const user = await User.findById(user_id);
  if (!user) {
    throw new NotFoundError("User");
  }

  if (user.role !== "gov_official") {
    throw new ValidationError("User is not a government official");
  }

  user.role_verified = false;
  await user.save();

  await GovernmentOfficial.updateOne(
    { user_id: user._id },
    {
      $set: {
        user_id: user._id,
        verified_by: null,
        verified_at: null,
      },
    },
    { upsert: true },
  );

  res.json({
    success: true,
    message: "Government official rejected successfully",
    user,
  });
}

// Admin: list all users with docs
async function listAllUsers(req, res) {
  const users = await User.find({})
    .select(
      "_id name email role role_verified is_active last_login_at createdAt verification_docs organization investment_sector designation department"
    )
    .populate({
      path: "verification_docs",
      select: "_id document_name doc_category_declared verified_status ocr_status fileUrl createdAt",
    })
    .sort({ createdAt: -1 })
    .lean();

  res.json({ success: true, users });
}

// Admin: delete any user
async function deleteUserByAdmin(req, res) {
  const { user_id } = req.params;
  const user = await User.findById(user_id);
  if (!user) throw new NotFoundError("User");

  // If this user owns startups, cascade delete related records.
  const ownedStartups = await Startup.find({ user_id: user._id })
    .select("_id")
    .lean();
  const ownedStartupIds = ownedStartups.map((s) => s._id);

  // Investor profile id (if any) is required to delete investments
  const investorProfile = await Investor.findOne({ user_id: user._id })
    .select("_id")
    .lean();

  await Promise.all([
    // Docs uploaded by user + docs tied to startups/applications owned by user
    Document.deleteMany({
      $or: [
        { uploaded_by: user._id },
        ...(ownedStartupIds.length ? [{ startup_id: { $in: ownedStartupIds } }] : []),
      ],
    }),

    // Applications for startups owned by user
    ownedStartupIds.length
      ? Application.deleteMany({ startup_id: { $in: ownedStartupIds } })
      : Promise.resolve(),

    // Conversations for startups owned by user OR where user is participant
    Conversation.deleteMany({
      $or: [
        { participants: user._id },
        ...(ownedStartupIds.length ? [{ startup_id: { $in: ownedStartupIds } }] : []),
      ],
    }),

    // Meeting requests where user is sender/receiver or startup matches
    MeetingRequest.deleteMany({
      $or: [
        { senderId: user._id },
        { receiverId: user._id },
        ...(ownedStartupIds.length ? [{ startupId: { $in: ownedStartupIds } }] : []),
      ],
    }),

    // Sessions where user participated or startup matches
    Session.deleteMany({
      $or: [
        { participants: user._id },
        ...(ownedStartupIds.length ? [{ startup_id: { $in: ownedStartupIds } }] : []),
      ],
    }),

    // Investment relations
    investorProfile?._id
      ? Investment.deleteMany({ investor_id: investorProfile._id })
      : Promise.resolve(),
    ownedStartupIds.length
      ? Investment.deleteMany({ startup_id: { $in: ownedStartupIds } })
      : Promise.resolve(),

    // Investor/government official profile records
    Investor.deleteOne({ user_id: user._id }),
    GovernmentOfficial.deleteOne({ user_id: user._id }),

    // OTPs tied to email
    VerificationOTP.deleteMany({ email: user.email }),

    // Yoga module relations (safe cleanup)
    YogaTutorial.deleteMany({ uploaded_by: user._id }),
    YogaPoseFeedback.deleteMany({ user_id: user._id }),
  ]);

  // Finally delete owned startups, then user
  if (ownedStartupIds.length) {
    await Startup.deleteMany({ _id: { $in: ownedStartupIds } });
  }
  await user.deleteOne();

  res.json({ success: true, message: "User deleted successfully" });
}

// Admin: system activity summary
async function getSystemActivity(req, res) {
  const [totalUsers, roleStats, recentUsers, recentVerifiedDocs] =
    await Promise.all([
      User.countDocuments({}),
      User.aggregate([
        { $group: { _id: "$role", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      User.find({})
        .select("_id name email role last_login_at createdAt")
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
      Document.find({})
        .select("_id document_name doc_category_declared verified_status ocr_status uploaded_by createdAt")
        .sort({ createdAt: -1 })
        .limit(20)
        .populate({ path: "uploaded_by", select: "name email role" })
        .lean(),
    ]);

  res.json({
    success: true,
    summary: {
      total_users: totalUsers,
      by_role: roleStats,
      recent_users: recentUsers,
      recent_documents: recentVerifiedDocs,
    },
  });
}

// Wrap functions with asyncHandler
const registerUserAsync = asyncHandler(registerUser);
const loginUserAsync = asyncHandler(loginUser);
const getProfileAsync = asyncHandler(getProfile);
const updateProfileAsync = asyncHandler(updateProfile);
const uploadVerificationDocAsync = asyncHandler(uploadVerificationDoc);
const listGovOfficialsAsync = asyncHandler(listGovOfficials);
const verifyGovOfficialAsync = asyncHandler(verifyGovOfficial);
const rejectGovOfficialAsync = asyncHandler(rejectGovOfficial);
const sendSignupOtpAsync = asyncHandler(sendSignupOtp);
const listAllUsersAsync = asyncHandler(listAllUsers);
const deleteUserByAdminAsync = asyncHandler(deleteUserByAdmin);
const getSystemActivityAsync = asyncHandler(getSystemActivity);

export { 
  sendSignupOtpAsync as sendSignupOtp,
  registerUserAsync as registerUser, 
  loginUserAsync as loginUser, 
  getProfileAsync as getProfile, 
  updateProfileAsync as updateProfile, 
  uploadVerificationDocAsync as uploadVerificationDoc,
  listGovOfficialsAsync as listGovOfficials,
  verifyGovOfficialAsync as verifyGovOfficial,
  rejectGovOfficialAsync as rejectGovOfficial,
  listAllUsersAsync as listAllUsers,
  deleteUserByAdminAsync as deleteUserByAdmin,
  getSystemActivityAsync as getSystemActivity,
};
