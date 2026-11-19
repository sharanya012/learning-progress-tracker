import { useCallback, useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import StatCard from "./StatCard";
import { apiRequest } from "../services/api";

const candidateMenuItems = [
  { id: "dashboard", label: "Dashboard" },
  { id: "assignments", label: "My Activities" }
];

function CandidateDashboard({ onSessionRefresh, onLogout }) {
  const [data, setData] = useState(null);
  const [activePage, setActivePage] = useState("dashboard");
  const [recommendedAssignmentId, setRecommendedAssignmentId] = useState(null);
  const [progressDrafts, setProgressDrafts] = useState({});
  const [savingAssignmentId, setSavingAssignmentId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function handleLogout() {
    setError("");

    try {
      await onLogout();
    } catch (err) {
      setError(err.message);
    }
  }

  const loadDashboard = useCallback(async () => {
    try {
      const result = await apiRequest("/candidate/dashboard");
      setData(result);
      setError("");
    } catch (err) {
      if ([401, 403].includes(err.status)) {
        await onSessionRefresh();
      }
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [onSessionRefresh]);

  useEffect(() => {
    Promise.resolve().then(loadDashboard);
  }, [loadDashboard]);

  useEffect(() => {
    if (activePage !== "assignments" || recommendedAssignmentId === null) return;

    document
      .getElementById(`assignment-${recommendedAssignmentId}`)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [activePage, recommendedAssignmentId]);

  async function saveProgress(assignmentId) {
    const progress = progressDrafts[assignmentId];
    if (progress === undefined) return;

    setSavingAssignmentId(assignmentId);
    setError("");

    try {
      const result = await apiRequest(`/candidate/assignments/${assignmentId}`, {
        method: "PATCH",
        body: JSON.stringify({ progress })
      });

      setData((currentData) => ({
        ...currentData,
        assignments: currentData.assignments.map((assignment) =>
          assignment.assignment_id === assignmentId
            ? { ...assignment, ...result.assignment }
            : assignment
        )
      }));
      setProgressDrafts((drafts) => {
        const nextDrafts = { ...drafts };
        delete nextDrafts[assignmentId];
        return nextDrafts;
      });
    } catch (err) {
      if ([401, 403].includes(err.status)) {
        await onSessionRefresh();
      }
      setError(err.message);
    } finally {
      setSavingAssignmentId(null);
    }
  }

  function renderAssignment(assignment, canEditProgress = false) {
    const progress =
      progressDrafts[assignment.assignment_id] ?? assignment.progress;
    const hasProgressChange = progress !== assignment.progress;
    const statusClass =
      assignment.status === "completed"
        ? "on-track"
        : assignment.status === "in_progress"
          ? "in-progress"
          : "not-started";
    const statusLabel =
      assignment.status === "in_progress"
        ? "In progress"
        : assignment.status === "not_started"
          ? "Not started"
          : "Completed";
    const progressInputId = `assignment-progress-${assignment.assignment_id}`;

    return (
      <article
        className="activity-card assignment-card"
        id={`assignment-${assignment.assignment_id}`}
        key={assignment.assignment_id}
      >
        <div className="assignment-card-heading">
          <h3>{assignment.title}</h3>
          <span className={`status ${statusClass}`}>{statusLabel}</span>
        </div>
        {assignment.description && <p>{assignment.description}</p>}
        <div className="assignment-meta">
          <span>Track: {assignment.track}</span>
          <span>Planned hours: {assignment.planned_hours}</span>
        </div>
        {canEditProgress ? (
          <div className="assignment-progress">
            <label htmlFor={progressInputId}>Progress: {progress}%</label>
            <input
              id={progressInputId}
              type="range"
              min="0"
              max="100"
              step="1"
              value={progress}
              disabled={savingAssignmentId === assignment.assignment_id}
              onChange={(event) =>
                setProgressDrafts((drafts) => ({
                  ...drafts,
                  [assignment.assignment_id]: Number(event.target.value)
                }))
              }
            />
            {hasProgressChange && (
              <button
                className="add-activity-btn"
                type="button"
                disabled={savingAssignmentId === assignment.assignment_id}
                onClick={() => saveProgress(assignment.assignment_id)}
              >
                {savingAssignmentId === assignment.assignment_id
                  ? "Saving..."
                  : "Save progress"}
              </button>
            )}
          </div>
        ) : (
          <div className="assignment-progress-readonly">
            <span>Progress: {assignment.progress}%</span>
            <div
              className="progress-bar"
              role="progressbar"
              aria-label={`${assignment.title} progress`}
              aria-valuenow={assignment.progress}
              aria-valuemin="0"
              aria-valuemax="100"
            >
              <div
                className="progress-fill"
                style={{ width: `${assignment.progress}%` }}
              />
            </div>
          </div>
        )}
      </article>
    );
  }

  const assignments = data?.assignments ?? [];
  const completedCount = assignments.filter(
    (assignment) => assignment.status === "completed"
  ).length;
  const inProgressCount = assignments.filter(
    (assignment) => assignment.status === "in_progress"
  ).length;
  const overallProgress = assignments.length
    ? Math.round(
        assignments.reduce(
          (total, assignment) => total + Number(assignment.progress || 0),
          0
        ) / assignments.length
      )
    : 0;
  const learningBreakdown = Object.values(
    assignments.reduce((tracks, assignment) => {
      const track = assignment.track?.trim() || "Other";
      if (!tracks[track]) {
        tracks[track] = { name: track, totalProgress: 0, count: 0 };
      }
      tracks[track].totalProgress += Number(assignment.progress || 0);
      tracks[track].count += 1;
      return tracks;
    }, {})
  )
    .map((track) => ({
      ...track,
      progress: Math.round(track.totalProgress / track.count)
    }))
    .sort((first, second) => first.name.localeCompare(second.name));
  const firstCompletedAssignment = assignments.find(
    (assignment) => assignment.status === "completed"
  );
  const nextAssignment =
    assignments.find((assignment) => assignment.status === "not_started") ??
    assignments.find((assignment) => assignment.status !== "completed");
  const candidateName = data?.candidate.full_name ?? "Candidate";
  const initials = candidateName
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  function retryDashboardLoad() {
    setLoading(true);
    loadDashboard();
  }

  return (
    <div className="dashboard-layout">
      <Sidebar
        activePage={activePage}
        menuItems={candidateMenuItems}
        onNavigate={setActivePage}
        onLogout={handleLogout}
      />

      <main className="main-content">
        <header className="topbar">
          <div>
            <h2>{activePage === "dashboard" ? "Dashboard" : "My Activities"}</h2>
            <p>Welcome back, {candidateName}!</p>
          </div>
          <div className="profile">
            <div className="avatar" aria-hidden="true">{initials}</div>
            <span>{candidateName}</span>
          </div>
        </header>

        {loading ? (
          <p role="status">Loading your dashboard...</p>
        ) : error && !data ? (
          <div>
            <p className="error-message" role="alert">{error}</p>
            <button className="add-activity-btn" type="button" onClick={retryDashboardLoad}>
              Try again
            </button>
          </div>
        ) : (
          <>
            {error && <p className="error-message" role="alert">{error}</p>}
            {activePage === "dashboard" ? (
              <>
                <section className="welcome-section">
                  <div>
                    <h1>Your Learning Journey</h1>
                    <p>Keep track of your assigned activities and progress.</p>
                  </div>
                  <span className="cohort-label">{data.candidate.cohort}</span>
                </section>

                <section className="stats-grid candidate-stats-grid">
                  <StatCard
                    title="Assigned Activities"
                    value={assignments.length}
                    subtitle="Activities in your learning plan"
                  />
                  <StatCard
                    title="In Progress"
                    value={inProgressCount}
                    subtitle="Activities you have started"
                  />
                  <StatCard
                    title="Completed"
                    value={completedCount}
                    subtitle="Activities completed"
                  />
                  <StatCard
                    title="Overall Progress"
                    value={`${overallProgress}%`}
                    subtitle="Average progress across activities"
                  />
                </section>

                <section className="candidate-insights-grid">
                  <article className="candidate-insight-card">
                    <div className="candidate-insight-heading">
                      <div>
                        <h3>Learning Breakdown</h3>
                        <p>Average activity progress by track</p>
                      </div>
                    </div>
                    {learningBreakdown.length ? (
                      <div className="learning-breakdown-list">
                        {learningBreakdown.map((track) => (
                          <div className="learning-track-row" key={track.name}>
                            <div className="learning-track-label">
                              <strong>{track.name}</strong>
                              <span>{track.count} {track.count === 1 ? "activity" : "activities"}</span>
                            </div>
                            <div className="learning-track-progress">
                              <div
                                className="progress-bar"
                                role="progressbar"
                                aria-label={`${track.name} progress`}
                                aria-valuenow={track.progress}
                                aria-valuemin="0"
                                aria-valuemax="100"
                              >
                                <div
                                  className="progress-fill"
                                  style={{ width: `${track.progress}%` }}
                                />
                              </div>
                              <strong>{track.progress}%</strong>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="candidate-insight-empty">Track progress will appear once activities are assigned.</p>
                    )}
                  </article>

                  <article className="candidate-insight-card">
                    <div className="candidate-insight-heading">
                      <div>
                        <h3>Achievements &amp; Milestones</h3>
                        <p>Based on your activity progress</p>
                      </div>
                    </div>
                    <ul className="candidate-milestone-list">
                      <li className={firstCompletedAssignment ? "milestone-earned" : ""}>
                        <span aria-hidden="true">{firstCompletedAssignment ? "✓" : "○"}</span>
                        <div>
                          <strong>First activity completed</strong>
                          <small>
                            {firstCompletedAssignment
                              ? firstCompletedAssignment.title
                              : "Complete an activity to earn this milestone."}
                          </small>
                        </div>
                      </li>
                      <li className={overallProgress >= 50 ? "milestone-earned" : ""}>
                        <span aria-hidden="true">{overallProgress >= 50 ? "✓" : "○"}</span>
                        <div>
                          <strong>50% overall progress</strong>
                          <small>
                            {overallProgress >= 50
                              ? "Milestone reached!"
                              : `${overallProgress}% complete so far.`}
                          </small>
                        </div>
                      </li>
                      <li className={completedCount > 0 ? "milestone-earned" : ""}>
                        <span aria-hidden="true">{completedCount > 0 ? "✓" : "○"}</span>
                        <div>
                          <strong>Activities completed</strong>
                          <small>{completedCount} of {assignments.length} completed</small>
                        </div>
                      </li>
                    </ul>
                  </article>
                </section>

                <section className="recommended-activity-card">
                  <div>
                    <p className="activities-eyebrow">YOUR NEXT STEP</p>
                    <h3>{nextAssignment ? nextAssignment.title : "All caught up!"}</h3>
                    <p>
                      {nextAssignment
                        ? `${nextAssignment.track} · ${nextAssignment.progress}% complete`
                        : "You have completed all assigned activities."}
                    </p>
                  </div>
                  {nextAssignment && (
                    <button
                      className="add-activity-btn"
                      type="button"
                      onClick={() => {
                        setRecommendedAssignmentId(nextAssignment.assignment_id);
                        setActivePage("assignments");
                      }}
                    >
                      Go to activity
                    </button>
                  )}
                </section>

                <section className="overview-grid">
                  <div className="overview-main">
                    <div className="section-heading">
                      <div>
                        <h3>Your Activities</h3>
                        <p>Review your learning plan and progress.</p>
                      </div>
                      {assignments.length > 3 && (
                        <button
                          className="view-all-button"
                          type="button"
                          onClick={() => setActivePage("assignments")}
                        >
                          View all
                        </button>
                      )}
                    </div>
                    {assignments.length === 0 ? (
                      <div className="table-card">
                        <p>No activities have been assigned yet.</p>
                      </div>
                    ) : (
                      <section className="candidate-assignments-list">
                        {assignments.slice(0, 3).map((assignment) =>
                          renderAssignment(assignment)
                        )}
                      </section>
                    )}
                  </div>

                  <aside className="quick-view">
                    <h3>Progress Overview</h3>
                    <p className="quick-subtitle">Your activity status</p>
                    <div className="quick-stat">
                      <div>
                        <span className="quick-dot in-progress-dot"></span>
                        <span>In Progress</span>
                      </div>
                      <strong>{inProgressCount}</strong>
                    </div>
                    <div className="quick-stat">
                      <div>
                        <span className="quick-dot completed-dot"></span>
                        <span>Completed</span>
                      </div>
                      <strong>{completedCount}</strong>
                    </div>
                    <div className="quick-stat">
                      <div>
                        <span className="quick-dot not-started-dot"></span>
                        <span>Not Started</span>
                      </div>
                      <strong>{assignments.length - completedCount - inProgressCount}</strong>
                    </div>
                  </aside>
                </section>
              </>
            ) : (
              <>
                <section className="welcome-section">
                  <div>
                    <h1>My Activities</h1>
                    <p>Update your progress as you work through each activity.</p>
                  </div>
                  <span className="cohort-label">{data.candidate.cohort}</span>
                </section>
                {assignments.length === 0 ? (
                  <div className="table-card">
                    <p>No activities have been assigned yet.</p>
                  </div>
                ) : (
                  <section className="candidate-assignments-list">
                    {assignments.map((assignment) => renderAssignment(assignment, true))}
                  </section>
                )}
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default CandidateDashboard;
