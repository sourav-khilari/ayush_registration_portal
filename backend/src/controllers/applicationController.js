// src/controllers/applicationController.js
import Application from "../models/Application.js";
import Startup from "../models/Startup.js"; // <- needed to check ownership
import Document from "../models/Document.js";
import DocumentRequirement from "../models/DocumentRequirement.js";
import User from "../models/User.js";

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

// Get applications for startup owner
async function getMyApplications(req, res) {
  try {
    // Get all startups owned by the user (include status)
    const startups = await Startup.find({ user_id: req.user._id }).select("_id name founder_name email status").lean();
    const startupIds = startups.map(s => s._id);

    if (startupIds.length === 0) {
      return res.json({ success: true, applications: [] });
    }

    const { status, sector, application_type } = req.query;
    const filter = { startup_id: { $in: startupIds } };
    
    if (status) filter.status = status;
    if (sector) filter.sector = sector;
    if (application_type) filter.application_type = application_type;

    // Get existing Application records
    let applications = await Application
      .find(filter)
      .sort({ createdAt: -1 })
      .populate({
        path: "documents",
        select: "doc_category_declared verified_status ocr_status document_name fileUrl rejection_reason verified_at createdAt"
      })
      .populate({
        path: "startup_id",
        select: "name founder_name email"
      })
      .populate({
        path: "assigned_official",
        select: "name email"
      })
      .lean();

    // Also find startups that have documents but no Application record
    // Group documents by startup_id to find startups with documents
    const docsByStartup = await Document.aggregate([
      { $match: { startup_id: { $in: startupIds }, application_id: null } },
      { $group: { _id: "$startup_id", docs: { $push: "$$ROOT" }, firstDoc: { $first: "$$ROOT" } } }
    ]);

    // For each startup with documents but no application, create a virtual application entry
    for (const group of docsByStartup) {
      const startupId = group._id;
      const startup = startups.find(s => String(s._id) === String(startupId));
      if (!startup) continue;

      // Check if we already have an application for this startup
      const hasApp = applications.some(app => String(app.startup_id?._id || app.startup_id) === String(startupId));
      if (hasApp) continue;

      // Get documents for this startup
      const docs = await Document.find({ startup_id: startupId, application_id: null })
        .select("doc_category_declared verified_status ocr_status document_name fileUrl rejection_reason verified_at createdAt")
        .lean();

      // Try to infer sector and application_type from documents or use defaults
      // Look for common patterns in document categories
      let inferredSector = sector || null;
      let inferredType = application_type || "startup_registration";

      // Create a virtual application object
      // Use startup status if available, otherwise default to draft
      // Map startup status to application status: approved -> approved, rejected -> rejected, pending/under_review -> under_review, else -> draft
      let appStatus = "draft";
      if (startup.status === "approved") {
        appStatus = "approved";
      } else if (startup.status === "rejected") {
        appStatus = "rejected";
      } else if (startup.status === "pending" || startup.status === "under_review") {
        appStatus = "under_review";
      }
      
      const virtualApp = {
        _id: `virtual_${startupId}`,
        startup_id: { 
          _id: startup._id, 
          name: startup.name, 
          founder_name: startup.founder_name, 
          email: startup.email,
          status: startup.status 
        },
        sector: inferredSector || "ayurveda", // default
        application_type: inferredType,
        status: appStatus, // Use mapped startup status
        documents: docs,
        createdAt: docs.length > 0 ? docs[0].createdAt : new Date(),
        updatedAt: docs.length > 0 ? docs[docs.length - 1].createdAt : new Date(),
        isVirtual: true, // flag to indicate this is a virtual application
      };

      // Apply filters if provided
      if (sector && virtualApp.sector !== sector) continue;
      if (application_type && virtualApp.application_type !== application_type) continue;
      if (status && virtualApp.status !== status) continue;

      applications.push(virtualApp);
    }

    // Sort by createdAt descending
    applications.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
      const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
      return dateB - dateA;
    });

    return res.json({ success: true, applications });
  } catch (err) {
    console.error("getMyApplications error:", err);
    return res.status(500).json({ message: "Failed to fetch applications", error: err.message });
  }
}

// Get single application with full details for startup owner
async function getMyApplication(req, res) {
  try {
    const app = await Application.findById(req.params.id)
      .populate({
        path: "documents",
        select: "doc_category_declared doc_category_detected verified_status ocr_status document_name fileUrl filename file_size rejection_reason verified_at verified_by createdAt updatedAt extracted_fields"
      })
      .populate({
        path: "startup_id",
        select: "name founder_name email phone_number"
      })
      .populate({
        path: "assigned_official",
        select: "name email"
      })
      .populate({
        path: "review_history.by",
        select: "name email role"
      })
      .lean();

    if (!app) {
      return res.status(404).json({ message: "Application not found" });
    }

    // Verify ownership
    const startup = await Startup.findById(app.startup_id).select("user_id").lean();
    if (!startup || String(startup.user_id) !== String(req.user._id)) {
      return res.status(403).json({ message: "Not authorized to view this application" });
    }

    // Get document requirements to show what's required vs what's uploaded
    const requirements = await DocumentRequirement.findOne({
      sector: app.sector,
      application_type: app.application_type,
    }).lean();

    return res.json({
      success: true,
      application: app,
      requirements: requirements?.requirements || [],
    });
  } catch (err) {
    console.error("getMyApplication error:", err);
    return res.status(500).json({ message: "Failed to fetch application", error: err.message });
  }
}

export { 
  createApplication, 
  submitApplication, 
  getApplication, 
  listApplicationsForOfficials,
  getMyApplications,
  getMyApplication,
};
