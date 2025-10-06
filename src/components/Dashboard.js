import React from 'react';

const Dashboard = ({ onStateSelect, searchTerm }) => {
  const states = [
    { name: 'Tamilnadu', projects: 12, progress: 75 },
    { name: 'Delhi', projects: 8, progress: 60 },
    { name: 'Uttar Pradesh', projects: 15, progress: 45 },
    { name: 'Maharashtra', projects: 20, progress: 80 },
    { name: 'Karnataka', projects: 10, progress: 55 },
    { name: 'Kerala', projects: 6, progress: 70 },
    { name: 'Gujarat', projects: 9, progress: 65 },
    { name: 'Rajasthan', projects: 7, progress: 40 },
    { name: 'Punjab', projects: 5, progress: 85 },
    { name: 'West Bengal', projects: 11, progress: 50 },
    { name: 'Bihar', projects: 4, progress: 35 },
    { name: 'Madhya Pradesh', projects: 8, progress: 60 },
    { name: 'Andhra Pradesh', projects: 13, progress: 75 },
    { name: 'Telangana', projects: 9, progress: 70 }
  ];

  const filteredStates = states.filter(state =>
    state.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalProjects = states.reduce((sum, state) => sum + state.projects, 0);
  const averageProgress = states.reduce((sum, state) => sum + state.progress, 0) / states.length;

  return (
    <div className="dashboard">
      <div className="card">
        <div className="header-with-actions">
          <div>
            <h2>State Dashboard</h2>
            <p className="text-muted">Select a state to view and manage projects</p>
          </div>
          <div className="stats-overview">
            <div className="stat-card">
              <span className="stat-number">{states.length}</span>
              <span className="stat-label">Total States</span>
            </div>
            <div className="stat-card">
              <span className="stat-number">{totalProjects}</span>
              <span className="stat-label">Active Projects</span>
            </div>
            <div className="stat-card">
              <span className="stat-number">{Math.round(averageProgress)}%</span>
              <span className="stat-label">Avg Progress</span>
            </div>
          </div>
        </div>

        {filteredStates.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <i className="fas fa-search"></i>
            </div>
            <h3>No states found</h3>
            <p>Try adjusting your search terms</p>
          </div>
        ) : (
          <div className="grid grid-3">
            {filteredStates.map((state, index) => (
              <div
                key={index}
                className="state-card"
                onClick={() => onStateSelect(state.name)}
              >
                <div className="state-icon">
                  {state.name.split(' ').map(word => word[0]).join('')}
                </div>
                <h3>{state.name}</h3>
                <div className="project-info">
                  <div className="detail-item">
                    <span>Projects:</span>
                    <strong>{state.projects}</strong>
                  </div>
                  <div className="detail-item">
                    <span>Progress:</span>
                    <div className="progress-bar">
                      <div 
                        className="progress-fill"
                        style={{ width: `${state.progress}%` }}
                      ></div>
                    </div>
                    <span>{state.progress}%</span>
                  </div>
                </div>
                <span className="state-arrow">
                  <i className="fas fa-arrow-right"></i>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;