const test = require("node:test");
const assert = require("node:assert/strict");
const {
  mergeTypingProfile,
  mergeErrorMap,
  mergeCharClassStats,
} = require("./mergeTypingProfile");

test("mergeErrorMap increments existing and new keys", () => {
  const merged = mergeErrorMap({ th: 2, q: 1 }, { th: 4, ing: 3 });

  assert.deepEqual(merged, { th: 6, q: 1, ing: 3 });
});

test("mergeErrorMap ignores invalid counts", () => {
  const merged = mergeErrorMap({ a: 1 }, { a: "2", b: NaN, c: 3 });

  assert.deepEqual(merged, { a: 1, c: 3 });
});

test("mergeCharClassStats combines correct and total counts", () => {
  const merged = mergeCharClassStats(
    {
      letters: { correct: 90, total: 100, accuracy: 90 },
      numbers: { correct: 5, total: 5, accuracy: 100 },
      symbols: { correct: 4, total: 8, accuracy: 50 },
    },
    {
      letters: { correct: 45, total: 50, accuracy: 90 },
      numbers: { correct: 0, total: 0, accuracy: 100 },
      symbols: { correct: 1, total: 2, accuracy: 50 },
    }
  );

  assert.equal(merged.letters.correct, 135);
  assert.equal(merged.letters.total, 150);
  assert.equal(merged.letters.accuracy, 90);
  assert.equal(merged.symbols.correct, 5);
  assert.equal(merged.symbols.total, 10);
  assert.equal(merged.symbols.accuracy, 50);
});

test("mergeTypingProfile accumulates errors and replaces wpm samples", () => {
  const existing = {
    errorMap: { th: 2, q: 1 },
    avgWpmOverTime: [40, 42],
    accuracyByCharClass: {
      letters: { correct: 90, total: 100, accuracy: 90 },
      numbers: { correct: 0, total: 0, accuracy: 100 },
      symbols: { correct: 0, total: 0, accuracy: 100 },
    },
    lastUpdated: "2026-01-01T00:00:00.000Z",
  };

  const incoming = {
    errorMap: { th: 4, ing: 3 },
    avgWpmOverTime: [55, 58, 60],
    accuracyByCharClass: {
      letters: { correct: 45, total: 50, accuracy: 90 },
      numbers: { correct: 0, total: 0, accuracy: 100 },
      symbols: { correct: 1, total: 2, accuracy: 50 },
    },
    lastUpdated: "2026-02-01T00:00:00.000Z",
  };

  const merged = mergeTypingProfile(existing, incoming);

  assert.deepEqual(merged.errorMap, { th: 6, q: 1, ing: 3 });
  assert.deepEqual(merged.avgWpmOverTime, [55, 58, 60]);
  assert.equal(merged.accuracyByCharClass.letters.correct, 135);
  assert.equal(merged.accuracyByCharClass.letters.total, 150);
  assert.equal(merged.lastUpdated, "2026-02-01T00:00:00.000Z");
  assert.equal(merged.testsCompletedSinceLastPassage, 1);
});

test("mergeTypingProfile handles missing existing profile", () => {
  const merged = mergeTypingProfile(undefined, {
    errorMap: { q: 2 },
    avgWpmOverTime: [30],
    accuracyByCharClass: {
      letters: { correct: 10, total: 12, accuracy: 83.3 },
    },
  });

  assert.deepEqual(merged.errorMap, { q: 2 });
  assert.deepEqual(merged.avgWpmOverTime, [30]);
  assert.equal(merged.accuracyByCharClass.letters.correct, 10);
  assert.equal(merged.accuracyByCharClass.letters.total, 12);
  assert.equal(merged.testsCompletedSinceLastPassage, 1);
});
