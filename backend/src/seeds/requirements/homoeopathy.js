function homoeopathyManufacturingOwn() {
	return [
		{ doc_category: "application_form", note: "State form and fee challan" },
		{ doc_category: "company_kyc" },
		{ doc_category: "premises_kyc", note: "Ownership/lease, utility, layout" },
		{ doc_category: "gmp_compliance", note: "Homeopathy GMP (Schedule M-1), QC lab" },
		{ doc_category: "technical_staff" },
		{ doc_category: "product_dossiers", note: "Mother tinctures/potencies, SOPs, specs, labels" },
		{ doc_category: "statutory_nocs", note: "Pollution/Fire as applicable, water analysis" },
		{ doc_category: "affidavits" },
	];
}

function homoeopathyLoanLicense() {
	return [
		{ doc_category: "contract_agreement" },
		{ doc_category: "manufacturer_license_gmp" },
		{ doc_category: "product_dossiers" },
		{ doc_category: "label_draft" },
	];
}

function homoeopathyClinic() {
	return [
		{ doc_category: "clinical_establishments_application" },
		{ doc_category: "practitioners", note: "BHMS/DHMS certificates" },
		{ doc_category: "facility_equipment" },
		{ doc_category: "sops" },
		{ doc_category: "statutory_authorizations", note: "BMW if applicable, Fire NOC" },
	];
}

module.exports = { homoeopathyManufacturingOwn, homoeopathyLoanLicense, homoeopathyClinic };


