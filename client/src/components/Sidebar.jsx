function Sidebar() {
  return (
    <aside className="sidebar">
      <h2 className="logo">Track<span>.</span></h2>

      <p className="menu-title">MENU</p>

      <nav>
        <div className="nav-item active">Dashboard</div>
        <div className="nav-item">Candidates</div>
        <div className="nav-item">Activities</div>
        <div className="nav-item">Assignments</div>
      </nav>

      <div className="sidebar-bottom">
        <p className="menu-title">ACCOUNT</p>
        <div className="nav-item">Settings</div>
        <div className="nav-item">Logout</div>
      </div>
    </aside>
  );
}

export default Sidebar;