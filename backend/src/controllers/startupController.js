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

module.exports = {
  createStartup,
  getMyStartups,
  getStartupById,
  updateStartup,
  deleteStartup,
};
