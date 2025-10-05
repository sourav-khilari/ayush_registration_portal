const DocumentRequirement = require("../models/DocumentRequirement");
const { startupCommon } = require("../seeds/requirements/common");

// Fetch all required documents for a given sector and application type
async function getRequirementsBySector(req, res) {
  try {
    const { sector, application_type } = req.params;

    const requirements = await DocumentRequirement.findOne({
      sector,
      application_type,
    }).lean();

    if (!requirements) {
      return res.status(404).json({
        message: `No document requirements found for ${sector} (${application_type})`,
      });
    }

    res.status(200).json({
      sector,
      application_type,
      total_required: requirements.requirements.length,
      requirements: requirements.requirements,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching requirements", error: error.message });
  }
}

module.exports = { getRequirementsBySector };

// Return only the common requirements for the given sector/application_type
async function getCommonRequirements(req, res) {
  try {
    const { sector, application_type } = req.params;

    // For now, "common" means the common startup registration base + any items
    // in the stored requirement that also appear in startupCommon by doc_category.
    const doc = await DocumentRequirement.findOne({ sector, application_type }).lean();
    if (!doc) {
      return res.status(404).json({ message: `No document requirements found for ${sector} (${application_type})` });
    }

    const commonSet = new Set(startupCommon.map((r) => r.doc_category));
    const commonOnly = (doc.requirements || []).filter((r) => commonSet.has(r.doc_category));

    return res.json({ sector, application_type, total_common: commonOnly.length, requirements: commonOnly });
  } catch (error) {
    return res.status(500).json({ message: "Error fetching common requirements", error: error.message });
  }
}

module.exports.getCommonRequirements = getCommonRequirements;
