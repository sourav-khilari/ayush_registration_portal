function yogaClinic() {
	return [
		{ doc_category: "clinical_establishments_application" },
		{ doc_category: "entity_kyc", note: "Incorporation, PAN, GST if taxable" },
		{ doc_category: "premises_kyc_clinic", note: "Lease/ownership, occupancy/fitness, layout" },
		{ doc_category: "practitioners", note: "BNYS registration (clinical); yoga therapist/instructor certs" },
		{ doc_category: "facility_equipment", note: "Hydrotherapy, mud, physio, yoga props; SOPs/consent" },
		{ doc_category: "statutory_authorizations", note: "BMW (if clinical), Fire NOC, first-aid/emergency SOPs, referral tie-ups" },
	];
}

function yogaTrainingCenter() {
	return [
		{ doc_category: "entity_kyc" },
		{ doc_category: "premises_kyc" },
		{ doc_category: "faculty_certifications" },
		{ doc_category: "course_outlines" },
		{ doc_category: "safety_sops" },
		{ doc_category: "local_trade_license", note: "Municipality enlistment as applicable" },
	];
}

module.exports = { yogaClinic, yogaTrainingCenter };


