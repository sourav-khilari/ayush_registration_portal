// src/controllers/applicationController.js
const Application = require("../models/Application");
const Startup = require("../models/Startup"); // <- needed to check ownership
const DocumentRequirement = require("../models/DocumentRequirement");
const User = require("../models/User");

async function createApplication(req, res) {
  try {
    const { startup_id, sector, application_type, application_data } = req.body;
    if (!startup_id || !sector || !application_type)
      return res.status(400).json({ message: "Missing fields" });

    const app = await Application.create({
      startup_id,
      sector,
      application_type,
      application_data,
    });

    return res
      .status(201)
      .json({ message: "Application created", application: app });
  } catch (err) {
    console.error("createApplication error:", err);
    return res
      .status(500)
      .json({ message: "Create failed", error: err.message });
  }
}

async function submitApplication(req, res) {
  try {
    // load application and the startup (to check owner)
    const app = await Application.findById(req.params.id);
    if (!app) return res.status(404).json({ message: "Application not found" });

    const startup = await Startup.findById(app.startup_id).select("user_id");
    if (!startup) return res.status(404).json({ message: "Startup not found" });

    // Only the startup owner or admin can submit
    const isOwner = String(startup.user_id) === String(req.user._id);
    const isAdmin = req.user.role === "admin";
    if (!isOwner && !isAdmin) {
      return res
        .status(403)
        .json({ message: "Not authorised to submit this application" });
    }

    // Decide whether to require verified documents before submission:
    // Require verification for regulated types; relax for startup_registration
    const requireVerified = app.application_type !== "startup_registration";

    // Check required documents (the method returns { complete, missing, details })
    const { complete, missing, details } = await app.checkRequiredDocuments({
      require_verified: requireVerified,
    });

    if (!complete) {
      return res.status(400).json({
        message: "Missing or unverified required documents",
        requireVerified,
        missing,
        details,
      });
    }

    // All good — update application status to submitted
    app.status = "submitted";
    app.submitted_at = new Date();
    app.review_history = app.review_history || [];
    app.review_history.push({
      action: "submitted",
      by: req.user._id,
      by_role: req.user.role || "user",
      comment: req.body.comment || "",
      at: new Date(),
    });

    await app.save();

    return res.json({ message: "Application submitted", application: app });
  } catch (err) {
    console.error("submitApplication error:", err);
    return res
      .status(500)
      .json({ message: "Submit failed", error: err.message });
  }
}

async function getApplication(req, res) {
  try {
    const app = await Application.findById(req.params.id).populate("documents");
    if (!app) return res.status(404).json({ message: "Not found" });
    return res.json(app);
  } catch (err) {
    console.error("getApplication error:", err);
    return res
      .status(500)
      .json({ message: "Failed to fetch application", error: err.message });
  }
}

// List applications for govt officials/admins
async function listApplicationsForOfficials(req, res) {
  try {
    const isAdmin = req.user.role === "admin";
    const isGov = req.user.role === "gov_official" && req.user.role_verified === true;
    if (!isAdmin && !isGov) {
      return res.status(403).json({ message: "Forbidden: only verified officials/admin" });
    }

    const { status, sector, application_type, q } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (sector) filter.sector = sector;
    if (application_type) filter.application_type = application_type;

    // simple text search across some fields
    if (q) filter.$or = [
      { reviewer_comment: new RegExp(q, "i") },
      { "application_data.name": new RegExp(q, "i") },
      { "application_data.startup_name": new RegExp(q, "i") },
    ];

    const apps = await Application
      .find(filter)
      .sort({ createdAt: -1 })
      .populate({ path: "documents", select: "doc_category_declared doc_category_detected verified_status page_images page_count" })
      .populate({ path: "startup_id", select: "name founder_name email phone_number" })
      .lean();

    return res.json({ items: apps });
  } catch (err) {
    console.error("listApplicationsForOfficials error:", err);
    return res.status(500).json({ message: "Failed to list applications", error: err.message });
  }
}

module.exports = { createApplication, submitApplication, getApplication, listApplicationsForOfficials };
