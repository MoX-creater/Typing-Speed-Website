const PASSAGE_REUSE_MAX_TESTS = 3;
const PASSAGE_REUSE_MAX_AGE_MS = 10 * 60 * 1000;

function resolvePassageTheme(theme) {
  return typeof theme === "string" && theme.trim() ? theme.trim() : "any everyday topic";
}

function passageCreatedAtMs(createdAt) {
  if (!createdAt) {
    return null;
  }

  if (typeof createdAt.toMillis === "function") {
    return createdAt.toMillis();
  }

  if (createdAt instanceof Date) {
    return createdAt.getTime();
  }

  const parsed = Date.parse(createdAt);
  return Number.isNaN(parsed) ? null : parsed;
}

function shouldReusePassage({
  passageCreatedAt,
  testsCompletedSinceLastPassage = 0,
  now = Date.now(),
}) {
  const createdAtMs = passageCreatedAtMs(passageCreatedAt);
  if (createdAtMs == null) {
    return false;
  }

  const ageMs = now - createdAtMs;
  const testsSince = Number(testsCompletedSinceLastPassage) || 0;

  return testsSince < PASSAGE_REUSE_MAX_TESTS && ageMs < PASSAGE_REUSE_MAX_AGE_MS;
}

module.exports = {
  PASSAGE_REUSE_MAX_TESTS,
  PASSAGE_REUSE_MAX_AGE_MS,
  resolvePassageTheme,
  passageCreatedAtMs,
  shouldReusePassage,
};
