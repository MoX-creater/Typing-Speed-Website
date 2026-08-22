const express = require("express");
const { requireAuth } = require("../middleware/auth");
const { aiGenerationRateLimit } = require("../utils/rateLimiter");
const { buildSummaryPrompt } = require("../utils/buildSummaryPrompt");
const { generateValidatedSummary } = require("../utils/generateValidatedSummary");
const { loadTypingProfile } = require("./passages");

const router = express.Router();

router.post(
  "/tests/summary",
  requireAuth,
  aiGenerationRateLimit("Please wait a moment before generating another summary."),
  async (req, res) => {
  const {
    avgWpmOverTime,
    accuracyByCharClass,
    finalWpm,
    finalAccuracy,
    duration,
    testType,
  } = req.body || {};

  try {
    const { profile: typingProfile } = await loadTypingProfile(req.userId);

    const { prompt } = buildSummaryPrompt(
      {
        avgWpmOverTime,
        accuracyByCharClass,
        finalWpm,
        finalAccuracy,
        duration,
        testType,
      },
      "solo",
      typingProfile
    );

    const generation = await generateValidatedSummary(prompt, "test-summary");

    return res.status(200).json({
      summary: generation.summary,
      usedFallback: generation.usedFallback,
    });
  } catch (error) {
    console.error("Failed to generate test summary:", error);
    return res.status(500).json({ error: "Failed to generate test summary" });
  }
}
);

module.exports = router;
