import pool from "../config/db.js";

export async function requireAuth(req, res, next) {
  try {
    if (!req.session.accountId) {
      return res.status(401).json({ message: "Please log in." });
    }

    const result = await pool.query(
      `SELECT id, email, role, must_change_password,
              session_version
       FROM accounts WHERE id = $1`,
      [req.session.accountId]
    );

    const account = result.rows[0];

    if (
      !account ||
      account.session_version !== req.session.sessionVersion
    ) {
      return res.status(401).json({ message: "Session expired." });
    }

    req.account = account;
    next();
  } catch (error) {
    next(error);
  }
}

export function allowRoles(...roles) {
  return (req, res, next) => {
    if (!req.account || !roles.includes(req.account.role)) {
      return res.status(403).json({
        message: "You do not have permission to access this resource."
      });
    }

    if (
      req.account.must_change_password &&
      req.path !== "/change-password"
    ) {
      return res.status(403).json({
        message: "Please change your temporary password first."
      });
    }

    next();
  };
}
