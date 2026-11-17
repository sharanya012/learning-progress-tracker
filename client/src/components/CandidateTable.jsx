
function CandidateTable({ candidates = [] }) {
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
            </tr>
          </thead>

          <tbody>
            {candidates.length === 0 ? (
              <tr>
                <td colSpan="3">No candidates found.</td>
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
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default CandidateTable;
