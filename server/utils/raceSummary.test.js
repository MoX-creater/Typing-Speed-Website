const test = require("node:test");
const assert = require("node:assert/strict");
const { buildSummaryPrompt, formatWpmTrend, formatErrorPatterns } = require("./buildSummaryPrompt");
const {
  validateSummaryResponse,
  DEFAULT_SUMMARY,
  normalizeSummaryText,
} = require("./validateSummaryResponse");

test("formatWpmTrend describes speed-up when WPM increases", () => {
  const trend = formatWpmTrend([42, 48, 55]);
  assert.match(trend, /speeded up/i);
  assert.match(trend, /42/);
  assert.match(trend, /55/);
});

test("buildSummaryPrompt includes solo test context", () => {
  const { prompt } = buildSummaryPrompt(
    {
      avgWpmOverTime: [35, 42, 48],
      accuracyByCharClass: {
        letters: { correct: 120, total: 125, accuracy: 96 },
      },
      finalWpm: 48,
      finalAccuracy: 94.5,
      duration: 30,
      testType: "Classic • 30s • English",
    },
    "solo"
  );

  assert.match(prompt, /solo typing speed test/i);
  assert.match(prompt, /Test duration: 30 seconds/);
  assert.match(prompt, /during the test/i);
  assert.doesNotMatch(prompt, /out of .* players/i);
});

test("buildSummaryPrompt includes race metrics and output rules", () => {
  const { prompt } = buildSummaryPrompt({
    avgWpmOverTime: [40, 52, 58],
    accuracyByCharClass: {
      letters: { correct: 90, total: 95, accuracy: 94.7 },
      symbols: { correct: 4, total: 8, accuracy: 50 },
    },
    finalWpm: 58,
    finalAccuracy: 91.2,
    placement: 2,
    playerCount: 4,
  });

  assert.match(prompt, /Final WPM: 58/);
  assert.match(prompt, /2 out of 4 players/);
  assert.match(prompt, /symbols: 50%/i);
  assert.match(prompt, /Output ONLY the summary text/);
  assert.match(prompt, /2-3 sentences/);
});

test("buildSummaryPrompt includes specific error patterns when typingProfile has errorMap", () => {
  const typingProfile = {
    errorMap: { th: 12, ing: 8, qu: 6, sh: 4, er: 3 },
  };

  const { prompt } = buildSummaryPrompt(
    {
      avgWpmOverTime: [35, 42, 48],
      finalWpm: 48,
      finalAccuracy: 92.5,
    },
    "solo",
    typingProfile
  );

  assert.match(prompt, /Persistent trouble spots/i);
  assert.match(prompt, /th/);
  assert.match(prompt, /ing/);
  assert.match(prompt, /qu/);
  assert.match(prompt, /Be SPECIFIC/);
  assert.doesNotMatch(prompt, /new user with no history/i);
});

test("buildSummaryPrompt falls back to session-only feedback when no typingProfile", () => {
  const { prompt } = buildSummaryPrompt(
    {
      avgWpmOverTime: [40, 45],
      finalWpm: 45,
      finalAccuracy: 95.0,
    },
    "solo",
    null
  );

  assert.doesNotMatch(prompt, /Persistent trouble spots/i);
  assert.match(prompt, /new user with no history/i);
});

test("buildSummaryPrompt falls back when typingProfile has empty errorMap", () => {
  const { prompt } = buildSummaryPrompt(
    {
      avgWpmOverTime: [40, 45],
      finalWpm: 45,
      finalAccuracy: 95.0,
    },
    "race",
    { errorMap: {} }
  );

  assert.doesNotMatch(prompt, /Persistent trouble spots/i);
  assert.match(prompt, /new user with no history/i);
});

test("formatErrorPatterns extracts top patterns from errorMap", () => {
  const patterns = formatErrorPatterns({
    errorMap: { th: 20, ing: 15, qu: 10, x: 5, z: 2 },
  });

  assert.ok(Array.isArray(patterns));
  assert.ok(patterns.length >= 4);
  assert.equal(patterns[0], "th");
  assert.equal(patterns[1], "ing");
});

test("formatErrorPatterns returns null when no profile", () => {
  assert.equal(formatErrorPatterns(null), null);
  assert.equal(formatErrorPatterns({}), null);
  assert.equal(formatErrorPatterns({ errorMap: {} }), null);
});

test("buildSummaryPrompt includes error patterns for race context too", () => {
  const typingProfile = {
    errorMap: { th: 12, ing: 8 },
  };

  const { prompt } = buildSummaryPrompt(
    {
      avgWpmOverTime: [40, 52, 58],
      finalWpm: 58,
      finalAccuracy: 91.2,
      placement: 2,
      playerCount: 4,
    },
    "race",
    typingProfile
  );

  assert.match(prompt, /Persistent trouble spots/i);
  assert.match(prompt, /th/);
  assert.match(prompt, /ing/);
  assert.match(prompt, /2 out of 4 players/);
});

test("validateSummaryResponse accepts a valid summary", () => {
  const summary =
    "You picked up speed as the race went on and finished strong at 58 WPM. " +
    "Symbols were a bit tricky, so slowing down on punctuation could help. " +
    "Great effort overall — keep racing and that consistency will improve.";
  const result = validateSummaryResponse(summary);

  assert.equal(result.valid, true);
  assert.equal(result.sentenceCount, 3);
});

test("validateSummaryResponse rejects empty and preamble responses", () => {
  assert.equal(validateSummaryResponse("").valid, false);
  assert.equal(
    validateSummaryResponse(`Here's your summary: ${DEFAULT_SUMMARY}`).valid,
    false
  );
});

test("normalizeSummaryText trims quotes and collapses whitespace", () => {
  assert.equal(normalizeSummaryText('  "hello   world."  '), "hello world.");
});
