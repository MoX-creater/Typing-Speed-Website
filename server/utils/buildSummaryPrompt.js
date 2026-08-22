const { getTopErrors, getErrorPatternList } = require("./buildPassagePrompt");

function formatWpmTrend(avgWpmOverTime = [], sessionLabel = "race") {
  const label = sessionLabel === "test" ? "test" : "race";

  if (!Array.isArray(avgWpmOverTime) || avgWpmOverTime.length === 0) {
    return `No WPM samples recorded during the ${label}.`;
  }

  if (avgWpmOverTime.length === 1) {
    return `WPM samples during the ${label}: ${avgWpmOverTime.join(", ")}.`;
  }

  const first = avgWpmOverTime[0];
  const last = avgWpmOverTime[avgWpmOverTime.length - 1];
  const peak = Math.max(...avgWpmOverTime);
  const trend =
    last > first + 3 ? "speeded up"
    : last < first - 3 ? "slowed down"
    : " stayed fairly steady";

  return (
    `WPM samples during the ${label}: ${avgWpmOverTime.join(", ")}. ` +
    `The typist started around ${first} WPM, finished around ${last} WPM, peaked at ${peak} WPM, and ${trend}.`
  );
}

function formatAccuracyByClass(accuracyByCharClass = {}) {
  const classes = ["letters", "numbers", "symbols"];
  const parts = classes
    .map((charClass) => {
      const stats = accuracyByCharClass[charClass];
      if (!stats || !stats.total) return null;
      const accuracy = stats.accuracy ?? ((stats.correct / stats.total) * 100).toFixed(1);
      return `${charClass}: ${accuracy}% (${stats.correct}/${stats.total} correct)`;
    })
    .filter(Boolean);

  if (parts.length === 0) {
    return "No character-class accuracy breakdown available.";
  }

  return `Accuracy by character type — ${parts.join("; ")}.`;
}

function formatPlacement(placement, playerCount) {
  if (!placement || !playerCount) {
    return "Placement information was not recorded.";
  }

  return `Final placement: ${placement} out of ${playerCount} players.`;
}

function formatErrorPatterns(typingProfile) {
  if (!typingProfile || !typingProfile.errorMap) {
    return null;
  }

  const topErrors = getTopErrors(typingProfile.errorMap);
  const patterns = getErrorPatternList(topErrors);

  // If getErrorPatternList returned the fallback, there are no real errors
  if (
    topErrors.length === 0 ||
    (patterns.length === 1 && patterns[0] === "varied common English letter combinations")
  ) {
    return null;
  }

  return patterns;
}

function buildSummaryPrompt(performanceData = {}, context = "race", typingProfile = null) {
  const {
    avgWpmOverTime = [],
    accuracyByCharClass = {},
    finalWpm,
    finalAccuracy,
    placement,
    playerCount,
    duration,
    testType,
  } = performanceData;

  const isSolo = context === "solo";
  const sessionLabel = isSolo ? "test" : "race";
  const wpmTrend = formatWpmTrend(avgWpmOverTime, sessionLabel);
  const accuracyBreakdown = formatAccuracyByClass(accuracyByCharClass);
  const placementLine = isSolo
    ? `Test duration: ${duration ?? "unknown"} seconds${testType ? ` (${testType})` : ""}.`
    : formatPlacement(placement, playerCount);

  const intro = isSolo
    ? "Write a short post-test performance summary for a solo typing speed test."
    : "Write a short post-race performance summary for a multiplayer typing race.";

  const dataLabel = isSolo ? "Test data:" : "Race data:";
  const sessionWord = isSolo ? "test" : "race";

  const errorPatterns = formatErrorPatterns(typingProfile);
  const hasHistory = errorPatterns !== null && errorPatterns.length > 0;

  const historyBlock = hasHistory
    ? `- Persistent trouble spots based on their typing history: ${errorPatterns.join(", ")}`
    : "";

  const specificnessRule = hasHistory
    ? `Be SPECIFIC — name the actual characters or letter combinations they struggle with (e.g. "you consistently mistype 'th' and 'ing'"), not vague categories like "symbols" or "letters." Reference whether this ${sessionWord} shows improvement on those specific patterns or not, if the data suggests it.`
    : `Note any weaker accuracy areas if the data shows them. Since this is a new user with no history, base feedback only on this ${sessionWord}'s data.`;

  const prompt = `${intro}

${dataLabel}
- Final WPM: ${finalWpm ?? "unknown"}
- Final accuracy: ${finalAccuracy ?? "unknown"}%
- ${placementLine}
- ${wpmTrend}
- ${accuracyBreakdown}
${historyBlock ? `${historyBlock}\n` : ""}
Write 2-3 sentences of natural, encouraging but specific feedback in plain language. Mention whether their speed trended up, down, or stayed steady during the ${sessionWord}. ${specificnessRule} Keep it constructive and actionable, not just praise.

Rules:
- Output ONLY the summary text.
- Use a warm, natural tone — not clinical or robotic.
- Do NOT include a title, markdown, bullet points, or quotation marks.
- Do NOT start with phrases like "Here's your summary:" or similar preambles.
- Keep it to 2-3 sentences total.`;

  return { prompt, context };
}

module.exports = {
  buildSummaryPrompt,
  formatWpmTrend,
  formatAccuracyByClass,
  formatErrorPatterns,
};
