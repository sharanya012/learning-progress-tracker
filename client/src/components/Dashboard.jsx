
import { useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import StatCard from "./StatCard";
import CandidateTable from "./CandidateTable";
import { apiRequest } from "../services/api";

function Dashboard({ onSessionRefresh, onLogout }) {
  const [stats, setStats] = useState({
    learners: 0,
    assignments: 0,
    completed: 0,
    in_progress: 0
  });

  const [candidates, setCandidates] = useState([]);
  const [activities, setActivities] = useState([]);
  const [activePage, setActivePage] = useState("dashboard");
  const [showActivityForm, setShowActivityForm] = useState(false);
  const [activityTitle, setActivityTitle] = useState("");
  const [activityTopic, setActivityTopic] = useState("");
  const [activityDescription, setActivityDescription] = useState("");
  const [plannedHours, setPlannedHours] = useState("");
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [activitiesReloadKey, setActivitiesReloadKey] = useState(0);
  const [activitySaving, setActivitySaving] = useState(false);
  const [activityError, setActivityError] = useState("");
  const [showCandidateForm, setShowCandidateForm] = useState(false);
  const [candidateName, setCandidateName] = useState("");
  const [candidateEmail, setCandidateEmail] = useState("");
  const [candidateCohort, setCandidateCohort] = useState("");
  const [candidateSaving, setCandidateSaving] = useState(false);
  const [candidateError, setCandidateError] = useState("");
  const [createdCredentials, setCreatedCredentials] = useState(null);
  const [selectedCandidate, setSelectedCandidate] = useState("");
  const [selectedActivity, setSelectedActivity] = useState("");
  const [assignmentSaving, setAssignmentSaving] = useState(false);
  const [assignmentError, setAssignmentError] = useState("");
  const [assignmentMessage, setAssignmentMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [logoutError, setLogoutError] = useState("");

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [dashboardData, candidateData] = await Promise.all([
          apiRequest("/coordinator/dashboard"),
          apiRequest("/coordinator/candidates")
        ]);

        setStats(dashboardData);
        setCandidates(candidateData);
      } catch (err) {
        if ([401, 403].includes(err.status)) {
          await onSessionRefresh();
        }
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, [onSessionRefresh]);

  async function refreshAssignmentDashboard() {
    try {
      const [dashboardData, candidateData] = await Promise.all([
        apiRequest("/coordinator/dashboard"),
        apiRequest("/coordinator/candidates")
      ]);
      setStats(dashboardData);
      setCandidates(candidateData);
    } catch (err) {
      if ([401, 403].includes(err.status)) {
        await onSessionRefresh();
      }
      throw err;
    }
  }

  function handleCandidateUpdated(updatedCandidate) {
    setCandidates((currentCandidates) =>
      currentCandidates.map((candidate) =>
        candidate.id === updatedCandidate.id
          ? { ...candidate, ...updatedCandidate }
          : candidate
      )
    );
  }

  useEffect(() => {
    if (!["activities", "assignments"].includes(activePage)) return;

    async function loadActivities() {
      setActivitiesLoading(true);
      setActivityError("");

      try {
        const activityData = await apiRequest("/coordinator/activities");
        setActivities(activityData);
      } catch (err) {
        if ([401, 403].includes(err.status)) {
          await onSessionRefresh();
        }
        setActivityError(err.message);
      } finally {
        setActivitiesLoading(false);
      }
    }

    loadActivities();
  }, [activePage, activitiesReloadKey, onSessionRefresh]);

  function openActivities() {
    setActivePage("activities");
    setShowActivityForm(true);
    setActivityError("");
  }

  async function handleActivitySubmit(event) {
    event.preventDefault();
    setActivityError("");

    const title = activityTitle.trim();
    const topic = activityTopic.trim();
    const hours = Number(plannedHours);

    if (!title || !topic || !Number.isFinite(hours) || hours <= 0) {
      setActivityError("Enter a title, topic and planned hours greater than zero.");
      return;
    }

    setActivitySaving(true);

    try {
      await apiRequest("/coordinator/activities", {
        method: "POST",
        body: JSON.stringify({
          title,
          description: activityDescription.trim(),
          track: topic,
          plannedHours: hours
        })
      });

      setActivityTitle("");
      setActivityTopic("");
      setActivityDescription("");
      setPlannedHours("");
      setShowActivityForm(false);
      const activityData = await apiRequest("/coordinator/activities");
      setActivities(activityData);
    } catch (err) {
      if ([401, 403].includes(err.status)) {
        await onSessionRefresh();
      }
      setActivityError(err.message);
    } finally {
      setActivitySaving(false);
    }
  }

  async function handleCandidateSubmit(event) {
    event.preventDefault();
    setCandidateError("");

    const fullName = candidateName.trim();
    const email = candidateEmail.trim();
    const cohort = candidateCohort.trim();

    if (!fullName || !email || !cohort) {
      setCandidateError("Name, email and cohort are required.");
      return;
    }

    setCandidateSaving(true);

    try {
      const result = await apiRequest("/coordinator/candidates", {
        method: "POST",
        body: JSON.stringify({ fullName, email, cohort })
      });

      setCreatedCredentials(result.credentials);
      setCandidateName("");
      setCandidateEmail("");
      setCandidateCohort("");
      setShowCandidateForm(false);

      try {
        const [dashboardData, candidateData] = await Promise.all([
          apiRequest("/coordinator/dashboard"),
          apiRequest("/coordinator/candidates")
        ]);
        setStats(dashboardData);
        setCandidates(candidateData);
      } catch (refreshError) {
        if ([401, 403].includes(refreshError.status)) {
          await onSessionRefresh();
        }
        setCandidateError(
          `Candidate account created, but the list could not be refreshed: ${refreshError.message}`
        );
      }
    } catch (err) {
      if ([401, 403].includes(err.status)) {
        await onSessionRefresh();
      }
      setCandidateError(err.message);
    } finally {
      setCandidateSaving(false);
    }
  }

  async function handleAssignmentSubmit(event) {
    event.preventDefault();
    setAssignmentError("");
    setAssignmentMessage("");

    const candidateId = Number(selectedCandidate);
    const activityId = Number(selectedActivity);

    if (!Number.isInteger(candidateId) || candidateId <= 0 ||
        !Number.isInteger(activityId) || activityId <= 0) {
      setAssignmentError("Select both a candidate and an activity.");
      return;
    }

    setAssignmentSaving(true);

    try {
      await apiRequest("/coordinator/assignments", {
        method: "POST",
        body: JSON.stringify({ candidateId, activityId })
      });

      setAssignmentMessage("Activity assigned successfully.");
      setSelectedCandidate("");
      setSelectedActivity("");

      try {
        const [dashboardData, candidateData] = await Promise.all([
          apiRequest("/coordinator/dashboard"),
          apiRequest("/coordinator/candidates")
        ]);
        setStats(dashboardData);
        setCandidates(candidateData);
      } catch (refreshError) {
        if ([401, 403].includes(refreshError.status)) {
          await onSessionRefresh();
        }
        setAssignmentError(
          `Activity assigned, but the dashboard could not be refreshed: ${refreshError.message}`
        );
      }
    } catch (err) {
      if ([401, 403].includes(err.status)) {
        await onSessionRefresh();
      }
      setAssignmentError(err.message);
    } finally {
      setAssignmentSaving(false);
    }
  }

  async function handleLogout() {
    setLogoutError("");

    try {
      await onLogout();
    } catch (err) {
      setLogoutError(err.message);
    }
  }

  return (
    <div className="dashboard-layout">
      <Sidebar
        onLogout={handleLogout}
        activePage={activePage}
        onNavigate={(page) => {
          setActivePage(page);
          setShowActivityForm(false);
          setShowCandidateForm(false);
          setCandidateError("");
          setAssignmentError("");
          setAssignmentMessage("");
        }}
      />

      <main className="main-content">
        <header className="topbar">
          <div>
            <h2>
              {activePage === "activities"
                ? "Activities"
                : activePage === "candidates"
                  ? "Candidates"
                  : activePage === "assignments"
                    ? "Assignments"
                    : "Dashboard"}
            </h2>
            <p>Welcome back, Coordinator!</p>
          </div>
        </header>

        {logoutError && (
          <p className="error-message" role="alert">{logoutError}</p>
        )}

        {activePage === "activities" ? (
          <>
            <section className="activities-page-header">
              <div>
                <p className="activities-eyebrow">LEARNING CONTENT</p>
                <h1>Activity Library</h1>
                <p>Build and organize the learning activities assigned to your cohort.</p>
              </div>

              {!showActivityForm && (
                <button
                  className="add-activity-btn"
                  type="button"
                  onClick={() => {
                    setActivityError("");
                    setShowActivityForm(true);
                  }}
                >
                  <span aria-hidden="true">+</span> Create activity
                </button>
              )}
            </section>

            <section className="activities-summary" aria-label="Activity summary">
              <article className="activities-summary-card">
                <span className="activities-summary-icon" aria-hidden="true">A</span>
                <div>
                  <p>Total activities</p>
                  <strong>{activities.length}</strong>
                </div>
              </article>
              <article className="activities-summary-card">
                <span className="activities-summary-icon hours-icon" aria-hidden="true">H</span>
                <div>
                  <p>Planned learning hours</p>
                  <strong>
                    {activities.reduce(
                      (total, activity) => total + (Number(activity.planned_hours) || 0),
                      0
                    ).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    <small> hrs</small>
                  </strong>
                </div>
              </article>
            </section>

            {showActivityForm && (
              <section className="activity-editor">
                <div className="activity-editor-heading">
                  <div>
                    <h2>Create a learning activity</h2>
                    <p>Add the details candidates need to get started.</p>
                  </div>
                  <button
                    className="activity-close-button"
                    type="button"
                    aria-label="Close activity form"
                    onClick={() => {
                      setShowActivityForm(false);
                      setActivityError("");
                    }}
                    disabled={activitySaving}
                  >
                    ×
                  </button>
                </div>
                <form className="activity-form activity-editor-form" onSubmit={handleActivitySubmit}>
                  <div className="activity-field">
                    <label htmlFor="activity-title">Activity title</label>
                    <input
                      id="activity-title"
                      type="text"
                      maxLength="200"
                      placeholder="e.g. Introduction to React"
                      value={activityTitle}
                      onChange={(event) => setActivityTitle(event.target.value)}
                      required
                    />
                  </div>

                  <div className="activity-field">
                    <label htmlFor="activity-topic">Learning track</label>
                    <input
                      id="activity-topic"
                      type="text"
                      maxLength="100"
                      placeholder="e.g. Frontend development"
                      value={activityTopic}
                      onChange={(event) => setActivityTopic(event.target.value)}
                      required
                    />
                  </div>

                  <div className="activity-field">
                    <label htmlFor="planned-hours">Planned hours</label>
                    <input
                      id="planned-hours"
                      type="number"
                      min="0.01"
                      max="9999.99"
                      step="0.01"
                      placeholder="e.g. 4"
                      value={plannedHours}
                      onChange={(event) => setPlannedHours(event.target.value)}
                      required
                    />
                  </div>

                  <div className="activity-field activity-description-field">
                    <label htmlFor="activity-description">
                      Description <span>Optional</span>
                    </label>
                    <textarea
                      id="activity-description"
                      maxLength="1000"
                      rows="3"
                      placeholder="Describe what candidates will learn or complete."
                      value={activityDescription}
                      onChange={(event) => setActivityDescription(event.target.value)}
                    />
                  </div>

                  {activityError && (
                    <p className="error-message activity-form-error" role="alert">
                      {activityError}
                    </p>
                  )}

                  <div className="activity-form-actions">
                    <button
                      className="secondary-button"
                      type="button"
                      onClick={() => {
                        setShowActivityForm(false);
                        setActivityError("");
                      }}
                      disabled={activitySaving}
                    >
                      Cancel
                    </button>
                    <button
                      className="add-activity-btn"
                      type="submit"
                      disabled={activitySaving}
                    >
                      {activitySaving ? "Saving..." : "Create activity"}
                    </button>
                  </div>
                </form>
              </section>
            )}

            {activityError && !showActivityForm && (
              <div className="activities-error">
                <p className="error-message" role="alert">{activityError}</p>
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => setActivitiesReloadKey((key) => key + 1)}
                >
                  Try again
                </button>
              </div>
            )}
            {!showActivityForm && (
              <div className="activities-list-heading">
                <div>
                  <h2>All activities</h2>
                  <p>Activities available to assign to candidates.</p>
                </div>
                <span>{activities.length} {activities.length === 1 ? "activity" : "activities"}</span>
              </div>
            )}
            {activitiesLoading ? (
              <div className="activities-empty-state" role="status">
                <span className="activities-loader" aria-hidden="true"></span>
                <h3>Loading activities</h3>
                <p>Your learning library is on its way.</p>
              </div>
            ) : !activityError && activities.length === 0 ? (
              <div className="activities-empty-state">
                <span className="activities-empty-icon" aria-hidden="true">+</span>
                <h3>Your library is ready to grow</h3>
                <p>Create your first activity to start building a learning plan for your candidates.</p>
                {!showActivityForm && (
                  <button
                    className="add-activity-btn"
                    type="button"
                    onClick={() => setShowActivityForm(true)}
                  >
                    Create your first activity
                  </button>
                )}
              </div>
            ) : !activityError && activities.length > 0 ? (
              <section className="activities-list" aria-label="Activities">
                {activities.map((activity, index) => (
                  <article className="activity-card coordinator-activity-card" key={activity.id}>
                    <div className="coordinator-activity-card-top">
                      <span className="activity-index">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="activity-track">{activity.track}</span>
                    </div>
                    <h3>{activity.title}</h3>
                    <p className="coordinator-activity-description">
                      {activity.description || "A learning activity for your candidate cohort."}
                    </p>
                    <div className="coordinator-activity-footer">
                      <span className="activity-hours-icon" aria-hidden="true"></span>
                      <span>
                        <strong>{activity.planned_hours}</strong>
                        {" "}{Number(activity.planned_hours) === 1 ? "planned hour" : "planned hours"}
                      </span>
                    </div>
                  </article>
                ))}
              </section>
            ) : null}
          </>
        ) : activePage === "candidates" ? (
          <>
            <section className="welcome-section">
              <div>
                <h1>Candidates</h1>
                <p>Create and manage candidate accounts.</p>
              </div>
              {!showCandidateForm && (
                <button
                  className="add-activity-btn"
                  type="button"
                  onClick={() => {
                    setCandidateError("");
                    setCreatedCredentials(null);
                    setShowCandidateForm(true);
                  }}
                >
                  + Add Candidate
                </button>
              )}
            </section>

            {showCandidateForm && (
              <form className="activity-form" onSubmit={handleCandidateSubmit}>
                <h3>Create Candidate Account</h3>
                <label htmlFor="candidate-name">Full name</label>
                <input
                  id="candidate-name"
                  type="text"
                  maxLength="150"
                  autoComplete="name"
                  value={candidateName}
                  onChange={(event) => setCandidateName(event.target.value)}
                  required
                />

                <label htmlFor="candidate-email">Email</label>
                <input
                  id="candidate-email"
                  type="email"
                  maxLength="255"
                  autoComplete="email"
                  value={candidateEmail}
                  onChange={(event) => setCandidateEmail(event.target.value)}
                  required
                />

                <label htmlFor="candidate-cohort">Cohort</label>
                <input
                  id="candidate-cohort"
                  type="text"
                  maxLength="100"
                  value={candidateCohort}
                  onChange={(event) => setCandidateCohort(event.target.value)}
                  required
                />

                {candidateError && (
                  <p className="error-message" role="alert">{candidateError}</p>
                )}

                <div className="activity-form-actions">
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => setShowCandidateForm(false)}
                    disabled={candidateSaving}
                  >
                    Cancel
                  </button>
                  <button
                    className="add-activity-btn"
                    type="submit"
                    disabled={candidateSaving}
                  >
                    {candidateSaving ? "Creating..." : "Create Candidate"}
                  </button>
                </div>
              </form>
            )}

            {candidateError && !showCandidateForm && (
              <p className="error-message" role="alert">{candidateError}</p>
            )}
            {createdCredentials && (
              <div className="form-success" role="status">
                <strong>Candidate account created.</strong>
                <p>Email: {createdCredentials.email}</p>
                <p>
                  Temporary password: <code>{createdCredentials.temporaryPassword}</code>
                </p>
                <p>Share these credentials securely. The candidate must change this password at first login.</p>
              </div>
            )}
            {loading ? (
              <p>Loading candidates...</p>
            ) : error ? (
              <p className="error-message" role="alert">{error}</p>
            ) : (
              <CandidateTable
                candidates={candidates}
                manageAssignments
                onAssignmentsChange={refreshAssignmentDashboard}
                onCandidateUpdated={handleCandidateUpdated}
                onSessionRefresh={onSessionRefresh}
              />
            )}
          </>
        ) : activePage === "assignments" ? (
          <>
            <section className="welcome-section">
              <div>
                <h1>Assign an Activity</h1>
                <p>Choose a candidate and an activity to assign.</p>
              </div>
            </section>

            <form className="activity-form" onSubmit={handleAssignmentSubmit}>
              <h3>New Assignment</h3>
              {activitiesLoading ? (
                <p>Loading activities...</p>
              ) : (
                <>
                  {activityError && (
                    <p className="error-message" role="alert">{activityError}</p>
                  )}
                  {error && (
                    <p className="error-message" role="alert">{error}</p>
                  )}
                  {loading && <p>Loading candidates...</p>}
                  <label htmlFor="assignment-candidate">Candidate</label>
                  <select
                    id="assignment-candidate"
                    value={selectedCandidate}
                    onChange={(event) => setSelectedCandidate(event.target.value)}
                    required
                  >
                    <option value="">Select a candidate</option>
                    {candidates.map((candidate) => (
                      <option key={candidate.id} value={candidate.id}>
                        {candidate.full_name} ({candidate.email})
                      </option>
                    ))}
                  </select>

                  <label htmlFor="assignment-activity">Activity</label>
                  <select
                    id="assignment-activity"
                    value={selectedActivity}
                    onChange={(event) => setSelectedActivity(event.target.value)}
                    required
                  >
                    <option value="">Select an activity</option>
                    {activities.map((activity) => (
                      <option key={activity.id} value={activity.id}>
                        {activity.title} - {activity.track}
                      </option>
                    ))}
                  </select>

                  {assignmentError && (
                    <p className="error-message" role="alert">{assignmentError}</p>
                  )}
                  {assignmentMessage && (
                    <p className="success-message" role="status">{assignmentMessage}</p>
                  )}

                  {!loading && candidates.length === 0 && (
                    <p>Add a candidate before creating an assignment.</p>
                  )}
                  {activities.length === 0 && (
                    <p>Add an activity before creating an assignment.</p>
                  )}

                  <div className="activity-form-actions">
                    <button
                      className="add-activity-btn"
                      type="submit"
                      disabled={assignmentSaving || loading || candidates.length === 0 || activities.length === 0}
                    >
                      {assignmentSaving ? "Assigning..." : "Assign Activity"}
                    </button>
                  </div>
                </>
              )}
            </form>
          </>
        ) : (
          <>
        <section className="welcome-section">
          <div>
            <h1>Training Overview</h1>
            <p>Here's what's happening with your cohort today.</p>
          </div>

          <button
            className="add-activity-btn"
            type="button"
            onClick={openActivities}
          >
            + Add Activity
          </button>
        </section>

        {loading && <p>Loading dashboard...</p>}
        {error && <p className="error-message">{error}</p>}

        {!loading && !error && (
          <>
            <section className="stats-grid">
              <StatCard
                title="Learners"
                value={stats.learners}
                subtitle="Registered learners"
              />

              <StatCard
                title="Assignments"
                value={stats.assignments}
                subtitle="Total assigned activities"
              />

              <StatCard
                title="Completed"
                value={stats.completed}
                subtitle="Assignments completed"
              />
            </section>

            <section className="overview-grid">
              <div className="overview-main">
                <CandidateTable candidates={candidates} />
              </div>

              <aside className="quick-view">
                <h3>Quick View</h3>
                <p className="quick-subtitle">
                  Assignment status overview
                </p>

                <div className="quick-stat">
                  <div>
                    <span className="quick-dot in-progress-dot"></span>
                    <span>In Progress</span>
                  </div>
                  <strong>{stats.in_progress}</strong>
                </div>

                <div className="quick-stat">
                  <div>
                    <span className="quick-dot completed-dot"></span>
                    <span>Completed</span>
                  </div>
                  <strong>{stats.completed}</strong>
                </div>
              </aside>
            </section>
          </>
        )}
          </>
        )}
      </main>
    </div>
  );
}

export default Dashboard;
