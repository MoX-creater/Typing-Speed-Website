const test = require("node:test");
const assert = require("node:assert/strict");
const {
  AI_GENERATION_COOLDOWN_MS,
  checkAiGenerationRateLimit,
  resetAiGenerationRateLimits,
} = require("./rateLimiter");

test("checkAiGenerationRateLimit allows the first request", () => {
  resetAiGenerationRateLimits();
  assert.deepEqual(checkAiGenerationRateLimit("user-1"), { allowed: true });
});

test("checkAiGenerationRateLimit blocks rapid repeat requests for the same user", () => {
  resetAiGenerationRateLimits();
  assert.deepEqual(checkAiGenerationRateLimit("user-1"), { allowed: true });

  const blocked = checkAiGenerationRateLimit("user-1");
  assert.equal(blocked.allowed, false);
  assert.ok(blocked.retryAfterMs > 0);
  assert.ok(blocked.retryAfterMs <= AI_GENERATION_COOLDOWN_MS);
});

test("checkAiGenerationRateLimit tracks users independently", () => {
  resetAiGenerationRateLimits();
  assert.deepEqual(checkAiGenerationRateLimit("user-a"), { allowed: true });
  assert.deepEqual(checkAiGenerationRateLimit("user-b"), { allowed: true });
  assert.equal(checkAiGenerationRateLimit("user-a").allowed, false);
  assert.equal(checkAiGenerationRateLimit("user-b").allowed, false);
});
