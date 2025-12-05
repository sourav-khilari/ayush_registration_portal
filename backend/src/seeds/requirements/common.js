// Common requirements fragments shared across sectors

const startupCommon = [
  {
    doc_category: "founder_id",
    note: "Mandatory KYC",
    required: true,
  },
  {
    doc_category: "founder_pan",
    note: "PAN of promoter",
    extract_fields: [
      { name: "pan", label: "PAN" },
      { name: "name", label: "Name" },
    ],
  },
  { doc_category: "address_proof", note: "Verifies location / identity", required: true },
  { doc_category: "business_pitch", note: "AYUSH must understand your startup", required: true },
  {
    doc_category: "prototype_or_mvp",
    note: "Prototype images/videos/docs",
    required: false,
  },
  {
    doc_category: "ip_status",
    note: "Patent/trademark filings if any",
    required: false,
  },
];

function getStartupRegistration(sector) {
  return [
    ...startupCommon,
    { doc_category: "company_registration", note: "Required (unless sole proprietor) - Confirms legal entity", required: true },
    {
      doc_category: "constitution_document",
      note: "If applicable",
      required: false,
    },
    {
      doc_category: "proof_business_activity",
      note: "Demos, website, client LOIs",
      required: false,
    },
    {
      doc_category: "product_qr",
      note: "If startup has their own product",
      required: false,
    },
  ];
}

export { startupCommon, getStartupRegistration };
