// src/models/StartupProfile.js
import mongoose from "mongoose";

const StartupProfileSchema = new mongoose.Schema(
  {
    startupId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    oneLinePitch: {
      type: String,
      maxlength: 200,
    },
    stage: {
      type: String,
      enum: ["Idea", "Prototype", "Traction", "Revenue"],
    },
    fundingAsk: {
      type: Number,
      default: 0,
    },
    equityOfferedPercent: {
      type: Number,
      default: 0,
    },
    team: [
      {
        name: String,
        role: String,
        yearsExperience: Number,
        isMedicalExpert: {
          type: Boolean,
          default: false,
        },
      },
    ],
    marketSizeDescription: String,
    visibility: {
      investors: {
        type: Boolean,
        default: true,
      },
      public: {
        type: Boolean,
        default: false,
      },
    },
    attractionScore: {
      type: Number,
      default: 0,
    },
    scoreBreakdown: {
      type: mongoose.Schema.Types.Mixed,
    },
    profileCompleteness: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

export default mongoose.models.StartupProfile || mongoose.model("StartupProfile", StartupProfileSchema);
