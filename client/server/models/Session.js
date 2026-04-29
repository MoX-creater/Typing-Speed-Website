import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  wpm: {
    type: Number,
    required: true,
  },
  accuracy: {
    type: Number,
    required: true,
  },
  duration: {
    type: Number, // in seconds
    required: true,
  },
  correctWords: {
    type: Number,
    default: 0,
  },
  totalWords: {
    type: Number,
    default: 0,
  },
  correctChars: {
    type: Number,
    default: 0,
  },
  totalChars: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Index for leaderboard queries
sessionSchema.index({ wpm: -1 });
sessionSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model("Session", sessionSchema);
