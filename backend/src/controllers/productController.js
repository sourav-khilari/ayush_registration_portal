// src/controllers/productController.js
import fs from "fs";
import path from "path";
import Barcode from "../models/Barcode.js"; // optional DB match
import Product from "../models/Product.js"; // optional DB match

/**
 * verifyProductQrHandler
 * - expects multer memoryStorage (req.file.buffer) or disk (req.file.path)
 * - saves a debug copy at ./uploads/debug-<timestamp>.png
 * - tries to decode the QR using available libraries:
 *     1) qrcode-reader + jimp (if present)
 *     2) jsqr (if present) + jimp (to get raw pixels) -- only if available and compatible
 * - returns diagnostics so you can verify upload and decoding attempts
 */
export async function verifyProductQrHandler(req, res) {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({
          success: false,
          message: "No file uploaded. Field name must be 'image'.",
        });
    }

    // prefer buffer (memoryStorage). If using disk storage, fallback to reading file.
    const buffer =
      req.file.buffer ||
      (req.file.path && fs.existsSync(req.file.path)
        ? fs.readFileSync(req.file.path)
        : null);
    if (!buffer) {
      return res
        .status(400)
        .json({ success: false, message: "Uploaded file buffer not found." });
    }

    // Save debug copy so you can open it locally
    let debugPath = null;
    try {
      const outDir = path.join(process.cwd(), "uploads");
      if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
      debugPath = path.join(outDir, `debug-${Date.now()}.png`);
      fs.writeFileSync(debugPath, buffer);
      console.log("Saved debug upload to:", debugPath);
    } catch (err) {
      console.warn("Could not save debug copy:", err.message || err);
    }

    // Prepare output diagnostics
    const diagnostic = {
      filename: req.file.originalname || null,
      size: req.file.size || (buffer ? buffer.length : null),
      debugPath,
      decodeAttempts: [],
      decodedText: null,
      matched_barcode: null,
      matched_product: null,
    };

    // Try 1: qrcode-reader + jimp (most common older approach)
    try {
      // dynamic imports — won't crash if module missing or incompatible
      const QRReader =
        (await import("qrcode-reader")).default ||
        (await import("qrcode-reader"));
      // jimp import attempts (different dist versions export differently)
      let Jimp;
      try {
        Jimp = (await import("jimp")).default || (await import("jimp"));
      } catch (jimpErr) {
        // try alternative dynamic require path (rare)
        try {
          Jimp = await import("jimp").then((m) => m);
        } catch (e) {
          Jimp = null;
        }
      }

      if (QRReader && Jimp) {
        diagnostic.decodeAttempts.push("qrcode-reader + jimp available");
        try {
          // jimp can read from buffer
          const jimg = await Jimp.read(buffer);
          // qrcode-reader usage
          const qr = new QRReader();
          const decoded = await new Promise((resolve, reject) => {
            qr.callback = function (err, value) {
              if (err) return resolve(null);
              // value.result or value.code depending on version
              const txt =
                value && (value.result || value.code || value.data)
                  ? value.result || value.code || value.data
                  : null;
              resolve(txt);
            };
            // pass Jimp bitmap
            qr.decode(jimg.bitmap);
          });

          if (decoded) {
            diagnostic.decodeAttempts.push("decoded via qrcode-reader+jimp");
            diagnostic.decodedText = decoded;
          } else {
            diagnostic.decodeAttempts.push(
              "qrcode-reader+jimp attempted but no decode"
            );
          }
        } catch (err) {
          diagnostic.decodeAttempts.push(
            "qrcode-reader+jimp error: " + (err.message || err.toString())
          );
        }
      } else {
        diagnostic.decodeAttempts.push("qrcode-reader or jimp not available");
      }
    } catch (err) {
      diagnostic.decodeAttempts.push(
        "qrcode-reader/jimp dynamic import failed: " +
          (err.message || String(err))
      );
    }

    // If still not decoded, try jsqr (if available) and a small pixel extraction via Jimp if present
    if (!diagnostic.decodedText) {
      try {
        const jsqrModule = await import("jsqr")
          .then((m) => m.default || m)
          .catch(() => null);
        let Jimp = null;
        try {
          Jimp = await import("jimp")
            .then((m) => m.default || m)
            .catch(() => null);
        } catch (e) {
          Jimp = null;
        }

        if (jsqrModule && Jimp) {
          diagnostic.decodeAttempts.push("jsqr + jimp available");
          try {
            const jimg = await Jimp.read(buffer);
            // convert to RGBA raw
            const { data, width, height } = jimg.bitmap; // data is Buffer with RGBA in many Jimp versions
            const uint8Clamped = new Uint8ClampedArray(
              data.buffer,
              data.byteOffset,
              data.byteLength
            );
            const result = jsqrModule(uint8Clamped, width, height);
            if (result && result.data) {
              diagnostic.decodeAttempts.push("decoded via jsqr+jimp");
              diagnostic.decodedText = result.data;
            } else {
              diagnostic.decodeAttempts.push(
                "jsqr+jimp attempted but no decode"
              );
            }
          } catch (err) {
            diagnostic.decodeAttempts.push(
              "jsqr+jimp error: " + (err.message || String(err))
            );
          }
        } else {
          diagnostic.decodeAttempts.push("jsqr or jimp not available");
        }
      } catch (err) {
        diagnostic.decodeAttempts.push(
          "jsqr import failed: " + (err.message || String(err))
        );
      }
    }

    // If decodedText found, try DB lookup (if your Barcode model exists)
    if (diagnostic.decodedText) {
      try {
        const decoded = diagnostic.decodedText;
        const barcode = await Barcode.findOne({
          $or: [{ jti: decoded }, { token: decoded }, { "meta.code": decoded }],
        })
          .lean()
          .catch(() => null);
        diagnostic.matched_barcode = barcode || null;
        if (barcode && barcode.product_id) {
          const prod = await Product.findById(barcode.product_id)
            .lean()
            .catch(() => null);
          diagnostic.matched_product = prod || null;
        }
      } catch (err) {
        console.warn("DB lookup failed:", err.message || err);
      }
    }

    // Return diagnostics and result
    return res.json({
      success: !!diagnostic.decodedText,
      message: diagnostic.decodedText
        ? "QR decoded"
        : "QR verification failed or no decode library available",
      diagnostic,
    });
  } catch (err) {
    console.error("verifyProductQrHandler error:", err);
    return res
      .status(500)
      .json({
        success: false,
        message: "Server error",
        error: err.message || String(err),
      });
  }
}
