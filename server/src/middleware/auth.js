import pool from "../db.js";

function unauthorized(res, message) {
  res.status(401).json({ message });
}

function clearInvalidSession(req, res) {
  if (!req.session) {
    unauthorized(res, "Session is no longer valid.");
    return;
  }

  req.session.destroy(() => {
    unauthorized(res, "Session is no longer valid.");
  });
}

export async function requireAuth(req, res, next) {
  const accountId = Number(req.session?.account?.id);
  const sessionVersion = Number(req.session?.account?.sessionVersion);

  if (!Number.isInteger(accountId) || !Number.isInteger(sessionVersion)) {
    unauthorized(res, "Authentication required.");
    return;
  }

  try {
    const result = await pool.query(
      `SELECT id, role, session_version, must_change_password, temporary_password_expires_at
       FROM accounts
       WHERE id = $1`,
      [accountId]
    );

    const account = result.rows[0];

    if (!account || Number(account.session_version) !== sessionVersion) {
      clearInvalidSession(req, res);
      return;
    }

    req.user = {
      id: account.id,
      role: account.role,
      mustChangePassword: account.must_change_password,
      temporaryPasswordExpiresAt: account.temporary_password_expires_at,
      sessionVersion: account.session_version,
    };

    next();
  } catch (error) {
    console.error("Authentication lookup failed:", error?.code || "unknown");
    res.status(500).json({ message: "Authentication could not be verified." });
  }
}

function requireRole(role) {
  return function requireRoleMiddleware(req, res, next) {
    if (!req.user) {
      unauthorized(res, "Authentication required.");
      return;
    }

    if (req.user.role !== role) {
      res.status(403).json({ message: "You do not have access to this resource." });
      return;
    }

    next();
  };
}

export const requireCoordinator = requireRole("coordinator");

export const requireCandidate = requireRole("candidate");

export function requirePasswordChangeComplete(req, res, next) {
  if (!req.user) {
    unauthorized(res, "Authentication required.");
    return;
  }

  if (req.user.mustChangePassword) {
    res.status(403).json({
      message: "Password change required.",
      code: "PASSWORD_CHANGE_REQUIRED",
    });
    return;
  }

  next();
}
