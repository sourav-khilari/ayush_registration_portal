import mongoose from 'mongoose';

const VerificationOtpSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, index: true },
    otp_hash: { type: String, required: true },
    doc_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Document' },
    used: { type: Boolean, default: false },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
    meta: { type: Object },
  },
  { timestamps: true }
);

export default mongoose.model('VerificationOTP', VerificationOtpSchema);
