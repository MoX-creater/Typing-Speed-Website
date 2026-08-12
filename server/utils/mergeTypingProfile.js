const CHAR_CLASSES = ["letters", "numbers", "symbols"];

function emptyCharClassStats() {
  return {
    letters: { correct: 0, total: 0, accuracy: 100 },
    numbers: { correct: 0, total: 0, accuracy: 100 },
    symbols: { correct: 0, total: 0, accuracy: 100 },
  };
}

function mergeCharClassStats(existing = {}, incoming = {}) {
  const merged = emptyCharClassStats();

  for (const charClass of CHAR_CLASSES) {
    const prev = existing[charClass] || {};
    const next = incoming[charClass] || {};
    const correct = (prev.correct || 0) + (next.correct || 0);
    const total = (prev.total || 0) + (next.total || 0);

    merged[charClass] = {
      correct,
      total,
      accuracy: total > 0 ? Number(((correct / total) * 100).toFixed(1)) : 100,
    };
  }

  return merged;
}

function mergeErrorMap(existing = {}, incoming = {}) {
  const merged = { ...existing };

  for (const [key, count] of Object.entries(incoming)) {
    if (typeof count !== "number" || Number.isNaN(count)) continue;
    merged[key] = (merged[key] || 0) + count;
  }

  return merged;
}

/**
 * Merge a new test's telemetry into an existing typingProfile document.
 * errorMap counts accumulate; avgWpmOverTime is replaced with the latest test;
 * accuracyByCharClass merges underlying correct/total counts.
 */
function mergeTypingProfile(existingProfile = {}, incomingProfile = {}) {
  return {
    errorMap: mergeErrorMap(existingProfile.errorMap, incomingProfile.errorMap),
    avgWpmOverTime: Array.isArray(incomingProfile.avgWpmOverTime)
      ? incomingProfile.avgWpmOverTime
      : existingProfile.avgWpmOverTime || [],
    accuracyByCharClass: mergeCharClassStats(
      existingProfile.accuracyByCharClass,
      incomingProfile.accuracyByCharClass
    ),
    lastUpdated: incomingProfile.lastUpdated || new Date().toISOString(),
    testsCompletedSinceLastPassage:
      (existingProfile.testsCompletedSinceLastPassage || 0) + 1,
  };
}

module.exports = {
  mergeTypingProfile,
  mergeErrorMap,
  mergeCharClassStats,
};
