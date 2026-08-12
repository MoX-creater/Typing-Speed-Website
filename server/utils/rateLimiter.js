// Cooldown between AI generation requests per user (passage + summaries share one limit).
const AI_GENERATION_COOLDOWN_MS = 8 * 1000;

// In-memory only: resets on server restart and does not sync across multiple instances.
const lastAiRequestByUser = new Map();

function checkAiGenerationRateLimit(userId) {
  const now = Date.now();
  const lastRequestAt = lastAiRequestByUser.get(userId);

  if (lastRequestAt != null && now - lastRequestAt < AI_GENERATION_COOLDOWN_MS) {
    return {
      allowed: false,
      retryAfterMs: AI_GENERATION_COOLDOWN_MS - (now - lastRequestAt),
    };
  }

  lastAiRequestByUser.set(userId, now);
  return { allowed: true };
}

function aiGenerationRateLimit(errorMessage) {
  return (req, res, next) => {
    const userId = req.userId;
    if (!userId) {
      return next();
    }

    const result = checkAiGenerationRateLimit(userId);
    if (!result.allowed) {
      return res.status(429).json({ error: errorMessage });
    }

    return next();
  };
}

function resetAiGenerationRateLimits() {
  lastAiRequestByUser.clear();
}

module.exports = {
  AI_GENERATION_COOLDOWN_MS,
  checkAiGenerationRateLimit,
  aiGenerationRateLimit,
  resetAiGenerationRateLimits,
};
