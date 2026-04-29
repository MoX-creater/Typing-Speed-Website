import express from "express";
import Session from "../models/Session.js";
import auth from "../middleware/auth.js";

const router = express.Router();

/**
 * POST /api/sessions
 * Save a new typing session result (authenticated)
 */
router.post("/", auth, async (req, res) => {
  try {
    const { wpm, accuracy, duration, correctWords, totalWords, correctChars, totalChars } = req.body;

    const session = new Session({
      userId: req.user.id,
      wpm,
      accuracy,
      duration,
      correctWords: correctWords || 0,
      totalWords: totalWords || 0,
      correctChars: correctChars || 0,
      totalChars: totalChars || 0,
    });

    await session.save();
    res.status(201).json(session);
  } catch (err) {
    console.error("Save session error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * GET /api/sessions/leaderboard
 * Fetch the global top 50 scores (public)
 */
router.get("/leaderboard", async (req, res) => {
  try {
    const leaderboard = await Session.aggregate([
      {
        $group: {
          _id: "$userId",
          bestWpm: { $max: "$wpm" },
          bestAccuracy: { $max: "$accuracy" },
          totalSessions: { $sum: 1 },
        },
      },
      { $sort: { bestWpm: -1 } },
      { $limit: 50 },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $project: {
          _id: 0,
          username: "$user.username",
          bestWpm: 1,
          bestAccuracy: 1,
          totalSessions: 1,
        },
      },
    ]);

    res.json(leaderboard);
  } catch (err) {
    console.error("Leaderboard error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * GET /api/sessions/history
 * Fetch the authenticated user's session history
 */
router.get("/history", auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [sessions, total] = await Promise.all([
      Session.find({ userId: req.user.id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Session.countDocuments({ userId: req.user.id }),
    ]);

    res.json({
      sessions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("History error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
