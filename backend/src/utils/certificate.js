import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import PDFDocument from "pdfkit";
import bwipjs from "bwip-js";
import QRCode from "qrcode";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function hmacHex(input) {
  const secret = process.env.CERT_SECRET || process.env.JWT_SECRET || "dev-secret";
  return crypto.createHmac("sha256", secret).update(String(input)).digest("hex");
}

export async function generateStartupCertificatePdf(startup, options = {}) {
  if (!startup?._id) throw new Error("Missing startup id");
  const approverName =
    options?.approverName ||
    startup?.status_updated_by_name ||
    "Government Official";
  const approverEmail =
    options?.approverEmail || startup?.status_updated_by_email || "N/A";
  const approverRole = options?.approverRole || "gov_official";

  const issuedAt = new Date();
  const certificateId = startup.certificate_id || crypto.randomUUID();
  const certificateHash = hmacHex(`${certificateId}:${startup._id}:${issuedAt.toISOString()}`);

  const outDir = path.join(__dirname, "..", "..", "public", "certificates");
  ensureDir(outDir);

  const fileName = `certificate-${startup._id}-${Date.now()}.pdf`;
  const filePath = path.join(outDir, fileName);

  // Generate a barcode (Code128) as a PNG buffer for authenticity
  const barcodeText = `AYUSH|${certificateId}|${String(startup._id)}`;
  const barcodePng = await bwipjs.toBuffer({
    bcid: "code128",
    text: barcodeText,
    scale: 3,
    height: 10,
    includetext: false,
  });

  // Generate QR Code containing a verification URL
  const verifyBase =
    process.env.CERT_VERIFY_BASE_URL ||
    process.env.PUBLIC_BASE_URL ||
    `http://localhost:${process.env.CLIENT_PORT || 5173}`;
  const verifyUrl = `${String(verifyBase).replace(/\/$/, "")}/verify-certificate?certificate_id=${encodeURIComponent(
    certificateId,
  )}&hash=${encodeURIComponent(certificateHash)}`;
  const qrPng = await QRCode.toBuffer(verifyUrl, {
    type: "png",
    errorCorrectionLevel: "M",
    margin: 1,
    width: 240,
  });

  await new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 48 });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    // Header
    doc
      .fontSize(20)
      .fillColor("#0f172a")
      .text("AYUSH Startup Registration Certificate", { align: "center" });
    doc.moveDown(0.25);
    doc
      .fontSize(10)
      .fillColor("#334155")
      .text("Ministry of AYUSH � Government of India", { align: "center" });

    doc.moveDown(1);
    doc
      .moveTo(48, doc.y)
      .lineTo(547, doc.y)
      .lineWidth(1)
      .strokeColor("#e2e8f0")
      .stroke();

    doc.moveDown(1.2);

    // Certificate body
    doc
      .fontSize(12)
      .fillColor("#0f172a")
      .text(
        `This is to certify that the following startup has been approved and registered under the AYUSH Startup Registration Portal.`,
        { align: "left" },
      );

    doc.moveDown(1);

    const leftX = 60;
    const labelColor = "#475569";
    const valueColor = "#0f172a";
    const lineGap = 18;
    let y = doc.y;

    function row(label, value) {
      doc.fontSize(10).fillColor(labelColor).text(label, leftX, y);
      doc.fontSize(11).fillColor(valueColor).text(value || "�", leftX + 160, y);
      y += lineGap;
    }

    row("Startup Name", startup.name);
    row("Founder Name", startup.founder_name);
    row("Registered Email", startup.email);
    row("Phone", startup.phone_number);
    row("Startup Type", startup.startup_type);
    row("Website", startup.website);
    row("Address", startup.address);

    y += 6;
    doc.fontSize(10).fillColor(labelColor).text("Approval Status", leftX, y);
    doc.fontSize(11).fillColor(valueColor).text("APPROVED", leftX + 160, y);
    y += lineGap;

    doc.fontSize(10).fillColor(labelColor).text("Approval Date", leftX, y);
    doc
      .fontSize(11)
      .fillColor(valueColor)
      .text(issuedAt.toLocaleString(), leftX + 160, y);
    y += lineGap;

    row("Approved By", `${approverName} (${approverEmail})`);
    row("Approver Role", String(approverRole).replaceAll("_", " "));

    doc.fontSize(10).fillColor(labelColor).text("Certificate ID", leftX, y);
    doc.fontSize(11).fillColor(valueColor).text(certificateId, leftX + 160, y);
    y += lineGap;

    doc.fontSize(10).fillColor(labelColor).text("Verification Hash", leftX, y);
    doc
      .fontSize(9)
      .fillColor(valueColor)
      .text(certificateHash, leftX + 160, y, { width: 330 });
    y += lineGap + 6;

    // Barcode + QR block
    doc.fontSize(10).fillColor(labelColor).text("Authenticity", leftX, y);
    y += 12;
    doc.image(barcodePng, leftX, y, { width: 260 });
    // QR on right side
    doc
      .fontSize(9)
      .fillColor(labelColor)
      .text("Scan to verify", 430, y - 2, { width: 110, align: "center" });
    doc.image(qrPng, 430, y + 12, { width: 110 });
    // Print verify url (small)
    doc
      .fontSize(7)
      .fillColor("#64748b")
      .text(verifyUrl, 300, y + 80, { width: 245 });
    y += 96;

    // Footer
    doc
      .moveTo(48, 760)
      .lineTo(547, 760)
      .lineWidth(1)
      .strokeColor("#e2e8f0")
      .stroke();
    doc
      .fontSize(9)
      .fillColor("#64748b")
      .text(
        "This certificate is system-generated. Verify using the QR code or Certificate ID + Verification Hash in the AYUSH Portal.",
        48,
        772,
        { align: "center", width: 499 },
      );

    doc.end();

    stream.on("finish", resolve);
    stream.on("error", reject);
  });

  return {
    certificateId,
    certificateHash,
    certificateUrl: `/certificates/${fileName}`,
    filePath,
    issuedAt,
  };
}

