const test = require("node:test");
const assert = require("node:assert/strict");
const { buildSummaryPrompt, formatWpmTrend } = require("./buildSummaryPrompt");
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
  assert.match(prompt, /during the test:/i);
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
