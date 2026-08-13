const DEFAULT_PASSAGE =
  "The quick brown fox jumps over the lazy dog near the riverbank where wildflowers bloom in the golden light of a summer afternoon and gentle breezes carry the scent of fresh grass across the open meadow while birds sing softly in the distance";

const VALID_DURATIONS = [15, 30, 60, 120];

const DIFFICULTY_WORD_MULTIPLIER = {
  easy: 0.85,
  medium: 1.0,
  hard: 1.15,
};

const PREAMBLE_PATTERNS = [
  /^here(?:'s| is)\s+(?:your|a|the)\s+passage/i,
  /^sure,?\s/i,
  /^certainly,?\s/i,
  /^of course,?\s/i,
  /^below is\s/i,
  /^as requested,?\s/i,
];

const MARKDOWN_PATTERNS = [
  /^#{1,6}\s/m,
  /\*\*[^*]+\*\*/,
  /```/,
  /^---+$/m,
  /^\*\s/m,
  /^-\s/m,
  /^\d+\.\s/m,
];

function getTargetWordCount(duration = 15, difficulty = "medium") {
  const normalizedDuration = VALID_DURATIONS.includes(Number(duration)) ? Number(duration) : 15;
  const normalizedDifficulty = DIFFICULTY_WORD_MULTIPLIER[difficulty] ? difficulty : "medium";
  const multiplier = DIFFICULTY_WORD_MULTIPLIER[normalizedDifficulty];

  // Align with TypingTest buffer sizing (~2.5 words/sec), scaled by difficulty.
  return Math.round(normalizedDuration * 2.5 * multiplier);
}

function getTargetWordCountRange(duration = 15, difficulty = "medium") {
  const targetWords = getTargetWordCount(duration, difficulty);
  const tolerance = Math.max(5, Math.round(targetWords * 0.15));

  return {
    targetWords,
    minWords: Math.max(10, targetWords - tolerance),
    maxWords: targetWords + tolerance,
  };
}

function normalizePassageText(text) {
  return String(text || "")
    .trim()
    .replace(/^["'`]+|["'`]+$/g, "")
    .replace(/\s+/g, " ");
}

function countWords(text) {
  const normalized = normalizePassageText(text);
  if (!normalized) return 0;
  return normalized.split(/\s+/).filter(Boolean).length;
}

function validatePassageResponse(text, difficulty = "medium", duration = 15) {
  const normalized = normalizePassageText(text);
  const { minWords, maxWords, targetWords } = getTargetWordCountRange(duration, difficulty);
  const wordCount = countWords(normalized);

  if (!normalized) {
    return { valid: false, reason: "empty response", normalized, wordCount, targetWords };
  }

  if (wordCount < minWords) {
    return { valid: false, reason: "too short", normalized, wordCount, targetWords };
  }

  if (wordCount > maxWords) {
    return { valid: false, reason: "too long", normalized, wordCount, targetWords };
  }

  for (const pattern of PREAMBLE_PATTERNS) {
    if (pattern.test(normalized)) {
      return { valid: false, reason: "contains preamble", normalized, wordCount, targetWords };
    }
  }

  for (const pattern of MARKDOWN_PATTERNS) {
    if (pattern.test(normalized)) {
      return { valid: false, reason: "contains markdown formatting", normalized, wordCount, targetWords };
    }
  }

  if (/["“”]/.test(normalized)) {
    return { valid: false, reason: "contains quotation marks", normalized, wordCount, targetWords };
  }

  if (/—/.test(normalized)) {
    return { valid: false, reason: "contains em dashes", normalized, wordCount, targetWords };
  }

  return { valid: true, normalized, wordCount, targetWords };
}

module.exports = {
  DEFAULT_PASSAGE,
  VALID_DURATIONS,
  getTargetWordCount,
  getTargetWordCountRange,
  normalizePassageText,
  countWords,
  validatePassageResponse,
};
