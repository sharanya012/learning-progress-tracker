
import Sidebar from "./Sidebar";
import StatCard from "./StatCard";
import CandidateTable from "./CandidateTable";

function Dashboard() {
  return (
    <div className="dashboard-layout">
      <Sidebar />

      <main className="main-content">
        <header className="topbar">
          <div>
            <h2>Dashboard</h2>
            <p>Welcome back, Coordinator!</p>
          </div>

          <div className="profile">
            <div className="avatar">C</div>
            <span>Coordinator</span>
          </div>
        </header>

        <section className="welcome-section">
          <div>
            <h1>Training Overview</h1>
            <p>Here's what's happening with your cohort today.</p>
          </div>

          <button className="add-activity-btn">
            + Add Activity
          </button>
        </section>

        <section className="stats-grid">
          <StatCard
            title="Learners"
            value="24"
            subtitle="Registered learners"
          />

          <StatCard
            title="Assignments"
            value="48"
            subtitle="Total assigned activities"
          />

          <StatCard
            title="Completed"
            value="32"
            subtitle="Assignments completed"
          />
        </section>

        <section className="overview-grid">
          <div className="overview-main">
            <CandidateTable />
          </div>

          <aside className="quick-view">
            <h3>Quick View</h3>
            <p className="quick-subtitle">Assignment status overview</p>

            <div className="quick-stat">
              <div>
                <span className="quick-dot in-progress-dot"></span>
                <span>In Progress</span>
              </div>
              <strong>16</strong>
            </div>

            <div className="quick-stat">
              <div>
                <span className="quick-dot completed-dot"></span>
                <span>Completed</span>
              </div>
              <strong>32</strong>
            </div>
          </aside>
        </section>

      </main>
    </div>
  );
}

export default Dashboard;
