const candidates = [
  { name: "Aarav Sharma", email: "aarav@email.com", progress: 85, status: "On Track" },
  { name: "Diya Rao", email: "diya@email.com", progress: 70, status: "On Track" },
  { name: "Ishaan Mehta", email: "ishaan@email.com", progress: 45, status: "In Progress" },
  { name: "Ananya Nair", email: "ananya@email.com", progress: 30, status: "Needs Attention" }
];

function CandidateTable() {
  return (
    <div className="table-card">
      <div className="section-heading">
        <div>
          <h3>Candidate Progress</h3>
          <p>Track individual cohort performance</p>
        </div>
        <span className="view-all">View all</span>
      </div>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Candidate</th>
              <th>Progress</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>
            {candidates.map((candidate) => (
              <tr key={candidate.email}>
                <td>
                  <strong>{candidate.name}</strong>
                  <small>{candidate.email}</small>
                </td>

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

                <td>
                  <span className={`status ${candidate.status.toLowerCase().replaceAll(" ", "-")}`}>
                    {candidate.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default CandidateTable;