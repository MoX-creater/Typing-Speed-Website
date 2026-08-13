const test = require("node:test");
const assert = require("node:assert/strict");
const {
  PASSAGE_REUSE_MAX_TESTS,
  PASSAGE_REUSE_MAX_AGE_MS,
  resolvePassageTheme,
  shouldReusePassage,
} = require("./passageCache");

test("resolvePassageTheme trims input and falls back to default topic", () => {
  assert.equal(resolvePassageTheme("  space  "), "space");
  assert.equal(resolvePassageTheme(""), "any everyday topic");
  assert.equal(resolvePassageTheme("   "), "any everyday topic");
});

test("shouldReusePassage allows fresh passages within test and time limits", () => {
  const now = Date.now();
  const createdAt = new Date(now - 2 * 60 * 1000);

  assert.equal(
    shouldReusePassage({
      passageCreatedAt: createdAt,
      testsCompletedSinceLastPassage: 2,
      now,
    }),
    true
  );
});

test("shouldReusePassage rejects when too many tests have completed", () => {
  const now = Date.now();

  assert.equal(
    shouldReusePassage({
      passageCreatedAt: new Date(now - 60 * 1000),
      testsCompletedSinceLastPassage: PASSAGE_REUSE_MAX_TESTS,
      now,
    }),
    false
  );
});

test("shouldReusePassage rejects when passage is too old", () => {
  const now = Date.now();

  assert.equal(
    shouldReusePassage({
      passageCreatedAt: new Date(now - PASSAGE_REUSE_MAX_AGE_MS - 1),
      testsCompletedSinceLastPassage: 0,
      now,
    }),
    false
  );
});

test("shouldReusePassage rejects missing createdAt", () => {
  assert.equal(
    shouldReusePassage({
      passageCreatedAt: null,
      testsCompletedSinceLastPassage: 0,
    }),
    false
  );
});
