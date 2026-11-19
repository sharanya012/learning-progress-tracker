
import express from "express";
import bcrypt from "bcryptjs";
import pool from "../config/db.js";
import { requireAuth, allowRoles } from "../middleware/auth.js";
import { generateTemporaryPassword } from "../utils/credentials.js";

const router = express.Router();

router.use(requireAuth, allowRoles("coordinator"));

// Dashboard statistics
router.get("/dashboard", async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM candidates) AS learners,
        (SELECT COUNT(*) FROM assignments) AS assignments,
        (SELECT COUNT(*) FROM assignments
         WHERE status = 'completed') AS completed,
        (SELECT COUNT(*) FROM assignments
         WHERE status = 'in_progress') AS in_progress
    `);

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// List candidates and their overall progress
router.get("/candidates", async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT
        c.id,
        c.full_name,
        a.email,
        c.cohort,
        COUNT(asg.id)::INTEGER AS assignments,
        COALESCE(
          ROUND(AVG(asg.progress)), 0
        ) AS progress
      FROM candidates c
      JOIN accounts a ON a.id = c.account_id
      LEFT JOIN assignments asg ON asg.candidate_id = c.id
      GROUP BY c.id, c.full_name, a.email, c.cohort
      ORDER BY c.full_name
    `);

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// List a candidate's assignments
router.get("/candidates/:candidateId/assignments", async (req, res, next) => {
  try {
    const candidateId = Number(req.params.candidateId);

    if (!Number.isSafeInteger(candidateId) || candidateId <= 0) {
      return res.status(400).json({ message: "Invalid candidate ID." });
    }

    const candidate = await pool.query(
      "SELECT id FROM candidates WHERE id = $1",
      [candidateId]
    );

    if (!candidate.rowCount) {
      return res.status(404).json({ message: "Candidate not found." });
    }

    const result = await pool.query(
      `SELECT
         asg.id AS assignment_id,
         act.id AS activity_id,
         asg.status,
         asg.progress,
         act.title,
         act.track,
         act.planned_hours
       FROM assignments asg
       JOIN activities act ON act.id = asg.activity_id
       WHERE asg.candidate_id = $1
       ORDER BY act.title`,
      [candidateId]
    );

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// Delete one assignment without deleting its candidate or activity
router.delete(
  "/candidates/:candidateId/assignments/:assignmentId",
  async (req, res, next) => {
    try {
      const candidateId = Number(req.params.candidateId);
      const assignmentId = Number(req.params.assignmentId);

      if (!Number.isSafeInteger(candidateId) || candidateId <= 0) {
        return res.status(400).json({ message: "Invalid candidate ID." });
      }

      if (!Number.isSafeInteger(assignmentId) || assignmentId <= 0) {
        return res.status(400).json({ message: "Invalid assignment ID." });
      }

      const result = await pool.query(
        `DELETE FROM assignments
         WHERE id = $1 AND candidate_id = $2
         RETURNING id`,
        [assignmentId, candidateId]
      );

      if (!result.rowCount) {
        const candidate = await pool.query(
          "SELECT id FROM candidates WHERE id = $1",
          [candidateId]
        );

        if (!candidate.rowCount) {
          return res.status(404).json({ message: "Candidate not found." });
        }

        return res.status(404).json({ message: "Assignment not found." });
      }

      res.json({ message: "Assignment deleted successfully." });
    } catch (error) {
      next(error);
    }
  }
);

// Update a candidate's cohort
router.patch("/candidates/:id", async (req, res, next) => {
  try {
    const candidateId = Number(req.params.id);
    const cohort = req.body.cohort;

    if (!Number.isSafeInteger(candidateId) || candidateId <= 0) {
      return res.status(400).json({ message: "Invalid candidate ID." });
    }

    if (typeof cohort !== "string" || !cohort.trim() || cohort.trim().length > 100) {
      return res.status(400).json({
        message: "Cohort is required and must be 100 characters or fewer."
      });
    }

    const result = await pool.query(
      `UPDATE candidates c
       SET cohort = $1
       FROM accounts a
       WHERE c.id = $2 AND a.id = c.account_id
       RETURNING c.id, c.full_name, c.cohort, a.email`,
      [cohort.trim(), candidateId]
    );

    if (!result.rowCount) {
      return res.status(404).json({ message: "Candidate not found." });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Delete a candidate account and its related candidate records
router.delete("/candidates/:id", async (req, res, next) => {
  try {
    const candidateId = Number(req.params.id);

    if (!Number.isSafeInteger(candidateId) || candidateId <= 0) {
      return res.status(400).json({ message: "Invalid candidate ID." });
    }

    const result = await pool.query(
      `DELETE FROM accounts
       WHERE id = (
         SELECT account_id FROM candidates WHERE id = $1
       )
       AND role = 'candidate'
       RETURNING id`,
      [candidateId]
    );

    if (!result.rowCount) {
      return res.status(404).json({ message: "Candidate not found." });
    }

    res.json({ message: "Candidate deleted successfully." });
  } catch (error) {
    next(error);
  }
});

// Create candidate account
router.post("/candidates", async (req, res, next) => {
  const client = await pool.connect();

  try {
    const { fullName, email, cohort } = req.body;

    if (!fullName?.trim() || !email?.trim() || !cohort?.trim()) {
      return res.status(400).json({
        message: "Name, email and cohort are required."
      });
    }

    const temporaryPassword = generateTemporaryPassword();
    const passwordHash = await bcrypt.hash(temporaryPassword, 12);

    await client.query("BEGIN");

    const account = await client.query(
      `INSERT INTO accounts
       (email, password_hash, role, must_change_password,
        temporary_password_expires_at)
       VALUES ($1, $2, 'candidate', TRUE, NOW() + INTERVAL '24 hours')
       RETURNING id, email`,
      [email.toLowerCase().trim(), passwordHash]
    );

    const candidate = await client.query(
      `INSERT INTO candidates (account_id, full_name, cohort)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [account.rows[0].id, fullName.trim(), cohort.trim()]
    );

    await client.query("COMMIT");

    res.status(201).json({
      message: "Candidate created successfully.",
      candidate: candidate.rows[0],
      credentials: {
        email: account.rows[0].email,
        temporaryPassword
      }
    });
  } catch (error) {
    await client.query("ROLLBACK");

    if (error.code === "23505") {
      return res.status(409).json({
        message: "An account with this email already exists."
      });
    }

    next(error);
  } finally {
    client.release();
  }
});

// Create activity
router.post("/activities", async (req, res, next) => {
  try {
    const { title, description, track, plannedHours } = req.body;

    if (
      !title?.trim() ||
      !track?.trim() ||
      !Number.isFinite(Number(plannedHours)) ||
      Number(plannedHours) <= 0
    ) {
      return res.status(400).json({
        message: "Valid title, track and planned hours are required."
      });
    }

    const result = await pool.query(
      `INSERT INTO activities
       (title, description, track, planned_hours, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        title.trim(),
        description || "",
        track.trim(),
        Number(plannedHours),
        req.account.id
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// List activities
router.get("/activities", async (req, res, next) => {
  try {
    const result = await pool.query(
      "SELECT * FROM activities ORDER BY created_at DESC"
    );

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// Update activity details
router.patch("/activities/:id", async (req, res, next) => {
  try {
    const activityId = Number(req.params.id);
    const { title, description, track, plannedHours } = req.body;
    const hours = Number(plannedHours);

    if (!Number.isSafeInteger(activityId) || activityId <= 0) {
      return res.status(400).json({ message: "Invalid activity ID." });
    }

    if (
      typeof title !== "string" ||
      !title.trim() ||
      title.trim().length > 200 ||
      typeof track !== "string" ||
      !track.trim() ||
      track.trim().length > 100 ||
      (description !== undefined && typeof description !== "string") ||
      !Number.isFinite(hours) ||
      hours < 0.01 ||
      hours > 9999.99
    ) {
      return res.status(400).json({
        message: "Valid title, track and planned hours are required."
      });
    }

    const result = await pool.query(
      `UPDATE activities
       SET title = $1,
           description = $2,
           track = $3,
           planned_hours = $4
       WHERE id = $5
       RETURNING *`,
      [
        title.trim(),
        description || "",
        track.trim(),
        hours,
        activityId
      ]
    );

    if (!result.rowCount) {
      return res.status(404).json({ message: "Activity not found." });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Delete activity and its related assignments
router.delete("/activities/:id", async (req, res, next) => {
  try {
    const activityId = Number(req.params.id);

    if (!Number.isSafeInteger(activityId) || activityId <= 0) {
      return res.status(400).json({ message: "Invalid activity ID." });
    }

    const result = await pool.query(
      "DELETE FROM activities WHERE id = $1 RETURNING id",
      [activityId]
    );

    if (!result.rowCount) {
      return res.status(404).json({ message: "Activity not found." });
    }

    res.json({ message: "Activity deleted successfully." });
  } catch (error) {
    next(error);
  }
});

// Assign an activity to a candidate
router.post("/assignments", async (req, res, next) => {
  try {
    const candidateId = Number(req.body.candidateId);
    const activityId = Number(req.body.activityId);

    if (
      !Number.isSafeInteger(candidateId) ||
      candidateId <= 0 ||
      !Number.isSafeInteger(activityId) ||
      activityId <= 0
    ) {
      return res.status(400).json({
        message: "Valid candidate and activity IDs are required."
      });
    }

    const result = await pool.query(
      `INSERT INTO assignments (candidate_id, activity_id)
       VALUES ($1, $2)
       ON CONFLICT (candidate_id, activity_id) DO NOTHING
       RETURNING *`,
      [candidateId, activityId]
    );

    if (!result.rowCount) {
      return res.status(409).json({
        message: "This activity is already assigned to this candidate."
      });
    }

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Reset candidate password
router.post("/candidates/:id/reset-password", async (req, res, next) => {
  try {
    const candidateId = Number(req.params.id);

    if (!Number.isSafeInteger(candidateId) || candidateId <= 0) {
      return res.status(400).json({ message: "Invalid candidate ID." });
    }

    const temporaryPassword = generateTemporaryPassword();
    const passwordHash = await bcrypt.hash(temporaryPassword, 12);

    const result = await pool.query(
      `UPDATE accounts
       SET password_hash = $1,
           must_change_password = TRUE,
           temporary_password_expires_at = NOW() + INTERVAL '24 hours',
           session_version = session_version + 1
       WHERE id = (
         SELECT account_id FROM candidates WHERE id = $2
       )
       RETURNING email`,
      [passwordHash, candidateId]
    );

    if (!result.rowCount) {
      return res.status(404).json({ message: "Candidate not found." });
    }

    res.json({
      message: "Password reset successfully.",
      credentials: {
        email: result.rows[0].email,
        temporaryPassword
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
