import "dotenv/config";
import mongoose from "mongoose";
import DocumentRequirement from "./src/models/DocumentRequirement.js";
import DocumentTemplate from "./src/models/DocumentTemplate.js";

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  await DocumentRequirement.deleteMany({});

  // Fix indexes: drop any old unique index on application_type only, then ensure compound unique
  try {
    await DocumentRequirement.collection.dropIndex("application_type_1");
    console.log("Dropped legacy index application_type_1");
  } catch (e) {
    if (e && e.codeName !== "IndexNotFound") {
      console.warn("Could not drop legacy index application_type_1:", e.message);
    }
  }
  try {
    await DocumentRequirement.collection.createIndex(
      { sector: 1, application_type: 1 },
      { unique: true }
    );
    console.log("Ensured compound unique index on {sector, application_type}");
  } catch (e) {
    console.warn("Could not create compound index:", e.message);
  }

  const { getStartupRegistration } = await import("./src/seeds/requirements/common.js");
  const { ayurvedaManufacturingOwn, ayurvedaLoanLicense, ayurvedaClinic } = await import("./src/seeds/requirements/ayurveda.js");
  const { yogaClinic, yogaTrainingCenter } = await import("./src/seeds/requirements/yoga.js");
  const { unaniManufacturingOwn, unaniLoanLicense, unaniClinic } = await import("./src/seeds/requirements/unani.js");
  const { siddhaManufacturingOwn, siddhaLoanLicense, siddhaClinic } = await import("./src/seeds/requirements/siddha.js");
  const { homoeopathyManufacturingOwn, homoeopathyLoanLicense, homoeopathyClinic } = await import("./src/seeds/requirements/homoeopathy.js");

  // Ayurveda manufacturing (own unit)
  await DocumentRequirement.create({
    sector: "ayurveda",
    application_type: "manufacturing_own",
    requirements: ayurvedaManufacturingOwn(),
  });

  // Startup Registration (generic across sectors)
  const { startupCommon } = await import("./src/seeds/requirements/common.js");

  for (const sector of ["ayurveda", "yoga", "unani", "siddha", "homoeopathy"]) {
    await DocumentRequirement.create({
      sector,
      application_type: "startup_registration",
      requirements: getStartupRegistration(sector),
    });
  }

  // Ayurveda loan licence / third-party
  await DocumentRequirement.create({
    sector: "ayurveda",
    application_type: "loan_license",
    requirements: ayurvedaLoanLicense(),
  });

  // Ayurveda clinic/hospital/wellness
  await DocumentRequirement.create({
    sector: "ayurveda",
    application_type: "clinic",
    requirements: ayurvedaClinic(),
  });

  // Yoga & Naturopathy clinic/hospital/wellness
  await DocumentRequirement.create({
    sector: "yoga",
    application_type: "clinic",
    requirements: yogaClinic(),
  });

  // Yoga & Naturopathy training center (non-clinical)
  await DocumentRequirement.create({
    sector: "yoga",
    application_type: "training_center",
    requirements: yogaTrainingCenter(),
  });

  // Unani manufacturing
  await DocumentRequirement.create({
    sector: "unani",
    application_type: "manufacturing_own",
    requirements: unaniManufacturingOwn(),
  });
  // Unani loan licence
  await DocumentRequirement.create({
    sector: "unani",
    application_type: "loan_license",
    requirements: unaniLoanLicense(),
  });
  // Unani clinic
  await DocumentRequirement.create({
    sector: "unani",
    application_type: "clinic",
    requirements: unaniClinic(),
  });

  // Siddha manufacturing
  await DocumentRequirement.create({
    sector: "siddha",
    application_type: "manufacturing_own",
    requirements: siddhaManufacturingOwn(),
  });
  // Siddha loan licence
  await DocumentRequirement.create({
    sector: "siddha",
    application_type: "loan_license",
    requirements: siddhaLoanLicense(),
  });
  // Siddha clinic
  await DocumentRequirement.create({
    sector: "siddha",
    application_type: "clinic",
    requirements: siddhaClinic(),
  });

  // Homoeopathy manufacturing
  await DocumentRequirement.create({
    sector: "homoeopathy",
    application_type: "manufacturing_own",
    requirements: homoeopathyManufacturingOwn(),
  });
  // Homoeopathy loan licence
  await DocumentRequirement.create({
    sector: "homoeopathy",
    application_type: "loan_license",
    requirements: homoeopathyLoanLicense(),
  });
  // Homoeopathy clinic/hospital
  await DocumentRequirement.create({
    sector: "homoeopathy",
    application_type: "clinic",
    requirements: homoeopathyClinic(),
  });

  // Seed document templates (reference rules for OCR validation)
  await DocumentTemplate.deleteMany({});
  await DocumentTemplate.insertMany([
    {
      doc_category: "founder_id",
      variant: "aadhaar",
      fields: [
        { name: "name", required: true },
        { name: "document_number", required: true, pattern: "^\\\d{12}$" },
        { name: "dob", required: false, pattern: "^\\\d{2}[-/]\\\d{2}[-/]\\\d{4}$" },
        { name: "address", required: false },
        { name: "father_name", required: false },
      ],
    },
  ]);

  console.log("Seed complete");
  mongoose.connection.close();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
