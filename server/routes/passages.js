const express = require("express");
const firebaseAdmin = require("../firebaseAdmin");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { requireAuth } = require("../middleware/auth");
const { aiGenerationRateLimit } = require("../utils/rateLimiter");
const { buildPassagePrompt } = require("../utils/buildPassagePrompt");
const { generatePassage } = require("../utils/geminiService");
const {
  DEFAULT_PASSAGE,
  VALID_DURATIONS,
  getTargetWordCount,
  validatePassageResponse,
} = require("../utils/validatePassageResponse");
const { pickDefaultPassage } = require("../utils/defaultPassages");
const {
  resolvePassageTheme,
  shouldReusePassage,
} = require("../utils/passageCache");

const router = express.Router();
const PROFILE_DOC_ID = "current";
const VALID_DIFFICULTIES = ["easy", "medium", "hard"];

function getProfileRef(userId) {
  return getFirestore()
    .collection("users")
    .doc(userId)
    .collection("typingProfile")
    .doc(PROFILE_DOC_ID);
}

async function loadTypingProfile(userId) {
  try {
    const snapshot = await getProfileRef(userId).get();
    if (!snapshot.exists) {
      return { exists: false, profile: null };
    }
    return { exists: true, profile: snapshot.data() };
  } catch (error) {
    console.warn(
      "Failed to check typing profile, using default passage:",
      error.message
    );
    return { exists: false, profile: null };
  }
}

async function resetPassageTestCounter(userId) {
  try {
    await getProfileRef(userId).set({ testsCompletedSinceLastPassage: 0 }, { merge: true });
  } catch (error) {
    console.warn("Failed to reset passage test counter:", error.message);
  }
}

async function findLatestMatchingPassage(userId, difficulty, theme) {
  try {
    const snapshot = await getFirestore()
      .collection("passages")
      .where("userId", "==", userId)
      .where("difficulty", "==", difficulty)
      .where("theme", "==", theme)
      .orderBy("createdAt", "desc")
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() };
  } catch (error) {
    console.warn("Failed to query cached passage:", error.message);
    return null;
  }
}

async function tryRespondWithCachedPassage(res, {
  userId,
  difficulty,
  resolvedTheme,
  typingProfile,
}) {
  const cachedPassage = await findLatestMatchingPassage(userId, difficulty, resolvedTheme);
  if (!cachedPassage) {
    return false;
  }

  const testsCompletedSinceLastPassage =
    typingProfile?.testsCompletedSinceLastPassage ?? 0;

  if (
    !shouldReusePassage({
      passageCreatedAt: cachedPassage.createdAt,
      testsCompletedSinceLastPassage,
    })
  ) {
    return false;
  }

  console.log("[passage-generation] reused cached passage:", cachedPassage.id);

  await res.status(200).json({
    id: cachedPassage.id,
    text: cachedPassage.text,
    usedFallback: Boolean(cachedPassage.usedFallback),
    targetWordCount: cachedPassage.targetWordCount,
  });

  return true;
}

async function savePassageDoc({
  userId,
  text,
  difficulty,
  theme,
  duration,
  targetWordCount,
  basedOnErrors,
  usedFallback,
}) {
  const passageDoc = {
    userId,
    text,
    difficulty,
    theme,
    duration,
    targetWordCount,
    basedOnErrors,
    usedFallback,
    createdAt: FieldValue.serverTimestamp(),
  };

  return getFirestore().collection("passages").add(passageDoc);
}

async function respondWithDefaultPassage(res, {
  userId,
  difficulty,
  theme,
  duration,
  typingProfile = null,
}) {
  const resolvedTheme = resolvePassageTheme(theme);
  const reused = await tryRespondWithCachedPassage(res, {
    userId,
    difficulty,
    resolvedTheme,
    typingProfile,
  });
  if (reused) {
    return;
  }

  const text = pickDefaultPassage(userId);
  const targetWordCount = getTargetWordCount(duration, difficulty);

  const docRef = await savePassageDoc({
    userId,
    text,
    difficulty,
    theme: resolvedTheme,
    duration,
    targetWordCount,
    basedOnErrors: [],
    usedFallback: true,
  });

  return res.status(200).json({
    id: docRef.id,
    text,
    usedFallback: true,
    targetWordCount,
  });
}

