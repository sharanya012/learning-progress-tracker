import crypto from "node:crypto";
import express from "express";
import bcrypt from "bcryptjs";
import pool from "../config/db.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required."
      });
    }

    const result = await pool.query(
      "SELECT * FROM accounts WHERE email = $1",
      [email.toLowerCase().trim()]
    );

    const account = result.rows[0];

    const valid = account
      ? await bcrypt.compare(password, account.password_hash)
      : false;

    if (!valid) {
      return res.status(401).json({
        message: "Invalid email or password."
      });
    }

    if (
      account.must_change_password &&
      account.temporary_password_expires_at &&
      new Date(account.temporary_password_expires_at) < new Date()
    ) {
      return res.status(401).json({
        message: "Temporary password expired. Contact your coordinator."
      });
    }

    req.session.regenerate((error) => {
      if (error) return next(error);

      req.session.accountId = account.id;
      req.session.sessionVersion = account.session_version;
      req.session.csrfToken = crypto.randomBytes(32).toString("hex");

      req.session.save((saveError) => {
        if (saveError) return next(saveError);

        res.json({
          message: "Login successful.",
          csrfToken: req.session.csrfToken,
          user: {
            id: account.id,
            email: account.email,
            role: account.role,
            mustChangePassword: account.must_change_password
          }
        });
      });
    });
  } catch (error) {
    next(error);
  }
});

router.get("/me", requireAuth, (req, res) => {
  res.json({
    user: {
      id: req.account.id,
      email: req.account.email,
      role: req.account.role,
      mustChangePassword: req.account.must_change_password
    }
  });
});

router.post("/change-password", requireAuth, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword || newPassword.length < 8) {
      return res.status(400).json({
        message: "Provide your current password and a new password of at least 8 characters."
      });
    }

    const result = await pool.query(
      "SELECT * FROM accounts WHERE id = $1",
      [req.account.id]
    );

    const account = result.rows[0];

    const valid = await bcrypt.compare(
      currentPassword,
      account.password_hash
    );

    if (!valid) {
      return res.status(400).json({
        message: "Current password is incorrect."
      });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await pool.query(
      `UPDATE accounts
       SET password_hash = $1,
           must_change_password = FALSE,
           temporary_password_expires_at = NULL,
           session_version = session_version + 1
       WHERE id = $2`,
      [passwordHash, account.id]
    );

    req.session.destroy(() => {
      res.clearCookie("lpt.sid");
      res.json({
        message: "Password changed. Please log in again."
      });
    });
  } catch (error) {
    next(error);
  }
});

router.post("/logout", (req, res, next) => {
  req.session.destroy((error) => {
    if (error) return next(error);

    res.clearCookie("lpt.sid");
    res.json({ message: "Logged out successfully." });
  });
});

export default router;
