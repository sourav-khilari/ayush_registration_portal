// Common requirements fragments shared across sectors

const startupCommon = [
	{ doc_category: "founder_id", note: "Aadhaar/Passport of promoter", extract_fields: [
		{ name: "name", label: "Name" },
		{ name: "document_number", label: "ID No" },
	]},
	{ doc_category: "founder_pan", note: "PAN of promoter", extract_fields: [
		{ name: "pan", label: "PAN" },
		{ name: "name", label: "Name" },
	]},
	{ doc_category: "address_proof", note: "Utility bill/Bank statement" },
	{ doc_category: "business_pitch", note: "Pitch deck / concept note" },
	{ doc_category: "prototype_or_mvp", note: "Prototype images/videos/docs", required: false },
	{ doc_category: "ip_status", note: "Patent/trademark filings if any", required: false },
];

function getStartupRegistration(sector) {
	return [
		...startupCommon,
		{ doc_category: "company_registration", note: "If incorporated", required: false },
		{ doc_category: "constitution_document", note: "If applicable", required: false },
		{ doc_category: "proof_business_activity", note: "Demos, website, client LOIs", required: false },
	];
}

module.exports = { startupCommon, getStartupRegistration };


