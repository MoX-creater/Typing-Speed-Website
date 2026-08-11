import { auth } from "./firebase";

const INVALID_TOKENS = new Set(["null", "undefined", ""]);

function isValidToken(token) {
  return typeof token === "string" && token.length > 0 && !INVALID_TOKENS.has(token);
}

/**
 * Returns a fresh Firebase ID token when a session exists.
 * Falls back to localStorage only if Firebase has not restored auth yet.
 */
export async function getAuthToken() {
  const firebaseUser = auth.currentUser;
  if (firebaseUser) {
    return firebaseUser.getIdToken();
  }

  const stored = localStorage.getItem("token");
  return isValidToken(stored) ? stored : null;
}

export { isValidToken };
