
import express from "express";
import cors from "cors";
import "dotenv/config";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import crypto from "node:crypto";

import pool from "./config/db.js";
import { sessionMiddleware } from "./config/session.js";

import authRoutes from "./routes/auth.js";
import coordinatorRoutes from "./routes/coordinator.js";
import candidateRoutes from "./routes/candidate.js";

const app = express();
app.set("trust proxy", 1);

app.use(helmet());

app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true
  })
);

app.use(express.json());

// Use the single shared PostgreSQL session store
app.use(sessionMiddleware);

// CSRF token endpoint
app.get("/api/v1/csrf-token", (req, res) => {
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString("hex");
  }

  res.json({ csrfToken: req.session.csrfToken });
});

// Verify CSRF token on state-changing requests
app.use("/api/v1", (req, res, next) => {
  const safeMethods = ["GET", "HEAD", "OPTIONS"];

  if (safeMethods.includes(req.method)) {
    return next();
  }

  const token = req.get("x-csrf-token");

  if (
    !token ||
    !req.session.csrfToken ||
    token !== req.session.csrfToken
  ) {
    return res.status(403).json({
      message: "Invalid or missing CSRF token."
    });
  }

  next();
});

// Login rate limiter
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    message: "Too many login attempts. Please try again later."
  }
});

// Health endpoint
app.get("/api/health", async (req, res, next) => {
  try {
    await pool.query("SELECT 1");

    res.json({
      message: "Learning Progress Tracker API is running!",
      database: "connected"
    });
  } catch (error) {
    next(error);
  }
});

// API routes
app.use("/api/v1/auth/login", loginLimiter);
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/coordinator", coordinatorRoutes);
app.use("/api/v1/candidate", candidateRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    message: "API endpoint not found."
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error("Server error:", error);

  if (res.headersSent) {
    return next(error);
  }

  res.status(500).json({
    message: "Something went wrong on the server."
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
