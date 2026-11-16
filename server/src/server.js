import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import cors from "cors";
import pool from "./db.js";
import { checkSessionStore, sessionMiddleware } from "./config/session.js";
import apiRouter from "./routes/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const app = express();

const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";

if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

app.use(cors({
  origin: clientUrl,
  credentials: true,
}));

app.use(express.json());
app.use(sessionMiddleware);

app.get("/api/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.status(200).json({
      message: "Learning Progress Tracker API is running!",
      server: "ok",
      database: "ok",
    });
  } catch {
    res.status(503).json({
      message: "Learning Progress Tracker API is running!",
      server: "ok",
      database: "unavailable",
    });
  }
});

app.use("/api", apiRouter);

app.use((err, req, res, next) => {
  console.error("Request error:", err?.code || "unknown");

  if (res.headersSent) {
    next(err);
    return;
  }

  res.status(500).json({ message: "Request failed." });
});

const PORT = process.env.PORT || 5000;

await checkSessionStore();

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
