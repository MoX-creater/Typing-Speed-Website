import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Session from "../models/Session.js";
import auth from "../middleware/auth.js";

const router = express.Router();

/**
 * POST /api/users/register
 * Register a new user
 */
router.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Check for existing user
    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
    });
    if (existingUser) {
      return res.status(400).json({
        message:
          existingUser.email === email
            ? "Email already registered"
            : "Username already taken",
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = new User({ username, email, password: hashedPassword });
    await user.save();

    // Generate JWT
    const token = jwt.sign(
      { id: user._id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * POST /api/users/login
 * Authenticate user and return JWT
 */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user._id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * GET /api/users/profile
 * Fetch authenticated user's profile with aggregated stats
 */
router.get("/profile", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Aggregate stats from sessions
    const stats = await Session.aggregate([
      { $match: { userId: user._id } },
      {
        $group: {
          _id: null,
          totalSessions: { $sum: 1 },
          avgWpm: { $avg: "$wpm" },
          bestWpm: { $max: "$wpm" },
          avgAccuracy: { $avg: "$accuracy" },
          bestAccuracy: { $max: "$accuracy" },
          totalTimeSpent: { $sum: "$duration" },
        },
      },
    ]);

    // Get recent sessions
    const recentSessions = await Session.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      user,
      stats: stats[0] || {
        totalSessions: 0,
        avgWpm: 0,
        bestWpm: 0,
        avgAccuracy: 0,
        bestAccuracy: 0,
        totalTimeSpent: 0,
      },
      recentSessions,
    });
  } catch (err) {
    console.error("Profile error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
