import { useState } from "react";
import { apiRequest } from "../services/api";

function CandidateTable({
  candidates = [],
  manageAssignments = false,
  onAssignmentsChange,
  onCandidateUpdated,
  onCandidateDeleted,
  onSessionRefresh
}) {
  const [assignmentsCandidate, setAssignmentsCandidate] = useState(null);
  const [assignmentStates, setAssignmentStates] = useState({});
  const [accountCandidate, setAccountCandidate] = useState(null);
  const [cohort, setCohort] = useState("");
  const [accountError, setAccountError] = useState("");
  const [cohortSaving, setCohortSaving] = useState(false);
  const [passwordResetting, setPasswordResetting] = useState(false);
  const [candidateDeactivating, setCandidateDeactivating] = useState(false);
  const [temporaryPassword, setTemporaryPassword] = useState("");

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
      if ([401, 403].includes(error.status)) {
        await onSessionRefresh?.();
      }
      updateAssignmentState(candidateId, { error: error.message });
    } finally {
      updateAssignmentState(candidateId, { loading: false });
    }
  }

  function handleManageAssignments(candidate) {
    setAssignmentsCandidate(candidate);
    const candidateId = candidate.id;
    if (!assignmentStates[candidateId]?.loaded) {
      loadAssignments(candidateId);
    }
  }

  async function handleAddAssignmentClick(candidateId) {
    const state = assignmentStates[candidateId] || {};
    if (state.showAddForm) {
      updateAssignmentState(candidateId, { showAddForm: false });
      return;
    }

    updateAssignmentState(candidateId, {
      showAddForm: true,
      activitiesLoading: true,
      error: "",
      message: ""
    });

    try {
      const activities = await apiRequest("/coordinator/activities");
      updateAssignmentState(candidateId, { activities });
    } catch (error) {
      if ([401, 403].includes(error.status)) {
        await onSessionRefresh?.();
      }
      updateAssignmentState(candidateId, { error: error.message });
    } finally {
      updateAssignmentState(candidateId, { activitiesLoading: false });
    }
  }

  async function handleAddAssignment(candidateId) {
    const state = assignmentStates[candidateId] || {};
    const activityId = Number(state.selectedActivityId);

    if (!Number.isSafeInteger(activityId) || activityId <= 0) {
      updateAssignmentState(candidateId, { error: "Select an activity to assign." });
      return;
    }

    updateAssignmentState(candidateId, { saving: true, error: "", message: "" });

    try {
      await apiRequest("/coordinator/assignments", {
        method: "POST",
        body: JSON.stringify({ candidateId, activityId })
      });

      updateAssignmentState(candidateId, {
        selectedActivityId: "",
        showAddForm: false,
        message: "Activity assigned successfully."
      });

      await loadAssignments(candidateId);
      await onAssignmentsChange?.();
    } catch (error) {
      if ([401, 403].includes(error.status)) {
        await onSessionRefresh?.();
      }
      updateAssignmentState(candidateId, {
        error: error.message,
        message: ""
      });
    } finally {
      updateAssignmentState(candidateId, { saving: false });
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
      if ([401, 403].includes(error.status)) {
        await onSessionRefresh?.();
      }
      updateAssignmentState(candidateId, { error: error.message });
    } finally {
      updateAssignmentState(candidateId, { deletingId: null });
    }
  }

  function handleManageAccount(candidate) {
    setAccountCandidate(candidate);
    setCohort(candidate.cohort);
    setAccountError("");
    setTemporaryPassword("");
  }

  async function handleCohortSave(event) {
    event.preventDefault();
    const updatedCohort = cohort.trim();

    if (!updatedCohort) {
      setAccountError("Cohort is required.");
      return;
    }

    setAccountError("");
    setCohortSaving(true);

    const requestController = new AbortController();
    const timeoutId = window.setTimeout(() => requestController.abort(), 20000);

    try {
      const updatedCandidate = await apiRequest(
        `/coordinator/candidates/${accountCandidate.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({ cohort: updatedCohort }),
          signal: requestController.signal
        }
      );
      setAccountCandidate(updatedCandidate);
      setCohort(updatedCandidate.cohort);
      onCandidateUpdated?.(updatedCandidate);
    } catch (error) {
      if (error.name === "AbortError") {
        setAccountError(
          "Saving the cohort timed out. Check whether it was updated before trying again."
        );
        return;
      }

      if ([401, 403].includes(error.status)) {
        await onSessionRefresh?.();
      }
      setAccountError(error.message);
    } finally {
      window.clearTimeout(timeoutId);
      setCohortSaving(false);
    }
  }

  async function handlePasswordReset() {
    setAccountError("");
    setTemporaryPassword("");
    setPasswordResetting(true);

    try {
      const result = await apiRequest(
        `/coordinator/candidates/${accountCandidate.id}/reset-password`,
        { method: "POST" }
      );
      setTemporaryPassword(result.credentials.temporaryPassword);
    } catch (error) {
      if ([401, 403].includes(error.status)) {
        await onSessionRefresh?.();
      }
      setAccountError(error.message);
    } finally {
      setPasswordResetting(false);
    }
  }

  async function handleDeactivateCandidate() {
    if (
      !window.confirm(
        "Confirm action: Candidate records will be deleted and this action cannot be reverted."
      )
    ) {
      return;
    }

    setAccountError("");
    setCandidateDeactivating(true);

    try {
      await apiRequest(`/coordinator/candidates/${accountCandidate.id}`, {
        method: "DELETE"
      });
      const deletedCandidateId = accountCandidate.id;
      setAccountCandidate(null);
      await onCandidateDeleted?.(deletedCandidateId);
    } catch (error) {
      if ([401, 403].includes(error.status)) {
        await onSessionRefresh?.();
      }
      setAccountError(error.message);
    } finally {
      setCandidateDeactivating(false);
    }
  }

  const currentAssignmentState = assignmentsCandidate
    ? assignmentStates[assignmentsCandidate.id] || {}
    : {};
  const availableActivities = (currentAssignmentState.activities || []).filter(
    (activity) =>
      !currentAssignmentState.items?.some(
        (assignment) => assignment.activity_id === activity.id
      )
  );

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
              candidates.map((candidate) => (
                <tr key={candidate.id}>
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
                      <div className="candidate-row-actions">
                        <button
                          className="secondary-button manage-assignments-button"
                          type="button"
                          onClick={() => handleManageAssignments(candidate)}
                        >
                          Manage Assignments
                        </button>
                        <button
                          className="secondary-button manage-account-button"
                          type="button"
                          onClick={() => handleManageAccount(candidate)}
                        >
                          Manage Account
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {assignmentsCandidate && (
        <div className="account-modal-backdrop">
          <section
            className="account-modal assignments-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="manage-assignments-title"
          >
            <div className="account-modal-heading">
              <div>
                <h2 id="manage-assignments-title">Manage Assignments</h2>
                <p>{assignmentsCandidate.full_name}</p>
              </div>
              <button
                className="activity-close-button"
                type="button"
                aria-label="Close manage assignments"
                onClick={() => setAssignmentsCandidate(null)}
              >
                ×
              </button>
            </div>

            {currentAssignmentState.loading ? (
              <p>Loading assignments...</p>
            ) : currentAssignmentState.items?.length ? (
              <div className="managed-assignments-list">
                {currentAssignmentState.items.map((assignment) => (
                  <article
                    className="managed-assignment"
                    key={assignment.assignment_id}
                  >
                    <div>
                      <strong>{assignment.title}</strong>
                      <span>Track: {assignment.track}</span>
                      <span>Planned hours: {assignment.planned_hours}</span>
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
                      disabled={Boolean(
                        currentAssignmentState.deletingId ||
                        currentAssignmentState.saving
                      )}
                      onClick={() =>
                        handleDeleteAssignment(assignmentsCandidate.id, assignment)
                      }
                    >
                      {currentAssignmentState.deletingId === assignment.assignment_id
                        ? "Deleting..."
                        : "Delete"}
                    </button>
                  </article>
                ))}
              </div>
            ) : (
              <p className="managed-assignments-empty">No assignments yet</p>
            )}

            {currentAssignmentState.error && (
              <p className="error-message" role="alert">
                {currentAssignmentState.error}
              </p>
            )}
            {currentAssignmentState.message && (
              <p className="success-message" role="status">
                {currentAssignmentState.message}
              </p>
            )}

            <div className="add-assignment-actions">
              <button
                className="add-activity-btn"
                type="button"
                disabled={Boolean(
                  currentAssignmentState.saving || currentAssignmentState.deletingId
                )}
                onClick={() => handleAddAssignmentClick(assignmentsCandidate.id)}
              >
                {currentAssignmentState.showAddForm ? "Cancel" : "Add Assignment"}
              </button>
            </div>

            {currentAssignmentState.showAddForm && (
              <div className="add-assignment-form">
                {currentAssignmentState.activitiesLoading ? (
                  <p>Loading activities...</p>
                ) : (
                  <>
                    <label htmlFor="candidate-activity-select">Activity</label>
                    <select
                      id="candidate-activity-select"
                      value={currentAssignmentState.selectedActivityId || ""}
                      onChange={(event) =>
                        updateAssignmentState(assignmentsCandidate.id, {
                          selectedActivityId: event.target.value,
                          error: ""
                        })
                      }
                    >
                      <option value="">Select an activity</option>
                      {availableActivities.map((activity) => (
                        <option key={activity.id} value={activity.id}>
                          {activity.title} - {activity.track}
                        </option>
                      ))}
                    </select>
                    {!currentAssignmentState.activities?.length ? (
                      <p>No activities available yet.</p>
                    ) : !availableActivities.length ? (
                      <p>All available activities are already assigned.</p>
                    ) : null}
                    <button
                      className="add-activity-btn"
                      type="button"
                      disabled={Boolean(
                        currentAssignmentState.saving ||
                        currentAssignmentState.deletingId ||
                        !currentAssignmentState.selectedActivityId
                      )}
                      onClick={() => handleAddAssignment(assignmentsCandidate.id)}
                    >
                      {currentAssignmentState.saving
                        ? "Assigning..."
                        : "Assign Activity"}
                    </button>
                  </>
                )}
              </div>
            )}
          </section>
        </div>
      )}

      {accountCandidate && (
        <div className="account-modal-backdrop">
          <section
            className="account-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="manage-account-title"
          >
            <div className="account-modal-heading">
              <h2 id="manage-account-title">Manage Account</h2>
              <button
                className="activity-close-button"
                type="button"
                aria-label="Close manage account"
                onClick={() => setAccountCandidate(null)}
                disabled={candidateDeactivating}
              >
                ×
              </button>
            </div>

            <p className="account-modal-name">{accountCandidate.full_name}</p>
            <p className="account-modal-email">{accountCandidate.email}</p>

            <form className="account-cohort-form" onSubmit={handleCohortSave}>
              <label htmlFor="candidate-cohort-edit">Cohort</label>
              <div>
                <input
                  id="candidate-cohort-edit"
                  type="text"
                  maxLength="100"
                  value={cohort}
                  onChange={(event) => setCohort(event.target.value)}
                  disabled={cohortSaving || candidateDeactivating}
                  required
                />
                <button
                  className="add-activity-btn"
                  type="submit"
                  disabled={
                    cohortSaving ||
                    candidateDeactivating ||
                    cohort.trim() === accountCandidate.cohort
                  }
                >
                  {cohortSaving ? "Saving..." : "Save"}
                </button>
              </div>
            </form>

            <div className="account-password-section">
              <button
                className="secondary-button"
                type="button"
                onClick={handlePasswordReset}
                disabled={passwordResetting || candidateDeactivating}
              >
                {passwordResetting ? "Resetting..." : "Reset Password"}
              </button>
              {temporaryPassword && (
                <div className="form-success" role="status">
                  <strong>Temporary password generated.</strong>
                  <p>
                    Share this securely with the candidate. They must change it
                    after logging in.
                  </p>
                  <code>{temporaryPassword}</code>
                </div>
              )}
            </div>

            <div className="account-deactivate-section">
              <button
                className="delete-assignment-button"
                type="button"
                onClick={handleDeactivateCandidate}
                disabled={candidateDeactivating || cohortSaving || passwordResetting}
              >
                {candidateDeactivating ? "Deactivating..." : "Deactivate Candidate"}
              </button>
            </div>

            {accountError && (
              <p className="error-message" role="alert">{accountError}</p>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

export default CandidateTable;
