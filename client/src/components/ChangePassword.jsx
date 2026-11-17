
import { useState } from "react";
import { apiRequest } from "../services/api";

function ChangePassword({ onLogout }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    try {
      await apiRequest("/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword })
      });

      onLogout();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={handleSubmit}>
        <h2>Change your password</h2>
        <p>You must change your temporary password before continuing.</p>

        <label>Temporary password</label>
        <input
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          required
        />

        <label>New password</label>
        <input
          type="password"
          minLength="8"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
        />

        {error && <p className="error-message">{error}</p>}

        <button className="add-activity-btn" type="submit">
          Update password
        </button>
      </form>
    </div>
  );
}

export default ChangePassword;
