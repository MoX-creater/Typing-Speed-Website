const express = require("express");
const firebaseAdmin = require("../firebaseAdmin");
const { mergeTypingProfile } = require("../utils/mergeTypingProfile");

const router = express.Router();
const PROFILE_DOC_ID = "current";

function getProfileRef(userId) {
  if (!firebaseAdmin) {
    throw new Error("Firebase Admin is not configured");
  }

  return firebaseAdmin
    .firestore()
    .collection("users")
    .doc(userId)
    .collection("typingProfile")
    .doc(PROFILE_DOC_ID);
}

router.post("/typing-profile", async (req, res) => {
  if (!firebaseAdmin) {
    return res.status(503).json({ error: "Firebase Admin is not configured" });
  }

  const { userId, errorMap, avgWpmOverTime, accuracyByCharClass } = req.body || {};

  if (!userId) {
    return res.status(400).json({ error: "userId is required" });
  }

  const incomingProfile = {
    errorMap: errorMap || {},
    avgWpmOverTime: Array.isArray(avgWpmOverTime) ? avgWpmOverTime : [],
    accuracyByCharClass: accuracyByCharClass || {},
    lastUpdated: new Date().toISOString(),
  };

  try {
    const profileRef = getProfileRef(userId);
    const snapshot = await profileRef.get();
    const existingProfile = snapshot.exists ? snapshot.data() : {};
    const mergedProfile = mergeTypingProfile(existingProfile, incomingProfile);

    await profileRef.set(mergedProfile, { merge: true });

    return res.status(200).json({ typingProfile: mergedProfile });
  } catch (error) {
    console.error("Failed to save typing profile:", error);
    return res.status(500).json({ error: "Failed to save typing profile" });
  }
});

router.get("/debug/typing-profile/:userId", async (req, res) => {
  if (!firebaseAdmin) {
    return res.status(503).json({ error: "Firebase Admin is not configured" });
  }

  const { userId } = req.params;

  try {
    const snapshot = await getProfileRef(userId).get();

    if (!snapshot.exists) {
      return res.status(404).json({ error: "Typing profile not found", userId });
    }

    return res.status(200).json({ userId, typingProfile: snapshot.data() });
  } catch (error) {
    console.error("Failed to fetch typing profile:", error);
    return res.status(500).json({ error: "Failed to fetch typing profile" });
  }
});

module.exports = router;
