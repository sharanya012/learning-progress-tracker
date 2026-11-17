import { useCallback, useEffect, useState } from "react";
import Dashboard from "./components/Dashboard";
import CandidateDashboard from "./components/CandidateDashboard";
import Login from "./components/Login";
import ChangePassword from "./components/ChangePassword";
import { apiRequest } from "./services/api";
import "./App.css";

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkSession = useCallback(async () => {
    try {
      const data = await apiRequest("/auth/me");
      setUser(data.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(checkSession);
  }, [checkSession]);

  function handleLogout() {
    setUser(null);
  }

  async function handleSessionLogout() {
    await apiRequest("/auth/logout", { method: "POST" });
    setUser(null);
  }

  if (loading) return <p>Loading...</p>;

  if (!user) {
    return <Login onLogin={setUser} />;
  }

  if (user.mustChangePassword) {
    return <ChangePassword onLogout={handleLogout} />;
  }

  if (user.role === "coordinator") {
    return (
      <Dashboard
        onSessionRefresh={checkSession}
        onLogout={handleSessionLogout}
      />
    );
  }

  return (
    <CandidateDashboard
      onSessionRefresh={checkSession}
      onLogout={handleSessionLogout}
    />
  );
}

export default App;
