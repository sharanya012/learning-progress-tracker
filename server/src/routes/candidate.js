import express from "express";
import pool from "../config/db.js";
import { requireAuth, allowRoles } from "../middleware/auth.js";

const router = express.Router();

router.use(requireAuth, allowRoles("candidate"));

// Candidate profile and assigned activities
router.get("/dashboard", async (req, res, next) => {
  try {
    const profile = await pool.query(
      `SELECT id, full_name, cohort
       FROM candidates WHERE account_id = $1`,
      [req.account.id]
    );

    const candidate = profile.rows[0];

    if (!candidate) {
      return res.status(404).json({
        message: "Candidate profile not found."
      });
    }

    const assignments = await pool.query(
      `SELECT
         asg.id AS assignment_id,
         asg.status,
         asg.progress,
         asg.updated_at,
         act.id AS activity_id,
         act.title,
         act.description,
         act.track,
         act.planned_hours
       FROM assignments asg
       JOIN activities act ON act.id = asg.activity_id
       WHERE asg.candidate_id = $1
       ORDER BY act.title`,
      [candidate.id]
    );

    res.json({
      candidate,
      assignments: assignments.rows
    });
  } catch (error) {
    next(error);
  }
});

// Update progress on an assigned activity
router.patch("/assignments/:id", async (req, res, next) => {
  try {
    const assignmentId = Number(req.params.id);
    const { progress } = req.body;

    if (
      !Number.isInteger(assignmentId) ||
      assignmentId <= 0 ||
      !Number.isInteger(progress) ||
      progress < 0 ||
      progress > 100
    ) {
      return res.status(400).json({
        message: "Provide a valid assignment ID and progress from 0 to 100."
      });
    }

    const candidateResult = await pool.query(
      "SELECT id FROM candidates WHERE account_id = $1",
      [req.account.id]
    );

    const candidate = candidateResult.rows[0];

    if (!candidate) {
      return res.status(404).json({
        message: "Candidate profile not found."
      });
    }

    const status =
      progress === 100
        ? "completed"
        : progress > 0
          ? "in_progress"
          : "not_started";

    const result = await pool.query(
      `UPDATE assignments
       SET progress = $1,
           status = $2,
           updated_at = NOW()
       WHERE id = $3 AND candidate_id = $4
       RETURNING *`,
      [progress, status, assignmentId, candidate.id]
    );

    if (!result.rowCount) {
      return res.status(404).json({
        message: "Assignment not found."
      });
    }

    res.json({
      message: "Progress updated successfully.",
      assignment: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

export default router;