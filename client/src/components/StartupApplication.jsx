import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { StartupAPI, RequirementsAPI, DocumentAPI } from "../api";
import {
  FaLeaf,
  FaRocket,
  FaBuilding,
  FaFileAlt,
  FaSave,
  FaArrowLeft,
  FaCheckCircle,
  FaInfoCircle,
  FaUpload,
} from "react-icons/fa";

function StartupApplication() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    // Startup Information
    startup_name: "",
    founder_name: "",
    email: "",
    phone_number: "",
    startup_type: "",
    description: "",
    website: "",
    address: "",
    // Application Information
    sector: "",
    application_type: "",
    // Additional Information
    tags: [],
    business_plan: "",
    funding_requirements: "",
    team_size: "",
    expected_revenue: "",
    target_market: "",
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [userProfile, setUserProfile] = useState(null);
  const [requirementsState, setRequirementsState] = useState({
    loading: false,
    error: "",
    items: [],
  });

  // Documents state: for each doc_category -> { file, fields }
  const [documentsData, setDocumentsData] = useState({});
  const [documentsError, setDocumentsError] = useState("");

  // Upload results: array of { category, fileName, status, id, raw }
  const [uploadResults, setUploadResults] = useState([]);

  // Aadhaar verification state
  const [aadhaarUploadLoading, setAadhaarUploadLoading] = useState(false);
  const [aadhaarVerified, setAadhaarVerified] = useState(false); // OCR verified
  const [maskedId, setMaskedId] = useState(null); // extracted last4 as "XXXX-XXXX-3642"
  const [aadhaarOtpPending, setAadhaarOtpPending] = useState(false); // email-lookup called
  const [aadhaarEmail, setAadhaarEmail] = useState(null); // masked email from email-lookup
  const [otpInput, setOtpInput] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [aadhaarFullyVerified, setAadhaarFullyVerified] = useState(false); // OTP verified
  const [verificationError, setVerificationError] = useState("");

  // QR verification state
  const [qrLoading, setQrLoading] = useState(false);
  const [qrResult, setQrResult] = useState(null); // holds last QR verification result

  // ===== DOC_META: friendly labels + short descriptions for doc_category keys =====
  const DOC_META = {
    company_registration: {
      label: "Company Registration",
      desc: "Proof that your company is legally registered (GST / MSME / CIN / Trade Licence).",
      requiredText: "Required (unless sole proprietor)",
    },
    constitution_document: {
      label: "Business Formation Document",
      desc: "Partnership Deed, MOA / AOA, LLP agreement or similar. Upload only if applicable.",
    },
    proof_business_activity: {
      label: "Proof of Business Activity",
      desc: "Demo screenshots, website link, client LOIs, product photos or other proof you are operational.",
    },
    business_pitch: {
      label: "Business Pitch (Optional)",
      desc: "Short doc explaining idea, problem, solution, and target users.",
    },
    prototype_or_mvp: {
      label: "Prototype / MVP (Optional)",
      desc: "Images, video or files showing a working demo or prototype.",
    },
    ip_status: {
      label: "IP Status (Optional)",
      desc: "Patent / Trademark filings or application numbers, if any.",
    },
    founder_id: {
      label: "Founder ID (Aadhaar)",
      desc: "Upload Aadhaar for identity verification (we'll extract last 4 digits and verify by OTP).",
    },
    product_qr: {
      label: "Product QR / Barcode",
      desc: "Upload an image of the product QR or barcode to verify product details.",
    },
  };

  useEffect(() => {
    if (user) {
      setUserProfile(user);
      setFormData((prev) => ({
        ...prev,
        founder_name: user.name || "",
        email: user.email || "",
      }));
    }
  }, [user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const normalizeSector = (sector) => {
    if (!sector) return sector;
    const map = {
      homoeopathy: "homoeopathy",
    };
    return map[sector] || sector;
  };

  // Load requirements when sector + application_type present
  useEffect(() => {
    const shouldFetch = formData.sector && formData.application_type;
    if (!shouldFetch) {
      setRequirementsState((prev) => ({ ...prev, items: [], error: "" }));
      setDocumentsData({});
      return;
    }

    let ignore = false;
    setRequirementsState({ loading: true, error: "", items: [] });

    Promise.all([
      RequirementsAPI.get(
        normalizeSector(formData.sector),
        formData.application_type
      ),
      RequirementsAPI.getCommon(
        normalizeSector(formData.sector),
        formData.application_type
      ),
    ])
      .then(([sectorRes, commonRes]) => {
        if (ignore) return;
        const sectorItems = Array.isArray(sectorRes?.requirements)
          ? sectorRes.requirements
          : [];
        const commonItems = Array.isArray(commonRes?.requirements)
          ? commonRes.requirements
          : [];

        // Merge common first then sector specific (sector overrides same doc_category)
        const mergedMap = new Map();
        for (const it of [...commonItems, ...sectorItems]) {
          mergedMap.set(it.doc_category, it);
        }
        const merged = Array.from(mergedMap.values());
        setRequirementsState({ loading: false, error: "", items: merged });
        setDocumentsError("");

        // initialize documentsData for each required doc
        const nextDocs = {};
        for (const req of merged) {
          const key = req.doc_category;
          nextDocs[key] = {
            file: null,
            // initialize fields from extract_fields if present
            fields: (req.extract_fields || []).reduce((acc, f) => {
              acc[f.name] = "";
              return acc;
            }, {}),
          };
        }
        setDocumentsData(nextDocs);
      })
      .catch((err) => {
        if (ignore) return;
        setRequirementsState({
          loading: false,
          error: err.message || "Failed to load requirements",
          items: [],
        });
        setDocumentsData({});
      });

    return () => {
      ignore = true;
    };
  }, [formData.sector, formData.application_type]);

  const handleDocFileChange = (docCategory, file) => {
    setDocumentsData((prev) => ({
      ...prev,
      [docCategory]: {
        ...(prev[docCategory] || { file: null, fields: {} }),
        file,
      },
    }));
  };

  const handleDocFieldChange = (docCategory, fieldName, value) => {
    setDocumentsData((prev) => ({
      ...prev,
      [docCategory]: {
        ...(prev[docCategory] || { file: null, fields: {} }),
        fields: {
          ...((prev[docCategory] && prev[docCategory].fields) || {}),
          [fieldName]: value,
        },
      },
    }));
  };

  // ---- Aadhaar Verification Handlers ----
  const handleUploadAadhaar = async () => {
    const aadhaarFile = documentsData["founder_id"]?.file;
    if (!aadhaarFile) {
      setVerificationError("Please select a founder_id file");
      return;
    }

    setAadhaarUploadLoading(true);
    setVerificationError("");
    console.log("🔵 Starting Aadhaar upload...", aadhaarFile.name);

    try {
      const res = await DocumentAPI.upload(aadhaarFile, {
        doc_category_declared: "founder_id",
      });

      console.log("✅ Upload response:", res);

      // Check if document is verified
      if (res?.document?.verified_status === "verified") {
        console.log("✅ Document verified, extracting last4...");
        setAadhaarVerified(true);

        // Extract last4 from response - from ocr_text (extracted_fields is empty Map)
        const last4 = res?.document?.ocr_text?.aadhaar_last4;

        console.log("📋 Extracted last4:", last4);

        if (last4) {
          const masked = `XXXX-XXXX-${last4}`;
          setMaskedId(masked);
          console.log("🔐 Masked ID:", masked);

          // Auto-call email-lookup
          console.log("📧 Calling email-lookup API...");
          try {
            const emailRes = await DocumentAPI.emailLookup({
              masked_id: masked,
            });
            console.log("✅ Email-lookup response:", emailRes);

            if (emailRes?.success) {
              setAadhaarEmail(emailRes.email);
              setAadhaarOtpPending(true);
              console.log("📨 OTP pending set to true, email:", emailRes.email);
            } else {
              setVerificationError(
                `Email lookup failed: ${emailRes?.message || "unknown error"}`
              );
              console.error("❌ Email lookup failed:", emailRes);
            }
          } catch (emailErr) {
            setVerificationError(`Email lookup failed: ${emailErr.message}`);
            console.error("❌ Email lookup error:", emailErr);
          }
        } else {
          setVerificationError(
            "Could not extract Aadhaar last 4 digits from response"
          );
          console.error(
            "❌ Could not extract last4. ocr_text:",
            res?.document?.ocr_text,
            "Full response:",
            res
          );
          setAadhaarVerified(false);
        }
      } else {
        setVerificationError(
          `Aadhaar verification failed: ${
            res?.document?.verified_status || "unknown"
          }`
        );
        console.error(
          "❌ Verification failed. Status:",
          res?.document?.verified_status,
          "Full response:",
          res
        );
        setAadhaarVerified(false);
      }
    } catch (err) {
      setVerificationError(`Upload failed: ${err.message}`);
      console.error("❌ Upload error:", err);
      setAadhaarVerified(false);
    } finally {
      setAadhaarUploadLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpInput.trim()) {
      setVerificationError("Please enter the OTP");
      return;
    }

    if (!maskedId || !aadhaarEmail) {
      setVerificationError("Missing email or masked ID for OTP verification");
      console.error(
        "❌ Missing data. maskedId:",
        maskedId,
        "email:",
        aadhaarEmail
      );
      return;
    }

    console.log("🔐 Verifying OTP...", {
      maskedId,
      email: aadhaarEmail,
      otp: otpInput,
    });
    setOtpLoading(true);
    setVerificationError("");

    try {
      const res = await DocumentAPI.verifyOtp({
        masked_id: maskedId,
        email: aadhaarEmail,
        otp: otpInput,
      });

      console.log("✅ OTP verification response:", res);

      if (res?.success) {
        console.log("✅ OTP verified successfully!");
        setAadhaarFullyVerified(true);
        setOtpInput("");
        setAadhaarOtpPending(false);
      } else {
        setVerificationError("OTP verification failed");
        console.error("❌ OTP verification failed. Response:", res);
      }
    } catch (err) {
      setVerificationError(`OTP verification error: ${err.message}`);
      console.error("❌ OTP error:", err);
    } finally {
      setOtpLoading(false);
    }
  };

  // ---- QR Verification Handler ----
  const handleVerifyQR = async (docCategory = "product_qr") => {
    const docEntry = documentsData[docCategory];
    if (!docEntry || !docEntry.file) {
      setDocumentsError("Please select a QR image first");
      return;
    }

    setQrLoading(true);
    setQrResult(null);
    setDocumentsError("");

    try {
      const form = new FormData();
      form.append("image", docEntry.file);

      // Vite env or fallback
      const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5002";
      const url = `${API_BASE}/product/verify-image`;

      const res = await fetch(url, {
        method: "POST",
        body: form,
        credentials: "include",
      });

      const data = await res.json();
      console.log("QR verify response:", data);
      setQrResult(data);

      // If server returned product or barcode info, update documentsData
      if (data?.success && (data.product || data.barcode)) {
        setDocumentsData((prev) => ({
          ...prev,
          [docCategory]: {
            ...(prev[docCategory] || {}),
            uploaded: prev[docCategory]?.uploaded || false,
            verified_qr: true,
            verified_qr_at: new Date().toISOString(),
            matched_product: data.product || null,
            matched_barcode: data.barcode || null,
          },
        }));
      }
    } catch (err) {
      console.error("QR verify error:", err);
      setDocumentsError("QR verification failed. Try again.");
    } finally {
      setQrLoading(false);
    }
  };

  const labelize = (slug) => {
    if (!slug) return "";
    return slug
      .split("_")
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join(" ");
  };

  const validateRequiredDocumentsSelected = () => {
    // First check if Aadhaar verification is required and not complete
    const requiresAadhaar = (requirementsState.items || []).some(
      (req) => req.doc_category === "founder_id" && req.required !== false
    );
    if (requiresAadhaar && !aadhaarFullyVerified) {
      setDocumentsError(
        "Please verify your Aadhaar with OTP before proceeding"
      );
      return false;
    }

    const missing = (requirementsState.items || [])
      .filter((req) => req.required !== false) // required by default
      .filter((req) => !documentsData[req.doc_category]?.file)
      .map(
        (req) => DOC_META[req.doc_category]?.label || labelize(req.doc_category)
      );

    if (missing.length > 0) {
      setDocumentsError(
        `Please upload all required documents before submitting: ${missing.join(
          ", "
        )}`
      );
      return false;
    }
    setDocumentsError("");
    return true;
  };

  const handleTagsChange = (e) => {
    const tags = e.target.value
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag);
    setFormData((prev) => ({ ...prev, tags }));
  };

  const validateStep = (step) => {
    const newErrors = {};
    if (step === 1) {
      if (!formData.startup_name.trim())
        newErrors.startup_name = "Startup name is required";
      if (!formData.founder_name.trim())
        newErrors.founder_name = "Founder name is required";
      if (!formData.email.trim()) newErrors.email = "Email is required";
      else if (!/\S+@\S+\.\S+/.test(formData.email))
        newErrors.email = "Email is invalid";
      if (!formData.phone_number.trim())
        newErrors.phone_number = "Phone number is required";
      if (!formData.startup_type.trim())
        newErrors.startup_type = "Startup type is required";
      if (!formData.description.trim())
        newErrors.description = "Description is required";
    }
    if (step === 2) {
      if (!formData.sector) newErrors.sector = "Sector is required";
      if (!formData.application_type)
        newErrors.application_type = "Application type is required";
      if (!formData.address.trim()) newErrors.address = "Address is required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrevious = () => {
    setCurrentStep((prev) => prev - 1);
  };

  // MAIN submit: create startup (if needed), upload documents one-by-one,
  // capture backend responses (which include verification status), and save to uploadResults
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateStep(currentStep)) {
      return;
    }

    // ensure docs selected
    if (!validateRequiredDocumentsSelected()) {
      return;
    }

    setIsSubmitting(true);
    setUploadResults([]);

    try {
      // 1) Try to create startup (backend may return duplicate error)
      const payload = {
        name: formData.startup_name,
        founder_name: formData.founder_name,
        email: formData.email,
        phone_number: formData.phone_number,
        startup_type: formData.startup_type,
        description: formData.description,
        website: formData.website,
        address: formData.address,
        tags: formData.tags,
        sector: formData.sector,
        application_type: formData.application_type,
      };

      let startupId = null;

      try {
        const created = await StartupAPI.create(payload);
        // try common shapes for created id
        startupId =
          created?.startup?._id ||
          created?.startup?.id ||
          created?._id ||
          created?.id ||
          null;
      } catch (createErr) {
        const msg = createErr?.message || "";
        // if duplicate, we'll find existing below; otherwise rethrow
        if (!/E11000|duplicate key/i.test(msg)) {
          throw createErr;
        }
      }

      // After create/duplicate, attempt to ensure we have startup id by asking mine()
      try {
        const mine = await StartupAPI.mine();
        if (Array.isArray(mine?.startups)) {
          const found = mine.startups.find(
            (s) =>
              (s?.email || "").toLowerCase() ===
              (formData.email || "").toLowerCase()
          );
          if (found) {
            startupId = found._id || found.id || startupId;
          }
        }
      } catch (err) {
        // ignore mine failures
      }

      // 2) Upload documents one-by-one and capture responses
      const uploadResponses = [];
      // Use the requirementsState.items order so we correlate categories
      for (const req of requirementsState.items || []) {
        const docEntry = documentsData[req.doc_category];
        if (!docEntry || !docEntry.file) continue;

        try {
          // Prepare metadata - include startup_id and description with any extracted fields
          // Put fields into description JSON so backend can optionally use them.
          const descriptionPayload =
            docEntry.fields && Object.keys(docEntry.fields).length > 0
              ? JSON.stringify({ extracted_fields: docEntry.fields })
              : undefined;

          const res = await DocumentAPI.upload(docEntry.file, {
            doc_category_declared: req.doc_category,
            startup_id: startupId,
            application_id: undefined,
            document_name: docEntry.file.name,
            description: descriptionPayload,
          });

          // Expect backend to respond with { success: true, document: doc }
          if (res?.success && res.document) {
            const doc = res.document;
            uploadResponses.push({
              category: doc.doc_category_declared || req.doc_category,
              fileName: doc.document_name || doc.filename || docEntry.file.name,
              status: doc.verified_status || doc.ocr_status || "pending",
              id: doc._id || doc.id || null,
              raw: doc,
            });

            // Update documentsData with returned doc id/status
            setDocumentsData((prev) => ({
              ...prev,
              [req.doc_category]: {
                ...(prev[req.doc_category] || {}),
                uploaded: true,
                uploaded_at: new Date().toISOString(),
                doc_id: doc._id || doc.id,
                verified_status: doc.verified_status || null,
              },
            }));
          } else {
            // generic fallback
            uploadResponses.push({
              category: req.doc_category,
              fileName: docEntry.file.name,
              status: "upload_failed",
              id: null,
              raw: res,
            });
          }
        } catch (err) {
          console.error("Upload failed for category:", req.doc_category, err);
          uploadResponses.push({
            category: req.doc_category,
            fileName: docEntry.file.name,
            status: "error",
            id: null,
            raw: { message: err?.message || String(err) },
          });
        }
      }

      // Save upload results to state so UI can show summary
      setUploadResults(uploadResponses);

      // Move UI to a confirmation/summary area (we keep user on the page)
      setCurrentStep(3); // stay on docs step but show summary below
    } catch (error) {
      console.error("Create startup / upload failed", error);
      // show a generic error message - we deliberately avoid throwing raw errors to UI
      setDocumentsError(
        "Submission failed. Please try again or contact support."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    navigate("/StartupOwner/dashboard");
  };

  // Renders
  const renderStep1 = () => (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-gray-900 mb-4">
        Startup Information
      </h3>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label
            htmlFor="startup_name"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Startup Name *
          </label>
          <input
            type="text"
            id="startup_name"
            name="startup_name"
            value={formData.startup_name}
            onChange={handleInputChange}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-ayush-500 focus:border-ayush-500 ${
              errors.startup_name ? "border-red-500" : "border-gray-300"
            }`}
            placeholder="Enter your startup name"
          />
          {errors.startup_name && (
            <p className="mt-1 text-sm text-red-600">{errors.startup_name}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="founder_name"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Founder Name *
          </label>
          <input
            type="text"
            id="founder_name"
            name="founder_name"
            value={formData.founder_name}
            onChange={handleInputChange}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-ayush-500 focus:border-ayush-500 ${
              errors.founder_name ? "border-red-500" : "border-gray-300"
            }`}
            placeholder="Enter founder name"
          />
          {errors.founder_name && (
            <p className="mt-1 text-sm text-red-600">{errors.founder_name}</p>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Email Address *
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-ayush-500 focus:border-ayush-500 ${
              errors.email ? "border-red-500" : "border-gray-300"
            }`}
            placeholder="Enter email address"
          />
          {errors.email && (
            <p className="mt-1 text-sm text-red-600">{errors.email}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="phone_number"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Phone Number *
          </label>
          <input
            type="tel"
            id="phone_number"
            name="phone_number"
            value={formData.phone_number}
            onChange={handleInputChange}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-ayush-500 focus:border-ayush-500 ${
              errors.phone_number ? "border-red-500" : "border-gray-300"
            }`}
            placeholder="Enter phone number"
          />
          {errors.phone_number && (
            <p className="mt-1 text-sm text-red-600">{errors.phone_number}</p>
          )}
        </div>
      </div>

      <div>
        <label
          htmlFor="startup_type"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Startup Type *
        </label>
        <select
          id="startup_type"
          name="startup_type"
          value={formData.startup_type}
          onChange={handleInputChange}
          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-ayush-500 focus:border-ayush-500 ${
            errors.startup_type ? "border-red-500" : "border-gray-300"
          }`}
        >
          <option value="">Select startup type</option>
          <option value="healthcare_tech">Healthcare Technology</option>
          <option value="wellness_services">Wellness Services</option>
          <option value="product_manufacturing">Product Manufacturing</option>
          <option value="consulting">Consulting</option>
          <option value="education_training">Education & Training</option>
          <option value="research_development">Research & Development</option>
        </select>
        {errors.startup_type && (
          <p className="mt-1 text-sm text-red-600">{errors.startup_type}</p>
        )}
      </div>

      <div>
        <label
          htmlFor="description"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Startup Description *
        </label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleInputChange}
          rows={4}
          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-ayush-500 focus:border-ayush-500 ${
            errors.description ? "border-red-500" : "border-gray-300"
          }`}
          placeholder="Describe your startup, its mission, and what makes it unique"
        />
        {errors.description && (
          <p className="mt-1 text-sm text-red-600">{errors.description}</p>
        )}
      </div>

      <div>
        <label
          htmlFor="website"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Website (Optional)
        </label>
        <input
          type="url"
          id="website"
          name="website"
          value={formData.website}
          onChange={handleInputChange}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ayush-500 focus:border-ayush-500"
          placeholder="https://yourstartup.com"
        />
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-gray-900 mb-4">
        Application Details
      </h3>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label
            htmlFor="sector"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            AYUSH Sector *
          </label>
          <select
            id="sector"
            name="sector"
            value={formData.sector}
            onChange={handleInputChange}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-ayush-500 focus:border-ayush-500 ${
              errors.sector ? "border-red-500" : "border-gray-300"
            }`}
          >
            <option value="">Select AYUSH sector</option>
            <option value="ayurveda">Ayurveda</option>
            <option value="yoga">Yoga</option>
            <option value="unani">Unani</option>
            <option value="siddha">Siddha</option>
            <option value="homoeopathy">Homeopathy</option>
          </select>
          {errors.sector && (
            <p className="mt-1 text-sm text-red-600">{errors.sector}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="application_type"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Application Type *
          </label>
          <select
            id="application_type"
            name="application_type"
            value={formData.application_type}
            onChange={handleInputChange}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-ayush-500 focus:border-ayush-500 ${
              errors.application_type ? "border-red-500" : "border-gray-300"
            }`}
          >
            <option value="">Select application type</option>
            <option value="startup_registration">Startup Registration</option>
            <option value="manufacturing_own">Manufacturing (Own)</option>
            <option value="loan_license">Loan License</option>
            <option value="clinic">Clinic</option>
            <option value="training_center">Training Center</option>
          </select>
          {errors.application_type && (
            <p className="mt-1 text-sm text-red-600">
              {errors.application_type}
            </p>
          )}
        </div>
      </div>

      <div>
        <label
          htmlFor="address"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Business Address *
        </label>
        <textarea
          id="address"
          name="address"
          value={formData.address}
          onChange={handleInputChange}
          rows={3}
          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-ayush-500 focus:border-ayush-500 ${
            errors.address ? "border-red-500" : "border-gray-300"
          }`}
          placeholder="Enter complete business address"
        />
        {errors.address && (
          <p className="mt-1 text-sm text-red-600">{errors.address}</p>
        )}
      </div>

      <div>
        <label
          htmlFor="tags"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Tags (Optional)
        </label>
        <input
          type="text"
          id="tags"
          name="tags"
          value={formData.tags.join(", ")}
          onChange={handleTagsChange}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ayush-500 focus:border-ayush-500"
          placeholder="Enter tags separated by commas (e.g., healthcare, technology, wellness)"
        />
        <p className="mt-1 text-sm text-gray-500">
          Separate multiple tags with commas
        </p>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-gray-900 mb-4">
        Required Documents
      </h3>

      {!formData.sector || !formData.application_type ? (
        <p className="text-sm text-gray-600">
          Select AYUSH sector and application type to view required documents.
        </p>
      ) : requirementsState.loading ? (
        <p className="text-sm text-gray-600">Loading requirements...</p>
      ) : requirementsState.error ? (
        <p className="text-sm text-red-600">{requirementsState.error}</p>
      ) : requirementsState.items.length === 0 ? (
        <p className="text-sm text-gray-600">No requirements found.</p>
      ) : (
        <div className="space-y-6">
          {documentsError && (
            <div className="p-3 rounded-md bg-red-50 text-red-700 text-sm">
              {documentsError}
            </div>
          )}

          {requirementsState.items.map((req) => (
            <div
              key={req.doc_category}
              className={`border rounded-lg p-4 ${
                req.doc_category === "founder_id" && aadhaarFullyVerified
                  ? "border-green-300 bg-green-50"
                  : ""
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div>
                  {/*
                    Use friendly label and description when available via DOC_META,
                    otherwise fallback to labelize(req.doc_category) and req.note.
                  */}
                  <p className="font-semibold text-gray-900">
                    {DOC_META[req.doc_category]?.label ||
                      labelize(req.doc_category)}
                    {req.doc_category === "founder_id" &&
                      aadhaarFullyVerified && (
                        <span className="ml-2 text-green-600 text-sm">
                          ✓ Verified
                        </span>
                      )}
                  </p>

                  {/* required hint from meta or fallback */}
                  <p className="text-xs text-gray-500 mt-1">
                    {DOC_META[req.doc_category]?.requiredText ||
                      (req.required === false ? "Optional" : "")}
                  </p>

                  {/* friendly description or fallback to req.note */}
                  {DOC_META[req.doc_category]?.desc ? (
                    <p className="text-xs text-gray-600 mt-1">
                      {DOC_META[req.doc_category].desc}
                    </p>
                  ) : (
                    req.note && (
                      <p className="text-xs text-gray-600 mt-1">{req.note}</p>
                    )
                  )}
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded ${
                    req.required === false
                      ? "bg-gray-100 text-gray-700"
                      : "bg-green-100 text-green-700"
                  }`}
                >
                  {req.required === false ? "Optional" : "Required"}
                </span>
              </div>

              {verificationError && req.doc_category === "founder_id" && (
                <div className="p-3 mb-4 rounded-md bg-red-50 text-red-700 text-sm">
                  {verificationError}
                </div>
              )}

              {req.extract_fields && req.extract_fields.length > 0 && (
                <div className="grid md:grid-cols-2 gap-4 mb-3">
                  {req.extract_fields.map((f) => (
                    <div key={f.name}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {f.label || labelize(f.name)}
                      </label>
                      <input
                        type="text"
                        value={
                          documentsData[req.doc_category]?.fields?.[f.name] ||
                          ""
                        }
                        onChange={(e) =>
                          handleDocFieldChange(
                            req.doc_category,
                            f.name,
                            e.target.value
                          )
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-ayush-500 focus:border-ayush-500"
                        placeholder={`Enter ${f.label || labelize(f.name)}`}
                      />
                    </div>
                  ))}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Upload Document
                </label>
                <div className="flex gap-2 items-start">
                  <div className="flex-1">
                    <input
                      type="file"
                      onChange={(e) => {
                        handleDocFileChange(
                          req.doc_category,
                          e.target.files?.[0] || null
                        );
                        if (req.doc_category === "founder_id") {
                          setVerificationError("");
                        }
                      }}
                      className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-ayush-50 file:text-ayush-700 hover:file:bg-ayush-100"
                    />
                    {documentsData[req.doc_category]?.file && (
                      <p className="mt-1 text-xs text-gray-600">
                        Selected: {documentsData[req.doc_category].file.name}
                      </p>
                    )}
                    {documentsData[req.doc_category]?.uploaded && (
                      <p className="mt-1 text-xs text-green-600">
                        Uploaded — status:{" "}
                        {documentsData[req.doc_category].verified_status ||
                          "pending"}
                      </p>
                    )}
                  </div>

                  {/* Verify button for founder_id */}
                  {req.doc_category === "founder_id" &&
                    !aadhaarFullyVerified && (
                      <button
                        onClick={handleUploadAadhaar}
                        disabled={
                          !documentsData[req.doc_category]?.file ||
                          aadhaarUploadLoading
                        }
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed whitespace-nowrap h-10 mt-0"
                      >
                        {aadhaarUploadLoading ? "Verifying..." : "Verify"}
                      </button>
                    )}

                  {/* Verify button for Product QR */}
                  {req.doc_category === "product_qr" && (
                    <div className="flex flex-col items-end gap-2">
                      <button
                        onClick={() => handleVerifyQR(req.doc_category)}
                        disabled={
                          !documentsData[req.doc_category]?.file || qrLoading
                        }
                        className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed whitespace-nowrap h-10"
                      >
                        {qrLoading ? "Verifying QR..." : "Verify QR"}
                      </button>

                      {/* show quick result */}
                      {qrResult && (
                        <div className="mt-2 p-2 rounded border bg-gray-50 text-xs w-64 text-left">
                          <div className="font-semibold text-sm mb-1">
                            QR Result:{" "}
                            {qrResult.status ||
                              (qrResult.success ? "VERIFIED" : "NOT_FOUND")}
                          </div>
                          <div className="text-xs text-gray-700">
                            {qrResult.matched_type && (
                              <div>
                                <strong>Matched:</strong>{" "}
                                {qrResult.matched_type}
                              </div>
                            )}
                            {qrResult.matched_by && (
                              <div>
                                <strong>By:</strong> {qrResult.matched_by}
                              </div>
                            )}
                            {qrResult.product && (
                              <div>
                                <strong>Product:</strong>{" "}
                                {qrResult.product.product_name}
                              </div>
                            )}
                            {qrResult.barcode && (
                              <div>
                                <strong>Barcode status:</strong>{" "}
                                {qrResult.barcode.status}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* OTP Input - Show only for founder_id after email-lookup succeeds */}
              {req.doc_category === "founder_id" &&
                aadhaarVerified &&
                aadhaarOtpPending &&
                !aadhaarFullyVerified && (
                  <div className="mt-4 p-4 rounded-md bg-blue-50 border border-blue-200">
                    <p className="text-sm text-blue-800 mb-3">
                      ✉️ OTP sent to:{" "}
                      <span className="font-semibold">{aadhaarEmail}</span>
                    </p>
                    <div className="flex gap-2 items-end">
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Enter OTP Code
                        </label>
                        <input
                          type="text"
                          placeholder="Enter 6-digit OTP"
                          value={otpInput}
                          onChange={(e) => {
                            setOtpInput(e.target.value);
                            setVerificationError("");
                          }}
                          maxLength="6"
                          className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <button
                        onClick={handleVerifyOtp}
                        disabled={!otpInput.trim() || otpLoading}
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed whitespace-nowrap h-10"
                      >
                        {otpLoading ? "Verifying..." : "Verify OTP"}
                      </button>
                    </div>
                  </div>
                )}
            </div>
          ))}
        </div>
      )}

      {/* If we have uploadResults, show a compact summary here too */}
      {uploadResults.length > 0 && (
        <div className="mt-6 p-4 border rounded bg-gray-50">
          <h4 className="font-semibold mb-2">Upload & Verification Summary</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left">
                  <th className="py-2">Document</th>
                  <th className="py-2">File</th>
                  <th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {uploadResults.map((r, i) => (
                  <tr key={i} className="border-t">
                    <td className="py-2">
                      {DOC_META[r.category]?.label || labelize(r.category)}
                    </td>
                    <td className="py-2">{r.fileName}</td>
                    <td className="py-2">
                      {r.status === "verified" ? (
                        <span className="text-green-600 font-semibold">
                          Verified ✅
                        </span>
                      ) : r.status === "rejected" ? (
                        <span className="text-red-600 font-semibold">
                          Rejected ❌
                        </span>
                      ) : r.status === "pending" ||
                        r.status === "processing" ? (
                        <span className="text-yellow-600 font-semibold">
                          Pending ⏳
                        </span>
                      ) : r.status === "upload_failed" ? (
                        <span className="text-gray-600 font-semibold">
                          Upload failed ⚠️
                        </span>
                      ) : (
                        <span className="text-gray-600 font-semibold">
                          Error
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center space-x-3">
            <button
              type="button"
              onClick={() => navigate("/StartupOwner/profile")}
              className="px-4 py-2 bg-ayush-600 text-white rounded hover:bg-ayush-700"
            >
              Go to Profile
            </button>
            <button
              type="button"
              onClick={() => {
                // allow user to re-upload / modify docs: navigate to step 3 (documents)
                setCurrentStep(3);
              }}
              className="px-4 py-2 border rounded"
            >
              Edit Documents
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <FaLeaf className="text-ayush-600 text-2xl" />
              <span className="text-xl font-bold text-gray-900">AYUSH</span>
            </div>
            <button
              onClick={handleBack}
              className="text-gray-700 hover:text-ayush-600 transition-colors flex items-center"
            >
              <FaArrowLeft className="mr-2" /> Back to Dashboard
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="mb-4">
              <FaRocket className="text-6xl text-ayush-600 mx-auto" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Startup Application
            </h1>
            <p className="text-gray-600">
              Complete the form below to submit your AYUSH startup registration
              application.
            </p>
          </div>

          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                Step {currentStep} of 3
              </span>
              <span className="text-sm text-gray-500">
                {Math.round((currentStep / 3) * 100)}% Complete
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-ayush-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(currentStep / 3) * 100}%` }}
              ></div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            {currentStep === 1 && renderStep1()}
            {currentStep === 2 && renderStep2()}
            {currentStep === 3 && renderStep3()}

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-8">
              <button
                type="button"
                onClick={currentStep === 1 ? handleBack : handlePrevious}
                className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                {currentStep === 1 ? "Cancel" : "Previous"}
              </button>

              {currentStep < 3 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="px-6 py-3 rounded-lg font-semibold bg-ayush-600 text-white hover:bg-ayush-700"
                >
                  Next Step
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`px-6 py-3 rounded-lg font-semibold transition-colors duration-200 flex items-center ${
                    isSubmitting
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-ayush-600 hover:bg-ayush-700 text-white"
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Submitting...
                    </>
                  ) : (
                    <>
                      <FaSave className="mr-2" /> Submit Application
                    </>
                  )}
                </button>
              )}
            </div>
          </form>

          {/* Info Section */}
          <div className="mt-8 p-6 bg-ayush-50 rounded-lg">
            <div className="flex items-start">
              <FaInfoCircle className="text-ayush-600 text-xl mr-3 mt-1" />
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  Application Process
                </h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>
                    • Your application will be reviewed by AYUSH officials
                  </li>
                  <li>
                    • You may be contacted for additional information or
                    documents
                  </li>
                  <li>
                    • The review process typically takes 15-30 business days
                  </li>
                  <li>
                    • You can track your application status in the dashboard
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
export default StartupApplication;
