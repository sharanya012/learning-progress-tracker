import { Fragment, useState } from "react";
import { apiRequest } from "../services/api";

function CandidateTable({
  candidates = [],
  manageAssignments = false,
  onAssignmentsChange
}) {
  const [expandedCandidateId, setExpandedCandidateId] = useState(null);
  const [assignmentStates, setAssignmentStates] = useState({});

  function updateAssignmentState(candidateId, update) {
    setAssignmentStates((previous) => ({
      ...previous,
      [candidateId]: {
        ...previous[candidateId],
        ...update
      }
    }));
  }

  async function loadAssignments(candidateId) {
    updateAssignmentState(candidateId, { loading: true, error: "" });

    try {
      const assignments = await apiRequest(
        `/coordinator/candidates/${candidateId}/assignments`
      );
      updateAssignmentState(candidateId, {
        items: assignments,
        loaded: true,
        error: ""
      });
    } catch (error) {
      updateAssignmentState(candidateId, { error: error.message });
    } finally {
      updateAssignmentState(candidateId, { loading: false });
    }
  }

  function handleManageAssignments(candidateId) {
    if (expandedCandidateId === candidateId) {
      setExpandedCandidateId(null);
      return;
    }

    setExpandedCandidateId(candidateId);
    if (!assignmentStates[candidateId]?.loaded) {
      loadAssignments(candidateId);
    }
  }

  async function handleDeleteAssignment(candidateId, assignment) {
    if (!window.confirm(`Delete "${assignment.title}" from this candidate?`)) {
      return;
    }

    updateAssignmentState(candidateId, {
      deletingId: assignment.assignment_id,
      error: ""
    });

    try {
      await apiRequest(
        `/coordinator/candidates/${candidateId}/assignments/${assignment.assignment_id}`,
        { method: "DELETE" }
      );

      updateAssignmentState(candidateId, {
        items: (assignmentStates[candidateId]?.items || []).filter(
          (item) => item.assignment_id !== assignment.assignment_id
        )
      });

      try {
        const assignments = await apiRequest(
          `/coordinator/candidates/${candidateId}/assignments`
        );
        updateAssignmentState(candidateId, { items: assignments, loaded: true });
      } catch (error) {
        updateAssignmentState(candidateId, {
          error: `Assignment deleted, but the list could not be refreshed: ${error.message}`
        });
      }

      try {
        await onAssignmentsChange?.();
      } catch (error) {
        updateAssignmentState(candidateId, {
          error: `Assignment deleted, but dashboard totals could not be refreshed: ${error.message}`
        });
      }
    } catch (error) {
      updateAssignmentState(candidateId, { error: error.message });
    } finally {
      updateAssignmentState(candidateId, { deletingId: null });
    }
  }

  return (
    <div className="table-card">
      <div className="section-heading">
        <div>
          <h3>Candidate Progress</h3>
          <p>Track individual cohort performance</p>
        </div>
      </div>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Candidate</th>
              <th>Assignments</th>
              <th>Progress</th>
              {manageAssignments && <th>Actions</th>}
            </tr>
          </thead>

          <tbody>
            {candidates.length === 0 ? (
              <tr>
                <td colSpan={manageAssignments ? 4 : 3}>No candidates found.</td>
              </tr>
            ) : (
              candidates.map((candidate) => {
                const assignmentState = assignmentStates[candidate.id] || {};
                const expanded = expandedCandidateId === candidate.id;

                return (
                  <Fragment key={candidate.id}>
                    <tr>
                      <td>
                        <strong>{candidate.full_name}</strong>
                        <small>{candidate.email}</small>
                      </td>

                      <td>{candidate.assignments}</td>

                      <td>
                        <div className="progress-container">
                          <div className="progress-bar">
                            <div
                              className="progress-fill"
                              style={{ width: `${candidate.progress}%` }}
                            />
                          </div>
                          <span>{candidate.progress}%</span>
                        </div>
                      </td>

                      {manageAssignments && (
                        <td>
                          <button
                            className="secondary-button manage-assignments-button"
                            type="button"
                            aria-expanded={expanded}
                            aria-controls={`candidate-assignments-${candidate.id}`}
                            onClick={() => handleManageAssignments(candidate.id)}
                          >
                            {expanded ? "Close Assignments" : "Manage Assignments"}
                          </button>
                        </td>
                      )}
                    </tr>

                    {manageAssignments && expanded && (
                      <tr>
                        <td
                          id={`candidate-assignments-${candidate.id}`}
                          className="managed-assignments-cell"
                          colSpan="4"
                        >
                          {assignmentState.loading ? (
                            <p>Loading assignments...</p>
                          ) : assignmentState.error && !assignmentState.loaded ? (
                            <p className="error-message" role="alert">
                              {assignmentState.error}
                            </p>
                          ) : assignmentState.items?.length ? (
                            <div className="managed-assignments-list">
                              {assignmentState.items.map((assignment) => (
                                <article
                                  className="managed-assignment"
                                  key={assignment.assignment_id}
                                >
                                  <div>
                                    <strong>{assignment.title}</strong>
                                    <span>Track: {assignment.track}</span>
                                    <span>
                                      Planned hours: {assignment.planned_hours}
                                    </span>
                                    <span>
                                      Status: {assignment.status
                                        ? assignment.status.replaceAll("_", " ")
                                        : "Unknown"}
                                    </span>
                                    <div className="managed-assignment-progress">
                                      <div
                                        className="progress-bar"
                                        aria-label={`Progress: ${assignment.progress}%`}
                                      >
                                        <div
                                          className="progress-fill"
                                          style={{ width: `${assignment.progress}%` }}
                                        />
                                      </div>
                                      <span>{assignment.progress}%</span>
                                    </div>
                                  </div>
                                  <button
                                    className="delete-assignment-button"
                                    type="button"
                                    disabled={Boolean(assignmentState.deletingId)}
                                    onClick={() =>
                                      handleDeleteAssignment(candidate.id, assignment)
                                    }
                                  >
                                    {assignmentState.deletingId === assignment.assignment_id
                                      ? "Deleting..."
                                      : "Delete"}
                                  </button>
                                </article>
                              ))}
                            </div>
                          ) : (
                            <p>No assignments yet</p>
                          )}
                          {assignmentState.error && assignmentState.loaded && (
                            <p className="error-message" role="alert">
                              {assignmentState.error}
                            </p>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default CandidateTable;
