const coordinatorMenuItems = [
  { id: "dashboard", label: "Dashboard" },
  { id: "candidates", label: "Candidates" },
  { id: "activities", label: "Activities" }
];

function Sidebar({
  activePage,
  onNavigate,
  menuItems = coordinatorMenuItems,
  onLogout
}) {
  return (
    <aside className="sidebar">
      <h2 className="logo">Track<span>.</span></h2>

      <p className="menu-title">MENU</p>

      <nav>
        {menuItems.map((item) => (
          <button
            className={`nav-item${activePage === item.id ? " active" : ""}`}
            type="button"
            key={item.id}
            onClick={() => onNavigate(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <p className="menu-title">ACCOUNT</p>
        {onLogout ? (
          <button className="nav-item" type="button" onClick={onLogout}>
            Logout
          </button>
        ) : (
          <>
            <div className="nav-item">Settings</div>
            <div className="nav-item">Logout</div>
          </>
        )}
      </div>
    </aside>
  );
}

export default Sidebar;