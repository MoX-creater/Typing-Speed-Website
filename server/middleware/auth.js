const firebaseAdmin = require("../firebaseAdmin");

async function requireAuth(req, res, next) {
  if (!firebaseAdmin) {
    return res.status(503).json({ error: "Firebase Admin is not configured" });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const decoded = await firebaseAdmin.auth().verifyIdToken(token);
    req.userId = decoded.uid;
    next();
  } catch (error) {
    console.error("Auth token verification failed:", error.message);
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

module.exports = { requireAuth };
