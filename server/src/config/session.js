import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import pool from "./db.js";

const PgStore = connectPgSimple(session);

const DEFAULT_SESSION_MAX_AGE_MS = 8 * 60 * 60 * 1000;

function sessionMaxAgeMs() {
  const configured = Number(process.env.SESSION_MAX_AGE_MS);

  if (Number.isFinite(configured) && configured > 0) {
    return configured;
  }

  return DEFAULT_SESSION_MAX_AGE_MS;
}

if (!process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET is not set. Add it to server/.env.");
}

const sessionStore = new PgStore({
  pool,
  tableName: "session",
  createTableIfMissing: false,
  errorLog(error) {
    console.error("Session store error:", error?.code || "unknown");
  },
});

export const sessionMiddleware = session({
  store: sessionStore,
  name: "lpt.sid",
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: sessionMaxAgeMs(),
  },
});

export async function checkSessionStore() {
  try {
    const result = await pool.query(
      "SELECT to_regclass('public.session') AS name"
    );

    if (!result.rows[0]?.name) {
      console.warn(
        "PostgreSQL session table public.session was not found. Sessions cannot be saved until that table exists. Existing application tables were not changed."
      );
      return;
    }

    console.log("PostgreSQL session store is ready.");
  } catch {
    console.warn("Could not verify the PostgreSQL session store.");
  }
}
