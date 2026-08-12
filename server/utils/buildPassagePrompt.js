const { getTargetWordCount } = require("./validatePassageResponse");

const READING_LEVELS = {
  easy: "easy — simple everyday words and short sentences",
  medium: "medium — varied vocabulary and sentence length",
  hard: "hard — complex vocabulary, longer sentences, more punctuation variety",
};

function getTopErrors(errorMap = {}, min = 5, max = 8) {
  const sorted = Object.entries(errorMap)
    .filter(([, count]) => typeof count === "number" && count > 0)
    .sort((a, b) => b[1] - a[1]);

  if (sorted.length === 0) {
    return [];
  }

  const take = Math.min(max, Math.max(min, sorted.length));
  return sorted.slice(0, take);
}

function getErrorPatternList(topErrors) {
  if (topErrors.length === 0) {
    return ["varied common English letter combinations"];
  }

  return topErrors.map(([pattern]) => pattern);
}

function buildPassagePrompt(
  typingProfile = {},
  difficulty = "medium",
  theme = "",
  duration = 15
) {
  const normalizedDifficulty = READING_LEVELS[difficulty] ? difficulty : "medium";
  const normalizedTheme =
    typeof theme === "string" && theme.trim() ? theme.trim() : "any everyday topic";
  const topErrors = getTopErrors(typingProfile.errorMap);
  const errorPatterns = getErrorPatternList(topErrors);
  const targetWordCount = getTargetWordCount(duration, normalizedDifficulty);

  const prompt = `Write a single typing practice passage.

Requirements:
- Length: exactly ${targetWordCount} words (not sentences, not paragraphs — count words)
- Reading level: ${READING_LEVELS[normalizedDifficulty]}
- Topic: ${normalizedTheme}
- Naturally include frequent use of these letter patterns, since the typist struggles with them: ${errorPatterns.join(", ")} — weave them into real words, don't force awkward phrasing just to hit them
- Write ORIGINAL, coherent, sensible prose — like something from a real article, story, or blog post. Not a random word list, not disconnected sentences, not filler.
- Do NOT use quotation marks, em dashes, markdown formatting, numbers/bullets, or a title
- Do NOT include any preamble like "Here is your passage:" — output ONLY the passage text itself, nothing else
- Avoid repeating the same sentence structure more than twice in a row
- Avoid uncommon or awkward words purely to hit character patterns — natural phrasing takes priority over pattern density

Output only the passage text.`;

  return {
    prompt,
    basedOnErrors: topErrors.map(([pattern]) => pattern),
    targetWordCount,
    difficulty: normalizedDifficulty,
    theme: normalizedTheme,
    duration: Number(duration),
  };
}

module.exports = {
  buildPassagePrompt,
  getTopErrors,
  getErrorPatternList,
  READING_LEVELS,
};
