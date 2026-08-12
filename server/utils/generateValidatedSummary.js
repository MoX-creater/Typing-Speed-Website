const { generateSummary } = require("./geminiService");
const {
  DEFAULT_SUMMARY,
  validateSummaryResponse,
} = require("./validateSummaryResponse");

async function generateValidatedSummary(prompt, logTag = "performance-summary") {
  let lastReason = "unknown";

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    let rawText;

    try {
      rawText = await generateSummary(prompt);
    } catch (error) {
      lastReason = "gemini api error";
      console.error(`${logTag} Gemini call failed (attempt ${attempt}):`, error.message);
      continue;
    }

    if (attempt === 1) {
      console.log(`[${logTag}] raw Gemini response:`, JSON.stringify(rawText));
    }

    const validation = validateSummaryResponse(rawText);

    if (validation.valid) {
      return { summary: validation.normalized, usedFallback: false, attempt };
    }

    lastReason = validation.reason;
    console.warn(`${logTag} validation failed (attempt ${attempt}): ${validation.reason}`);
  }

  return {
    summary: DEFAULT_SUMMARY,
    usedFallback: true,
    attempt: 2,
    fallbackReason: lastReason,
  };
}

module.exports = {
  generateValidatedSummary,
};
