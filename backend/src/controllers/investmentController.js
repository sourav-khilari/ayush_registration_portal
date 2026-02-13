import Investment from "../models/Investment.js";
import Investor from "../models/Investor.js";
import Startup from "../models/Startup.js";

/**
 * Ensure there is an Investor document linked to the current user.
 * This keeps the API easy to use from the frontend – we only need the JWT.
 */
async function ensureInvestorForUser(user) {
  let investor = await Investor.findOne({ user_id: user._id });
  if (!investor) {
    investor = await Investor.create({
      user_id: user._id,
      organization: user.organization,
      investment_sector: user.investment_sector,
    });
  }
  return investor;
}

/**
 * POST /api/investments
 * Body: { startup_id, amount, stake_percentage?, investment_type?, meta? }
 */
export async function createInvestment(req, res) {
  try {
    if (req.user.role !== "investor") {
      return res
        .status(403)
        .json({ message: "Only investors can create investments" });
    }

    const { startup_id, amount, stake_percentage, investment_type, meta } =
      req.body || {};

    if (!startup_id || !amount) {
      return res
        .status(400)
        .json({ message: "startup_id and amount are required" });
    }

    const startup = await Startup.findById(startup_id);
    if (!startup) {
      return res.status(404).json({ message: "Startup not found" });
    }

    const investor = await ensureInvestorForUser(req.user);

    const investment = await Investment.create({
      startup_id: startup._id,
      investor_id: investor._id,
      amount,
      stake_percentage,
      investment_type,
      meta,
    });

    return res
      .status(201)
      .json({ message: "Investment created", investment });
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Failed to create investment", error: err.message });
  }
}

/**
 * GET /api/investments/my
 * List the logged-in investor's investments.
 */
export async function listMyInvestments(req, res) {
  try {
    if (req.user.role !== "investor") {
      return res
        .status(403)
        .json({ message: "Only investors can view investments" });
    }

    const investor = await ensureInvestorForUser(req.user);

    const items = await Investment.find({ investor_id: investor._id })
      .populate("startup_id", "name startup_type location revenue")
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ items });
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Failed to list investments", error: err.message });
  }
}

