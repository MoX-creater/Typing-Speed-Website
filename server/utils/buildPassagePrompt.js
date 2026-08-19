const { getTargetWordCount } = require("./validatePassageResponse");

const READING_LEVELS = {
  easy: "easy — simple everyday words and short sentences, ALL LOWERCASE, ZERO punctuation of any kind",
  medium: "medium — varied vocabulary and sentence length, normal capitalization, natural use of periods and commas",
  hard: "hard — complex vocabulary, longer sentences, full punctuation variety (commas, semicolons, colons, quotation marks, apostrophes), mixed case including proper nouns",
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

  const formattingRule =
    normalizedDifficulty === "easy"
      ? "This passage must be entirely lowercase with absolutely no punctuation marks anywhere — not one comma, period, apostrophe, or any other mark."
      : normalizedDifficulty === "hard"
      ? "This passage must include varied, natural punctuation (commas, periods, semicolons, quotation marks where appropriate) and complex sentence structures."
      : "Use standard capitalization and natural punctuation (periods and commas) throughout.";

  const prompt = `Write a single typing practice passage.
Requirements:
- Length: exactly ${targetWordCount} words (not sentences, not paragraphs — count words)
- Reading level: ${READING_LEVELS[normalizedDifficulty]}
- CRITICAL FORMATTING RULE (follow this exactly, it overrides everything else below): ${formattingRule}
- Topic: ${normalizedTheme}
- Naturally include frequent use of these letter patterns, since the typist struggles with them: ${errorPatterns.join(", ")} — weave them into real words, don't force awkward phrasing just to hit them
- Write ORIGINAL, coherent, sensible prose — like something from a real article, story, or blog post. Not a random word list, not disconnected sentences, not filler.
- Do NOT use quotation marks, em dashes, markdown formatting, numbers/bullets, or a title
- Do NOT include any preamble like "Here is your passage:" — output ONLY the passage text itself, nothing else
- Avoid repeating the same sentence structure more than twice in a row
- Avoid uncommon or awkward words purely to hit character patterns — natural phrasing takes priority over pattern density
${normalizedDifficulty === "easy" ? "Reminder: no punctuation, no capital letters, anywhere in this passage." : ""}
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
};;
