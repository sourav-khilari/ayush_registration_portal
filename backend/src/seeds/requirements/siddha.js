function siddhaManufacturingOwn() {
	return [
		{ doc_category: "application_form" },
		{ doc_category: "company_kyc" },
		{ doc_category: "premises_kyc" },
		{ doc_category: "site_layout" },
		{ doc_category: "gmp_compliance", note: "Schedule T" },
		{ doc_category: "technical_staff", note: "Siddha-specific staff" },
		{ doc_category: "product_dossiers" },
		{ doc_category: "statutory_nocs" },
	];
}

function siddhaLoanLicense() {
	return [
		{ doc_category: "company_kyc" },
		{ doc_category: "product_dossiers" },
		{ doc_category: "contract_agreement" },
		{ doc_category: "manufacturer_license_gmp" },
	];
}

function siddhaClinic() {
	return [
		{ doc_category: "clinical_establishments_application" },
		{ doc_category: "practitioners", note: "BSMS registration, staff credentials" },
		{ doc_category: "facility_equipment" },
		{ doc_category: "sops" },
		{ doc_category: "statutory_authorizations" },
	];
}

module.exports = { siddhaManufacturingOwn, siddhaLoanLicense, siddhaClinic };


