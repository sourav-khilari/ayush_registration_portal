// src/controllers/startupController.js
import Startup from "../models/Startup.js";
import { sendEmail } from "../utils/sendEmail.js";
import Document from "../models/Document.js";
import { generateStartupCertificatePdf } from "../utils/certificate.js";
import PDFDocument from "pdfkit";

function toNum(v, d = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
}

function normalizeRevenueSeries(startup) {
  const monthly = Array.isArray(startup.revenue_monthly)
    ? startup.revenue_monthly
        .filter((r) => r?.period && r?.value != null)
        .map((r) => ({ label: String(r.period), value: toNum(r.value, 0) }))
        .sort((a, b) => a.label.localeCompare(b.label))
    : [];

  if (monthly.length) return monthly;

  const yearly = Array.isArray(startup.revenue_history)
    ? startup.revenue_history
        .filter((r) => r?.year != null && r?.value != null)
        .map((r) => ({ label: String(r.year), value: toNum(r.value, 0) }))
        .sort((a, b) => a.label.localeCompare(b.label))
    : [];

  if (yearly.length) return yearly;
  if (startup.revenue != null) return [{ label: "current", value: toNum(startup.revenue, 0) }];
  return [];
}

function computeFinancialInsights(startup) {
  const revenueSeries = normalizeRevenueSeries(startup);
  const latestRevenue = revenueSeries.length
    ? toNum(revenueSeries[revenueSeries.length - 1].value, 0)
    : toNum(startup.revenue, 0);

  const prevRevenue =
    revenueSeries.length > 1 ? toNum(revenueSeries[revenueSeries.length - 2].value, 0) : null;
  const revenueGrowthPct =
    prevRevenue && prevRevenue > 0
      ? ((latestRevenue - prevRevenue) / prevRevenue) * 100
      : null;

  const yearlyExpenses = toNum(startup.expenses, 0);
  const monthlyBurn =
    toNum(startup.burn_rate, 0) > 0 ? toNum(startup.burn_rate, 0) : yearlyExpenses / 12;
  const fundingRaised = toNum(startup.funding_raised, 0);
  const runwayMonths =
    monthlyBurn > 0 && fundingRaised > 0 ? Number((fundingRaised / monthlyBurn).toFixed(1)) : null;

  const profitLoss = toNum(startup.profit_loss, 0);
  const expenseToRevenuePct =
    latestRevenue > 0 ? Number(((yearlyExpenses / latestRevenue) * 100).toFixed(1)) : null;

  const alerts = [];
  if (runwayMonths != null && runwayMonths < 3) {
    alerts.push({
      type: "critical",
      code: "runway_low",
      title: "Runway below 3 months",
      message: `Projected runway is ${runwayMonths} months.`,
    });
  }
  if (revenueGrowthPct != null && revenueGrowthPct < 0) {
    alerts.push({
      type: "warning",
      code: "revenue_drop",
      title: "Revenue drop detected",
      message: `Revenue changed ${revenueGrowthPct.toFixed(1)}% from previous period.`,
    });
  }
  if (expenseToRevenuePct != null && expenseToRevenuePct > 80) {
    alerts.push({
      type: "warning",
      code: "expenses_spike",
      title: "Expenses are high versus revenue",
      message: `Expenses are ${expenseToRevenuePct}% of revenue.`,
    });
  }
  if (profitLoss < 0 && latestRevenue > 0) {
    alerts.push({
      type: "info",
      code: "negative_cash_flow",
      title: "Negative cash flow",
      message: "Profit/Loss is currently negative.",
    });
  }

  const growthFactor =
    revenueGrowthPct == null ? 1 : Math.max(0.2, 1 + revenueGrowthPct / 100);
  const forecast = [];
  let projectedRevenue = latestRevenue || 0;
  for (let i = 1; i <= 6; i += 1) {
    projectedRevenue = Number((projectedRevenue * growthFactor).toFixed(2));
    const projectedBurn = Number(monthlyBurn.toFixed(2));
    const net = Number((projectedRevenue - projectedBurn).toFixed(2));
    forecast.push({
      month: i,
      projected_revenue: projectedRevenue,
      projected_burn: projectedBurn,
      projected_net: net,
    });
  }

  return {
    latestRevenue,
    prevRevenue,
    revenueGrowthPct,
    yearlyExpenses,
    monthlyBurn,
    fundingRaised,
    runwayMonths,
    profitLoss,
    expenseToRevenuePct,
    alerts,
    forecast,
  };
}

