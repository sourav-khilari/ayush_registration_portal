function unaniManufacturingOwn() {
	return [
		{ doc_category: "application_form" },
		{ doc_category: "company_kyc" },
		{ doc_category: "premises_kyc" },
		{ doc_category: "site_layout" },
		{ doc_category: "gmp_compliance", note: "Schedule T compliance" },
		{ doc_category: "technical_staff" },
		{ doc_category: "product_dossiers", note: "Pharmacopeial references" },
		{ doc_category: "statutory_nocs" },
		{ doc_category: "water_analysis" },
	];
}

function unaniLoanLicense() {
	return [
		{ doc_category: "company_kyc" },
		{ doc_category: "product_dossiers" },
		{ doc_category: "contract_agreement" },
		{ doc_category: "manufacturer_license_gmp" },
	];
}

function unaniClinic() {
	return [
		{ doc_category: "clinical_establishments_application" },
		{ doc_category: "practitioners", note: "BUMS registration, staff credentials" },
		{ doc_category: "facility_equipment" },
		{ doc_category: "sops" },
		{ doc_category: "statutory_authorizations" },
	];
}

module.exports = { unaniManufacturingOwn, unaniLoanLicense, unaniClinic };


