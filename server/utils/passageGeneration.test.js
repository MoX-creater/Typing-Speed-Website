const test = require("node:test");
const assert = require("node:assert/strict");
const { buildPassagePrompt, getTopErrors } = require("./buildPassagePrompt");
const { pickDefaultPassage, STOCK_PASSAGES } = require("./defaultPassages");
const {
  validatePassageResponse,
  normalizePassageText,
  getTargetWordCount,
  DEFAULT_PASSAGE,
} = require("./validatePassageResponse");

test("getTopErrors returns up to 8 entries sorted by count", () => {
  const top = getTopErrors({ th: 4, q: 2, ing: 3, a: 10, b: 1, c: 8, d: 7, e: 6, f: 5, g: 4 });

  assert.equal(top.length, 8);
  assert.deepEqual(top[0], ["a", 10]);
  assert.deepEqual(top[1], ["c", 8]);
});

test("getTopErrors returns empty array when no errors exist", () => {
  assert.deepEqual(getTopErrors({}), []);
  assert.deepEqual(getTopErrors({ th: 0 }), []);
});

test("getTargetWordCount scales with duration and difficulty", () => {
  assert.equal(getTargetWordCount(15, "medium"), 38);
  assert.equal(getTargetWordCount(30, "medium"), 75);
  assert.equal(getTargetWordCount(60, "medium"), 150);
  assert.equal(getTargetWordCount(120, "medium"), 300);
  assert.equal(getTargetWordCount(15, "easy"), 32);
  assert.equal(getTargetWordCount(15, "hard"), 43);
});

test("buildPassagePrompt uses the new template with word count and error patterns", () => {
  const { prompt, basedOnErrors, theme, difficulty, targetWordCount } = buildPassagePrompt(
    { errorMap: { th: 4, q: 2, ing: 3 } },
    "medium",
    "space exploration",
    30
  );

  assert.equal(theme, "space exploration");
  assert.equal(difficulty, "medium");
  assert.equal(targetWordCount, 75);
  assert.deepEqual(basedOnErrors, ["th", "ing", "q"]);
  assert.match(prompt, /Write a single typing practice passage/);
  assert.match(prompt, /Length: exactly 75 words/);
  assert.match(prompt, /Topic: space exploration/);
  assert.match(prompt, /th, ing, q/);
  assert.match(prompt, /Output only the passage text/);
});

test("buildPassagePrompt handles missing typing profile and theme", () => {
  const { prompt, basedOnErrors, theme, targetWordCount } = buildPassagePrompt(
    undefined,
    "easy",
    "",
    15
  );

  assert.equal(theme, "any everyday topic");
  assert.equal(targetWordCount, 32);
  assert.deepEqual(basedOnErrors, []);
  assert.match(prompt, /varied common English letter combinations/);
  assert.match(prompt, /easy — simple everyday words and short sentences/);
});

test("validatePassageResponse accepts a passage within target word range", () => {
  const words = Array.from({ length: 38 }, (_, i) => `word${i + 1}`).join(" ");
  const result = validatePassageResponse(words, "medium", 15);

  assert.equal(result.valid, true);
  assert.equal(result.wordCount, 38);
});

test("validatePassageResponse rejects empty and preamble responses", () => {
  assert.equal(validatePassageResponse("", "easy", 15).valid, false);
  assert.equal(
    validatePassageResponse("Here is your passage: " + DEFAULT_PASSAGE, "easy", 15).valid,
    false
  );
});

test("validatePassageResponse rejects markdown artifacts", () => {
  const markdownPassage = `# Title ${DEFAULT_PASSAGE}`;
  assert.equal(validatePassageResponse(markdownPassage, "easy", 15).valid, false);
});

test("normalizePassageText trims quotes and collapses whitespace", () => {
  assert.equal(normalizePassageText('  "hello   world"  '), "hello world");
});

test("pickDefaultPassage returns a stock passage deterministically", () => {
  const first = pickDefaultPassage("user-a");
  const second = pickDefaultPassage("user-a");

  assert.equal(first, second);
  assert.ok(STOCK_PASSAGES.includes(first));
});

test("pickDefaultPassage rotates across stock passages for different users", () => {
  const picks = new Set([
    pickDefaultPassage("user-a"),
    pickDefaultPassage("user-b"),
    pickDefaultPassage("user-c"),
    pickDefaultPassage("user-d"),
  ]);

  assert.ok(picks.size > 1);
});

test("pickDefaultPassage falls back to DEFAULT_PASSAGE when stock list is empty", () => {
  const original = STOCK_PASSAGES.splice(0, STOCK_PASSAGES.length);
  try {
    assert.equal(pickDefaultPassage("user-a"), DEFAULT_PASSAGE);
  } finally {
    STOCK_PASSAGES.push(...original);
  }
});
