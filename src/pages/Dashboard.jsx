import React from 'react';
import './styles.css';

function Dashboard() {
  return (
    <div className="dashboard-container">
      <nav className="dashboard-nav">
        <div className="nav-brand">Quantum Job Tracker</div>
        <button className="logout-btn">Logout</button>
      </nav>

      <main className="dashboard-main">
        <header className="dashboard-header">
          <h1>Welcome to Dashboard</h1>
          <p>Manage your quantum computing jobs</p>
        </header>

        <div className="dashboard-grid">
          <div className="dashboard-card">
            <h3>Active Jobs</h3>
            <div className="card-content">
              <p className="stat">0</p>
              <p className="label">Running</p>
            </div>
          </div>

          <div className="dashboard-card">
            <h3>Completed Jobs</h3>
            <div className="card-content">
              <p className="stat">0</p>
              <p className="label">Finished</p>
            </div>
          </div>

          <div className="dashboard-card">
            <h3>System Status</h3>
            <div className="card-content">
              <p className="stat">Online</p>
              <p className="label">Ready</p>
            </div>
          </div>
        </div>

        <section className="job-section">
          <h2>Recent Jobs</h2>
          <div className="job-list">
            <p>No jobs available. Start by creating a new quantum computing job.</p>
          </div>
        </section>
      </main>
    </div>
  );
}

export default Dashboard;
