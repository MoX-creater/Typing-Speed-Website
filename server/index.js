import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";

import userRoutes from "./routes/users.js";
import sessionRoutes from "./routes/sessions.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// --------------- Middleware ---------------
app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json());

// Request timing middleware — ensures sub-150ms visibility
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (duration > 150) {
      console.warn(`⚠️  Slow response: ${req.method} ${req.originalUrl} took ${duration}ms`);
    }
  });
  next();
});

// --------------- Routes ---------------
app.use("/api/users", userRoutes);
app.use("/api/sessions", sessionRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

// --------------- MongoDB Connection ---------------
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ Connected to MongoDB");
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  });
