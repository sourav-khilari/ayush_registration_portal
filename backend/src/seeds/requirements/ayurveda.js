function ayurvedaManufacturingOwn() {
	return [
		{ doc_category: "application_form", note: "State-specific form and fee challan" },
		{ doc_category: "company_kyc", note: "Incorporation, PAN, GST, constitution, authorization" },
		{ doc_category: "premises_kyc", note: "Ownership/lease, rent NOC, utility bill" },
		{ doc_category: "site_layout", note: "Site/master layout and equipment list" },
		{ doc_category: "gmp_compliance", note: "Schedule T self-declaration, QC lab details" },
		{ doc_category: "technical_staff", note: "CVs, qualifications, registrations, appointment letters" },
		{ doc_category: "product_dossiers", note: "MFRs, SOPs, specs, draft labels" },
		{ doc_category: "statutory_nocs", note: "Pollution, Fire, BMW tie-up, water report" },
		{ doc_category: "affidavits", note: "Non-conviction, trademark/brand undertakings" },
		{ doc_category: "state_specific_undertakings", note: "e.g., biodiversity board intimation" },
	];
}

function ayurvedaLoanLicense() {
	return [
		{ doc_category: "company_kyc" },
		{ doc_category: "product_dossiers" },
		{ doc_category: "contract_agreement", note: "Executed agreement with licensed manufacturer" },
		{ doc_category: "manufacturer_license_gmp", note: "Copy of valid licence and GMP" },
		{ doc_category: "site_master_file", required: false },
		{ doc_category: "stability_validation", required: false },
	];
}

function ayurvedaClinic() {
	return [
		{ doc_category: "clinical_establishments_application", note: "State form" },
		{ doc_category: "entity_kyc", note: "Incorporation, PAN, GST if applicable" },
		{ doc_category: "premises_kyc_clinic", note: "Ownership/lease, occupancy/fitness, layout" },
		{ doc_category: "practitioners", note: "BAMS registration, council certificate, ID; therapists certificates" },
		{ doc_category: "facility_sops", note: "Equipment lists, SOPs: triage, consent, infection control" },
		{ doc_category: "statutory_authorizations", note: "BMW authorization/tie-up, Fire NOC, signage, fee receipt" },
	];
}

module.exports = { ayurvedaManufacturingOwn, ayurvedaLoanLicense, ayurvedaClinic };