function ensureFinanceAccess(req, startup) {
  const role = req.user?.role;
  const isAdmin = role === "admin";
  const isGov = role === "gov_official" && req.user?.role_verified === true;
  const isInvestor = role === "investor";
  const isOwner = String(startup.user_id) === String(req.user?._id);

  if (!isAdmin && !isGov && !isInvestor && !isOwner) {
    return { ok: false, status: 403, message: "Forbidden" };
  }
  if (isInvestor && startup.status !== "approved") {
    return { ok: false, status: 403, message: "Forbidden: startup not approved" };
  }
  return { ok: true };
}

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

async function getFinancialForecast(req, res) {
  try {
    const startup = await Startup.findById(req.params.id)
      .select(
        "user_id status revenue revenue_history revenue_monthly expenses burn_rate funding_raised profit_loss",
      )
      .lean();
    if (!startup) return res.status(404).json({ message: "Startup not found" });

    const access = ensureFinanceAccess(req, startup);
    if (!access.ok) return res.status(access.status).json({ message: access.message });

    const insights = computeFinancialInsights(startup);
    return res.json({
      success: true,
      forecast: insights.forecast,
      runway_months: insights.runwayMonths,
      monthly_burn: insights.monthlyBurn,
      revenue_growth_pct: insights.revenueGrowthPct,
    });
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch forecast", error: err.message });
  }
}

async function getFinancialAlerts(req, res) {
  try {
    const startup = await Startup.findById(req.params.id)
      .select(
        "user_id status revenue revenue_history revenue_monthly expenses burn_rate funding_raised profit_loss",
      )
      .lean();
    if (!startup) return res.status(404).json({ message: "Startup not found" });

    const access = ensureFinanceAccess(req, startup);
    if (!access.ok) return res.status(access.status).json({ message: access.message });

    const insights = computeFinancialInsights(startup);
    return res.json({
      success: true,
      alerts: insights.alerts,
      summary: {
        runway_months: insights.runwayMonths,
        monthly_burn: insights.monthlyBurn,
        revenue_growth_pct: insights.revenueGrowthPct,
      },
    });
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch alerts", error: err.message });
  }
}

function buildCsv(startup, insights) {
  const rows = [
    ["metric", "value"],
    ["startup_name", startup.name || ""],
    ["status", startup.status || ""],
    ["revenue_latest", String(insights.latestRevenue ?? "")],
    ["profit_loss", String(insights.profitLoss ?? "")],
    ["expenses_yearly", String(insights.yearlyExpenses ?? "")],
    ["monthly_burn", String(insights.monthlyBurn ?? "")],
    ["funding_raised", String(insights.fundingRaised ?? "")],
    ["runway_months", String(insights.runwayMonths ?? "")],
    ["revenue_growth_pct", String(insights.revenueGrowthPct ?? "")],
    ["expense_to_revenue_pct", String(insights.expenseToRevenuePct ?? "")],
  ];
  const header = "alert_code,alert_type,title,message";
  const alertsLines = insights.alerts.map((a) =>
    [a.code, a.type, a.title, a.message]
      .map((x) => `"${String(x || "").replace(/"/g, '""')}"`)
      .join(","),
  );
  const base = rows
    .map((r) => r.map((x) => `"${String(x || "").replace(/"/g, '""')}"`).join(","))
    .join("\n");
  return `${base}\n\n${header}\n${alertsLines.join("\n")}\n`;
}

function buildPdfBuffer(startup, insights) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 40 });
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(18).text("AYUSH Financial Analytics Report", { align: "center" });
    doc.moveDown(0.5);
    doc.fontSize(11).text(`Startup: ${startup.name || "N/A"}`);
    doc.text(`Status: ${startup.status || "N/A"}`);
    doc.text(`Generated: ${new Date().toLocaleString()}`);
    doc.moveDown();

    const lines = [
      ["Latest Revenue", insights.latestRevenue],
      ["Profit / Loss", insights.profitLoss],
      ["Yearly Expenses", insights.yearlyExpenses],
      ["Monthly Burn", insights.monthlyBurn],
      ["Funding Raised", insights.fundingRaised],
      ["Runway (months)", insights.runwayMonths],
      ["Revenue Growth %", insights.revenueGrowthPct],
      ["Expense / Revenue %", insights.expenseToRevenuePct],
    ];
    lines.forEach(([k, v]) => doc.text(`${k}: ${v ?? "N/A"}`));

    doc.moveDown();
    doc.fontSize(13).text("Forecast (6 months)");
    doc.fontSize(10);
    insights.forecast.forEach((f) => {
      doc.text(
        `Month ${f.month}: Revenue ${f.projected_revenue}, Burn ${f.projected_burn}, Net ${f.projected_net}`,
      );
    });

    doc.moveDown();
    doc.fontSize(13).text("Alerts");
    doc.fontSize(10);
    if (!insights.alerts.length) doc.text("No active alerts.");
    insights.alerts.forEach((a) => doc.text(`- [${a.type}] ${a.title}: ${a.message}`));
    doc.end();
  });
}

