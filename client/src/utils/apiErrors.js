export const RATE_LIMIT_FALLBACK = "Please wait a moment before trying again.";

export function getRateLimitError(err, fallback = RATE_LIMIT_FALLBACK) {
  if (err?.response?.status === 429) {
    return err.response?.data?.error || fallback;
  }
  return null;
}
