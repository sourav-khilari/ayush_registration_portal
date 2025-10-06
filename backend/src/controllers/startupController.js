// src/controllers/startupController.js
const Startup = require("../models/Startup");

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

module.exports = {
  createStartup,
  getMyStartups,
  getStartupById,
  updateStartup,
  deleteStartup,
  listStartupsForOfficials,
};