async function exportFinancialAnalytics(req, res) {
  try {
    const format = String(req.query.format || "csv").toLowerCase();
    if (!["csv", "pdf"].includes(format)) {
      return res.status(400).json({ message: "format must be csv or pdf" });
    }

    const startup = await Startup.findById(req.params.id)
      .select(
        "name user_id status revenue revenue_history revenue_monthly expenses burn_rate funding_raised profit_loss",
      )
      .lean();
    if (!startup) return res.status(404).json({ message: "Startup not found" });

    const access = ensureFinanceAccess(req, startup);
    if (!access.ok) return res.status(access.status).json({ message: access.message });

    const insights = computeFinancialInsights(startup);

    if (format === "csv") {
      const csv = buildCsv(startup, insights);
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="financial-analytics-${startup._id}.csv"`,
      );
      return res.status(200).send(csv);
    }

    const pdf = await buildPdfBuffer(startup, insights);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="financial-analytics-${startup._id}.pdf"`,
    );
    return res.status(200).send(pdf);
  } catch (err) {
    return res.status(500).json({ message: "Failed to export analytics", error: err.message });
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

    // Generate certificate on approval (best-effort, idempotent)
    if (status === "approved" && !startup.certificate_url) {
      try {
        const cert = await generateStartupCertificatePdf(startup);
        startup.certificate_id = cert.certificateId;
        startup.certificate_hash = cert.certificateHash;
        startup.certificate_url = cert.certificateUrl;
        startup.certificate_issued_at = cert.issuedAt;
        await startup.save();

        // Email certificate to startup owner (best-effort)
        try {
          await sendEmail({
            email: startup.email,
            subject: `AYUSH Certificate Issued: ${startup.name}`,
            message: `Dear ${startup.founder_name}, your startup "${startup.name}" has been approved. Your registration certificate is attached.`,
            html: `<p>Dear ${startup.founder_name},</p>
                  <p>Your startup <strong>${startup.name}</strong> has been <strong>APPROVED</strong>.</p>
                  <p>Your AYUSH registration certificate is attached to this email.</p>
                  <p><strong>Certificate ID:</strong> ${cert.certificateId}<br/>
                     <strong>Verification Hash:</strong> ${cert.certificateHash}</p>
                  <p>Regards,<br/>AYUSH Portal</p>`,
            attachments: [
              {
                filename: `AYUSH-Certificate-${startup.name}.pdf`,
                path: cert.filePath,
                contentType: "application/pdf",
              },
            ],
          });
        } catch (emailErr) {
          console.error("Failed to send certificate email:", emailErr);
        }
      } catch (certErr) {
        console.error("Certificate generation failed:", certErr);
      }
    }

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

    // Add a hero image URL (derived from uploaded documents) for investor cards.
    const ids = items.map((s) => s._id).filter(Boolean);
    let heroByStartup = {};
    if (ids.length) {
      const docs = await Document.find({
        startup_id: { $in: ids },
      })
        .sort({ createdAt: -1 })
        .select("startup_id fileUrl page_images createdAt")
        .lean();

      for (const d of docs) {
        const sid = String(d.startup_id || "");
        if (!sid || heroByStartup[sid]) continue;
        const page0 = Array.isArray(d.page_images) && d.page_images.length ? d.page_images[0] : null;
        const url = page0?.url || d.fileUrl || "";
        if (url) heroByStartup[sid] = url;
      }
    }

    const enriched = items.map((s) => ({
      ...s,
      heroImageUrl: heroByStartup[String(s._id)] || "",
    }));

    return res.json({ items: enriched });
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
  getFinancialForecast,
  getFinancialAlerts,
  exportFinancialAnalytics,
};