async function generateValidatedPassage(prompt, difficulty, duration) {
  let lastReason = "unknown";

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const rawText = await generatePassage(prompt);

    if (attempt === 1) {
      console.log("[passage-generation] raw Gemini response:", JSON.stringify(rawText));
    }

    const validation = validatePassageResponse(rawText, difficulty, duration);

    if (validation.valid) {
      return { text: validation.normalized, usedFallback: false, attempt };
    }

    lastReason = validation.reason;
    console.warn(
      `Passage validation failed (attempt ${attempt}): ${validation.reason}` +
        (validation.wordCount != null ? ` (${validation.wordCount}/${validation.targetWords} words)` : "")
    );
  }

  return {
    text: DEFAULT_PASSAGE,
    usedFallback: true,
    attempt: 2,
    fallbackReason: lastReason,
  };
}

router.post(
  "/passages/generate",
  requireAuth,
  aiGenerationRateLimit("Please wait a moment before generating another passage."),
  async (req, res) => {
  if (!firebaseAdmin) {
    return res.status(503).json({ error: "Firebase Admin is not configured" });
  }

  const { difficulty = "medium", theme, duration = 15 } = req.body || {};
  const userId = req.userId;
  const normalizedDuration = Number(duration);

  if (!VALID_DIFFICULTIES.includes(difficulty)) {
    return res.status(400).json({
      error: "Invalid difficulty. Expected one of: easy, medium, hard",
    });
  }

  if (!VALID_DURATIONS.includes(normalizedDuration)) {
    return res.status(400).json({
      error: "Invalid duration. Expected one of: 15, 30, 60, 120",
    });
  }

  try {
    const { exists: profileExists, profile: typingProfile } = await loadTypingProfile(userId);
    const resolvedTheme = resolvePassageTheme(theme);

    if (!profileExists) {
      return respondWithDefaultPassage(res, {
        userId,
        difficulty,
        theme,
        duration: normalizedDuration,
        typingProfile,
      });
    }

    const reused = await tryRespondWithCachedPassage(res, {
      userId,
      difficulty,
      resolvedTheme,
      typingProfile,
    });
    if (reused) {
      return;
    }

    const {
      prompt,
      basedOnErrors,
      theme: resolvedThemeFromPrompt,
      difficulty: resolvedDifficulty,
      targetWordCount,
    } = buildPassagePrompt(typingProfile, difficulty, theme, normalizedDuration);

    const generation = await generateValidatedPassage(
      prompt,
      resolvedDifficulty,
      normalizedDuration
    );

    const docRef = await savePassageDoc({
      userId,
      text: generation.text,
      difficulty: resolvedDifficulty,
      theme: resolvedThemeFromPrompt,
      duration: normalizedDuration,
      targetWordCount,
      basedOnErrors,
      usedFallback: generation.usedFallback,
    });

    await resetPassageTestCounter(userId);

    return res.status(200).json({
      id: docRef.id,
      text: generation.text,
      usedFallback: generation.usedFallback,
      targetWordCount,
    });
  } catch (error) {
    console.error("Failed to generate passage:", error);
    return res.status(500).json({ error: "Failed to generate passage" });
  }
}
);

module.exports = router;
module.exports.loadTypingProfile = loadTypingProfile;
module.exports.respondWithDefaultPassage = respondWithDefaultPassage;
module.exports.findLatestMatchingPassage = findLatestMatchingPassage;
module.exports.tryRespondWithCachedPassage = tryRespondWithCachedPassage;
module.exports.resetPassageTestCounter = resetPassageTestCounter;
