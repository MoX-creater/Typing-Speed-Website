const DEFAULT_SUMMARY =
  "Nice race! Keep practicing to improve your speed and accuracy.";

const PREAMBLE_PATTERNS = [
  /^here(?:'s| is)\s+(?:your|a|the)\s+summary/i,
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

function normalizeSummaryText(text) {
  return String(text || "")
    .trim()
    .replace(/^["'`]+|["'`]+$/g, "")
    .replace(/\s+/g, " ");
}

function countSentences(text) {
  const normalized = normalizeSummaryText(text);
  if (!normalized) return 0;
  return normalized.split(/[.!?]+/).filter((part) => part.trim().length > 0).length;
}

function validateSummaryResponse(text) {
  const normalized = normalizeSummaryText(text);

  if (!normalized) {
    return { valid: false, reason: "empty response", normalized };
  }

  if (normalized.length < 40) {
    return { valid: false, reason: "too short", normalized };
  }

  if (normalized.length > 600) {
    return { valid: false, reason: "too long", normalized };
  }

  const sentenceCount = countSentences(normalized);
  if (sentenceCount < 1 || sentenceCount > 4) {
    return { valid: false, reason: "invalid sentence count", normalized, sentenceCount };
  }

  for (const pattern of PREAMBLE_PATTERNS) {
    if (pattern.test(normalized)) {
      return { valid: false, reason: "contains preamble", normalized };
    }
  }

  for (const pattern of MARKDOWN_PATTERNS) {
    if (pattern.test(normalized)) {
      return { valid: false, reason: "contains markdown formatting", normalized };
    }
  }

  if (/["“”]/.test(normalized)) {
    return { valid: false, reason: "contains quotation marks", normalized };
  }

  return { valid: true, normalized, sentenceCount };
}

module.exports = {
  DEFAULT_SUMMARY,
  normalizeSummaryText,
  countSentences,
  validateSummaryResponse,
};
