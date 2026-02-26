// src/controllers/startupController.js
import Startup from "../models/Startup.js";
import { sendEmail } from "../utils/sendEmail.js";

async function createStartup(req, res) {
  try {
    const {
      name,
      founder_name,
      email,
      phone_number,
      startup_type,
      description,
      website,
      address,
    } = req.body;
    const startup = await Startup.create({
      user_id: req.user._id,
      name,
      founder_name,
      email,
      phone_number,
      startup_type,
      description,
      website,
      address,
    });
    res.status(201).json({ message: "Startup created", startup });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Create startup failed", error: err.message });
  }
}

async function getMyStartups(req, res) {
  const startups = await Startup.find({ user_id: req.user._id });
  res.json({ startups });
}

async function getStartupById(req, res) {
  const s = await Startup.findById(req.params.id);
  if (!s) return res.status(404).json({ message: "Not found" });
  res.json(s);
}

/**
 * Separate API for Profit vs Expense bar graph.
 * Returns chart-ready labels + values.
 */
async function getProfitExpenseChart(req, res) {
  try {
    const startup = await Startup.findById(req.params.id)
      .select("user_id status profit_loss expenses")
      .lean();

    if (!startup) return res.status(404).json({ message: "Startup not found" });

    const role = req.user?.role;
    const isAdmin = role === "admin";
    const isGov = role === "gov_official" && req.user?.role_verified === true;
    const isInvestor = role === "investor";
    const isOwner = String(startup.user_id) === String(req.user?._id);

    if (!isAdmin && !isGov && !isInvestor && !isOwner) {
      return res.status(403).json({ message: "Forbidden" });
    }

    // Investors can only view approved startups.
    if (isInvestor && startup.status !== "approved") {
      return res.status(403).json({ message: "Forbidden: startup not approved" });
    }

    const profitLoss = Number(startup.profit_loss ?? 0) || 0;
    const expenses = Number(startup.expenses ?? 0) || 0;

    return res.json({
      success: true,
      chart: {
        type: "bar",
        title: "Profit vs Expense",
        currency: "INR",
        labels: ["Profit / Loss", "Expenses"],
        values: [profitLoss, expenses],
      },
    });
  } catch (err) {
    return res.status(500).json({
      message: "Failed to fetch profit/expense chart",
      error: err.message,
    });
  }
}

async function updateStartup(req, res) {
  const s = await Startup.findById(req.params.id);
  if (!s) return res.status(404).json({ message: "Not found" });
  if (s.user_id.toString() !== req.user._id.toString())
    return res.status(403).json({ message: "Not authorized" });
  Object.assign(s, req.body);
  await s.save();
  res.json({ message: "Updated", startup: s });
}

async function deleteStartup(req, res) {
  const s = await Startup.findById(req.params.id);
  if (!s) return res.status(404).json({ message: "Not found" });
  if (s.user_id.toString() !== req.user._id.toString())
    return res.status(403).json({ message: "Not authorized" });
  await s.deleteOne();
  res.json({ message: "Deleted" });
}

/**
 * Update startup status (e.g. approve / reject) by a verified
 * government official or admin.
 */
async function updateStartupStatusByOfficial(req, res) {
  try {
    const isAdmin = req.user.role === "admin";
    const isGov =
      req.user.role === "gov_official" && req.user.role_verified === true;

    if (!isAdmin && !isGov) {
      return res.status(403).json({
        message: "Forbidden: only verified government officials or admins",
      });
    }

    const { status } = req.body || {};
    const allowedStatuses = [
      "pending",
      "under_review",
      "approved",
      "rejected",
      "inactive",
    ];

    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: "Invalid or missing status value",
      });
    }

    const startup = await Startup.findById(req.params.id);
    if (!startup) {
      return res.status(404).json({ message: "Startup not found" });
    }

    startup.status = status;
    startup.status_updated_at = new Date();
    await startup.save();

    // Notify startup owner via email (best-effort)
    try {
      await sendEmail({
        email: startup.email,
        subject: `Your AYUSH startup has been ${status.toUpperCase()}`,
        message: `Dear ${startup.founder_name}, your startup "${startup.name}" status has been updated to "${status}".`,
        html: `<p>Dear ${startup.founder_name},</p>
               <p>Your AYUSH startup <strong>${startup.name}</strong> status has been updated to 
               <strong style="text-transform:uppercase;">${status}</strong> by the government authority.</p>
               <p>Date: ${new Date(startup.status_updated_at).toLocaleString()}</p>
               <p>If you have any questions, please log in to the portal to view details.</p>
               <p>Regards,<br/>AYUSH Portal</p>`,
      });
    } catch (emailErr) {
      console.error("Failed to send startup status email:", emailErr);
    }

    return res.json({
      message: `Startup status updated to ${status}`,
      startup,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Failed to update startup status",
      error: err.message,
    });
  }
}

// List all startups for verified govt officials or admins
async function listStartupsForOfficials(req, res) {
  try {
    const isAdmin = req.user.role === "admin";
    const isGov = req.user.role === "gov_official" && req.user.role_verified === true;
    if (!isAdmin && !isGov) {
      return res.status(403).json({ message: "Forbidden: only verified officials/admin" });
    }

    const { status, q } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (q) {
      filter.$or = [
        { name: new RegExp(q, "i") },
        { founder_name: new RegExp(q, "i") },
        { email: new RegExp(q, "i") },
        { phone_number: new RegExp(q, "i") },
      ];
    }

    const items = await Startup
      .find(filter)
      .sort({ createdAt: -1 })
      .select("name founder_name email phone_number startup_type status createdAt")
      .lean();

    return res.json({ items });
  } catch (err) {
    return res.status(500).json({ message: "Failed to list startups", error: err.message });
  }
}

/**
 * List startups for investors with rich filtering.
 * This is less restrictive than the officials view but only exposes
 * investor-safe fields.
 */
async function listStartupsForInvestors(req, res) {
  try {
    if (req.user.role !== "investor") {
      return res
        .status(403)
        .json({ message: "Forbidden: only investors are allowed" });
    }

    const {
      category,
      profitStatus,
      minRevenue,
      maxRevenue,
      location,
      q,
    } = req.query;

    const filter = { status: "approved" }; // investors see only approved startups by default

    if (category) filter.startup_type = category;
    if (profitStatus) filter.financial_status = profitStatus;

    if (location) {
      const regex = new RegExp(location, "i");
      filter.$or = [
        { location: regex },
        { address: regex },
      ];
    }

    const revenueFilter = {};
    if (minRevenue) revenueFilter.$gte = Number(minRevenue);
    if (maxRevenue) revenueFilter.$lte = Number(maxRevenue);
    if (Object.keys(revenueFilter).length) {
      filter.revenue = revenueFilter;
    }

    if (q) {
      const regex = new RegExp(q, "i");
      filter.$or = [
        ...(filter.$or || []),
        { name: regex },
        { founder_name: regex },
      ];
    }

    const items = await Startup.find(filter)
      .sort({ createdAt: -1 })
      .select(
        "name founder_name startup_type status location address revenue financial_status revenue_history website description createdAt"
      )
      .lean();

    return res.json({ items });
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Failed to list startups for investors", error: err.message });
  }
}

export {
  createStartup,
  getMyStartups,
  getStartupById,
  getProfitExpenseChart,
  updateStartup,
  deleteStartup,
  listStartupsForOfficials,
  listStartupsForInvestors,
  updateStartupStatusByOfficial,
};
